import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { getHistory, getExport, getHistoryDates, getHistoryDateNodes } from '../utils/api';
import { exportToPDF } from '../utils/exportPDF';
import { exportToCSV } from '../utils/exportCSV';
import Header from '../components/layout/Header';

const NODE_LABELS = {
  1: 'Power, SHT, Thermal, CO2, UV',
  2: 'Smart Gas CO2',
  3: 'Hydrant Pressure',
  4: 'Node 4 (Inactive)',
};
const STATUS_COLOR = { NORMAL: '#10b981', WARNING: '#f59e0b', DANGER: '#ef4444' };
const LIMIT = 50;

function StatusBadge({ v }) {
  if (!v) return <span style={{ color: '#475569' }}>-</span>;
  return (
    <span className="history-status-badge" style={{
      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
      color: STATUS_COLOR[v] || '#94a3b8', background: `${STATUS_COLOR[v] || '#64748b'}18`,
      border: `1px solid ${STATUS_COLOR[v] || '#64748b'}40`,
    }}>{v}</span>
  );
}

function EmptyRows({ colSpan, loading }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ textAlign: 'center', padding: 28, color: '#64748b' }}>
        {loading ? 'Memuat data...' : 'Tidak ada data'}
      </td>
    </tr>
  );
}

function val(v, dec = 1) {
  return v != null ? Number(v).toFixed(dec) : <span style={{ color: '#475569' }}>-</span>;
}

function textVal(v) {
  return v != null && v !== '' ? v : '-';
}

function dateStart(date) {
  return `${date}T00:00:00`;
}

function dateEnd(date) {
  return `${date}T23:59:59`;
}

function normalizeDateKey(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function formatDateLabel(value) {
  const date = normalizeDateKey(value);
  if (!date) return '-';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

function createMockDates() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return {
      date: d.toISOString().slice(0, 10),
      total_records: 960,
      node_count: 4,
      first_timestamp: `${d.toISOString().slice(0, 10)}T00:00:00`,
      last_timestamp: `${d.toISOString().slice(0, 10)}T23:59:59`,
      voltage: 220 + Math.random() * 5,
      current_amp: 145 + Math.random() * 15,
      frequency: 50 + (Math.random() - 0.5) * 0.3,
      power_kw: 1.6 + Math.random() * 0.4,
      energy_kwh: 1200 + Math.random() * 300,
      temperature: 28 + Math.random() * 4,
      humidity: 52 + Math.random() * 10,
      pressure: 4.5 + Math.random() * 2,
      water_level: 75 + Math.random() * 10,
      valve_status: 'CLOSED',
      smoke_status: 'NORMAL',
      flame_status: 'NORMAL',
    };
  });
}

function createMockNodeSummaries(date) {
  return [1, 2, 3, 4].map(nodeId => ({
    node_id: nodeId,
    total_records: 240,
    first_timestamp: `${date}T00:00:00`,
    last_timestamp: `${date}T23:59:59`,
    voltage: nodeId === 1 ? 220 + Math.random() * 5 : null,
    current_amp: nodeId === 1 ? 145 + Math.random() * 15 : null,
    frequency: nodeId === 1 ? 50 + (Math.random() - 0.5) * 0.3 : null,
    power_kw: nodeId === 1 ? 1.6 + Math.random() * 0.4 : null,
    energy_kwh: nodeId === 1 ? 1200 + Math.random() * 300 : null,
    temperature: nodeId === 2 || nodeId === 3 ? 28 + Math.random() * 4 : null,
    humidity: nodeId === 2 || nodeId === 3 ? 52 + Math.random() * 10 : null,
    pressure: nodeId === 4 ? 4.5 + Math.random() * 2 : null,
    water_level: nodeId === 1 ? 75 + Math.random() * 10 : null,
    valve_status: nodeId === 4 ? 'CLOSED' : null,
    smoke_status: 'NORMAL',
    flame_status: 'NORMAL',
  }));
}

