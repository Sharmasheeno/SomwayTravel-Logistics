# Deploying SomWay Travel & Logistics (Render)

This app is **two services** that run together:

1. **API** — the Express server (`npm run server`) that talks to MongoDB Atlas.
2. **Web** — the Vinext website (`npm run start:web`) that people open in the browser.

Login uses a **session cookie**, so the two services are configured to share that
cookie across their two HTTPS URLs.

You will deploy with **Render** using the included `render.yaml` blueprint, which
creates and wires up both services for you.

---

## Before you start

You need a **MongoDB Atlas** connection string (you already have one), and its
Network Access list must allow Render. The simplest option is to allow all IPs:

- Atlas → **Security → Network Access → Add IP Address → Allow access from anywhere** (`0.0.0.0/0`).

> ⚠️ Rotate your Atlas database password if it was ever shared in chat, then use
> the new password in the connection string below.

Your connection string should include a database name, e.g.:

```
mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/somway?retryWrites=true&w=majority
```

---

## Step 1 — Push this repo to GitHub

The code is already on GitHub at `Sharmasheeno/SomwayTravel-Logistics`. Make sure
the branch you want to deploy (this one) is pushed.

## Step 2 — Create the Blueprint on Render

1. Go to <https://dashboard.render.com> and sign in (you can use "Sign in with
   GitHub").
2. Click **New → Blueprint**.
3. Choose the `SomwayTravel-Logistics` repository.
4. Render reads `render.yaml` and shows **two services**: `somway-api` and
   `somway-web`. Click **Apply**.

Render now builds both. The first build takes a few minutes.

## Step 3 — Add your secrets

Render marks a few values as "must be set by you" (they are never stored in the
repo). Open each service → **Environment** and fill in:

On **somway-api**:

| Key | Value |
| --- | --- |
| `MONGODB_URI` | your Atlas connection string (with a database name) |
| `SEED_OWNER_PASSWORD` | a strong password (≥10 chars, letter+number+symbol) |
| `SEED_OWNER2_PASSWORD` | a strong password |
| `SEED_OFFICER_PASSWORD` | a strong password |

Everything else (ports, the two service URLs, CORS, cookie settings) is filled in
automatically by the blueprint. Click **Save**, which redeploys the API.

## Step 4 — Create the login accounts

Once **somway-api** is live (green), create the default users:

1. Open **somway-api** → **Shell** (in the Render dashboard).
2. Run:

   ```bash
   npm run seed:users
   ```

   It prints the accounts once, e.g.:

   ```
   Primary Owner | owner@somway.local | <your password> | owner
   Operations Officer | officer@somway.local | <your password> | operator
   ```

> No Shell on the free plan? You can instead run `npm run seed:users` locally
> with the same `MONGODB_URI` in your `.env` — it writes to the same Atlas
> database.

## Step 5 — Log in

Open the **somway-web** URL Render gives you (e.g.
`https://somway-web.onrender.com`), go to **`/admin`**, and sign in with one of
the seeded emails and passwords.

---

## Notes

- **Free plan sleeps.** Render's free web services spin down after inactivity, so
  the first request after idle takes ~30–60s to wake up. Upgrade the plan to keep
  it always on.
- **Custom domain.** Add one under each service's **Settings → Custom Domains**.
  If you change the web URL, the API's `CORS_ALLOWED_ORIGINS` updates
  automatically because it is linked to the web service.
- **Railway** works the same way (two services, same env vars) if you prefer it;
  Railway has no blueprint file, so you would create the two services by hand and
  set the same variables shown in `render.yaml`.
