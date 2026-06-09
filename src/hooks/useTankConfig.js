import { useState, useEffect } from 'react';
import { getWaterUsageConfig } from '../utils/api';

export function useTankConfig() {
  const [config, setConfig] = useState({
    shape: 'cylinder',
    maxDistanceCm: 200,
    cylinder: { diameterCm: 120 },
    rectangle: { lengthCm: 150, widthCm: 100 },
  });

  useEffect(() => {
    getWaterUsageConfig()
      .then((res) => {
        if (res?.data) {
          setConfig(res.data);
        }
      })
      .catch((err) => {
        console.error('Gagal mengambil konfigurasi tangki:', err);
      });
  }, []);

  const calcLiters = (distanceCm, levelPct) => {
    // Prioritaskan jarak sensor (distanceCm) jika valid
    if (distanceCm !== undefined && distanceCm !== null) {
      const waterLevelCm = Math.max(0, config.maxDistanceCm - distanceCm);
      const h = waterLevelCm / 100; // cm -> m
      let volumeM3 = 0;
      if (config.shape === 'cylinder') {
        const r = (config.cylinder?.diameterCm ?? 120) / 2 / 100; // cm -> m
        volumeM3 = Math.PI * r * r * h;
      } else {
        const l = (config.rectangle?.lengthCm ?? 150) / 100; // cm -> m
        const w = (config.rectangle?.widthCm ?? 100) / 100; // cm -> m
        volumeM3 = l * w * h;
      }
      return Math.round(volumeM3 * 1000); // 1 m^3 = 1000 L
    }

    // Gunakan fallback persentase jika jarak tidak valid
    if (levelPct !== undefined && levelPct !== null) {
      const h = config.maxDistanceCm / 100; // cm -> m
      let maxVolumeM3 = 0;
      if (config.shape === 'cylinder') {
        const r = (config.cylinder?.diameterCm ?? 120) / 2 / 100;
        maxVolumeM3 = Math.PI * r * r * h;
      } else {
        const l = (config.rectangle?.lengthCm ?? 150) / 100;
        const w = (config.rectangle?.widthCm ?? 100) / 100;
        maxVolumeM3 = l * w * h;
      }
      return Math.round(maxVolumeM3 * 1000 * levelPct);
    }

    return 0;
  };

  return { config, calcLiters };
}
