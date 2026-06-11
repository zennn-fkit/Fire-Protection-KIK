import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Wind, Thermometer, Flame, Eye } from 'lucide-react';

const STATUS_MAP = {
  NORMAL: { color: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)', label: 'Aman' },
  WARNING: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', label: 'Waspada' },
  DANGER: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.45)', label: 'Bahaya' },
};

const itemVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
};

function DetectorItem({ label, status, sub, index, icon: Icon }) {
  const s = STATUS_MAP[status] || STATUS_MAP.NORMAL;
  const isDanger = status === 'DANGER';

  return (
    <motion.div
      variants={itemVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.35, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02, y: -1, transition: { duration: 0.15 } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        background: s.bg, border: `1px solid ${s.border}`,
        borderRadius: 10, transition: 'all 0.3s',
        position: 'relative',
        boxShadow: isDanger ? `0 0 16px rgba(239, 68, 68, 0.25)` : 'none',
        animation: isDanger ? 'danger-pulse 2s infinite' : 'none'
      }}>
      {/* Sensor Icon Box */}
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `linear-gradient(135deg, ${s.color}15, ${s.color}05)`,
        border: `1px solid ${s.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <motion.div
          animate={isDanger ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
          transition={isDanger ? { repeat: Infinity, duration: 1.2 } : {}}
        >
          {Icon && <Icon size={16} color={s.color} />}
        </motion.div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <span style={{ fontSize: 9, color: s.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {s.label}
          </span>
          {sub && <span style={{ fontSize: 9, color: '#475569' }}>•</span>}
          {sub && <span style={{ fontSize: 9, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
        </div>
      </div>

      {/* Connection / Pulse Status indicator */}
      <div style={{
        width: 5, height: 5, borderRadius: '50%',
        backgroundColor: s.color,
        boxShadow: `0 0 6px ${s.color}`,
        position: 'absolute', top: 8, right: 8,
        animation: 'live-blink 2s ease-in-out infinite'
      }} />
    </motion.div>
  );
}

export default function SensorStatusCard({ detectors }) {
  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        🛡️ Status Detektor Kebakaran
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1, alignContent: 'stretch' }}>
        <DetectorItem label="Smoke Detector" status={detectors.smoke} sub="Detektor Asap" index={0} icon={Wind} />
        <DetectorItem label="Heat Detector" status={detectors.heat} sub="Heat Acc: ±0.3°C" index={1} icon={Thermometer} />
        <DetectorItem label="Flame Detector" status={detectors.flame} sub="Detektor Api" index={2} icon={Flame} />
        <DetectorItem label="Thermal Sensor" status={detectors.thermal} sub="Heat Acc: ±2.5%" index={3} icon={Eye} />
      </div>
    </div>
  );
}

