import Papa from 'papaparse';

/** Export sensor history data as CSV */
export function exportToCSV(data, options = {}) {
  const rows = options.columns
    ? data.map(r => Object.fromEntries(options.columns.map(c => [
        c.header,
        c.accessor ? c.accessor(r) : (r[c.dataKey] ?? ''),
      ])))
    : data.map(r => ({
        'Timestamp': r.timestamp ? new Date(r.timestamp).toLocaleString('id-ID') : '',
        'Node ID': r.node_id,
        'Tegangan (V)': r.voltage ?? '',
        'Arus (A)': r.current_amp ?? '',
        'Frekuensi (Hz)': r.frequency ?? '',
        'Daya (kW)': r.power_kw ?? '',
        'Suhu (C)': r.temperature ?? '',
        'Kelembaban (%RH)': r.humidity ?? '',
        'Tekanan Hydrant (Bar)': r.pressure ?? '',
        'Status Katup': r.valve_status ?? '',
        'Detektor Asap': r.smoke_status ?? '',
        'Detektor Api': r.flame_status ?? '',
        'Detektor Panas': r.heat_status ?? '',
        'Detektor Thermal': r.thermal_status ?? '',
        'Level Air (%)': r.water_level ?? '',
      }));

  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${options.filename || 'smart_fire_data'}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
