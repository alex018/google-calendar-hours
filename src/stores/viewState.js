import { createSlice } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/de';

import { loadCalendarEvents, selectCalendarEvents, selectAllCalendarEventsMap } from './calendarEvents';
import { updateConfig } from './storage';
import { RANGE_TYPE, WEEK_START } from '../constants';
import roundHours from '../utils/roundHours';

dayjs.extend(isoWeek);

export const viewState = createSlice({
  name: 'viewState',
  initialState: null,
  reducers: {
    setSelectedCalendarId: (state, { payload }) => {
      state.selectedCalendarId = payload;
    },
    setRangeType: (state, { payload }) => {
      state.selectedRangeType = payload;
    },
    changeRange: (state, { payload }) => {
      if (payload === 'prev') {
        state.currentDatePointerStart = dayjs(state.currentDatePointerStart)
          .subtract(1, state.selectedRangeType)
          .toJSON();
      } else if (payload === 'next') {
        state.currentDatePointerStart = dayjs(state.currentDatePointerStart)
          .add(1, state.selectedRangeType)
          .toJSON();
      }
    },
    resetRange: (state) => {
      state.currentDatePointerStart = dayjs().startOf('day').toJSON();
    },
    setWeekStart: (state, { payload }) => {
      state.weekStart = payload;
    },
    setStart: (state, { payload }) => {
      state.currentDatePointerStart = payload;
    },
    setEnd: (state, { payload }) => {
      state.currentDatePointerEnd = payload;
    },
  },
});

export const { changeRange, resetRange } = viewState.actions;
const {
  setSelectedCalendarId,
  setRangeType,
  setWeekStart,
  setStart,
  setEnd,
} = viewState.actions;

export const selectSelectedCalendar = (state) =>
  state.viewState.selectedCalendarId;

export const selectDate = (state) => state.viewState.currentDatePointerStart;

export const selectRangeType = (state) => state.viewState.selectedRangeType;
export const selectWeekStart = (state) => state.viewState.weekStart;
export const selectLocaleForWeekStart = (state) =>
  state.viewState.weekStart === WEEK_START.SUNDAY ? 'en' : 'de';

export const selectCurrentDatePointers = (state) => {
  const {
    selectedRangeType,
    currentDatePointerStart,
    currentDatePointerEnd,
  } = state.viewState;
  const currentDatePointerStartDate = dayjs(currentDatePointerStart);

  if (selectedRangeType === RANGE_TYPE.CUSTOM) {
    return {
      start: dayjs(currentDatePointerStart),
      // The selected end day should be included in the calculation, so we
      // need to add an extra day.
      end: dayjs(currentDatePointerEnd).add(1, 'day'),
    };
  }

  let rangeStart;
  let rangeEnd;

  if (selectedRangeType === RANGE_TYPE.DAY) {
    rangeStart = currentDatePointerStartDate.startOf('day');
    rangeEnd = rangeStart.add(1, 'day');
  } else if (selectedRangeType === RANGE_TYPE.WEEK) {
    rangeStart = currentDatePointerStartDate
      .locale(selectLocaleForWeekStart(state))
      .startOf('day')
      .weekday(0);
    rangeEnd = rangeStart.add(1, 'week');
  } else if (selectedRangeType === RANGE_TYPE.MONTH) {
    rangeStart = currentDatePointerStartDate.startOf('month');
    rangeEnd = rangeStart.add(1, 'month');
  } else if (selectedRangeType === RANGE_TYPE.YEAR) {
    rangeStart = currentDatePointerStartDate.startOf('year');
    rangeEnd = rangeStart.add(1, 'year');
  } else if (selectedRangeType === RANGE_TYPE.TOTAL) {
    rangeStart = dayjs('2000-01-01T10:00:00Z');
    rangeEnd = dayjs('2040-01-01T10:00:00Z');
  }

  return {
    start: rangeStart,
    end: rangeEnd,
  };
};

export const selectEventsByRange = (state) => {
  const events = selectCalendarEvents(state, selectSelectedCalendar(state));

  if (!events) {
    return null;
  }

  const { start: rangeStart, end: rangeEnd } = selectCurrentDatePointers(state);

  return events
    .filter(
      ({ start, end }) =>
        // Filter out all events that end before selected start date or start after
        // selected end date.
        !(new Date(end) < rangeStart || new Date(start) > rangeEnd)
    )
    .map(({ start, end, ...rest }) => ({
      ...rest,
      start: new Date(start) < rangeStart ? rangeStart.toJSON() : start,
      end: new Date(end) > rangeEnd ? rangeEnd.toJSON() : end,
    }));
};

export const selectHours = (state) => {
  const events = selectEventsByRange(state);

  if (!events) {
    return null;
  }

  let hours = 0;

  events.forEach(({ start, end }) => {
    hours += (new Date(end) - new Date(start)) / 1000 / 60 / 60;
  });

  return roundHours(hours);
};

export const selectNumberOfEvents = (state) =>
  selectEventsByRange(state)?.length || 0;

const computeHoursInRange = (events, start, end) => {
  let hours = 0;
  events.forEach(({ start: evStart, end: evEnd }) => {
    const evStartDate = new Date(evStart);
    const evEndDate = new Date(evEnd);
    if (evEndDate <= start || evStartDate >= end) return;
    const clippedStart = evStartDate < start ? start : evStartDate;
    const clippedEnd = evEndDate > end ? end : evEndDate;
    hours += (clippedEnd - clippedStart) / 1000 / 60 / 60;
  });
  return roundHours(hours);
};

