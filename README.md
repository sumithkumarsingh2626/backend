# Price Drop Alert — Backend

Production-oriented Express + TypeScript API with MongoDB, Redis/BullMQ, Zod validation, and JWT RBAC.

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Nodemon + `tsx` hot reload |
| `npm run build` | Emit `dist/` via `tsc` |
| `npm start` | Run compiled `dist/server.js` |

## Layout

See `src/` — `configs`, `constants`, `controllers`, `jobs`, `lib`, `middlewares`, `models`, `queues`, `routes`, `scrapers`, `services`, `types`, `utils`, `validators`.

## Bootstrap

Copy `.env.example` → `.env`, start MongoDB + Redis, then `npm run dev`.