function createMockDetail(date, nodeId, page) {
  const startIndex = (page - 1) * LIMIT;
  return Array.from({ length: LIMIT }, (_, i) => {
    const secondsFromEnd = (startIndex + i) * 3;
    const timestamp = new Date(`${date}T23:59:59`);
    timestamp.setSeconds(timestamp.getSeconds() - secondsFromEnd);
    return {
      id: i + 1 + startIndex,
      timestamp: timestamp.toISOString(),
      node_id: nodeId,
      voltage: nodeId === 1 ? (218 + Math.random() * 6) : null,
      current_amp: nodeId === 1 ? (140 + Math.random() * 20) : null,
      frequency: nodeId === 1 ? (50 + (Math.random() - 0.5) * 0.4) : null,
      power_kw: nodeId === 1 ? (1.5 + Math.random() * 0.5) : null,
      energy_kwh: nodeId === 1 ? (1200 + (startIndex + i) * 0.01 + Math.random() * 0.005) : null,
      temperature: nodeId === 2 || nodeId === 3 ? (27 + Math.random() * 5) : null,
      humidity: nodeId === 2 || nodeId === 3 ? (50 + Math.random() * 15) : null,
      pressure: nodeId === 4 ? (4 + Math.random() * 3) : null,
      valve_status: nodeId === 4 ? 'CLOSED' : null,
      smoke_status: 'NORMAL',
      flame_status: 'NORMAL',
      water_level: nodeId === 1 ? (75 + Math.random() * 10) : null,
    };
  });
}

