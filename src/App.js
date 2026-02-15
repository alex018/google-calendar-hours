import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { decode } from 'qss';

import { selectHasToken } from './stores/authentication';

import AuthScreen from './AuthScreen';
import Interface from './Interface';

import styles from './App.module.css';

const App = () => {
  const hasToken = useSelector(selectHasToken);

  useEffect(() => {
    const hashParams = decode(window.location?.hash?.slice(1) ?? '');

    if (hashParams.access_token) {
      sessionStorage.setItem('accessToken', hashParams.access_token);
      window.location = window.location.pathname.replace(/\/$/, '') || '/';
    }
  }, []);

  return (
    <div className={styles.appWrapper}>
      <div className={styles.app}>
        <div className={styles.sticky}>
          <div className={styles.content}>
            <div className={styles.header}>
              <div className={styles.headerIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="2" />
                  <path d="M12 7v5l3.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className={styles.headline}>
                Calendar Hours
              </h1>
            </div>
            {!hasToken && <AuthScreen />}
            {hasToken && <Interface />}
          </div>
          <footer className={styles.footer}>
            <p>
              <span>Open source project — </span>
              <a
                href="https://github.com/aronwoost/google-calendar-hours"
                target="_blank"
                rel="noreferrer"
              >
                View on GitHub
              </a>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default App;
