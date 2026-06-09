import EnergyChart from './EnergyChart';
import UltrasonicSensorCard from './UltrasonicSensorCard';

/** Satu kartu gabung: grafik realtime + strip tangki hydrant. */
export default function MonitoringRealtimePanel({
  energyHistory,
  waterDistance,
  maxTankCm = 200,
  chartTitle = 'Monitoring Realtime 3-Phase',
}) {
  const hasChart = energyHistory?.length > 0;

  return (
    <div
      className="card"
      style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        className={hasChart ? "monitoring-realtime-grid" : ""}
        style={{
          gap: hasChart ? 16 : 0,
          alignItems: 'stretch',
        }}
      >
        {hasChart && (
          <EnergyChart
            embedded
            data={energyHistory}
            title={chartTitle}
            initialMetric="watt"
            chartHeight={250}
          />
        )}

        <UltrasonicSensorCard
          variant="minimal"
          embedded
          hideLogo={true}
          distanceCm={waterDistance !== null ? waterDistance : maxTankCm * 0.313}
          maxDistanceCm={maxTankCm}
          title="Tangki Hydrant"
        />
      </div>
    </div>
  );
}
