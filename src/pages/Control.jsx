import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Bell, Waves, Power, Clock, User } from 'lucide-react';
import { useSensor } from '../context/SensorContext';
import { getControl, postControl } from '../utils/api';
import Header from '../components/layout/Header';
import { toast } from 'sonner';

const DEVICES = [
  {
    key: 'SPRINKLER',
    label: 'Sprinkler',
    icon: Droplets,
    color: '#3b82f6',
    onStatus: 'ON', offStatus: 'OFF',
    onLabel: 'Aktif', offLabel: 'Nonaktif',
    desc: 'Sistem pemadam air otomatis. Aktifkan saat api terdeteksi.',
  },
  {
    key: 'ALARM',
    label: 'Alarm Kebakaran',
    icon: Bell,
    color: '#ef4444',
    onStatus: 'ON', offStatus: 'OFF',
    onLabel: 'Berbunyi', offLabel: 'Diam',
    desc: 'Sirine peringatan bahaya kebakaran.',
  },
  {
    key: 'VALVE',
    label: 'Katup Hydrant',
    icon: Waves,
    color: '#10b981',
    onStatus: 'OPEN', offStatus: 'CLOSED',
    onLabel: 'Terbuka', offLabel: 'Tertutup',
    desc: 'Katup utama saluran air hydrant.',
  },
];

function ControlCard({ device, currentStatus, onToggle, loading, logs }) {
  const { key, label, icon: Icon, color, onStatus, offStatus, onLabel, offLabel, desc } = device;
  const isOn = currentStatus === onStatus;
  const lastLogs = (logs || []).filter(l => l.device === key).slice(0, 4);

  return (
    <div className={`card ${isOn ? 'card-danger' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: isOn ? `${color}25` : 'rgba(26,53,88,0.5)',
          border: `1px solid ${isOn ? color : '#1a3558'}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s',
          boxShadow: isOn ? `0 0 16px ${color}40` : 'none',
        }}>
          <Icon size={22} color={isOn ? color : '#475569'} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{label}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{desc}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {/* Status badge */}
          <div style={{
            padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            color: isOn ? color : '#64748b',
            background: isOn ? `${color}15` : 'rgba(26,53,88,0.4)',
            border: `1px solid ${isOn ? color : '#1a3558'}50`,
            transition: 'all 0.3s',
          }}>
            {isOn ? `● ${onLabel}` : `○ ${offLabel}`}
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isOn}
            onChange={() => onToggle(key, isOn ? offStatus : onStatus)}
            disabled={loading}
          />
          <span className="toggle-slider" />
        </label>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {isOn ? `Klik untuk matikan` : `Klik untuk aktifkan`}
        </span>
        {loading && <span style={{ fontSize: 11, color: '#f97316' }}>Memproses...</span>}
      </div>

      {/* Manual Override Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className={`btn ${isOn ? 'btn-outline' : 'btn-success'}`}
          style={{ flex: 1, fontSize: 12 }}
          onClick={() => onToggle(key, onStatus)}
          disabled={isOn || loading}
        >
          <Power size={12} /> {onLabel}
        </button>
        <button
          className={`btn ${isOn ? 'btn-danger' : 'btn-outline'}`}
          style={{ flex: 1, fontSize: 12 }}
          onClick={() => onToggle(key, offStatus)}
          disabled={!isOn || loading}
        >
          <Power size={12} /> {offLabel}
        </button>
      </div>

      {/* Last actions */}
      {lastLogs.length > 0 && (
        <div style={{ borderTop: '1px solid #1a3558', paddingTop: 12 }}>
          <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Riwayat Kontrol
          </div>
          {lastLogs.map((log, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: log.triggered_by === 'AUTO' ? '#f97316' : '#3b82f6',
              }} />
              <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
                {log.status}
              </span>
              <span style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 999,
                color: log.triggered_by === 'AUTO' ? '#f97316' : '#60a5fa',
                background: log.triggered_by === 'AUTO' ? 'rgba(249,115,22,0.1)' : 'rgba(59,130,246,0.1)',
              }}>
                {log.triggered_by}
              </span>
              {log.timestamp && (
                <span style={{ fontSize: 10, color: '#475569', marginLeft: 'auto' }}>
                  {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Control() {
  const { state, controlUpdate } = useSensor();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState({});

  useEffect(() => {
    getControl()
      .then(({ data }) => {
        setLogs(data.logs || []);
      })
      .catch(() => {
        // Demo logs
        setLogs([
          { device: 'SPRINKLER', status: 'OFF', triggered_by: 'MANUAL', timestamp: new Date(Date.now() - 3600000) },
          { device: 'ALARM', status: 'OFF', triggered_by: 'AUTO', timestamp: new Date(Date.now() - 7200000) },
          { device: 'VALVE', status: 'CLOSED', triggered_by: 'MANUAL', timestamp: new Date(Date.now() - 1800000) },
        ]);
      });
  }, []);

  const handleToggle = async (device, newStatus) => {
    setLoading(l => ({ ...l, [device]: true }));
    try {
      await postControl({ device, status: newStatus, operator: 'Operator' });
      controlUpdate({ device, status: newStatus });
      setLogs(prev => [{ device, status: newStatus, triggered_by: 'MANUAL', timestamp: new Date() }, ...prev]);
      toast.success(`${device} berhasil diubah ke ${newStatus}`, {
        style: { background: '#0d1f38', color: '#e2e8f0', border: '1px solid #1a3558' },
      });
    } catch {
      controlUpdate({ device, status: newStatus });
      setLogs(prev => [{ device, status: newStatus, triggered_by: 'MANUAL', timestamp: new Date() }, ...prev]);
      toast.success(`${device} → ${newStatus} (Demo Mode)`);
    }
    setLoading(l => ({ ...l, [device]: false }));
  };

  return (
    <div className="page-gradient" style={{ minHeight: '100vh' }}>
      <Header title="Panel Kontrol Aktuator" />

      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ padding: '12px 16px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={16} color="#60a5fa" />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Kontrol manual dapat menimpa kontrol otomatis. Sistem akan otomatis mengaktifkan aktuator saat sensor mendeteksi bahaya.
          </span>
        </motion.div>

        {/* Control Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {DEVICES.map((device, index) => (
            <motion.div
              key={device.key}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <ControlCard
                device={device}
                currentStatus={state.actuators[device.key]}
                onToggle={handleToggle}
                loading={loading[device.key]}
                logs={logs}
              />
            </motion.div>
          ))}
        </div>

        {/* Full Activity Log */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Clock size={16} color="#64748b" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Log Aktivitas Kontrol</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['Waktu', 'Aktuator', 'Status', 'Trigger', 'Keterangan'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 20).map((log, i) => (
                  <tr key={i}>
                    <td>{log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID') : '–'}</td>
                    <td style={{ color: '#e2e8f0', fontWeight: 600 }}>{log.device}</td>
                    <td>
                      <span style={{
                        color: ['ON', 'OPEN'].includes(log.status) ? '#10b981' : '#ef4444',
                        fontWeight: 700,
                      }}>{log.status}</span>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                        color: log.triggered_by === 'AUTO' ? '#f97316' : '#60a5fa',
                        background: log.triggered_by === 'AUTO' ? 'rgba(249,115,22,0.12)' : 'rgba(59,130,246,0.12)',
                      }}>
                        {log.triggered_by === 'AUTO' ? '⚡ AUTO' : '👤 MANUAL'}
                      </span>
                    </td>
                    <td style={{ color: '#64748b' }}>{log.reason || log.operator || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
