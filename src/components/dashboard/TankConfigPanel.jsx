import { useState, useEffect, useCallback } from 'react';
import { Settings, Droplets, RefreshCw, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { getWaterUsage, getWaterUsageConfig, saveWaterUsageConfig } from '../../utils/api';

// ── Volume calculator (harus sama dengan backend calcVolume) ──
function calcVolume(waterLevelCm, config) {
  if (waterLevelCm == null || waterLevelCm < 0) return 0;
  const h = waterLevelCm / 100;
  if (config.shape === 'cylinder') {
    const r = (config.cylinder?.diameterCm ?? 120) / 2 / 100;
    return +(Math.PI * r * r * h).toFixed(4);
  } else {
    const l = (config.rectangle?.lengthCm ?? 150) / 100;
    const w = (config.rectangle?.widthCm  ?? 100) / 100;
    return +(l * w * h).toFixed(4);
  }
}

// ── Status badge ──
function StatusBadge({ status }) {
  const saved = status === 'SAVED';
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
      color:       saved ? '#10b981' : '#f59e0b',
      background:  saved ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
      border: `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
    }}>
      {saved ? '✓ Tersimpan' : '⏳ Pending'}
    </span>
  );
}

// ── Input field style helper ──
const inputStyle = {
  width: '100%', background: '#080f1e', border: '1px solid #1a3558',
  color: '#e2e8f0', padding: '8px 10px', borderRadius: 8,
  fontSize: 12, outline: 'none', boxSizing: 'border-box',
};

// ── Dummy fallback data ──
function dummyUsage() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return {
      id: i + 1,
      date: d.toISOString().slice(0, 10),
      volume_m3: +(0.8 + Math.random() * 0.5).toFixed(2),
      status: i === 0 ? 'PENDING' : 'SAVED',
    };
  });
}

export default function TankConfigPanel({ waterLevelCm = null, waterDistanceCm = null }) {
  // ── State ──
  const [config, setConfig]       = useState(null);       // loaded from backend
  const [form, setForm]           = useState(null);        // editable form copy
  const [usage, setUsage]         = useState([]);          // 7-day history
  const [usageSource, setSource]  = useState('loading');   // 'db' | 'dummy' | 'loading'
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState(null);        // { ok, text }
  const [loading, setLoading]     = useState(false);

  // Derived: volume saat ini berdasarkan sensor + config
  const currentVolume = form && waterLevelCm != null
    ? calcVolume(waterLevelCm, form)
    : null;

  // ── Load config & usage ──
  const load = useCallback(async () => {
    setLoading(true);
    // Config
    try {
      const { data } = await getWaterUsageConfig();
      setConfig(data);
      setForm(JSON.parse(JSON.stringify(data))); // deep copy
    } catch {
      const def = { shape: 'cylinder', maxDistanceCm: 200, cylinder: { diameterCm: 120 }, rectangle: { lengthCm: 150, widthCm: 100 } };
      setConfig(def); setForm(JSON.parse(JSON.stringify(def)));
    }
    // Usage history
    try {
      const { data } = await getWaterUsage();
      setUsage(data.data || dummyUsage());
      setSource(data.source || 'db');
    } catch {
      setUsage(dummyUsage());
      setSource('dummy');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Save config ──
  const handleSave = async () => {
    setSaving(true); setSaveMsg(null);
    try {
      await saveWaterUsageConfig(form);
      setConfig(JSON.parse(JSON.stringify(form)));
      setSaveMsg({ ok: true, text: 'Konfigurasi berhasil disimpan!' });
    } catch {
      setSaveMsg({ ok: false, text: 'Gagal menyimpan. Cek koneksi backend.' });
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const setF = (path, value) => {
    setForm(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  if (!form) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <RefreshCw size={20} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const isCylinder = form.shape === 'cylinder';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Info banner ── */}
      <div style={{
        padding: '10px 14px', borderRadius: 10,
        background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <Settings size={16} color="#38bdf8" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', marginBottom: 3 }}>
            Konfigurasi Dimensi Tangki Air
          </div>
          <div style={{ fontSize: 9, color: '#475569', lineHeight: 1.6 }}>
            Masukkan dimensi fisik tangki agar sistem dapat menghitung volume air (m³) secara akurat dari
            data sensor ultrasonik HC-SR04.
            {' '}Snapshot volume otomatis tersimpan ke database setiap <strong style={{ color: '#64748b' }}>tengah malam WIB</strong>.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* ── Left: Config Form ── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ⚙️ Pengaturan Tangki
          </div>

          {/* Shape selector */}
          <div>
            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Bentuk Tangki
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'cylinder',  label: '🛢️ Silinder' },
                { value: 'rectangle', label: '📦 Persegi Panjang' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setF('shape', opt.value)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${form.shape === opt.value ? 'rgba(59,130,246,0.6)' : '#1a3558'}`,
                    background: form.shape === opt.value ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.02)',
                    color: form.shape === opt.value ? '#93c5fd' : '#64748b',
                    transition: 'all 0.2s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tinggi tangki (max distance) */}
          <div>
            <label style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
              Tinggi / Max Jarak Sensor (cm)
            </label>
            <input
              type="number" min={10} max={1000} style={inputStyle}
              value={form.maxDistanceCm}
              onChange={e => setF('maxDistanceCm', Number(e.target.value))}
            />
            <div style={{ fontSize: 8, color: '#475569', marginTop: 3 }}>
              = Jarak sensor ke dasar tangki saat kosong
            </div>
          </div>

          {/* Cylinder: diameter */}
          {isCylinder && (
            <div>
              <label style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
                Diameter Tangki (cm)
              </label>
              <input
                type="number" min={10} max={2000} style={inputStyle}
                value={form.cylinder?.diameterCm ?? 120}
                onChange={e => setF('cylinder.diameterCm', Number(e.target.value))}
              />
              <div style={{ fontSize: 8, color: '#475569', marginTop: 3 }}>
                Volume = π × (D/2)² × tinggi_air
              </div>
            </div>
          )}

          {/* Rectangle: length + width */}
          {!isCylinder && (
            <>
              <div>
                <label style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
                  Panjang Tangki (cm)
                </label>
                <input
                  type="number" min={10} max={2000} style={inputStyle}
                  value={form.rectangle?.lengthCm ?? 150}
                  onChange={e => setF('rectangle.lengthCm', Number(e.target.value))}
                />
              </div>
              <div>
                <label style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
                  Lebar Tangki (cm)
                </label>
                <input
                  type="number" min={10} max={2000} style={inputStyle}
                  value={form.rectangle?.widthCm ?? 100}
                  onChange={e => setF('rectangle.widthCm', Number(e.target.value))}
                />
              </div>
              <div style={{ fontSize: 8, color: '#475569' }}>
                Volume = Panjang × Lebar × tinggi_air
              </div>
            </>
          )}

          {/* Save button */}
          <button
            onClick={handleSave} disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              background: saving ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.5)',
              color: '#93c5fd', transition: 'all 0.2s',
            }}
          >
            {saving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
            {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
          </button>

          {/* Save feedback */}
          {saveMsg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600,
              background: saveMsg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${saveMsg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: saveMsg.ok ? '#10b981' : '#ef4444',
            }}>
              {saveMsg.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
              {saveMsg.text}
            </div>
          )}
        </div>

        {/* ── Right: Volume Preview ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Volume preview card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              📐 Ringkasan Dimensi
            </div>

            {[
              { label: 'Bentuk',          value: isCylinder ? 'Silinder (Tabung)' : 'Persegi Panjang' },
              { label: 'Tinggi Tangki',   value: `${form.maxDistanceCm} cm` },
              ...(isCylinder ? [
                { label: 'Diameter',      value: `${form.cylinder?.diameterCm} cm` },
                { label: 'Jari-jari',     value: `${(form.cylinder?.diameterCm / 2).toFixed(1)} cm` },
              ] : [
                { label: 'Panjang',       value: `${form.rectangle?.lengthCm} cm` },
                { label: 'Lebar',         value: `${form.rectangle?.widthCm} cm` },
              ]),
              { label: 'Volume Maks',     value: `${calcVolume(form.maxDistanceCm, form).toFixed(3)} m³`, highlight: true },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 8px', borderRadius: 6,
                background: row.highlight ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${row.highlight ? 'rgba(59,130,246,0.3)' : 'rgba(26,53,88,0.4)'}`,
              }}>
                <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>{row.label}</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: row.highlight ? 13 : 11, fontWeight: 800,
                  color: row.highlight ? '#3b82f6' : '#e2e8f0',
                }}>{row.value}</span>
              </div>
            ))}

            {/* Live volume from sensor */}
            <div style={{ marginTop: 4, padding: '10px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ fontSize: 8, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Volume Air Saat Ini (Live)
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 900, color: currentVolume != null ? '#10b981' : '#475569' }}>
                {currentVolume != null ? `${currentVolume} m³` : '— m³'}
              </div>
              <div style={{ fontSize: 8, color: '#475569', marginTop: 2 }}>
                {waterLevelCm != null ? `Ketinggian air: ${waterLevelCm.toFixed(1)} cm` : 'Sensor tidak terkoneksi'}
              </div>
            </div>
          </div>

          {/* Source indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 8, fontSize: 9, fontWeight: 600,
            background: usageSource === 'db' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${usageSource === 'db' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
            color: usageSource === 'db' ? '#10b981' : '#f59e0b',
          }}>
            <Droplets size={11} />
            {usageSource === 'db' ? '✓ Data dari Database MySQL' : '⚠ Sensor offline — menampilkan data dummy'}
          </div>
        </div>
      </div>

      {/* ── Riwayat 7 Hari ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', borderBottom: '1px solid #1a3558',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            💧 Riwayat Pemakaian Air (7 Hari Terakhir)
          </div>
          <button
            onClick={load} disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              background: 'transparent', border: '1px solid #1a3558', borderRadius: 6,
              color: '#64748b', fontSize: 10, cursor: 'pointer',
            }}
          >
            <RefreshCw size={11} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            Refresh
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              {['Tanggal', 'Volume Tersisa (m³)', 'Status'].map(h => (
                <th key={h} style={{
                  padding: '8px 16px', textAlign: 'left', fontSize: 9, fontWeight: 700,
                  color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: 'rgba(8,15,30,0.6)', borderBottom: '1px solid #1a3558',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usage.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: 24, color: '#475569', fontSize: 11 }}>
                  {loading ? 'Memuat data...' : 'Belum ada data riwayat'}
                </td>
              </tr>
            )}
            {usage.map((row, i) => {
              const [y, m, d] = (row.date || '').split('-');
              const label = y ? `${d}/${m}/${y}` : '-';
              return (
                <tr key={row.id ?? i} style={{
                  borderBottom: '1px solid rgba(26,53,88,0.4)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  transition: 'background 0.2s',
                }}>
                  <td style={{ padding: '8px 16px', color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                    {label}
                  </td>
                  <td style={{ padding: '8px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>
                    {Number(row.volume_m3).toFixed(3)}
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
