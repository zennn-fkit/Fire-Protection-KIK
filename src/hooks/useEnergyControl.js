import { useState, useEffect, useCallback, useTransition } from 'react';
import { getEnergyReset, postEnergyReset } from '../utils/api';
import { useSensor } from '../context/SensorContext';
import { toast } from 'sonner';

/**
 * Custom hook untuk memisahkan logika kontrol meteran energi dari Dashboard.
 * Menggunakan React 19 useTransition untuk state pengiriman yang asinkron.
 * 
 * @returns {object} State dan action handler untuk reset energi.
 */
export function useEnergyControl() {
  const { state, setEnergyOffset } = useSensor();
  const { energyOffset, panelData } = state;
  const rawEnergyKwh = panelData?.energy_kwh ?? 0;

  const [showResetModal, setShowResetModalState] = useState(false);
  const [lastResetDate, setLastResetDate] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [fetchError, setFetchError] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Wrapper untuk membuka/menutup modal yang otomatis membersihkan actionError
  const setShowResetModal = useCallback((show) => {
    setShowResetModalState(show);
    if (!show) {
      setActionError(null);
    }
  }, []);

  // Fetch offset energi dari server
  const fetchOffset = useCallback(async () => {
    try {
      const res = await getEnergyReset();
      const data = res.data;
      if (data && data.current_offset != null) {
        setEnergyOffset(data.current_offset);
      }
      if (data && data.last_reset) {
        setLastResetDate(data.last_reset);
      }
      setFetchError(null);
    } catch (err) {
      console.warn('⚠️ Could not fetch energy reset offset:', err.message);
      setFetchError(err.message || 'Gagal sinkronisasi data offset dari server.');
    }
  }, [setEnergyOffset]);

  // Fetch offset energi pertama kali saat mount
  useEffect(() => {
    let active = true;
    if (active) {
      fetchOffset();
    }
    return () => {
      active = false;
    };
  }, [fetchOffset]);

  // Aksi reset energi dengan React 19 Action Transition
  const handleConfirmReset = useCallback(({ note }) => {
    startTransition(async () => {
      try {
        setActionError(null);
        const res = await postEnergyReset({ current_kwh: rawEnergyKwh, note });
        if (res.data && res.data.success) {
          setEnergyOffset(rawEnergyKwh);
          setLastResetDate(new Date().toISOString());
          setShowResetModal(false);
          toast.success('Meteran energi berhasil direset!');
        } else {
          throw new Error(res.data?.message || 'Server gagal memproses reset.');
        }
      } catch (err) {
        console.error('❌ Energy reset failed:', err.message);
        setActionError(err.message || 'Gagal mereset energy meter.');
      }
    });
  }, [setEnergyOffset, rawEnergyKwh, setShowResetModal]);

  const displayEnergyKwh = Math.max(0, rawEnergyKwh - energyOffset);

  return {
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
  };
}

