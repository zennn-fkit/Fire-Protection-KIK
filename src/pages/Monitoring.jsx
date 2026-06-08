import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BatteryCharging,
  Building2,
  Cpu,
  Droplets,
  Settings,
  ShieldCheck,
  Sun,
  Thermometer,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { useSensor } from '../context/SensorContext';
import Header from '../components/layout/Header';
import GaugeCard from '../components/dashboard/GaugeCard';
import HydrantPanel from '../components/dashboard/HydrantPanel';
import GasPanel from '../components/dashboard/GasPanel';
import hydrantSvg from '../assets/hydrant.svg';
import ThermalGradientCard from '../components/dashboard/ThermalGradientCard';

import WaterTankPanel from '../components/dashboard/WaterTankPanel';
import { ZONE_DEFAULT, ZONE_VOLTAGE } from '../utils/gaugeZones';

const tabVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.14, ease: 'easeOut' } },
};

const READY = {
  ready: {
    label: 'READY',
    text: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.32)',
  },
  pending: {
    label: 'BELUM READY',
    text: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.32)',
  },
  blocked: {
    label: 'BUTUH SENSOR CT',
    text: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.32)',
  },
};

const detectorPalette = {
  NORMAL: { label: 'Aktif - Aman', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  WARNING: { label: 'Aktif - Waspada', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  DANGER: { label: 'Aktif - Bahaya', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

function formatNumber(value, digits = 1, fallback = '-') {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : fallback;
}

function ReadinessBadge({ state = 'ready' }) {
  const tone = READY[state] || READY.ready;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 9px',
        borderRadius: 999,
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        color: tone.text,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: tone.text,
          boxShadow: `0 0 8px ${tone.text}`,
        }}
      />
      {tone.label}
    </span>
  );
}

function ProductTabs({ activeTab, onChange, dangerStates = {} }) {
  const tabs = [
    { key: 'distribution', label: 'Panel Distribusi', icon: Zap },
    { key: 'building', label: 'Bangunan', icon: Building2 },
    { key: 'hydrant', label: 'Hydrant', icon: hydrantSvg },
    { key: 'smargas', label: 'Smargas', icon: Wind },
  ];

  return (
    <div className="monitoring-tabs" role="tablist" aria-label="Product monitoring">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.key;
        const isDanger = dangerStates[tab.key];
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={`monitoring-tab ${active ? 'active' : ''}`}
            onClick={() => onChange(tab.key)}
          >
            {typeof Icon === 'string' ? (
              <img src={Icon} alt={tab.label} width={16} height={16} style={{ objectFit: 'contain' }} />
            ) : (
              <Icon size={16} />
            )}
            <span>{tab.label}</span>
            {isDanger && <span className="tab-danger-dot" title="DANGER DETECTED" />}
          </button>
        );
      })}
    </div>
  );
}

function SectionHeader({ eyebrow, title, children }) {
  return (
    <div className="monitoring-section-header">
      <div>
        <div className="monitoring-eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StatusCard({ icon: Icon, title, value, unit, status = 'ready', note, color = '#60a5fa' }) {
  return (
    <div className="card monitoring-status-card">
      <div className="monitoring-card-topline">
        <div className="monitoring-card-icon" style={{ color, borderColor: `${color}40`, background: `${color}14` }}>
          <Icon size={17} />
        </div>
        <ReadinessBadge state={status} />
      </div>
      <div>
        <div className="monitoring-card-title">{title}</div>
        <div className="monitoring-card-value" style={{ color }}>
          {value}
          {unit && <span>{unit}</span>}
        </div>
      </div>
      {note && <div className="monitoring-card-note">{note}</div>}
    </div>
  );
}

function DetectorCard({ icon: Icon, title, status }) {
  const tone = detectorPalette[status] || { label: 'Tidak ada data', color: '#64748b', bg: 'rgba(100,116,139,0.12)' };
  return (
    <div className="card monitoring-detector-card">
      <div className="monitoring-detector-icon" style={{ color: tone.color, background: tone.bg }}>
        <Icon size={22} />
      </div>
      <div>
        <div className="monitoring-card-title">{title}</div>
        <div className="monitoring-detector-state" style={{ color: tone.color }}>
          {tone.label}
        </div>
      </div>
      <ReadinessBadge state="ready" />
    </div>
  );
}

function ProductSummary({ items, children }) {
  const cols = items.length + (children ? 1 : 0);
  return (
    <div className="monitoring-summary" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map((item) => (
        <StatusCard key={item.title} {...item} />
      ))}
      {children}
    </div>
  );
}

