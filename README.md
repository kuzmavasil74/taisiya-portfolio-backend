# Taisiya Style — backend

Express + MongoDB API for the booking site (https://www.taisiiastyle.cz) and the Telegram bot.

## Deployment (Railway, project `taisiya-style`)

| Service | Start command | Notes |
| --- | --- | --- |
| `backend` | `node index.js` | healthcheck `/health`, `ENABLE_BOT_POLLING=true` (the only instance that polls Telegram) |
| `reminder-worker` | `node reminderService.js` | day/hour reminders and review requests, no polling |

Both services deploy automatically on push to `main`.

### Environment variables

`MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
`ENABLE_BOT_POLLING`, optional `CORS_ORIGINS` (comma-separated extra origins).

Never run a second instance with `ENABLE_BOT_POLLING=true` (Telegram answers `409 Conflict`).

## Development

```bash
npm install
npm test   # unit + integration tests (in-memory MongoDB replica set)
npm run dev
```

`node scripts/reset-password.js <email>` resets a user's password (needs `MONGO_URI` and `NEW_PASSWORD` in the environment).
