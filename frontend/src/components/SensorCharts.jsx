import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

const TOOLTIP_STYLE = {
  background: '#0a1520',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  fontSize: '0.72rem',
  fontFamily: "'JetBrains Mono', monospace",
  color: '#c0cdd8',
}

export default function SensorCharts({ history, shipment }) {
  if (!history.length) return null

  const chartHistory = history.length > 1
    ? history
    : [{ ...history[0], ts: history[0].ts - 1000 }, history[0]]

  const tempOutOfRange = chartHistory.some(
    (h) => h.temperature < shipment.tempMin || h.temperature > shipment.tempMax
  )
  const humidityOutOfRange = chartHistory.some(
    (h) => h.humidity < shipment.humidityMin || h.humidity > shipment.humidityMax
  )

  // Y-axis domain with padding
  const temps = chartHistory.map((h) => h.temperature)
  const hums = chartHistory.map((h) => h.humidity)
  const tempDomain = [
    Math.min(...temps, shipment.tempMin) - 1,
    Math.max(...temps, shipment.tempMax) + 1,
  ]
  const humDomain = [
    Math.min(...hums, shipment.humidityMin) - 3,
    Math.max(...hums, shipment.humidityMax) + 3,
  ]

  return (
    <div className="panel panel--charts">
      <div className="panel-header">
        <span className="panel-title mono">SENSOR TRENDS</span>
        <span className="mono meta-label">LAST {history.length} READINGS</span>
      </div>

      <div className="charts-grid">
        {/* Temperature chart */}
        <div className="chart-block">
          <div className="chart-label mono">
            TEMPERATURE
            <span className={`chart-status-dot ${tempOutOfRange ? 'red' : 'teal'}`} />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartHistory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="ts"
                tickFormatter={fmtTime}
                tick={{ fontSize: 9, fill: '#5a7080', fontFamily: 'JetBrains Mono' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={tempDomain}
                tick={{ fontSize: 9, fill: '#5a7080', fontFamily: 'JetBrains Mono' }}
                tickFormatter={(v) => `${v}°`}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={fmtTime}
                formatter={(v) => [`${v.toFixed(1)}°C`, 'Temp']}
              />
              {/* Safe zone highlight */}
              <ReferenceArea
                y1={shipment.tempMin}
                y2={shipment.tempMax}
                fill="rgba(0,200,180,0.06)"
                stroke="none"
              />
              <ReferenceLine y={shipment.tempMin} stroke="rgba(0,200,180,0.3)" strokeDasharray="4 3" />
              <ReferenceLine y={shipment.tempMax} stroke="rgba(0,200,180,0.3)" strokeDasharray="4 3" />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke={tempOutOfRange ? 'var(--red)' : 'var(--teal)'}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="chart-range-label mono">
            Safe: {shipment.tempMin}°C – {shipment.tempMax}°C
          </div>
        </div>

        {/* Humidity chart */}
        <div className="chart-block">
          <div className="chart-label mono">
            HUMIDITY
            <span className={`chart-status-dot ${humidityOutOfRange ? 'red' : 'teal'}`} />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartHistory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="ts"
                tickFormatter={fmtTime}
                tick={{ fontSize: 9, fill: '#5a7080', fontFamily: 'JetBrains Mono' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={humDomain}
                tick={{ fontSize: 9, fill: '#5a7080', fontFamily: 'JetBrains Mono' }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={fmtTime}
                formatter={(v) => [`${v}%`, 'Humidity']}
              />
              <ReferenceArea
                y1={shipment.humidityMin}
                y2={shipment.humidityMax}
                fill="rgba(0,200,180,0.06)"
                stroke="none"
              />
              <ReferenceLine y={shipment.humidityMin} stroke="rgba(0,200,180,0.3)" strokeDasharray="4 3" />
              <ReferenceLine y={shipment.humidityMax} stroke="rgba(0,200,180,0.3)" strokeDasharray="4 3" />
              <Line
                type="monotone"
                dataKey="humidity"
                stroke={humidityOutOfRange ? 'var(--amber)' : '#7dd3fc'}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="chart-range-label mono">
            Safe: {shipment.humidityMin}% – {shipment.humidityMax}%
          </div>
        </div>
      </div>
    </div>
  )
}
