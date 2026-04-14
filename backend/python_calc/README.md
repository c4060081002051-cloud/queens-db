# Python Finance Calculator Service

This service owns fee and statement calculation formulas used by the Node API.

## Start

From `backend/`:

1. Install dependencies:
   - `npm run calc:install`
2. Run calculator API:
   - `npm run calc:dev`

The API listens on `http://127.0.0.1:8100`.

## Endpoints

- `POST /v1/finance/payment-summary`
- `POST /v1/finance/statement-summary`
- `GET /health`

## Node integration

Node calls this service from `src/services/pythonCalc.ts`.
You can override the URL with:

- `PY_CALC_BASE_URL=http://127.0.0.1:8100`
