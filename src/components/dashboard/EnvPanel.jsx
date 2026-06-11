import { Thermometer, Droplets } from 'lucide-react';
import { getStatus, STATUS_COLORS } from '../../utils/thresholds';

function EnvMetric({ icon: Icon, label, value, unit, threshKey, color }) {
  const status = getStatus(threshKey, value);
  const sc = STATUS_COLORS[status];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
      background: 'rgba(10,22,40,0.6)', borderRadius: 10, border: `1px solid #1a3558`,
      flex: 1,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `linear-gradient(135deg, ${color}20, ${color}08)`,
        border: `1px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>
            {typeof value === 'number' ? value.toFixed(1) : value}
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{unit}</span>
        </div>
        <div style={{ fontSize: 9, color: sc.text, fontWeight: 600, marginTop: 2 }}>{sc.label}</div>
      </div>
    </div>
  );
}

export default function EnvPanel({ nodes, title, style }) {
  return (
    <div className="card" style={style}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        🌡️ {title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {nodes.map((n, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{n.label}</div>
            <EnvMetric
              icon={Thermometer} label="Suhu" value={n.data.temperature}
              unit="°C" threshKey="temperature" color="#f97316"
            />
            <EnvMetric
              icon={Droplets} label="Kelembaban" value={n.data.humidity}
              unit="% RH" threshKey="humidity" color="#3b82f6"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

