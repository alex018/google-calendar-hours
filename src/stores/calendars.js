import { createSlice } from '@reduxjs/toolkit';

import { selectAccessToken } from './authentication';
import { fetchCalendars } from './api';
import { loadCalendarEvents } from './calendarEvents';

export const calendars = createSlice({
  name: 'calendars',
  initialState: {
    list: null,
  },
  reducers: {
    setCalendars: (state, { payload }) => {
      state.list = payload;
    },
  },
});

const { setCalendars } = calendars.actions;

export const loadCalendars = () => async (dispatch, getState) => {
  const accessToken = selectAccessToken(getState());
  try {
    const { items } = await fetchCalendars({ accessToken });
    const calendarList = items.map(({ id, summary, backgroundColor }) => ({
      id,
      label: summary,
      color: backgroundColor || '#4285f4',
    }));

    dispatch(setCalendars(calendarList));

    // Load events for all calendars in parallel
    calendarList.forEach(({ id }) => {
      dispatch(loadCalendarEvents({ calendarId: id }));
    });
  } catch (e) {
    // do nothing
  }
};

export const selectCalendars = (state) => state.calendars.list;

export const selectCalendarColor = (state, calendarId) => {
  const calendar = state.calendars.list?.find(({ id }) => id === calendarId);
  return calendar?.color || '#4285f4';
};

export default calendars.reducer;
