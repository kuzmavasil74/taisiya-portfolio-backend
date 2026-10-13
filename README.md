# Taisiya Style — backend

REST API and Telegram bot for the booking site of a hair salon in Prague.

**Site:** https://www.taisiiastyle.cz  
**Frontend repository:** [taisiya-portfolio-frontend](https://github.com/kuzmavasil74/taisiya-portfolio-frontend)

## Stack

Node.js 22 (ESM) · Express · MongoDB (Mongoose 8, replica set for transactions) · JWT · bcryptjs · yup · luxon · express-rate-limit · node-telegram-bot-api · `node:test`

## How booking works

- **Atomic reservations.** A booking occupies one `BookedSlot` document per 30-minute slot (service duration + 15 minutes of buffer, rounded up to slots). `BookedSlot.slot` has a unique index and the booking plus its slots are written in one MongoDB transaction, so two simultaneous requests can never take the same time (the loser gets `409`).
- **Schedule rules** (`utils/schedule.js`, Europe/Prague): Monday, Wednesday and Friday, 09:00–20:00, start on a 30-minute boundary, the service must end before closing, no dates in the past.
- **Single source of truth for services.** Durations and prices live in `controllers/bookingController.js` and are served by `GET /bookings/services`; the server ignores any price or duration from the client.
- **Loyalty.** 1 point per 100 CZK for bookings made while logged in; points are revoked once if the booking is canceled or deleted. The referral bonus (50 points each) is paid after the invitee's first booking, not on signup.
- **Permissions.** Clients can create bookings (guests too), read their own and cancel them. Confirming, editing and rescheduling are admin-only; a reschedule re-reserves slots atomically.
- **Telegram.** A new booking is posted to the admin chat with confirm/cancel buttons; clients subscribe to reminders through a `/start` deep link. A separate worker sends reminders a day and an hour ahead and asks for a review two hours after the visit.

## API

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/auth/register`, `/auth/login` | public (rate limited) |
| `GET` | `/bookings/services` | public |
| `GET` | `/bookings/available-slots?date=YYYY-MM-DD` | public |
| `POST` | `/bookings` | public; a valid Bearer token links the booking to the account (rate limited) |
| `POST` | `/bookings/waitlist` | public (rate limited) |
| `GET` | `/bookings/all` | logged in: own bookings, admin: all |
| `GET` `PUT` `PATCH` `DELETE` | `/bookings/:id` | owner or admin (clients can only cancel) |
| `GET` | `/bookings?status=upcoming\|archive&page=&limit=` | admin |
| `GET` | `/feedback` | public |
| `POST` | `/feedback` | logged in (rate limited) |
| `DELETE` | `/feedback/:id` | admin |
| `GET` `DELETE` | `/users/me` | logged in (delete anonymizes bookings) |
| `GET` `POST` `PUT` `DELETE` | `/users`, `/users/:id` | admin |
| `GET` | `/admin/stats`, `/admin/users` | admin |
| `GET` | `/health` | public (no DB access) |

## Development

Requires Node.js 22 and a MongoDB replica set (a free Atlas cluster works).

```bash
npm install
cp .env.example .env   # or create .env with the variables below
npm run dev            # nodemon, http://localhost:4000
npm test               # unit + integration tests (in-memory MongoDB replica set)
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET`, `JWT_EXPIRES` | token signing secret and lifetime (default `1d`) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | bot token and the chat/group that receives booking notifications |
| `ENABLE_BOT_POLLING` | `true` on exactly one instance (the API); see below |
| `CORS_ORIGINS` | optional, comma-separated extra allowed origins |
| `PORT` | set by the host; default `4000` |

### Tests

`npm test` runs `node --test`: schedule rules, service labels, and integration tests of the booking flow (double booking, overlaps and buffer, concurrent requests, working hours, points, ownership rules, rescheduling, referral bonus) against an in-memory MongoDB replica set. GitHub Actions runs them on every push.

### Utilities

```bash
MONGO_URI="..." NEW_PASSWORD="..." node scripts/reset-password.js user@example.com
```

Resets a user's password (there is no self-service reset yet).

## Deployment (Railway, project `taisiya-style`)

| Service | Start command | Notes |
| --- | --- | --- |
| `backend` | `node index.js` | healthcheck `/health`, `ENABLE_BOT_POLLING=true` |
| `reminder-worker` | `node reminderService.js` | reminders and review requests, no polling |

Both services deploy automatically on every push to `main`.

Run **only one** instance with `ENABLE_BOT_POLLING=true`: Telegram answers `409 Conflict` when two processes poll the same bot.
