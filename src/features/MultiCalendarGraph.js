import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

import { selectCalendars } from '../stores/calendars';
import {
  selectAllCalendarsMonthlyData,
  selectAllCalendarsYearlyData,
  selectAllCalendarsWeeklyData,
} from '../stores/viewState';

import styles from './MultiCalendarGraph.module.css';

const CHART_TYPE = {
  STACKED: 'stacked',
  GROUPED: 'grouped',
  LINE: 'line',
  PIE: 'pie',
};

const TIME_RANGE = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

const BAR_CHART_HEIGHT = 320;
const PADDING = { top: 28, right: 16, bottom: 40, left: 52 };
const Y_TICKS = 4;

const chartHeight = BAR_CHART_HEIGHT - PADDING.top - PADDING.bottom;

function niceMax(rawMax) {
  if (!rawMax || rawMax === 0) return Y_TICKS;
  return Math.ceil(rawMax / Y_TICKS) * Y_TICKS;
}

function pickData(timeRange, weeklyData, monthlyData, yearlyData) {
  if (timeRange === TIME_RANGE.WEEKLY) return weeklyData;
  if (timeRange === TIME_RANGE.MONTHLY) return monthlyData;
  return yearlyData;
}

// Compute pie arc path
function pieSlicePath(cx, cy, r, startAngle, endAngle, innerR) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const ix1 = cx + innerR * Math.cos(toRad(endAngle));
  const iy1 = cy + innerR * Math.sin(toRad(endAngle));
  const ix2 = cx + innerR * Math.cos(toRad(startAngle));
  const iy2 = cy + innerR * Math.sin(toRad(startAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${ix1} ${iy1}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
    'Z',
  ].join(' ');
}

