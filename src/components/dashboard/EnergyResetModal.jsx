import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 30 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 350 },
  },
  exit: {
    opacity: 0, scale: 0.9, y: 20,
    transition: { duration: 0.2 },
  },
};

/**
 * Komponen modal dialog konfirmasi untuk mereset meteran energi (energy offset).
 * 
 * @component
 * @param {object} props
 * @param {boolean} props.isOpen - Menentukan apakah modal terbuka/terlihat.
 * @param {Function} props.onClose - Fungsi callback saat modal ditutup (batal).
 * @param {Function} props.onConfirm - Fungsi callback saat konfirmasi reset dilakukan. Menerima objek `{ current_kwh, note }`.
 * @param {number} [props.currentKwh=0] - Nilai akumulasi pemakaian energi total saat ini dari sensor.
 * @param {number} [props.energyOffset=0] - Nilai offset/offset energi saat ini dari SensorContext.
 * @param {string|null} [props.lastResetDate=null] - String format ISO tanggal/waktu reset terakhir kali dilakukan.
 * @param {boolean} [props.loading=false] - State memuat (pending) saat aksi reset API sedang berlangsung.
 */
export default function EnergyResetModal({
  isOpen,
  onClose,
  onConfirm,
  currentKwh = 0,
  energyOffset = 0,
  lastResetDate = null,
  loading = false,
  error = null,
}) {
  const [note, setNote] = useState('');
  const periodKwh = (currentKwh - energyOffset).toFixed(2);

  const handleConfirm = () => {
    onConfirm({ note: note.trim() || null });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Belum pernah';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md"
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={e => e.stopPropagation()}
            className="w-full max-w-[420px] bg-gradient-to-br from-[#0f172a]/97 to-[#1e293b]/97 border border-indigo-500/25 rounded-[20px] p-6 shrink-0 max-h-[90vh] overflow-y-auto shadow-[0_25px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(99,102,241,0.1)]"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-xl shadow-[0_4px_15px_rgba(245,158,11,0.3)]">
                ⚡
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-50">Reset Energy Meter</div>
                <div className="text-[11px] text-slate-400">Mulai tracking pemakaian baru</div>
              </div>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="p-2.5 px-3.5 rounded-lg bg-red-500/8 border border-red-500/25 mb-3 flex items-start gap-2 animate-scale-in">
                <span className="text-sm leading-none">❌</span>
                <div className="text-[11px] text-red-400 leading-normal">
                  {error}
                </div>
              </div>
            )}

            {/* Info Cards */}
            <div className="flex flex-col gap-2 mb-3">
              {/* Pemakaian Periode */}
              <div className="p-3.5 px-4 rounded-[14px] bg-gradient-to-br from-orange-500/12 to-amber-500/8 border border-orange-500/20">
                <div className="text-[10px] text-orange-400 font-bold tracking-wider uppercase mb-1">
                  Pemakaian Periode Ini
                </div>
                <div className="text-[26px] font-extrabold text-orange-500 font-sans">
                  {periodKwh} <span className="text-[13px] font-semibold text-orange-400">kWh</span>
                </div>
              </div>

              {/* Detail Row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 px-3 rounded-xl bg-slate-700/40 border border-slate-600/30">
                  <div className="text-[9px] text-slate-500 font-semibold uppercase mb-0.5">Total Sensor</div>
                  <div className="text-[15px] font-bold text-slate-200">
                    {Number(currentKwh).toFixed(2)} <span className="text-[10px] text-slate-400">kWh</span>
                  </div>
                </div>
                <div className="p-2.5 px-3 rounded-xl bg-slate-700/40 border border-slate-600/30">
                  <div className="text-[9px] text-slate-500 font-semibold uppercase mb-0.5">Reset Terakhir</div>
                  <div className="text-[11px] font-semibold text-slate-200 leading-normal">
                    {formatDate(lastResetDate)}
                  </div>
                </div>
              </div>
            </div>

            {/* Note Input */}
            <div className="mb-3.5">
              <label className="text-[11px] text-slate-400 font-semibold block mb-1.5">
                Catatan (opsional)
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Contoh: Mei 2026"
                maxLength={100}
                className="w-full p-2.5 px-3.5 rounded-lg bg-slate-800/80 border border-slate-600/50 text-slate-50 text-[13px] focus:border-indigo-500/60 outline-none transition-colors duration-200 box-border"
                disabled={loading}
              />
            </div>

            {/* Warning */}
            <div className="p-2.5 px-3.5 rounded-lg bg-amber-500/8 border border-amber-500/15 mb-4 flex items-start gap-2">
              <span className="text-sm leading-none">ℹ️</span>
              <div className="text-[11px] text-amber-400 leading-normal">
                Gauge akan kembali ke <strong>0 kWh</strong>. Data historis sensor tetap tersimpan di database.
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={onClose}
                disabled={loading}
                className="p-2.5 px-5 rounded-lg bg-slate-700/50 border border-slate-600/40 text-slate-400 text-[13px] font-semibold transition-all duration-200 hover:bg-slate-700/80 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Batal
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={`p-2.5 px-6 rounded-lg text-white text-[13px] font-bold transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                  loading
                    ? 'bg-orange-500/40 shadow-none cursor-not-allowed'
                    : 'bg-gradient-to-br from-orange-500 to-amber-500 shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.5)]'
                }`}
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full display-inline-block animate-spin" />
                    Mereset...
                  </>
                ) : (
                  <>⚡ Reset Sekarang</>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
