import { useState, useEffect, useMemo, useRef } from 'react';
import { THRESHOLDS, validateFireThresholds, UV_SENSOR_KEYS } from '../utils/thresholds';

// Validasi satu kali saat module di-import (mencegah silent bug dari threshold yang hilang)
validateFireThresholds(THRESHOLDS);

/**
 * PURE FUNCTION: Sangat mudah di-unit-test karena tidak bergantung pada React State.
 * Bisa diuji terpisah dengan mock data panel yang ekstrim.
 * Logika deteksi: UV OR (Heat AND Smoke)
 */
export function checkFireDanger(panelData, thresholds = THRESHOLDS.fire) {
  if (!panelData) return false;

  // Konversi eksplisit tanpa menutupinya menjadi 0
  const temp = Number(panelData.temperature_sht);
  const thermal = Number(panelData.thermal_temp);
  const co2 = Number(panelData.co2_ppm);
  const rawUv = panelData[UV_SENSOR_KEYS.DATA_KEY];

  // Ambil nilai bahaya dari Single Source of Truth
  const tempDanger = thresholds.temperature_sht.danger_hi;
  const thermalDanger = thresholds.thermal_temp.danger_hi;
  const co2Danger = thresholds.co2_ppm.danger_hi;

  // Toleransi tipe data (backend bisa mengirim 1, "1", atau true)
  const isFlameDetected = 
    rawUv === UV_SENSOR_KEYS.FLAME_ACTIVE_VALUE || 
    rawUv === String(UV_SENSOR_KEYS.FLAME_ACTIVE_VALUE) || 
    rawUv === true;
  
  // Hanya evaluasi jika datanya valid (Bukan NaN)
  const hasHeat = (!isNaN(temp) && temp >= tempDanger) || (!isNaN(thermal) && thermal >= thermalDanger);
  const hasSmoke = !isNaN(co2) && co2 >= co2Danger;

  return isFlameDetected || (hasHeat && hasSmoke);
}

/**
 * PURE FUNCTION: Mendiagnosa penyebab pasti alarm kebakaran.
 * Mengembalikan string deskriptif tentang sensor yang melampaui batas.
 */
export function diagnoseFireReason(panelData, thresholds = THRESHOLDS.fire) {
  if (!panelData) return "Unknown cause";

  const temp = Number(panelData.temperature_sht);
  const thermal = Number(panelData.thermal_temp);
  const co2 = Number(panelData.co2_ppm);
  const rawUv = panelData[UV_SENSOR_KEYS.DATA_KEY];

  const tempDanger = thresholds.temperature_sht.danger_hi;
  const thermalDanger = thresholds.thermal_temp.danger_hi;
  const co2Danger = thresholds.co2_ppm.danger_hi;

  const isFlameDetected = 
    rawUv === UV_SENSOR_KEYS.FLAME_ACTIVE_VALUE || 
    rawUv === String(UV_SENSOR_KEYS.FLAME_ACTIVE_VALUE) || 
    rawUv === true;
    
  const hasTempHeat = !isNaN(temp) && temp >= tempDanger;
  const hasThermalHeat = !isNaN(thermal) && thermal >= thermalDanger;
  const hasHeat = hasTempHeat || hasThermalHeat;
  const hasSmoke = !isNaN(co2) && co2 >= co2Danger;

  const reasons = [];
  if (isFlameDetected) {
    reasons.push("UV flame detected");
  }
  if (hasHeat && hasSmoke) {
    const heatSource = hasThermalHeat ? "thermal" : "SHT sensor";
    reasons.push(`High temp (${heatSource}) + smoke`);
  }

  return reasons.length > 0 ? reasons.join(" AND ") : "Unknown cause";
}

/**
 * Custom hook dengan penambahan logika Hysteresis.
 * 
 * @param {object} panelData - The current sensor data
 * @param {number} triggerDelayMs - Delay sebelum menyalakan alarm (mencegah false positive)
 * @param {number} resolveDelayMs - Delay sebelum mematikan alarm (mencegah flickering)
 */
export function useFireDetection(panelData, triggerDelayMs = 3000, resolveDelayMs = 5000, options = {}) {
  const { onAlarmTriggered, onAlarmResolved } = options;
  const [isFireHazard, setIsFireHazard] = useState(false);
  const timerRef = useRef(null);

  // 1. Cek kondisi bahaya secara realtime menggunakan Pure Function
  const currentDanger = useMemo(() => {
    return checkFireDanger(panelData);
  }, [
    panelData?.temperature_sht, 
    panelData?.thermal_temp, 
    panelData?.co2_ppm, 
    panelData?.uv_value
  ]);

  // 2. Mekanisme Debounce & Hysteresis yang lebih canggih dengan Ref
  useEffect(() => {
    if (currentDanger) {
      if (!isFireHazard) {
        // Cabang 1: Bahaya baru muncul (Trigger)
        // Bersihkan sisa timer jika ada
        if (timerRef.current) clearTimeout(timerRef.current);
        
        timerRef.current = setTimeout(() => {
          setIsFireHazard(true);
          if (onAlarmTriggered) {
            onAlarmTriggered({
              timestamp: new Date().toISOString(),
              triggerData: panelData,
              reason: diagnoseFireReason(panelData, THRESHOLDS.fire)
            });
          }
        }, triggerDelayMs);
      } else {
        // Cabang 2: Alarm sudah aktif (Sudah aktif)
        // Jika ada resolveTimer sedang berjalan (karena sempat aman sebentar lalu bahaya lagi),
        // segera batalkan agar alarm tidak mati!
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    } else {
      if (isFireHazard) {
        // Cabang 3: Kondisi aman, tapi alarm masih menyala (Resolve / Hysteresis)
        // Tunda mematikan alarm untuk mencegah flickering
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
          setIsFireHazard(false);
          if (onAlarmResolved) {
            onAlarmResolved({
              timestamp: new Date().toISOString()
            });
          }
        }, resolveDelayMs);
      } else {
        // Cabang 4: Kondisi sepenuhnya aman (Sudah aman)
        // Jika ada triggerTimer sedang berjalan (bahaya sebentar lalu langsung aman), batalkan.
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    }

    // Cleanup function: mencegah memory leak jika komponen unmount
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDanger, isFireHazard, triggerDelayMs, resolveDelayMs]);

  return isFireHazard;
}
