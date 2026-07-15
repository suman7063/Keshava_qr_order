# bicres — QR Ordering SaaS for Restaurants

Multi-tenant QR ordering platform built with **Next.js 16 (App Router)**, **Supabase** and **Tailwind CSS 4**. Restaurants sign up, get their own subdomain (`zara.bicres.com`), print QR codes per table, and customers order from their phone — no app install.

## Features

- **Self-serve onboarding** — email + password signup with verification, subdomain picker with live availability check, Free / Pro (14-day trial) plans
- **Menu management** — categories, items with images, veg/vegan flags, CSV export, printable PDF menus (5 templates)
- **Tables & QR codes** — per-table QR, 4 printable card templates with custom colors/text
- **Customer ordering** — mobile menu, cart, table sessions with a shared 6-digit join code, live order tracking, bill request
- **Manager dashboard** — accept/reject orders, KOT thermal print, bill requests, daily stats, new-order sound alert
- **Kitchen display** — realtime confirmed → preparing → ready pipeline
- **Superadmin panel** — manage all tenants, plans and status
- **Security** — tenant-scoped RLS policies, role-based API authorization (admin / manager / superadmin), server-side pricing, plan limit enforcement, audit logs

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase keys
npm run dev
```

### Database setup

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the SQL editor (fresh install), **then run every file in `supabase/migrations/` in order** — `003_saas_security.sql` is required; without it the RLS policies are allow-all.
   - Or with the CLI: `SUPABASE_PROJECT_REF=<ref> npm run supabase:deploy`
3. Create your superadmin: sign up a user, then insert a row in `user_roles` with `role = 'superadmin'` (restaurant_id NULL) via the SQL editor.

### Environment variables

See [.env.example](.env.example). The service-role key is server-only.

### Multi-tenancy

The proxy ([src/proxy.ts](src/proxy.ts)) extracts the subdomain from the Host header and forwards it as `x-subdomain`; every API route resolves the tenant from it. Locally, everything maps to the `default` tenant.

## Plans & billing

Plan limits live in [src/lib/plans.ts](src/lib/plans.ts) and are enforced in the tables / menu-items APIs. Self-serve Pro signups get a 14-day trial (`restaurants.trial_ends_at`), after which limits fall back to Free. A `subscriptions` table skeleton exists for the payment-gateway integration (Razorpay/Stripe) — **not wired up yet**; plan changes are currently manual via the superadmin panel.

## Deployment

- **App**: Netlify/Vercel — set the env vars from `.env.example`, wildcard domain `*.bicres.com` pointed at the app.
- **Database**: pushing to `main` with changes under `supabase/` runs the migration workflow (`.github/workflows/deploy-supabase.yml`). CI (lint + typecheck + build) runs on every push/PR.
