import { useState, useId } from 'react';
import type { TodaySales } from '../../models/responses/dashboard.response';
import { formatMoney } from '../../lib/money';
import { computeDonutSlices, type PieSliceData } from './donut-geometry';

export interface InteractiveSalesChartProps {
  todaySales: TodaySales;
  dateLabel?: string;
  className?: string;
}

export type ChartMetric = 'revenue' | 'count';

export function InteractiveSalesChart({
  todaySales,
  dateLabel = "Today's sales",
  className = '',
}: InteractiveSalesChartProps) {
  const [metric, setMetric] = useState<ChartMetric>('revenue');
  const [selectedSliceId, setSelectedSliceId] = useState<string>('all');
  const [hoveredSliceId, setHoveredSliceId] = useState<string | null>(null);

  const selectId = useId();

  // Prepare slice data based on selected metric
  const slicesData: PieSliceData[] = [
    {
      id: 'paid',
      label: 'Paid sales',
      value: metric === 'revenue' ? todaySales.paidKobo : todaySales.paidCount,
      color: '#3b82f6', // Vibrant blue as seen in reference
      formattedValue:
        metric === 'revenue'
          ? formatMoney(todaySales.paidKobo)
          : `${todaySales.paidCount} ${todaySales.paidCount === 1 ? 'sale' : 'sales'}`,
      sublabel: 'Paid via cash / instant',
    },
    {
      id: 'credit',
      label: 'Credit sales',
      value: metric === 'revenue' ? todaySales.creditKobo : todaySales.creditCount,
      color: '#1d4ed8', // Deeper blue as seen in reference
      formattedValue:
        metric === 'revenue'
          ? formatMoney(todaySales.creditKobo)
          : `${todaySales.creditCount} ${todaySales.creditCount === 1 ? 'sale' : 'sales'}`,
      sublabel: 'Paid on customer account',
    },
  ];

  const totalValue =
    metric === 'revenue' ? todaySales.totalKobo : todaySales.count;
  const formattedTotal =
    metric === 'revenue'
      ? formatMoney(todaySales.totalKobo)
      : `${todaySales.count} ${todaySales.count === 1 ? 'sale' : 'sales'}`;

  // Compute geometry
  const computedSlices = computeDonutSlices(slicesData, {
    cx: 150,
    cy: 150,
    innerRadius: 62,
    outerRadius: 92,
    activeOuterRadius: 102,
    ringRadius: 110,
  });

  // Active slice determination: hover takes precedence for instant feedback, then selection
  const activeId = hoveredSliceId ?? (selectedSliceId !== 'all' ? selectedSliceId : null);
  const activeSlice = computedSlices.find((s) => s.id === activeId);

  // Center display values
  const centerValue = activeSlice ? activeSlice.formattedValue : formattedTotal;
  const centerLabel = activeSlice
    ? activeSlice.label
    : metric === 'revenue'
      ? 'Total Revenue'
      : 'Total Sales';

  const hasData = totalValue > 0;

  return (
    <article
      className={`interactive-chart-card ${className}`}
      aria-label="Interactive sales breakdown chart"
    >
      <header className="chart-header">
        <div className="chart-title-group">
          <h2 className="chart-title">Pie Chart - Interactive</h2>
          <p className="micro chart-subtitle">{dateLabel}</p>
        </div>

        <div className="chart-controls">
          <div className="chart-metric-toggle" role="group" aria-label="Metric toggle">
            <button
              type="button"
              className={`metric-btn ${metric === 'revenue' ? 'active' : ''}`}
              onClick={() => setMetric('revenue')}
              aria-pressed={metric === 'revenue'}
            >
              Revenue (₦)
            </button>
            <button
              type="button"
              className={`metric-btn ${metric === 'count' ? 'active' : ''}`}
              onClick={() => setMetric('count')}
              aria-pressed={metric === 'count'}
            >
              Volume (Count)
            </button>
          </div>

          <div className="chart-select-wrapper">
            <label htmlFor={selectId} className="sr-only">
              Filter sales segment
            </label>
            <div className="custom-select-indicator">
              <span
                className="color-swatch"
                style={{
                  backgroundColor:
                    selectedSliceId === 'paid'
                      ? '#3b82f6'
                      : selectedSliceId === 'credit'
                        ? '#1d4ed8'
                        : '#60a5fa',
                }}
                aria-hidden="true"
              />
              <select
                id={selectId}
                className="chart-segment-select"
                value={selectedSliceId}
                onChange={(e) => {
                  setSelectedSliceId(e.target.value);
                  setHoveredSliceId(null);
                }}
              >
                <option value="all">All Sales</option>
                <option value="paid">Paid Sales</option>
                <option value="credit">Credit Sales</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="chart-body">
        <div className="chart-svg-container">
          <svg
            className="donut-svg"
            viewBox="0 0 300 300"
            aria-hidden="true"
          >
            <defs>
              <filter id="active-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {hasData ? (
              <g className="donut-slices-group">
                {computedSlices.map((slice) => {
                  const isCurrentActive = slice.id === activeId;
                  return (
                    <g
                      key={slice.id}
                      className={`slice-group ${isCurrentActive ? 'active' : ''}`}
                      onMouseEnter={() => setHoveredSliceId(slice.id)}
                      onMouseLeave={() => setHoveredSliceId(null)}
                      onClick={() => {
                        setSelectedSliceId((prev) =>
                          prev === slice.id ? 'all' : slice.id
                        );
                      }}
                    >
                      {/* Outer floating highlight arc (exact reference design) */}
                      {isCurrentActive && (
                        <path
                          d={slice.highlightArcPath}
                          fill="none"
                          stroke={slice.color}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          className="slice-highlight-arc"
                          opacity="0.85"
                        />
                      )}

                      {/* Main slice body */}
                      <path
                        d={isCurrentActive ? slice.activePath : slice.path}
                        fill={slice.color}
                        stroke="var(--color-surface)"
                        strokeWidth="2.5"
                        className="donut-slice-path"
                        style={{
                          transition:
                            'd 0.2s cubic-bezier(0.23, 1, 0.32, 1), filter 0.2s ease',
                          cursor: 'pointer',
                        }}
                      />
                    </g>
                  );
                })}
              </g>
            ) : (
              /* Muted empty ring when no sales yet */
              <g className="empty-donut-group">
                <circle
                  cx="150"
                  cy="150"
                  r="77"
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="30"
                  strokeDasharray="4 4"
                />
              </g>
            )}

            {/* Donut Center Label & Value */}
            <g className="donut-center-group" aria-hidden="true">
              <text
                x="150"
                y="142"
                textAnchor="middle"
                className="donut-center-value"
              >
                {centerValue}
              </text>
              <text
                x="150"
                y="166"
                textAnchor="middle"
                className="donut-center-label"
              >
                {centerLabel}
              </text>
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="chart-legend" role="list" aria-label="Sales breakdown legend">
          {slicesData.map((item) => {
            const isHighlighted = item.id === activeId;
            return (
              <button
                type="button"
                key={item.id}
                role="listitem"
                className={`legend-item ${isHighlighted ? 'highlighted' : ''}`}
                onClick={() =>
                  setSelectedSliceId((prev) => (prev === item.id ? 'all' : item.id))
                }
                aria-label={`${item.label}: ${item.formattedValue}`}
              >
                <span
                  className="legend-color-dot"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span className="legend-name">{item.label}</span>
                <strong className="legend-amount">{item.formattedValue}</strong>
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}