export default function History() {
  const [view, setView] = useState('dates');
  const [dates, setDates] = useState([]);
  const [nodeRows, setNodeRows] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ node_id: '', from: '', to: '' });
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedNode, setSelectedNode] = useState('');

  const updateFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setView('dates');
    setSelectedDate('');
    setSelectedNode('');
    setPage(1);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'dates') {
        const { data } = await getHistoryDates({ ...filters, limit: LIMIT, page });
        setDates(data.data);
        setTotal(data.total);
      } else if (view === 'nodes') {
        const { data } = await getHistoryDateNodes(selectedDate, { node_id: filters.node_id });
        setNodeRows(data.data);
        setTotal(data.data.length);
      } else {
        const { data } = await getHistory({
          node_id: selectedNode,
          from: dateStart(selectedDate),
          to: dateEnd(selectedDate),
          limit: LIMIT,
          page,
        });
        setRows(data.data);
        setTotal(data.total);
      }
    } catch {
      if (view === 'dates') {
        const mock = createMockDates();
        setDates(mock);
        setTotal(mock.length);
      } else if (view === 'nodes') {
        const mock = createMockNodeSummaries(selectedDate);
        setNodeRows(filters.node_id ? mock.filter(r => String(r.node_id) === filters.node_id) : mock);
        setTotal(mock.length);
      } else {
        setRows(createMockDetail(selectedDate, Number(selectedNode), page));
        setTotal(240);
      }
    }
    setLoading(false);
  }, [filters, page, selectedDate, selectedNode, view]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const openDate = (date) => {
    setSelectedDate(normalizeDateKey(date));
    setSelectedNode('');
    setView('nodes');
    setPage(1);
  };

  const openNode = (nodeId) => {
    setSelectedNode(String(nodeId));
    setView('detail');
    setPage(1);
  };

  const backToDates = () => {
    setView('dates');
    setSelectedDate('');
    setSelectedNode('');
    setPage(1);
  };

  const backToNodes = () => {
    setView('nodes');
    setSelectedNode('');
    setPage(1);
  };

  const dateColumns = [
    { label: 'Tanggal', render: r => formatDateLabel(r.date) },
    { label: 'Record', render: r => r.total_records },
    { label: 'Tegangan (V)', render: r => val(r.voltage) },
    { label: 'Daya (kW)', render: r => val(r.power_kw, 2) },
    {
      label: 'Energy (kWh)',
      render: r => r.energy_kwh != null
        ? <span style={{ color: '#f97316', fontWeight: 700 }}>{Number(r.energy_kwh).toFixed(2)}</span>
        : <span style={{ color: '#475569' }}>-</span>
    },
    { label: 'Sensor Suhu (C)', render: r => val(r.temperature) },
    { label: 'Kelembaban (%)', render: r => val(r.humidity) },
    { label: 'Sensor Karbon (PPM)', render: r => val(r.co2_ppm, 2) },
    { label: 'Sensor Gas (Bar)', render: r => val(r.pressure, 2) },
    { label: 'Thermal (C)', render: r => val(r.thermal_temp) },
    { label: 'UV', render: r => val(r.uv_value, 0) },
    { label: 'Tekanan Air (Bar)', render: r => val(r.water_pressure, 2) },
    { label: 'Level Air (%)', render: r => val(r.water_level) },
  ];

  const nodeColumns = [
    { label: 'Node', render: r => <span className="history-node-badge">Node {r.node_id}</span> },
    { label: 'Record', render: r => r.total_records },
    { label: 'Tegangan (V)', render: r => val(r.voltage) },
    { label: 'Daya (kW)', render: r => val(r.power_kw, 2) },
    {
      label: 'Energy (kWh)',
      render: r => r.energy_kwh != null
        ? <span style={{ color: '#f97316', fontWeight: 700 }}>{Number(r.energy_kwh).toFixed(2)}</span>
        : <span style={{ color: '#475569' }}>-</span>
    },
    { label: 'Sensor Suhu (C)', render: r => val(r.temperature) },
    { label: 'Kelembaban (%)', render: r => val(r.humidity) },
    { label: 'Sensor Karbon (PPM)', render: r => val(r.co2_ppm, 2) },
    { label: 'Sensor Gas (Bar)', render: r => val(r.pressure, 2) },
    { label: 'Thermal (C)', render: r => val(r.thermal_temp) },
    { label: 'UV', render: r => val(r.uv_value, 0) },
    { label: 'Tekanan Air (Bar)', render: r => val(r.water_pressure, 2) },
    { label: 'Level Air (%)', render: r => val(r.water_level) },
    { label: 'Asap', render: r => <StatusBadge v={r.smoke_status} /> },
    { label: 'Api', render: r => <StatusBadge v={r.flame_status} /> },
  ];

  const getDetailColumns = (nodeId) => {
    const base = [
      { label: 'Waktu', render: r => r.timestamp ? format(new Date(r.timestamp), 'HH:mm:ss') : '-' },
      { label: 'Node', render: r => <span className="history-node-badge">N-{r.node_id}</span> },
    ];
    if (nodeId === '1') {
      return base.concat([
        { label: 'Tegangan (V)', render: r => val(r.voltage) },
        { label: 'Arus (A)', render: r => val(r.current_amp) },
        { label: 'Daya (kW)', render: r => val(r.power_kw, 2) },
        { label: 'Energy (kWh)', render: r => r.energy_kwh != null ? <span style={{ color: '#f97316', fontWeight: 700 }}>{Number(r.energy_kwh).toFixed(2)}</span> : <span style={{ color: '#475569' }}>-</span> },
        { label: 'Suhu (C)', render: r => val(r.temperature) },
        { label: 'Kelembaban (%)', render: r => val(r.humidity) },
        { label: 'Thermal (C)', render: r => val(r.thermal_temp) },
        { label: 'CO2 (PPM)', render: r => val(r.co2_ppm, 3) },
        { label: 'UV', render: r => val(r.uv_value, 0) },
      ]);
    } else if (nodeId === '2') {
      return base.concat([
        { label: 'Pressure Gas (Bar)', render: r => val(r.pressure, 2) },
        { label: 'Valve Gas', render: r => <StatusBadge v={r.valve_status} /> },
      ]);
    } else if (nodeId === '3') {
      return base.concat([
        { label: 'Pressure Air (Bar)', render: r => val(r.water_pressure, 2) },
        { label: 'Valve Hydrant', render: r => <StatusBadge v={r.valve_status} /> },
      ]);
    } else {
      return base.concat([
        { label: 'Tegangan (V)', render: r => val(r.voltage) },
        { label: 'Daya (kW)', render: r => val(r.power_kw, 2) },
        { label: 'Suhu (C)', render: r => val(r.temperature) },
        { label: 'Pressure Gas', render: r => val(r.pressure, 2) },
        { label: 'Pressure Air', render: r => val(r.water_pressure, 2) },
        { label: 'Level Air (%)', render: r => val(r.water_level) },
        { label: 'Asap', render: r => <StatusBadge v={r.smoke_status} /> },
        { label: 'Api', render: r => <StatusBadge v={r.flame_status} /> },
      ]);
    }
  };

  const currentColumns = view === 'dates' ? dateColumns : view === 'nodes' ? nodeColumns : getDetailColumns(selectedNode);
  const currentRows = view === 'dates' ? dates : view === 'nodes' ? nodeRows : rows;
  const totalPages = Math.ceil(total / LIMIT);

  const summaryExportColumns = [
    { header: 'Tanggal', dataKey: 'date', accessor: r => formatDateLabel(r.date) },
    { header: 'Record', dataKey: 'total_records', accessor: r => r.total_records ?? '' },
    { header: 'Tegangan (V)', dataKey: 'voltage', accessor: r => r.voltage != null ? Number(r.voltage).toFixed(1) : '' },
    { header: 'Daya (kW)', dataKey: 'power_kw', accessor: r => r.power_kw != null ? Number(r.power_kw).toFixed(2) : '' },
    { header: 'Energy (kWh)', dataKey: 'energy_kwh', accessor: r => r.energy_kwh != null ? Number(r.energy_kwh).toFixed(2) : '' },
    { header: 'Sensor Suhu (C)', dataKey: 'temperature', accessor: r => r.temperature != null ? Number(r.temperature).toFixed(1) : '' },
    { header: 'Kelembaban (%)', dataKey: 'humidity', accessor: r => r.humidity != null ? Number(r.humidity).toFixed(1) : '' },
    { header: 'Sensor Karbon (PPM)', dataKey: 'co2_ppm', accessor: r => r.co2_ppm != null ? Number(r.co2_ppm).toFixed(2) : '' },
    { header: 'Sensor Gas (Bar)', dataKey: 'pressure', accessor: r => r.pressure != null ? Number(r.pressure).toFixed(2) : '' },
    { header: 'Thermal (C)', dataKey: 'thermal_temp', accessor: r => r.thermal_temp != null ? Number(r.thermal_temp).toFixed(1) : '' },
    { header: 'UV', dataKey: 'uv_value', accessor: r => r.uv_value != null ? Number(r.uv_value).toFixed(0) : '' },
    { header: 'Tekanan Air (Bar)', dataKey: 'water_pressure', accessor: r => r.water_pressure != null ? Number(r.water_pressure).toFixed(2) : '' },
    { header: 'Level Air (%)', dataKey: 'water_level', accessor: r => r.water_level != null ? Number(r.water_level).toFixed(1) : '' },
  ];

  const nodeExportColumns = [
    { header: 'Node', dataKey: 'node_id', accessor: r => `Node ${r.node_id}` },
    ...summaryExportColumns.slice(1),
    { header: 'Asap', dataKey: 'smoke_status', accessor: r => r.smoke_status || '' },
    { header: 'Api', dataKey: 'flame_status', accessor: r => r.flame_status || '' },
  ];

  const handleExport = async (type) => {
    try {
      if (view === 'detail') {
        const { data } = await getExport({
          node_id: selectedNode,
          from: dateStart(selectedDate),
          to: dateEnd(selectedDate),
        });
        type === 'pdf' ? exportToPDF(data.data, { from: selectedDate, to: selectedDate }) : exportToCSV(data.data);
        return;
      }

      const exportRows = view === 'dates'
        ? (await getHistoryDates({ ...filters, limit: 5000, page: 1 })).data.data
        : nodeRows;
      const columns = view === 'dates' ? summaryExportColumns : nodeExportColumns;
      const title = view === 'dates' ? 'Laporan Rata-rata Harian Sensor' : `Laporan Node Harian ${formatDateLabel(selectedDate)}`;
      const filename = view === 'dates' ? 'smart_fire_rata_rata_harian' : `smart_fire_node_${selectedDate}`;

      type === 'pdf'
        ? exportToPDF(exportRows, filters, { columns, title, filename, fontSize: 6 })
        : exportToCSV(exportRows, { columns, filename });
    } catch {
      if (view === 'detail') {
        type === 'pdf' ? exportToPDF(currentRows, filters) : exportToCSV(currentRows);
        return;
      }

      const columns = view === 'dates' ? summaryExportColumns : nodeExportColumns;
      const title = view === 'dates' ? 'Laporan Rata-rata Harian Sensor' : `Laporan Node Harian ${formatDateLabel(selectedDate)}`;
      const filename = view === 'dates' ? 'smart_fire_rata_rata_harian' : `smart_fire_node_${selectedDate}`;

      type === 'pdf'
        ? exportToPDF(currentRows, filters, { columns, title, filename, fontSize: 6 })
        : exportToCSV(currentRows, { columns, filename });
    }
  };

  return (
    <div className="page-gradient history-page" style={{ minHeight: '100vh' }}>
      <Header title="Riwayat Data Sensor" />

      <motion.div
        className="history-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <motion.div
          className="card history-toolbar"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <select
            value={filters.node_id}
            onChange={e => updateFilter('node_id', e.target.value)}
            style={{ background: '#080f1e', border: '1px solid #1a3558', color: '#cbd5e1', padding: '7px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
          >
            <option value="">Semua Node</option>
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>Node {n} - {NODE_LABELS[n]}</option>)}
          </select>

          {['from', 'to'].map(k => (
            <input
              key={k}
              type="datetime-local"
              value={filters[k]}
              onChange={e => updateFilter(k, e.target.value)}
              style={{ background: '#080f1e', border: '1px solid #1a3558', color: '#cbd5e1', padding: '7px 12px', borderRadius: 8, fontSize: 13 }}
            />
          ))}

          <button onClick={fetchData} className="btn btn-outline" style={{ gap: 6 }} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <div className="history-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={() => handleExport('csv')} className="btn btn-outline">
              <Download size={13} /> CSV
            </button>
            <button onClick={() => handleExport('pdf')} className="btn btn-primary">
              <FileText size={13} /> PDF
            </button>
          </div>
        </motion.div>

        <div className="history-breadcrumb" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          {view !== 'dates' && (
            <button className="btn btn-outline" onClick={view === 'nodes' ? backToDates : backToNodes} style={{ padding: '6px 10px' }}>
              <ArrowLeft size={14} />
            </button>
          )}
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {view === 'dates' && <>Daftar tanggal rata-rata harian</>}
            {view === 'nodes' && <>Tanggal <strong style={{ color: '#e2e8f0' }}>{formatDateLabel(selectedDate)}</strong> - pilih node untuk melihat data tiap 3 detik</>}
            {view === 'detail' && <>Tanggal <strong style={{ color: '#e2e8f0' }}>{formatDateLabel(selectedDate)}</strong> / <strong style={{ color: '#e2e8f0' }}>Node {selectedNode} - {NODE_LABELS[selectedNode]}</strong></>}
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Menampilkan <strong style={{ color: '#e2e8f0' }}>{currentRows.length}</strong> dari <strong style={{ color: '#e2e8f0' }}>{total}</strong> data
          </span>
          {loading && <RefreshCw size={12} color="#64748b" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />}
        </div>

        <motion.div
          className="card history-table-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{ padding: 0, overflow: 'hidden' }}>
          <div className="history-table-scroll" style={{ overflowX: 'auto' }}>
            <table className="data-table history-table">
              <colgroup>
                {currentColumns.map(c => <col key={c.label} style={{ width: c.w }} />)}
              </colgroup>
              <thead>
                <tr>
                  {currentColumns.map(c => <th key={c.label}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {currentRows.length === 0 && <EmptyRows colSpan={currentColumns.length} loading={loading} />}
                {currentRows.map((r, i) => (
                  <tr
                    key={r.id ?? `${r.date ?? r.node_id}-${i}`}
                    className={view !== 'detail' ? 'history-clickable-row' : ''}
                    onClick={() => view === 'dates' ? openDate(r.date) : view === 'nodes' ? openNode(r.node_id) : undefined}
                  >
                    {currentColumns.map(c => <td key={c.label}>{c.render(r)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {totalPages > 1 && view !== 'nodes' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Halaman {page} / {totalPages}</span>
            <button className="btn btn-outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
