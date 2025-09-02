# Water Meter Analytics Dashboard

Angular 19 dashboard with charts and tables backed by a Node/Express API and PostgreSQL. Includes Chart.js, Highcharts, Bootstrap, and AG Grid.

## Tech stack

- Frontend: Angular 19, Chart.js, Highcharts, Bootstrap, AG Grid
- Backend: Node.js (Express, CORS, pg)
- Database: PostgreSQL

## Repository structure

```
Dashb/
├─ Backend/            # Express API (server.js)
└─ front/              # Angular app (dashboard-ng19)
```

Key configs:
- Frontend env: `front/src/environments/environment.ts` (apiBaseUrl)
- Angular config: `front/angular.json`
- API server: `Backend/server.js`

## Quick start

Prereqs: Node.js 18+, npm 10+, PostgreSQL 13+ (running locally), Angular CLI 19 (`npm i -g @angular/cli`).

### 1) Backend (Express + PostgreSQL)

> Update DB credentials in `Backend/server.js` or use env vars.

```powershell
# From repo root
cd Backend
# If package.json is missing, initialize it first
if (-not (Test-Path package.json)) { npm init -y }
# Install dependencies
npm i express cors pg
# Start the API (http://localhost:3000)
node server.js
```

Health check: http://localhost:3000/api/health

### 2) Frontend (Angular)

```powershell
# In a new terminal at repo root
cd front
npm install
# Start Angular dev server (http://localhost:4200)
npm start
```

Frontend calls the API at `http://localhost:3000` (see `environment.ts`). Ensure the backend is running.

## Configuration

- API base URL: `front/src/environments/environment.ts`
  - development: `apiBaseUrl: 'http://localhost:3000'`
- Optional proxy for other endpoints: `front/proxy.conf.json`
- Database connection: `Backend/server.js` (consider using env vars and not committing credentials)

## Available scripts (frontend)

From `front/package.json`:
- `npm start` — `ng serve --proxy-config proxy.conf.json`
- `npm run build` — production build to `dist/dashboard-ng19`
- `npm test` — unit tests via Karma

## API overview

Base URL: `http://localhost:3000`

- GET `/api/health` — server status
- GET `/api/years` — distinct financial years
- GET `/api/divisions` — distinct divisions (cleaned names for display)
- GET `/api/industries` — distinct industries
- GET `/api/months` — distinct months
- GET `/api/alldata?page=0&pageSize=20` — paginated meter data
- GET `/api/all-meter-data` — sample limited data
- GET `/api/stats` — database stats
- GET `/api/test-db` — DB connection test

Charts:
- GET `/api/chart1?division=DIV&financial_year=YYYY` — Industry vs meter diff for a division/year
- GET `/api/chart2?financial_year=YYYY` — Division vs meter diff by year
- GET `/api/chart3?industry=NAME` — Year vs meter diff for an industry
- GET `/api/chart4?industry=NAME` — Time series by industry (by month)
- GET `/api/chart5?industry=NAME&financial_year=YYYY|all` — Monthly by industry (optionally all years)
- GET `/api/chart6?division=DIV&financial_year=YYYY` — Monthly by division/year

## Build and deploy

```powershell
cd front
npm run build
```
Outputs to `front/dist/dashboard-ng19`. Serve the built assets with any static web server (Nginx, Apache, etc.). The API remains a separate service.

## Folder pointers (frontend)

- Dashboard: `front/src/app/dashboard/`
- Charts services: `front/src/app/charts/charts.services.ts`
- Table: `front/src/app/dashboard/table.component.*`
- Navbar/Sidebar: `front/src/app/navbar`, `front/src/app/sidebar`

## Troubleshooting

- API not reachable: confirm `node Backend/server.js` is running and `apiBaseUrl` points to it.
- DB errors: verify PostgreSQL is running and credentials/DB name match your setup.
- CORS: API allows `http://localhost:4200` by default; adjust in `Backend/server.js` if needed.

## Notes

- Consider moving DB credentials to environment variables and using a `.env` (with `dotenv`) for security.
- This repo includes a nested `front/public` for static assets configured in `angular.json`.