export const selectMonthlyGraphData = (state) => {
  const events = selectCalendarEvents(state, selectSelectedCalendar(state));
  if (!events) return null;

  const year = dayjs(state.viewState.currentDatePointerStart).year();

  return Array.from({ length: 12 }, (_, month) => {
    const start = dayjs(`${year}-${String(month + 1).padStart(2, '0')}-01`)
      .startOf('month')
      .toDate();
    const end = dayjs(`${year}-${String(month + 1).padStart(2, '0')}-01`)
      .endOf('month')
      .add(1, 'millisecond')
      .toDate();
    return {
      label: dayjs(`${year}-${String(month + 1).padStart(2, '0')}-01`).format(
        'MMM'
      ),
      hours: computeHoursInRange(events, start, end),
    };
  });
};

export const selectYearlyGraphData = (state) => {
  const events = selectCalendarEvents(state, selectSelectedCalendar(state));
  if (!events) return null;

  const currentYear = dayjs().year();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

  return years.map((year) => {
    const start = dayjs(`${year}-01-01`).startOf('year').toDate();
    const end = dayjs(`${year}-12-31`).endOf('year').add(1, 'millisecond').toDate();
    return {
      label: String(year),
      hours: computeHoursInRange(events, start, end),
    };
  });
};

// Lightweight memoisation: returns the same object reference when inputs
// (events map reference + year) haven't changed.
let monthlyCache = { eventsMap: null, year: null, result: {} };
export const selectAllCalendarsMonthlyData = (state, year) => {
  const eventsMap = selectAllCalendarEventsMap(state);
  const targetYear = year || dayjs().year();

  if (eventsMap === monthlyCache.eventsMap && targetYear === monthlyCache.year) {
    return monthlyCache.result;
  }

  const result = {};
  Object.keys(eventsMap).forEach((calendarId) => {
    const events = eventsMap[calendarId];
    if (!events) return;
    result[calendarId] = Array.from({ length: 12 }, (_, month) => {
      const d = dayjs(`${targetYear}-${String(month + 1).padStart(2, '0')}-01`);
      return {
        label: d.format('MMM'),
        hours: computeHoursInRange(
          events,
          d.startOf('month').toDate(),
          d.endOf('month').add(1, 'millisecond').toDate()
        ),
      };
    });
  });
  monthlyCache = { eventsMap, year: targetYear, result };
  return result;
};

let yearlyCache = { eventsMap: null, result: {} };
export const selectAllCalendarsYearlyData = (state) => {
  const eventsMap = selectAllCalendarEventsMap(state);

  if (eventsMap === yearlyCache.eventsMap) {
    return yearlyCache.result;
  }

  const currentYear = dayjs().year();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

  const result = {};
  Object.keys(eventsMap).forEach((calendarId) => {
    const events = eventsMap[calendarId];
    if (!events) return;
    result[calendarId] = years.map((year) => ({
      label: String(year),
      hours: computeHoursInRange(
        events,
        dayjs(`${year}-01-01`).startOf('year').toDate(),
        dayjs(`${year}-12-31`).endOf('year').add(1, 'millisecond').toDate()
      ),
    }));
  });
  yearlyCache = { eventsMap, result };
  return result;
};

let weeklyCache = { eventsMap: null, year: null, result: {} };
export const selectAllCalendarsWeeklyData = (state, year) => {
  const eventsMap = selectAllCalendarEventsMap(state);
  const currentYear = year || dayjs().year();

  if (eventsMap === weeklyCache.eventsMap && currentYear === weeklyCache.year) {
    return weeklyCache.result;
  }

  // Determine number of ISO weeks in the current year
  const weeksInYear = dayjs(`${currentYear}-12-28`).isoWeek();

  const result = {};
  Object.keys(eventsMap).forEach((calendarId) => {
    const events = eventsMap[calendarId];
    if (!events) return;
    result[calendarId] = Array.from({ length: weeksInYear }, (_, i) => {
      const weekNum = i + 1;
      const weekStart = dayjs()
        .year(currentYear)
        .isoWeek(weekNum)
        .startOf('isoWeek')
        .toDate();
      const weekEnd = dayjs()
        .year(currentYear)
        .isoWeek(weekNum)
        .endOf('isoWeek')
        .add(1, 'millisecond')
        .toDate();
      return {
        label: `W${weekNum}`,
        hours: computeHoursInRange(events, weekStart, weekEnd),
      };
    });
  });
  weeklyCache = { eventsMap, year: currentYear, result };
  return result;
};

export const setSelectedCalendar = ({ calendarId }) => (dispatch, getState) => {
  dispatch(setSelectedCalendarId(calendarId));
  updateConfig({ selectedCalendarId: calendarId });
  const calendarEvents = selectCalendarEvents(getState(), calendarId);
  if (!calendarEvents) {
    dispatch(loadCalendarEvents({ calendarId }));
  }
};

export const changeRangeType = ({ range }) => (dispatch, getState) => {
  if (range === RANGE_TYPE.CUSTOM) {
    const { start, end } = selectCurrentDatePointers(getState());
    // We need to subtract a day here, because a day was added to `end`
    // in order to have the selected end day in the calculation.
    const correctedEnd = end.subtract(1, 'day');
    dispatch(setStart(start.toJSON()));
    dispatch(setEnd(correctedEnd.toJSON()));
    updateConfig({ start: start.toJSON(), end: correctedEnd.toJSON() });
  }
  dispatch(setRangeType(range));
  updateConfig({ selectedRangeType: range });
};

export const changeWeekStart = (weekStart) => (dispatch) => {
  dispatch(setWeekStart(weekStart));
  updateConfig({ weekStart });
};

export const changeStart = (start) => (dispatch) => {
  dispatch(setStart(start));
  updateConfig({ start });
};

export const changeEnd = (end) => (dispatch) => {
  dispatch(setEnd(end));
  updateConfig({ end });
};

export default viewState.reducer;
