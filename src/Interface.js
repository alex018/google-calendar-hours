import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import MultiCalendarGraph from './features/MultiCalendarGraph';
import { selectIsEventsLoading } from './stores/calendarEvents';
import { loadCalendars, selectCalendars } from './stores/calendars';

import styles from './Interface.module.css';

const Interface = () => {
  const dispatch = useDispatch();

  const calendars = useSelector(selectCalendars);
  const eventsLoading = useSelector(selectIsEventsLoading);

  useEffect(() => {
    if (!calendars) {
      dispatch(loadCalendars());
    }
  });

  if (!calendars) {
    return (
      <div className={styles.initialLoading}>
        <div className={styles.spinner} />
        <span>Loading calendars</span>
      </div>
    );
  }

  return (
    <div className={styles.interface}>
      {eventsLoading && (
        <div className={styles.loadingBar}>Loading calendar events</div>
      )}
      <MultiCalendarGraph />
    </div>
  );
};

export default Interface;
