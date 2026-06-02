import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Sliders, Flame, Bell, ChevronLeft, ChevronRight, Droplets, Monitor, Settings } from 'lucide-react';
import { useSensor } from '../../context/SensorContext';
import logoBaru from '../../assets/logo.png';


const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/monitoring', icon: Monitor, label: 'Monitoring' },
  { to: '/history', icon: History, label: 'Riwayat Data' },
  { to: '/control', icon: Sliders, label: 'Kontrol' },
  { to: '/sensors', icon: Settings, label: 'Manajemen Sensor' },
];

export default function Sidebar({ isOpen, onToggle }) {
  const { state } = useSensor();
  const activeAlerts = state.alerts.filter(a => a.severity === 'CRITICAL').length;

  return (
    <aside className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
      <button onClick={onToggle} className="sidebar-toggle">
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Logo */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #1a3558', display: 'flex', justifyContent: isOpen ? 'flex-start' : 'center', transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={logoBaru} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          {isOpen && (
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>Smart Fire</div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>Protection System</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 0', overflowX: 'hidden' }}>
        <div style={{
          fontSize: 10, color: '#475569', fontWeight: 600,
          padding: isOpen ? '4px 20px 8px' : '4px 0 8px',
          textAlign: isOpen ? 'left' : 'center',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          transition: 'all 0.3s'
        }}>
          {isOpen ? 'Menu' : '•••'}
        </div>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={!isOpen ? label : undefined}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            {isOpen && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Alert count */}
      {activeAlerts > 0 && (
        <div style={{
          margin: isOpen ? '0 12px 8px' : '0 12px 8px',
          padding: isOpen ? '10px 14px' : '10px 0',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.3s'
        }}>
          <Bell size={14} color="#ef4444" style={{ flexShrink: 0 }} />
          {isOpen && <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, whiteSpace: 'nowrap' }}>{activeAlerts} Alert Aktif</span>}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #1a3558', textAlign: 'center', transition: 'all 0.3s' }}>
        {isOpen ? (
          <div style={{ fontSize: 10, color: '#475569', whiteSpace: 'nowrap' }}>v1.0.0 · Smart Fire System</div>
        ) : (
          <div style={{ fontSize: 10, color: '#475569' }}>v1</div>
        )}
      </div>
    </aside>
  );
}
