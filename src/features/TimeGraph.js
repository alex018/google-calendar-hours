import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import {
  selectMonthlyGraphData,
  selectYearlyGraphData,
  selectSelectedCalendar,
} from '../stores/viewState';
import { selectCalendarColor } from '../stores/calendars';

import styles from './TimeGraph.module.css';

const GRAPH_VIEW = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

const BAR_CHART_WIDTH = 560;
const BAR_CHART_HEIGHT = 200;
const PADDING = { top: 24, right: 16, bottom: 36, left: 44 };

const chartWidth = BAR_CHART_WIDTH - PADDING.left - PADDING.right;
const chartHeight = BAR_CHART_HEIGHT - PADDING.top - PADDING.bottom;

const Y_TICKS = 4;

const TimeGraph = () => {
  const [viewType, setViewType] = useState(GRAPH_VIEW.MONTHLY);

  const selectedCalendar = useSelector(selectSelectedCalendar);
  const color = useSelector((state) =>
    selectCalendarColor(state, selectedCalendar)
  );
  const monthlyData = useSelector(selectMonthlyGraphData);
  const yearlyData = useSelector(selectYearlyGraphData);

  const data = viewType === GRAPH_VIEW.MONTHLY ? monthlyData : yearlyData;

  if (!data) return null;

  const maxHours = Math.max(...data.map((d) => d.hours), 1);

  // Round up maxHours to a nice number for Y axis
  const yMax = Math.ceil(maxHours / Y_TICKS) * Y_TICKS || Y_TICKS;
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) =>
    Math.round((yMax / Y_TICKS) * i)
  );

  const barSlotWidth = chartWidth / data.length;
  const barWidth = barSlotWidth * 0.6;
  const barOffset = barSlotWidth * 0.2;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Time per calendar</span>
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${
              viewType === GRAPH_VIEW.MONTHLY ? styles.active : ''
            }`}
            onClick={() => setViewType(GRAPH_VIEW.MONTHLY)}
          >
            Monthly
          </button>
          <button
            className={`${styles.toggleBtn} ${
              viewType === GRAPH_VIEW.YEARLY ? styles.active : ''
            }`}
            onClick={() => setViewType(GRAPH_VIEW.YEARLY)}
          >
            Yearly
          </button>
        </div>
      </div>

      <svg
        className={styles.chart}
        viewBox={`0 0 ${BAR_CHART_WIDTH} ${BAR_CHART_HEIGHT}`}
        aria-label={`${viewType} hours chart`}
      >
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick) => {
          const y =
            PADDING.top + chartHeight - (tick / yMax) * chartHeight;
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={PADDING.left + chartWidth}
                y2={y}
                stroke="#e0e0e0"
                strokeWidth="1"
              />
              <text
                x={PADDING.left - 6}
                y={y + 4}
                textAnchor="end"
                className={styles.axisLabel}
              >
                {tick}h
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = Math.max((d.hours / yMax) * chartHeight, 0);
          const x = PADDING.left + i * barSlotWidth + barOffset;
          const y = PADDING.top + chartHeight - barH;

          return (
            <g key={d.label}>
              {barH > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  fill={color}
                  rx="3"
                  className={styles.bar}
                >
                  <title>{`${d.label}: ${d.hours}h`}</title>
                </rect>
              )}
              {barH === 0 && (
                <rect
                  x={x}
                  y={PADDING.top + chartHeight - 2}
                  width={barWidth}
                  height={2}
                  fill={color}
                  opacity="0.3"
                  rx="1"
                />
              )}
              {/* Hour label above bar */}
              {d.hours > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className={styles.barLabel}
                >
                  {d.hours}h
                </text>
              )}
              {/* X axis label */}
              <text
                x={x + barWidth / 2}
                y={PADDING.top + chartHeight + 16}
                textAnchor="middle"
                className={styles.axisLabel}
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* X axis line */}
        <line
          x1={PADDING.left}
          y1={PADDING.top + chartHeight}
          x2={PADDING.left + chartWidth}
          y2={PADDING.top + chartHeight}
          stroke="#ccc"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
};

export default TimeGraph;
