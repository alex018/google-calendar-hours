# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install      # Install dependencies
npm start        # Start dev server (uses NODE_OPTIONS=--openssl-legacy-provider internally)
npm test         # Run tests in watch mode
npm run build    # Production build
npm run lint     # ESLint on src/
npm run lint:css # Stylelint on src/**/*.css
npm run deploy   # Deploy to GitHub Pages (gh-pages -d build)
```

Build requires `NODE_OPTIONS=--openssl-legacy-provider` due to the older webpack/Node.js version mismatch (already handled in `predeploy` script). If running `npm run build` directly fails, prefix with that env var.

To run a single test file: `npx jest src/path/to/file.test.js`

## Architecture

React + Redux Toolkit SPA, deployed to GitHub Pages (`alex018.github.io/google-calendar-hours`). No backend — all Google Calendar API calls are made directly from the browser using an OAuth implicit flow access token stored in `sessionStorage`.

### OAuth Flow

The Google OAuth Client ID is hardcoded in `src/AuthScreen.js` (line 6):
```js
const googleClientId = '386288482739-qv303lmckdqrmksk8mqpihpfu4o8kc7k.apps.googleusercontent.com';
```
The app uses `response_type: token` (implicit flow) — no client secret or redirect URI handling required. Make sure `https://alex018.github.io` is listed as an authorized JavaScript origin in your Google Cloud OAuth client settings.

### Redux Store (`src/stores/`)

- `authentication` — holds `accessToken` from `sessionStorage`; `selectHasToken` gates the UI between `AuthScreen` and `Interface`
- `calendars` — fetched calendar list; `loadCalendars` thunk triggers on auth
- `calendarEvents` — per-calendar event cache; `loadCalendarEvents` thunk fetches paginated Google Calendar API events
- `viewState` — all UI state: selected calendar, range type (day/week/month/year/total/custom), date pointer, week start; persisted to `localStorage` via `storage.js`
- `src/stores/index.js` — creates the store with preloaded state from `sessionStorage` (token) and `localStorage` (view config)

### Data Flow

`AuthScreen` → Google OAuth redirect → `App.js` extracts `access_token` from URL hash → stored in `sessionStorage` → `Interface` renders → user selects calendar → `loadCalendarEvents` fetches all events (paginated, up to 2500 per page, timeMax = now + 2 years) → `viewState` selectors compute hours/events for selected range.

### Key Selectors in `viewState.js`

- `selectCurrentDatePointers` — computes `{start, end}` dayjs objects for the active range type
- `selectEventsByRange` — filters and clips events to the selected range
- `selectHours` — sums duration of filtered events (rounded via `utils/roundHours.js`)
- `selectMonthlyGraphData` / `selectYearlyGraphData` — aggregated data for the `TimeGraph` SVG bar chart

### Linting

ESLint extends `airbnb` + `prettier`. JSX is used in `.js` files (not `.jsx`). `no-param-reassign` is disabled to allow Redux Toolkit's immer-based reducers. `testing-library` and `jest-dom` plugins are enforced.
