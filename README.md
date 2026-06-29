# Announcement App — Shopify Storefront Banner

A Shopify embedded app that lets a merchant publish a store-wide announcement from
the admin, persists every change to MongoDB for audit history, syncs the latest
message into a **Shop Metafield** via the Shopify Admin API, and displays it as a
floating banner on every storefront page through a **Theme App Extension**.

```
Admin Dashboard  ─▶  MongoDB (audit log)
        │
        └────────▶  Shopify Admin API ─▶ Shop Metafield (my_app.announcement)
                                                │
                                                ▼
                              Theme App Extension (App Embed Block)
                                                │
                                                ▼
                                   Storefront banner on every page
```

---

## Features

- Embedded admin dashboard built with **React + Polaris** (text field + Save button).
- Every save is written to **MongoDB** with a timestamp (audit history).
- The latest value is pushed to a **Shop Metafield** (`my_app.announcement`) using the
  GraphQL Admin API (`metafieldsSet`) — no deprecated ScriptTags.
- A **Theme App Extension** App Embed Block reads the metafield in Liquid and renders a
  sticky, dismissible banner across the storefront.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend (admin) | React, Shopify Polaris, App Bridge |
| Server | Node.js, React Router (Shopify App template) |
| Session storage | Prisma + SQLite |
| App database | MongoDB (Atlas) |
| Storefront | Theme App Extension (Liquid) |
| API | Shopify GraphQL Admin API (Shop Metafields) |

> Stack covers the MERN requirement: **M**ongoDB for the audit log, **R**eact for the
> dashboard, **N**ode for the server. The server framework is the Shopify React Router
> app template (the modern successor to the Remix template).

---

## Prerequisites

- **Node.js** 20+ and npm
- **Shopify Partner account** — https://partners.shopify.com
- A **development store** created from the Partner Dashboard
- **Shopify CLI** (`npm install -g @shopify/cli@latest`)
- A **MongoDB** connection string (e.g. MongoDB Atlas)

---

## Setup & Installation

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/announcement-app.git
cd announcement-app
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root (and/or `prisma/.env`). **Never commit this file.**

```env
SHOPIFY_API_KEY=your_app_client_id
SHOPIFY_API_SECRET=your_app_client_secret
SHOPIFY_APP_URL=https://your-tunnel-url.example.dev

# Prisma session store (SQLite)
DATABASE_URL="file:./dev.db"

# MongoDB audit log
MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/?appName=Cluster0"
```

Notes:
- Replace `USER`/`PASSWORD` with your real Atlas credentials, and **URL-encode** any
  special characters in the password (e.g. `@` → `%40`, `:` → `%3A`).
- `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` come from your app in the Partner Dashboard.
- The Shopify CLI manages `SHOPIFY_APP_URL` automatically during `dev`.

### 3. Set up the session database (Prisma)

```bash
npx prisma generate
npx prisma migrate deploy
```

### 4. Allow MongoDB network access

In MongoDB Atlas → **Network Access**, add your current IP (or `0.0.0.0/0` for local
development only). Make sure the cluster is running (free clusters auto-pause).

---

## Running Locally

```bash
shopify app dev
```

This starts the dev server, opens a tunnel, updates the app URLs, and gives you a
preview link to install the app on your development store. Open the app from the store's
admin and you'll see the **Announcement Manager** page.

---

## Theme App Extension (Storefront Banner)

The extension lives in `extensions/promo-banner` and ships an **App Embed Block** so the
banner floats on every page.

1. In your dev store theme: **Online Store → Themes → Customize → App embeds**, enable
   **Announcement Banner**, and save.
2. The block reads the metafield in Liquid:

   ```liquid
   {% assign announcement_text = shop.metafields.my_app.announcement %}
   {% if announcement_text != blank %}
     <div id="announcement-banner">{{ announcement_text }}</div>
   {% endif %}
   ```

### Metafield visibility (important)

For `shop.metafields.my_app.announcement` to be readable in Liquid, create a metafield
definition with **storefront access enabled**:

- **Settings → Custom data → Metafields (Shop)** → add definition
- Namespace & key: `my_app.announcement`
- Type: **Single line text**
- Enable storefront access

Without this, the banner stays empty even when the save succeeds.

---

## Required Access Scopes

`shopify.app.toml` requests the scopes the app needs:

```toml
[access_scopes]
scopes = "write_products,write_metafields"
```

If you change scopes, run `shopify app deploy` and reinstall/re-authenticate the app so
the new permissions are granted.

---

## Deployment

Deploy the Node app to any host (Render, Vercel, Fly.io, Heroku, Railway):

1. Set the same environment variables on the host.
2. Point `application_url` and the `[auth].redirect_urls` in `shopify.app.toml` at the
   production URL.
3. Release the config and extension:

   ```bash
   shopify app deploy
   ```

---

## Project Structure

```
app/
  routes/
    app.tsx                     # Embedded layout: App Bridge + Polaris providers
    app._index.tsx              # Announcement Manager dashboard (React/Polaris)
    api.save-announcement.tsx   # Action: save to Mongo + sync Shop Metafield
    auth.$.tsx, auth.login/     # OAuth routes
    webhooks.*.tsx              # App webhooks
  mongodb.server.ts             # MongoDB connection + announcement helpers
  shopify.server.ts             # Shopify app config (apiVersion, auth, webhooks)
  prisma.server.ts              # Prisma client
prisma/
  schema.prisma                 # Session model
  migrations/                   # Session table migration
extensions/
  promo-banner/                 # Theme App Extension (App Embed Block)
shopify.app.toml                # App configuration (URLs, scopes, webhooks)
```

---

## How It Maps to the Task

| Requirement | Where |
| --- | --- |
| Admin dashboard with text field + Save | `app/routes/app._index.tsx` |
| Save text + timestamp to MongoDB | `app/mongodb.server.ts` |
| Sync to Shop Metafield via Admin API | `app/routes/api.save-announcement.tsx` |
| Theme App Extension App Embed Block + Liquid | `extensions/promo-banner` |
| `shop.metafields` (no ScriptTags) | Liquid + `metafieldsSet` |

---

## Troubleshooting

- **`Missing values for: apiVersion`** — set `apiVersion` in `shopify.server.ts`.
- **`column Session.createdAt does not exist`** — Prisma schema/DB drift; run
  `npx prisma generate` after aligning `schema.prisma` with the migration.
- **MongoDB `Topology is closed`** — connection singleton lost across HMR; cache the
  client on `globalThis` (already handled in `mongodb.server.ts`).
- **MongoDB `SSL alert number 80`** — add your IP to Atlas Network Access; on Ubuntu
  24.04, install the `libssl1.1` compatibility package.
- **`No i18n was provided`** — Polaris React needs `<AppProvider i18n={...}>` from
  `@shopify/polaris` (already wired in `app.tsx`).
- **`Internal server error` on Save** — body format mismatch; the action handles both
  JSON and form-encoded bodies.
- **Banner empty on storefront** — create the metafield definition with storefront
  access (see above).

---

## Security

- `.env` / `prisma/.env` are gitignored — **never commit secrets**.
- If credentials are ever exposed, rotate the MongoDB password and the Shopify API
  secret immediately.
