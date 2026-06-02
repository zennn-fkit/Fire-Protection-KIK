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
      <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid #1a3558', display: 'flex', justifyContent: isOpen ? 'flex-start' : 'center', transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: '2.375rem', height: '2.375rem', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={logoBaru} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          {isOpen && (
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>Smart Fire</div>
              <div style={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 500 }}>Protection System</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '1rem 0', overflowX: 'hidden' }}>
        <div style={{
          fontSize: '0.625rem', color: '#475569', fontWeight: 600,
          padding: isOpen ? '0.25rem 1.25rem 0.5rem' : '0.25rem 0 0.5rem',
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
          margin: '0 0.75rem 0.5rem',
          padding: isOpen ? '0.625rem 0.875rem' : '0.625rem 0',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.625rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          transition: 'all 0.3s'
        }}>
          <Bell size={14} color="#ef4444" style={{ flexShrink: 0 }} />
          {isOpen && <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, whiteSpace: 'nowrap' }}>{activeAlerts} Alert Aktif</span>}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #1a3558', textAlign: 'center', transition: 'all 0.3s' }}>
        {isOpen ? (
          <div style={{ fontSize: '0.625rem', color: '#475569', whiteSpace: 'nowrap' }}>v1.0.0 · Smart Fire System</div>
        ) : (
          <div style={{ fontSize: '0.625rem', color: '#475569' }}>v1</div>
        )}
      </div>
    </aside>
  );
}
