import React from 'react';
import { encode } from 'qss';

import styles from './AuthScreen.module.css';

const googleClientId = '386288482739-qv303lmckdqrmksk8mqpihpfu4o8kc7k.apps.googleusercontent.com';
const googleScope =
  'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly';

const App = () => {
  const getGoogleAuthUrl = () => {
    const params = encode({
      client_id: googleClientId,
      redirect_uri: window.location.origin + window.location.pathname.replace(/\/$/, ''),
      scope: googleScope,
      response_type: 'token',
    });

    return `https://accounts.google.com/o/oauth2/auth?${params}`;
  };

  return (
    <div className={styles.card}>
      <div className={styles.hero}>
        <h2 className={styles.title}>Track your calendar hours</h2>
        <p className={styles.subtitle}>
          Connect your Google Calendar to see how you spend your time.
          Filter by day, week, month, year, or custom range.
        </p>
      </div>

      <div className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon} style={{ background: '#eff6ff' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <span className={styles.featureText}>Multi-calendar support</span>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon} style={{ background: '#f0fdf4' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <span className={styles.featureText}>Visual charts and graphs</span>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon} style={{ background: '#fef3c7' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <span className={styles.featureText}>Flexible time ranges</span>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon} style={{ background: '#fae8ff' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#c026d3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className={styles.featureText}>Private and secure</span>
        </div>
      </div>

      <div className={styles.authSection}>
        <p className={styles.authLabel}>Connect to get started</p>
        <a href={getGoogleAuthUrl()} data-testid="AuthLink" className={styles.authLink}>
          <svg className={styles.googleIcon} viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </a>
      </div>

      <div className={styles.privacy}>
        <p className={styles.privacyTitle}>Privacy</p>
        <p className={styles.privacyText}>
          All data stays in your browser. No servers, no tracking. Your calendar
          data is fetched directly from Google and never stored externally.
          Authentication is cleared when you close the tab.
        </p>
        <span className={styles.privacyBadge}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Read-only access
        </span>
      </div>
    </div>
  );
};

export default App;
