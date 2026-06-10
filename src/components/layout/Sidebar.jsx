import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Sliders, Flame, Bell, ChevronLeft, ChevronRight, Droplets, Monitor, Settings } from 'lucide-react';
import { useSensor } from '../../context/SensorContext';
import logoBaru from '../../assets/logo.png';

// Custom Sensor Icon Component — wraps the 960×960-viewBox Material SVG in a
// fixed-size container so it renders identically to Lucide icons (18 × 18 px).
function SensorIcon({ size = 18, style, ...props }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
        width="100%"
        height="100%"
        fill="currentColor"
        {...props}
      >
        <path d="M197-197q-54-55-85.5-127.5T80-480q0-84 31.5-156.5T197-763l57 57q-44 44-69 102t-25 124q0 67 25 125t69 101l-57 57Zm113-113q-32-33-51-76.5T240-480q0-51 19-94.5t51-75.5l57 57q-22 22-34.5 51T320-480q0 33 12.5 62t34.5 51l-57 57Zm113.5-113.5Q400-447 400-480t23.5-56.5Q447-560 480-560t56.5 23.5Q560-513 560-480t-23.5 56.5Q513-400 480-400t-56.5-23.5ZM650-310l-57-57q22-22 34.5-51t12.5-62q0-33-12.5-62T593-593l57-57q32 32 51 75.5t19 94.5q0 50-19 93.5T650-310Zm113 113-57-57q44-44 69-102t25-124q0-67-25-125t-69-101l57-57q54 54 85.5 126.5T880-480q0 83-31.5 155.5T763-197Z" />
      </svg>
    </span>
  );
}

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/monitoring', icon: Monitor, label: 'Monitoring' },
  { to: '/history', icon: History, label: 'Riwayat Data' },
  // { to: '/control', icon: Sliders, label: 'Kontrol' },
  // { to: '/sensors', icon: SensorIcon, label: 'Manajemen Sensor' },
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
