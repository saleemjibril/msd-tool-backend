# MSD Competency Survey API

Node (Express) + MongoDB API for the Ikore PMP MSD competency survey: public staged survey (name + phone), computed results, and admin JWT access to submissions.

## Setup

1. Copy `.env.example` to `.env` and set `MONGODB_URI`, `JWT_SECRET`, and optional `BOOTSTRAP_ADMIN_USERNAME` / `BOOTSTRAP_ADMIN_PASSWORD` (legacy: `BOOTSTRAP_ADMIN_EMAIL` is still read if username is unset).
2. `npm install`
3. `npm run dev`

## Endpoints

- `GET /api/health` — health check
- `GET /api/framework` — full competency JSON (`framework/ikore-1.0.json`)
- `POST /api/survey/lookup` — `{ phone }` → previous completed survey summary + full `result` payload
- `POST /api/survey` — `{ name, phone }` → new `in_progress` survey (abandons older drafts for that phone)
- `PATCH /api/survey/:id` — `{ phone, answers?, foundation?, currentStageIndex? }`
- `POST /api/survey/:id/complete` — `{ phone, answers?, foundation? }` → validates all answers, marks completed, returns `result`
- `GET /api/survey/completed/:id?phone=` — load completed result when phone matches
- `POST /api/admin/login` — `{ username, password }` → JWT (body `email` still accepted for backward compatibility)
- `GET /api/admin/surveys` — query: `page`, `limit`, `phone`, `name`, `from`, `to`
- `GET /api/admin/surveys/:id` — full submission + `result`

`CLIENT_URL` may be a comma-separated list for CORS.

## Admin user

Either set bootstrap env vars (admin created on first server start if missing) or run:

`npm run seed-admin`
