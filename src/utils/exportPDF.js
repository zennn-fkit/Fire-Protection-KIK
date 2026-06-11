import jsPDF from 'jspdf';
import 'jspdf-autotable';

function dash(v) {
  return v == null || v === '' ? '-' : v;
}

function fixed(v, dec) {
  return v != null ? Number(v).toFixed(dec) : '-';
}

/** Export sensor history data as PDF */
export function exportToPDF(data, filters = {}, options = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFillColor(5, 12, 24);
  doc.rect(0, 0, 297, 297, 'F');

  doc.setTextColor(249, 115, 22);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SMART FIRE PROTECTION SYSTEM', 14, 16);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(options.title || 'Laporan Data Sensor', 14, 23);
  doc.text(`Diekspor: ${new Date().toLocaleString('id-ID')}`, 14, 29);

  if (filters.from || filters.to) {
    doc.text(`Periode: ${filters.from || '-'} s/d ${filters.to || '-'}`, 14, 35);
  }

  const columns = options.columns || [
    { header: 'Timestamp', dataKey: 'timestamp' },
    { header: 'Node', dataKey: 'node_id' },
    { header: 'Tegangan (V)', dataKey: 'voltage' },
    { header: 'Arus (A)', dataKey: 'current_amp' },
    { header: 'Frekuensi (Hz)', dataKey: 'frequency' },
    { header: 'Daya (kW)', dataKey: 'power_kw' },
    { header: 'Suhu (C)', dataKey: 'temperature' },
    { header: 'Kelembaban (%)', dataKey: 'humidity' },
    { header: 'Tekanan (Bar)', dataKey: 'pressure' },
    { header: 'Status Katup', dataKey: 'valve_status' },
    { header: 'Asap', dataKey: 'smoke_status' },
    { header: 'Api', dataKey: 'flame_status' },
    { header: 'Level Air (%)', dataKey: 'water_level' },
  ];

  const rows = options.columns
    ? data.map(r => Object.fromEntries(columns.map(c => [
        c.dataKey,
        c.accessor ? c.accessor(r) : dash(r[c.dataKey]),
      ])))
    : data.map(r => ({
        timestamp: r.timestamp ? new Date(r.timestamp).toLocaleString('id-ID') : '-',
        node_id: `Node ${r.node_id}`,
        voltage: fixed(r.voltage, 1),
        current_amp: fixed(r.current_amp, 1),
        frequency: fixed(r.frequency, 2),
        power_kw: fixed(r.power_kw, 2),
        temperature: fixed(r.temperature, 1),
        humidity: fixed(r.humidity, 1),
        pressure: fixed(r.pressure, 2),
        valve_status: dash(r.valve_status),
        smoke_status: dash(r.smoke_status),
        flame_status: dash(r.flame_status),
        water_level: fixed(r.water_level, 1),
      }));

  doc.autoTable({
    startY: 42,
    columns,
    body: rows,
    styles: {
      fontSize: options.fontSize || 7,
      cellPadding: 2,
      fillColor: [8, 15, 30],
      textColor: [203, 213, 225],
      lineColor: [26, 53, 88],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [13, 31, 56],
      textColor: [249, 115, 22],
      fontStyle: 'bold',
      fontSize: options.fontSize || 7,
    },
    alternateRowStyles: { fillColor: [10, 22, 40] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${options.filename || 'smart_fire_data'}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
