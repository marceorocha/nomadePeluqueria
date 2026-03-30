# Nomade — Aesthetic Clinic & Hair Salon

Full-stack appointment booking app for an aesthetic clinic and hair salon. Supports public booking, staff walk-ins, VIP tiers, and calendar sync.

## Structure

- **client** — React + TypeScript frontend
- **server** — Node.js + Express + Prisma API

## Setup

1. Install dependencies: `npm install`
2. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL`, `JWT_SECRET`, etc.
3. Run migrations: `npm run db:push` (or `npm run db:migrate`)
4. Start dev: `npm run dev`

## First-time API

- **POST /api/bookings** — Public booking (no auth)
- **GET /api/availability** — Available slots (query: date, serviceId, clientTier)
