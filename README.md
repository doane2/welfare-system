# Welfare Management System

A monorepo containing the frontend and backend for the Welfare Management System.

## Project Structure
- `apps/frontend`: Next.js + TypeScript (Deployed on Vercel)
- `apps/backend`: Express.js + Prisma (Deployed on Railway)

## Tech Stack
- **Frontend:** Next.js 16, Tailwind CSS, TypeScript
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL (Railway)
- **Storage:** Cloudinary (for member documents)

## Setup
1. Run `npm install` in the root.
2. Setup `.env` files in `apps/frontend` and `apps/backend`.
3. Run `npm run dev` to start the development environment.