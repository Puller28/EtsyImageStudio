# Test Suite Overview

## FastAPI Smoke Tests
- Location: `test_fastapi_endpoints.py`
- Run with the local Python environment once your FastAPI server is listening:
  ```bash
  python test_fastapi_endpoints.py
  ```

## Playwright End-to-End Tests
- Location: `tests/e2e`
- Install browsers once:
  ```bash
  npx playwright install
  ```
- Execute the suite:
  ```bash
  npm run test:e2e
  ```
  The script starts the Express server via `npm run start:test` and covers:
  - Marketing pages (home hero, contact form UI)
  - Anonymous form endpoints (`/api/contact`, newsletter subscribe/unsubscribe)
  - Template catalogue responses (`/health`, `/api/templates`, previews)