const MultiCalendarGraph = () => {
  const calendars = useSelector(selectCalendars);
  const yearlyData = useSelector(selectAllCalendarsYearlyData);

  const [checkedCalendars, setCheckedCalendars] = useState(new Set());
  const [chartType, setChartType] = useState(CHART_TYPE.STACKED);
  const [timeRange, setTimeRange] = useState(TIME_RANGE.MONTHLY);
  const [graphYear, setGraphYear] = useState(dayjs().year());
  const scrollRef = useRef(null);

  // These selectors re-run whenever graphYear changes
  const monthlyData = useSelector((state) => selectAllCalendarsMonthlyData(state, graphYear));
  const weeklyData = useSelector((state) => selectAllCalendarsWeeklyData(state, graphYear));

  // Initialize all calendars as checked when the list is first available
  useEffect(() => {
    if (calendars && checkedCalendars.size === 0) {
      setCheckedCalendars(new Set(calendars.map((c) => c.id)));
    }
  }, [calendars, checkedCalendars.size]);

  const toggleCalendar = (calendarId) => {
    setCheckedCalendars((prev) => {
      const next = new Set(prev);
      if (next.has(calendarId)) {
        next.delete(calendarId);
      } else {
        next.add(calendarId);
      }
      return next;
    });
  };

  // Pick the right data set based on timeRange
  const allData = pickData(timeRange, weeklyData, monthlyData, yearlyData);

  // Active calendars = those that are checked AND have data loaded
  const activeCalendars = (calendars || []).filter(
    (c) => checkedCalendars.has(c.id) && allData[c.id]
  );

  // Get period labels from the first active calendar's data, or empty
  const firstData = activeCalendars.length > 0 ? allData[activeCalendars[0].id] : [];
  const periods = firstData || [];

  // ---- Y-axis helpers ----
  const getStackedMax = () => {
    if (periods.length === 0) return Y_TICKS;
    let max = 0;
    periods.forEach((_, i) => {
      const total = activeCalendars.reduce(
        (sum, cal) => sum + (allData[cal.id]?.[i]?.hours || 0),
        0
      );
      if (total > max) max = total;
    });
    return niceMax(max);
  };

  const getSingleMax = () => {
    let max = 0;
    activeCalendars.forEach((cal) => {
      (allData[cal.id] || []).forEach(({ hours }) => {
        if (hours > max) max = hours;
      });
    });
    return niceMax(max);
  };

  const yMax =
    chartType === CHART_TYPE.STACKED ? getStackedMax() : getSingleMax();
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) =>
    Math.round((yMax / Y_TICKS) * i)
  );

  // ---- SVG dimensions ----
  const isWeekly = timeRange === TIME_RANGE.WEEKLY;
  const periodCount = periods.length || 1;

  // For weekly: wider SVG inside scrollable container
  const svgWidth = isWeekly
    ? Math.max(560, periodCount * 22 + PADDING.left + PADDING.right)
    : 560;
  const chartWidth = svgWidth - PADDING.left - PADDING.right;

  // Bar sizing
  const barSlotWidth = chartWidth / Math.max(periodCount, 1);
  const groupedBarWidth =
    activeCalendars.length > 0
      ? (barSlotWidth * 0.8) / activeCalendars.length
      : barSlotWidth * 0.6;
  const stackedBarWidth = barSlotWidth * 0.6;
  const stackedBarOffset = barSlotWidth * 0.2;

  // ---- Chart rendering functions ----

  const renderYAxis = () =>
    yTicks.map((tick) => {
      const y = PADDING.top + chartHeight - (tick / yMax) * chartHeight;
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
    });

  const renderXAxis = () => (
    <line
      x1={PADDING.left}
      y1={PADDING.top + chartHeight}
      x2={PADDING.left + chartWidth}
      y2={PADDING.top + chartHeight}
      stroke="#ccc"
      strokeWidth="1"
    />
  );

  const renderXLabels = (skipEvery = 1) =>
    periods.map((p, i) => {
      if (i % skipEvery !== 0) return null;
      const x = PADDING.left + i * barSlotWidth + barSlotWidth / 2;
      return (
        <text
          key={p.label}
          x={x}
          y={PADDING.top + chartHeight + 16}
          textAnchor="middle"
          className={styles.axisLabel}
        >
          {p.label}
        </text>
      );
    });

  const renderStackedBars = () => {
    const skipEvery = isWeekly ? 4 : 1;
    return (
      <React.Fragment>
        {renderYAxis()}
        {renderXAxis()}
        {renderXLabels(skipEvery)}
        {periods.map((period, periodIdx) => {
          const x =
            PADDING.left + periodIdx * barSlotWidth + stackedBarOffset;
          let yBottom = PADDING.top + chartHeight;

          return (
            <g key={period.label}>
              {activeCalendars.map((cal) => {
                const hours = allData[cal.id]?.[periodIdx]?.hours || 0;
                if (hours === 0) return null;
                const barH = (hours / yMax) * chartHeight;
                const y = yBottom - barH;
                yBottom = y;
                return (
                  <rect
                    key={cal.id}
                    x={x}
                    y={y}
                    width={stackedBarWidth}
                    height={barH}
                    fill={cal.color}
                    rx="2"
                    className={styles.bar}
                  >
                    <title>{`${cal.label} — ${period.label}: ${hours}h`}</title>
                  </rect>
                );
              })}
            </g>
          );
        })}
      </React.Fragment>
    );
  };

  const renderGroupedBars = () => {
    const skipEvery = isWeekly ? 4 : 1;
    return (
      <React.Fragment>
        {renderYAxis()}
        {renderXAxis()}
        {renderXLabels(skipEvery)}
        {periods.map((period, periodIdx) => (
          <g key={period.label}>
            {activeCalendars.map((cal, calIdx) => {
              const hours = allData[cal.id]?.[periodIdx]?.hours || 0;
              const barH = Math.max((hours / yMax) * chartHeight, hours > 0 ? 1 : 0);
              const x =
                PADDING.left +
                periodIdx * barSlotWidth +
                barSlotWidth * 0.1 +
                calIdx * groupedBarWidth;
              const y = PADDING.top + chartHeight - barH;
              return (
                <rect
                  key={cal.id}
                  x={x}
                  y={y}
                  width={Math.max(groupedBarWidth - 1, 1)}
                  height={barH}
                  fill={cal.color}
                  rx="1"
                  className={styles.bar}
                >
                  <title>{`${cal.label} — ${period.label}: ${hours}h`}</title>
                </rect>
              );
            })}
          </g>
        ))}
      </React.Fragment>
    );
  };

  const renderLineChart = () => {
    const skipEvery = isWeekly ? 4 : 1;
    return (
      <React.Fragment>
        {renderYAxis()}
        {renderXAxis()}
        {renderXLabels(skipEvery)}
        {activeCalendars.map((cal) => {
          const calData = allData[cal.id] || [];
          const points = calData
            .map((d, i) => {
              const x = PADDING.left + i * barSlotWidth + barSlotWidth / 2;
              const y =
                PADDING.top + chartHeight - (d.hours / yMax) * chartHeight;
              return `${x},${y}`;
            })
            .join(' ');

          return (
            <g key={cal.id}>
              <polyline
                points={points}
                fill="none"
                stroke={cal.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                className={styles.line}
              />
              {calData.map((d) => {
                if (d.hours === 0) return null;
                const x = PADDING.left + calData.indexOf(d) * barSlotWidth + barSlotWidth / 2;
                const y =
                  PADDING.top + chartHeight - (d.hours / yMax) * chartHeight;
                return (
                  <circle
                    key={d.label}
                    cx={x}
                    cy={y}
                    r="3"
                    fill={cal.color}
                    className={styles.dot}
                  >
                    <title>{`${cal.label} — ${d.label}: ${d.hours}h`}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}
      </React.Fragment>
    );
  };

  const renderPieChart = () => {
    // Sum total hours per calendar across all periods
    const totals = activeCalendars.map((cal) => {
      const total = (allData[cal.id] || []).reduce(
        (sum, d) => sum + d.hours,
        0
      );
      return { ...cal, total };
    });
    const grandTotal = totals.reduce((sum, c) => sum + c.total, 0);

    if (grandTotal === 0) {
      return (
        <text x="280" y="120" textAnchor="middle" className={styles.axisLabel}>
          No data
        </text>
      );
    }

    const cx = 180;
    const cy = 110;
    const r = 90;
    const innerR = 48;

    let currentAngle = -90;
    const slices = totals
      .filter((c) => c.total > 0)
      .map((cal) => {
        const angle = (cal.total / grandTotal) * 360;
        const slice = {
          ...cal,
          startAngle: currentAngle,
          endAngle: currentAngle + angle,
          pct: ((cal.total / grandTotal) * 100).toFixed(1),
        };
        currentAngle += angle;
        return slice;
      });

    return (
      <React.Fragment>
        {slices.map((s) => (
          <path
            key={s.id}
            d={pieSlicePath(cx, cy, r, s.startAngle, s.endAngle, innerR)}
            fill={s.color}
            stroke="#fff"
            strokeWidth="2"
            className={styles.bar}
          >
            <title>{`${s.label}: ${s.total.toFixed(1)}h (${s.pct}%)`}</title>
          </path>
        ))}
        {/* Center label */}
        <text x={cx} y={cy - 6} textAnchor="middle" className={styles.pieCenter}>
          {grandTotal.toFixed(0)}h
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className={styles.pieCenterSub}>
          total
        </text>
        {/* Legend */}
        {slices.map((s, i) => {
          const lx = 290;
          const ly = 40 + i * 22;
          return (
            <g key={s.id}>
              <rect x={lx} y={ly} width={12} height={12} fill={s.color} rx="2" />
              <text x={lx + 18} y={ly + 10} className={styles.legendLabel}>
                {s.label}
              </text>
              <text x={lx + 230} y={ly + 10} textAnchor="end" className={styles.legendHours}>
                {s.total.toFixed(1)}h ({s.pct}%)
              </text>
            </g>
          );
        })}
      </React.Fragment>
    );
  };

  const isPie = chartType === CHART_TYPE.PIE;
  const isYearly = timeRange === TIME_RANGE.YEARLY;
  const showYearNav = !isPie && !isYearly;
  const thisYear = dayjs().year();
  const pieSvgWidth = 540;
  const pieSvgHeight = Math.max(240, activeCalendars.length * 22 + 80);

  const renderChart = () => {
    if (activeCalendars.length === 0) {
      return (
        <div className={styles.empty}>
          Select at least one calendar to show the chart.
        </div>
      );
    }
    if (isPie) {
      return (
        <svg
          className={styles.chart}
          viewBox={`0 0 ${pieSvgWidth} ${pieSvgHeight}`}
          aria-label="Pie chart: time per calendar"
        >
          {renderPieChart()}
        </svg>
      );
    }
    return (
      <div
        className={`${styles.chartScroll} ${isWeekly ? styles.scrollable : ''}`}
        ref={scrollRef}
      >
        <svg
          className={styles.chart}
          viewBox={`0 0 ${svgWidth} ${BAR_CHART_HEIGHT}`}
          style={isWeekly ? { minWidth: svgWidth } : {}}
          aria-label={`${chartType} ${timeRange} hours chart`}
        >
          {chartType === CHART_TYPE.STACKED && renderStackedBars()}
          {chartType === CHART_TYPE.GROUPED && renderGroupedBars()}
          {chartType === CHART_TYPE.LINE && renderLineChart()}
        </svg>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Calendar checkboxes */}
      <div className={styles.calendarList}>
        {(calendars || []).map((cal) => (
          <label key={cal.id} className={styles.calendarItem}>
            <input
              type="checkbox"
              checked={checkedCalendars.has(cal.id)}
              onChange={() => toggleCalendar(cal.id)}
              className={styles.checkbox}
            />
            <span
              className={styles.colorDot}
              style={{ background: cal.color }}
            />
            <span className={styles.calendarName}>{cal.label}</span>
            {!allData[cal.id] && (
              <span className={styles.loadingBadge}>loading…</span>
            )}
          </label>
        ))}
      </div>

      {/* Controls row */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Chart</span>
          <div className={styles.toggle}>
            {[
              { key: CHART_TYPE.STACKED, label: 'Stacked' },
              { key: CHART_TYPE.GROUPED, label: 'Grouped' },
              { key: CHART_TYPE.LINE, label: 'Line' },
              { key: CHART_TYPE.PIE, label: 'Pie' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`${styles.toggleBtn} ${chartType === key ? styles.active : ''}`}
                onClick={() => setChartType(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Period</span>
          <div className={styles.toggle}>
            {[
              { key: TIME_RANGE.WEEKLY, label: 'Weekly' },
              { key: TIME_RANGE.MONTHLY, label: 'Monthly' },
              { key: TIME_RANGE.YEARLY, label: 'Yearly' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`${styles.toggleBtn} ${timeRange === key ? styles.active : ''}`}
                onClick={() => setTimeRange(key)}
                disabled={isPie}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {renderChart()}

      {/* Year navigation — shown for weekly and monthly views */}
      {showYearNav && (
        <div className={styles.yearNav}>
          <button
            type="button"
            className={styles.yearNavBtn}
            onClick={() => setGraphYear((y) => y - 1)}
            aria-label="Previous year"
          >
            &#8592;
          </button>
          <span className={styles.yearLabel}>{graphYear}</span>
          <button
            type="button"
            className={styles.yearNavBtn}
            onClick={() => setGraphYear((y) => y + 1)}
            disabled={graphYear >= thisYear}
            aria-label="Next year"
          >
            &#8594;
          </button>
        </div>
      )}
    </div>
  );
};

export default MultiCalendarGraph;
