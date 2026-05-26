
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZONE_DEFAULT, ZONE_VOLTAGE } from '../utils/gaugeZones';
import { useSensor } from '../context/SensorContext';
import { useEnergyControl } from '../hooks/useEnergyControl';
import { useFireDetection } from '../hooks/useFireDetection';
import GaugeCard from '../components/dashboard/GaugeCard';
import EnergyResetModal from '../components/dashboard/EnergyResetModal';
import MonitoringRealtimePanel from '../components/dashboard/MonitoringRealtimePanel';
import Header from '../components/layout/Header';
import { Zap, Activity, Cpu, BatteryCharging } from 'lucide-react';

// Framer Motion variants
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const alertVariants = {
  initial: { opacity: 0, height: 0, scale: 0.95 },
  animate: {
    opacity: 1, height: 'auto', scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0, height: 0, scale: 0.95,
    transition: { duration: 0.3 },
  },
};

export default function Dashboard() {
  const { state } = useSensor();
  const { panelData, water_distance, energyHistory } = state;

  const {
    rawEnergyKwh,
    displayEnergyKwh,
    energyOffset,
    showResetModal,
    setShowResetModal,
    lastResetDate,
    isPending,
    fetchError,
    actionError,
    fetchOffset,
    handleConfirmReset,
  } = useEnergyControl();

  const MAX_TANK_CM = 200;

  // Evaluasi deteksi kebakaran menggunakan kombinasi sensor dan debounce (3 detik)
  const anyDanger = useFireDetection(panelData, 3000);

  const gauges = useMemo(() => {
    if (!panelData) return [];

    return [
      {
        label: 'Tegangan',
        value: panelData.voltage,
        min: 180,
        max: 260,
        unit: 'Volt AC',
        threshKey: 'voltage',
        decimals: 1,
        zones: ZONE_VOLTAGE,
        icon: Zap,
      },
      {
        label: 'Arus',
        value: panelData.current_amp,
        min: 0,
        max: 180,
        unit: 'Ampere',
        threshKey: 'current_amp',
        decimals: 2,
        zones: ZONE_DEFAULT,
        icon: Activity,
      },
      {
        label: 'Watt',
        value: panelData.power_watt,
        min: 0,
        max: 3000,
        unit: 'Watt',
        threshKey: 'power_kw',
        decimals: 2,
        zones: ZONE_DEFAULT,
        icon: Cpu,
      },
      {
        label: 'Energy',
        value: displayEnergyKwh,
        min: 0,
        max: 10000,
        unit: 'kWh',
        threshKey: 'energy_kwh',
        decimals: 2,
        zones: ZONE_DEFAULT,
        showReset: true,
        onReset: () => setShowResetModal(true),
        icon: BatteryCharging,
      },
    ];
  }, [panelData, displayEnergyKwh, setShowResetModal]);

  return (
    <div className="page-gradient">
      <Header title="Monitoring Sensor" />

      <AnimatePresence>
        {anyDanger && (
          <motion.div
            variants={alertVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              margin: '16px 28px 0',
              padding: '12px 20px',
              borderRadius: 12,
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              animation: 'danger-pulse 2s ease-in-out infinite',
            }}
          >
            <span style={{ fontSize: 20 }}>🚨</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>
              BAHAYA KEBAKARAN TERDETEKSI! Harap segera ambil tindakan!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fetchError && (
          <motion.div
            variants={alertVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              margin: '16px 28px 0',
              padding: '12px 20px',
              borderRadius: 12,
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>
                Gagal memuat offset energi awal: {fetchError}. Nilai gauge energi saat ini mungkin tidak akurat.
              </span>
            </div>
            <button
              onClick={fetchOffset}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                background: 'rgba(245,158,11,0.2)',
                border: '1px solid rgba(245,158,11,0.4)',
                color: '#fbbf24',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(245,158,11,0.3)'}
              onMouseLeave={e => e.target.style.background = 'rgba(245,158,11,0.2)'}
            >
              Coba Lagi
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {gauges.map((g) => (
            <motion.div
              key={g.label}
              variants={cardVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <GaugeCard {...g} />
            </motion.div>
          ))}
        </div>

        <motion.div variants={cardVariants}>
          <MonitoringRealtimePanel
            energyHistory={energyHistory}
            waterDistance={water_distance}
            maxTankCm={MAX_TANK_CM}
          />
        </motion.div>
      </motion.div>

      {/* Energy Reset Modal */}
      <EnergyResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleConfirmReset}
        currentKwh={rawEnergyKwh}
        energyOffset={energyOffset}
        lastResetDate={lastResetDate}
        loading={isPending}
        error={actionError}
      />
    </div>
  );
}