function HydrantView({ node3, waterPressure, waterLevel, waterDistance }) {
  const valveStatus = node3?.water_valve_status || 'CLOSED';
  const pressure = waterPressure ?? node3?.water_pressure ?? 0;

  const summary = [
    {
      icon: Settings,
      title: 'Kondisi Valve',
      value: valveStatus === 'OPEN' ? 'Terbuka' : 'Tertutup',
      status: 'ready',
      note: 'Status katup hydrant dari node jaringan pipa.',
      color: valveStatus === 'OPEN' ? '#10b981' : '#ef4444',
    },
  ];

  return (
    <motion.div key="hydrant" variants={tabVariants} initial="initial" animate="animate" exit="exit">
      <SectionHeader eyebrow="Product Hydrant" title="Monitoring hydrant trial KIK">
        <ReadinessBadge state="ready" />
      </SectionHeader>

      <div className="monitoring-main-grid">
        <WaterTankPanel
          level={waterLevel}
          distanceCm={waterDistance}
          pressure={pressure}
          isReady={true}
        />
        <HydrantPanel
          pressure={node3?.water_pressure ?? pressure}
          valve_status={valveStatus}
          maxPressure={12}
        />

      </div>

      <ProductSummary items={summary} />

      <div className="card monitoring-muted-panel">
        <div>
          <div className="monitoring-card-title">Data tandon disimpan sebagai kandidat integrasi</div>
          <p>
            Nilai level {formatNumber(waterLevel, 1)}% dan jarak {formatNumber(waterDistance, 1)} cm tidak dijadikan indikator utama karena status notulensi masih belum ready.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function DistributionView({ panelData }) {
  const electricalGauges = [
    {
      label: 'Voltase AC (3 Fasa)',
      value: panelData?.voltage ?? 0,
      min: 180,
      max: 260,
      unit: 'Volt',
      threshKey: 'voltage',
      decimals: 1,
      zones: ZONE_VOLTAGE,
      icon: Zap,
    },
    {
      label: 'Arus',
      value: panelData?.current_amp ?? 0,
      min: 0,
      max: 180,
      unit: 'Ampere',
      threshKey: 'current_amp',
      decimals: 2,
      zones: ZONE_DEFAULT,
      icon: Activity,
    },
    {
      label: 'Watt',
      value: panelData?.power_watt ?? 0,
      min: 0,
      max: 3000,
      unit: 'Watt',
      threshKey: 'power_kw',
      decimals: 0,
      zones: ZONE_DEFAULT,
      icon: Cpu,
    },
    {
      label: 'Energy',
      value: panelData?.energy_kwh ?? 0,
      min: 0,
      max: 10000,
      unit: 'kWh',
      threshKey: 'energy_kwh',
      decimals: 2,
      zones: ZONE_DEFAULT,
      icon: BatteryCharging,
    },
  ];

  // Top row sensors (alongside thermal gradient card)
  const topRowSensors = [
    {
      icon: Sun,
      title: 'UV Deteksi Api',
      value: panelData?.uv_value ? 'Terdeteksi' : 'Aman',
      status: 'ready',
      note: 'Sensor UV siap sebagai indikator flame.',
      color: panelData?.uv_value ? '#ef4444' : '#10b981',
    },
    {
      icon: Thermometer,
      title: 'Suhu Ruang Panel',
      value: formatNumber(panelData?.temperature_sht, 1),
      unit: 'C',
      status: 'ready',
      note: 'SHT siap untuk suhu ruang panel.',
      color: '#60a5fa',
    },
  ];

  // Bottom row sensors
  const bottomRowSensors = [
    {
      icon: Droplets,
      title: 'Kelembaban',
      value: formatNumber(panelData?.humidity, 1),
      unit: '%',
      status: 'ready',
      note: 'Kelembaban ruang panel distribusi.',
      color: '#38bdf8',
    },
    {
      icon: Wind,
      title: 'Karbon',
      value: formatNumber(panelData?.co2_ppm, 3),
      unit: 'ppm',
      status: 'ready',
      note: 'Sensor karbon siap dipantau.',
      color: '#10b981',
    },
  ];

  return (
    <motion.div key="distribution" variants={tabVariants} initial="initial" animate="animate" exit="exit">
      <SectionHeader eyebrow="Product Panel Distribusi" title="Monitoring panel listrik dan deteksi api">
        <ReadinessBadge state="blocked" />
      </SectionHeader>

      <div className="monitoring-gauge-grid">
        {electricalGauges.map((gauge, index) => (
          <div key={gauge.label} className={index > 0 ? 'monitoring-meter-needs-ct' : ''}>
            <GaugeCard {...gauge} blockedMessage={index > 0 ? "KURANG SENSOR CT" : undefined} />
          </div>
        ))}
      </div>

      {/* Top row: Thermal Gradient (2x) + UV + Suhu */}
      <div className="monitoring-sensor-grid">
        <ThermalGradientCard
          temperature={panelData?.thermal_temp}
          status="ready"
        />
        {topRowSensors.map((item) => (
          <StatusCard key={item.title} {...item} />
        ))}
      </div>

      {/* Bottom row: Kelembaban + Karbon */}
      <div className="monitoring-sensor-grid-bottom">
        {bottomRowSensors.map((item) => (
          <StatusCard key={item.title} {...item} />
        ))}
      </div>
    </motion.div>
  );
}

function BuildingView({ detectors, node2 }) {
  const smokeStatus = node2?.smoke_status ?? detectors?.smoke ?? 'NORMAL';
  const heatStatus = detectors?.heat;

  return (
    <motion.div key="building" variants={tabVariants} initial="initial" animate="animate" exit="exit">
      <SectionHeader eyebrow="Product Bangunan" title="Status alat deteksi kebakaran">
        <ReadinessBadge state="ready" />
      </SectionHeader>

      <div className="monitoring-building-grid">
        <DetectorCard icon={Wind} title="Smoke Detector" status={smokeStatus} />
        <DetectorCard icon={Thermometer} title="Heat Detector" status={heatStatus} />
      </div>

      <div className="card monitoring-building-note">
        <div className="monitoring-note-icon">
          <ShieldCheck size={20} />
        </div>
        <div>
          <div className="monitoring-card-title">Logika alarm tetap terpisah dari status alat</div>
          <p>
            Smoke dan Heat pada tampilan ini dibaca sebagai kondisi alat aktif atau tidak. Evaluasi bahaya kebakaran tetap memakai kombinasi UV, thermal, suhu, dan karbon.
          </p>
        </div>
      </div>


    </motion.div>
  );
}

function SmargasView({ node2 }) {
  const gasPressure = node2?.gas_pressure ?? 0;
  const valveStatus = node2?.gas_valve_status ?? 'CLOSED';
  const isDanger = gasPressure > 8;

  return (
    <motion.div key="smargas" variants={tabVariants} initial="initial" animate="animate" exit="exit">
      <SectionHeader eyebrow="Product Smargas" title="Smart Gas Monitoring">
        <ReadinessBadge state="ready" />
      </SectionHeader>

      {/* GasPanel (2 span) + Sensor Gas card (1 span) */}
      <div className="smargas-bottom-grid">
        <GasPanel
          pressure={gasPressure}
          valve_status={valveStatus}
          maxPressure={10}
        />
        <StatusCard
          icon={Wind}
          title="Sensor Gas"
          value={formatNumber(gasPressure, 2)}
          unit="Bar"
          status="ready"
          note="Tekanan gas utama termonitor."
          color={isDanger ? '#ef4444' : '#10b981'}
        />
      </div>
    </motion.div>
  );
}

export default function Monitoring() {
  const { state } = useSensor();
  const { panelData, node2, node3, water_level, water_pressure, water_distance, detectors } = state;
  const [activeTab, setActiveTab] = useState('distribution');

  const dangerStates = useMemo(() => {
    return {
      distribution: panelData?.uv_value === 1 || panelData?.thermal_temp >= 60 || panelData?.temperature_sht >= 60,
      building: (node2?.smoke_status ?? detectors?.smoke) === 'DANGER' || detectors?.heat === 'DANGER',
      hydrant: false,
      smargas: (node2?.gas_pressure ?? 0) > 8,
    };
  }, [panelData, detectors, node2]);

  const activeView = useMemo(() => {
    if (activeTab === 'distribution') {
      return <DistributionView panelData={panelData} />;
    }
    if (activeTab === 'building') {
      return <BuildingView detectors={detectors} node2={node2} />;
    }
    if (activeTab === 'smargas') {
      return <SmargasView node2={node2} />;
    }
    return (
      <HydrantView
        node3={node3}
        waterPressure={water_pressure}
        waterLevel={water_level}
        waterDistance={water_distance}
      />
    );
  }, [activeTab, detectors, node2, node3, panelData, water_distance, water_level, water_pressure]);

  return (
    <div className="page-gradient" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header title="Monitoring Product Trial KIK" />

      <div className="monitoring-page">
        <ProductTabs activeTab={activeTab} onChange={setActiveTab} dangerStates={dangerStates} />
        <AnimatePresence mode="wait">{activeView}</AnimatePresence>
      </div>
    </div>
  );
}
