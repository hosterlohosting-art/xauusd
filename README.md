# XAU/USD Signal Dashboard

Live XAU/USD signal dashboard with:

- Real-time gold price/candle view
- Multi-strategy buy/sell/hold scoring
- Prediction percentage and readiness gate
- Prediction archive with correctness tracking
- Trade journal with TP/SL outcome tracking
- Backend persistence through Turso, with local JSON fallback

## Local Development

Install dependencies:

```bash
npm install
```

Run frontend:

```bash
npm run dev
```

Run backend:

```bash
npm run backend
```

Frontend dev URL:

```text
http://127.0.0.1:3000
```

Backend URL:

```text
http://127.0.0.1:8787
```

## Production / cPanel

Recommended domain:

```text
https://trade.arabianherbal.com
```

In cPanel Git Version Control, clone:

```text
https://github.com/hosterlohosting-art/xauusd.git
```

Suggested repository path:

```text
repositories/xauusd
```

In cPanel Node.js App:

- Application root: the cloned repo folder
- Startup file: `server/server.cjs`
- Node version: 20+ recommended
- Application mode: production
- Run NPM install
- Run build command:

```bash
npm run build
```

- Start command:

```bash
npm run backend
```

The backend serves both:

- API routes: `/api/health`, `/api/trades`, `/api/predictions`
- Built frontend from `dist`

## Environment Variables

Set these in cPanel Node.js App environment variables. Do not commit real tokens.

```text
PORT=8787
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
```

For local frontend development only:

```text
VITE_API_URL=http://127.0.0.1:8787
```

On production, `VITE_API_URL` can be omitted because the frontend and backend are served from the same domain.

## Data Storage

When Turso env variables exist, predictions and trades are saved in Turso table:

```sql
app_records(collection, id, data, updated_at)
```

When Turso env variables are missing or unavailable, the backend falls back to:

```text
server/data/predictions.json
server/data/trades.json
```

The `server/data` folder is intentionally ignored by Git.

## Verification

```bash
npm run lint
npm run build
npm run backend
```

Then open:

```text
http://127.0.0.1:8787/api/health
```

Expected result includes:

```json
{ "ok": true }
```

## Trading Disclaimer

This software is for analysis and education. It tracks prediction quality over time, but no trading tool can guarantee profit or perfect accuracy. Always use risk management.
