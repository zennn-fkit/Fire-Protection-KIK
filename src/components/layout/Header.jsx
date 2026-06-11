import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Wifi, WifiOff, Clock } from 'lucide-react';
import { useSensor } from '../../context/SensorContext';

export default function Header({ title }) {
  const { state } = useSensor();
  const [time, setTime] = useState(new Date());
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const criticalAlerts = state.alerts.filter(a => a.severity === 'CRITICAL');
  const allAlerts = state.alerts.slice(0, 8);

  return (
    <header className="header">
      {/* Desktop view wrapper */}
      <div className="header-desktop">
        {/* Left: Title */}
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{title}</h1>
          <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Clock size={11} />
            {time.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Right: Status + Clock + Alerts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Live clock */}
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: '#f97316', letterSpacing: 2 }}>
            {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>

          {/* Connection status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: state.connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${state.connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 999 }}>
            {state.connected
              ? <><div className="dot-live" /><Wifi size={13} color="#10b981" /><span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Live</span></>
              : <><div className="dot-offline" /><WifiOff size={13} color="#ef4444" /><span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Demo</span></>
            }
          </div>

          {/* Last update */}
          {state.lastUpdate && (
            <div style={{ fontSize: 10, color: '#64748b' }}>
              Update: {new Date(state.lastUpdate).toLocaleTimeString('id-ID')}
            </div>
          )}

          {/* Alert bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              style={{
                position: 'relative', background: allAlerts.length > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(26,53,88,0.5)',
                border: `1px solid ${criticalAlerts.length > 0 ? 'rgba(239,68,68,0.4)' : '#1a3558'}`,
                borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Bell size={16} color={criticalAlerts.length > 0 ? '#ef4444' : '#94a3b8'} className={criticalAlerts.length > 0 ? 'animate-blink' : ''} />
              {allAlerts.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: criticalAlerts.length > 0 ? '#ef4444' : '#f59e0b' }}>
                  {allAlerts.length}
                </span>
              )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
            {showAlerts && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'absolute', right: 0, top: '110%', width: 320, zIndex: 100,
                  background: '#0d1f38', border: '1px solid #1a3558', borderRadius: 12,
                  boxShadow: '0 16px 48px rgba(0,0,0,0.6)', overflow: 'hidden',
                }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a3558', fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>
                  Notifikasi Alert
                </div>
                {allAlerts.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Tidak ada alert</div>
                ) : (
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {allAlerts.map((a, i) => (
                      <div key={i} style={{
                        padding: '10px 16px', borderBottom: '1px solid rgba(26,53,88,0.5)',
                        borderLeft: `3px solid ${a.severity === 'CRITICAL' ? '#ef4444' : a.severity === 'WARNING' ? '#f59e0b' : '#3b82f6'}`,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: a.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {a.severity} · {a.alert_type}
                        </div>
                        <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>{a.message}</div>
                        {a.timestamp && (
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                            {new Date(a.timestamp).toLocaleTimeString('id-ID')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile view wrapper */}
      <div className="header-mobile">
        {/* Row 1: Title & Live clock */}
        <div className="header-row-1">
          <div>
            <h1 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{title}</h1>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, color: '#f97316', letterSpacing: 1 }}>
            {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        {/* Row 2: Status & alerts */}
        <div className="header-row-2">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: state.connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${state.connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 999 }}>
              {state.connected
                ? <><div className="dot-live" /><Wifi size={11} color="#10b981" /><span style={{ fontSize: 9, color: '#10b981', fontWeight: 600 }}>Live</span></>
                : <><div className="dot-offline" /><WifiOff size={11} color="#ef4444" /><span style={{ fontSize: 9, color: '#ef4444', fontWeight: 600 }}>Demo</span></>
              }
            </div>
            {state.lastUpdate && (
              <div style={{ fontSize: 9, color: '#64748b' }}>
                Up: {new Date(state.lastUpdate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              style={{
                position: 'relative', background: allAlerts.length > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(26,53,88,0.5)',
                border: `1px solid ${criticalAlerts.length > 0 ? 'rgba(239,68,68,0.4)' : '#1a3558'}`,
                borderRadius: 8, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Bell size={14} color={criticalAlerts.length > 0 ? '#ef4444' : '#94a3b8'} className={criticalAlerts.length > 0 ? 'animate-blink' : ''} />
              {allAlerts.length > 0 && (
                <span style={{ fontSize: 9, fontWeight: 700, color: criticalAlerts.length > 0 ? '#ef4444' : '#f59e0b' }}>
                  {allAlerts.length}
                </span>
              )}
            </button>

            <AnimatePresence>
            {showAlerts && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'absolute', right: 0, top: '110%', width: 280, zIndex: 100,
                  background: '#0d1f38', border: '1px solid #1a3558', borderRadius: 12,
                  boxShadow: '0 16px 48px rgba(0,0,0,0.6)', overflow: 'hidden',
                }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #1a3558', fontWeight: 700, fontSize: 12, color: '#e2e8f0' }}>
                  Notifikasi Alert
                </div>
                {allAlerts.length === 0 ? (
                  <div style={{ padding: 15, textAlign: 'center', color: '#64748b', fontSize: 12 }}>Tidak ada alert</div>
                ) : (
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {allAlerts.map((a, i) => (
                      <div key={i} style={{
                        padding: '8px 12px', borderBottom: '1px solid rgba(26,53,88,0.5)',
                        borderLeft: `3px solid ${a.severity === 'CRITICAL' ? '#ef4444' : a.severity === 'WARNING' ? '#f59e0b' : '#3b82f6'}`,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: a.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {a.severity} · {a.alert_type}
                        </div>
                        <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>{a.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {showAlerts && <div onClick={() => setShowAlerts(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />}
    </header>
  );
}
