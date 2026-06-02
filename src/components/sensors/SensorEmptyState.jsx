import { motion } from 'framer-motion';
import { Wifi, WifiOff, Plus } from 'lucide-react';

export default function SensorEmptyState({ onAdd }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="sensor-empty-state"
    >
      {/* Animated icon */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="sensor-empty-icon"
      >
        <WifiOff size={32} strokeWidth={1.5} />
      </motion.div>

      <h3 className="sensor-empty-title">Belum Ada Sensor Terdaftar</h3>
      <p className="sensor-empty-desc">
        Tambahkan data master sensor untuk mulai memantau area. Sensor yang terdaftar akan muncul di sini.
      </p>

      {onAdd && (
        <motion.button
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={onAdd}
          className="btn btn-primary sensor-empty-btn"
        >
          <Plus size={16} /> Tambah Sensor Pertama
        </motion.button>
      )}
    </motion.div>
  );
}
