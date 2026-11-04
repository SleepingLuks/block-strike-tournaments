# Block Strike Tournaments

Responsive static frontend for the Block Strike community tournament platform.

## Pages
- `index.html` — homepage and tournament format overview.
- `tournaments.html` — tournament directory with format/status filters.
- `tournament.html` — tournament details, participants, matches, bracket and standings.
- `admin.html` — private administrator login and moderator account management.
- `admin.js` — browser-side admin interface; no passwords or service keys are committed.
- `database.js` — public read-only Supabase integration.

## Hosting
Publish the static site with GitHub Pages: repository Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

## Supabase setup
Project URL: `https://cmnkimnhogeatciffpkm.supabase.co`.

The browser uses only the Supabase publishable key. Never put the Supabase secret key in frontend files or commit it to GitHub.

### Database migration
1. Keep the original tournament schema already created in Supabase.
2. Open Supabase → SQL Editor.
3. Run `supabase/migrations/202611040002_username_admin_accounts.sql`.
4. This creates a separate private `admin_accounts` table and server-side sessions. It leaves tournament/player data intact. It replaces the previous Telegram-linked admin session table.

### First administrator
In Supabase Dashboard → Edge Functions → Secrets, add:
- `INITIAL_ADMIN_USERNAME` — first administrator login (3–24 lowercase Latin letters, digits or underscore).
- `INITIAL_ADMIN_PASSWORD` — initial password, at least 10 characters.
- `SUPABASE_SECRET_KEY` — the project's secret API key.

Deploy the `admin-api` Edge Function from `supabase/functions/admin-api`. The first successful login using the exact bootstrap username/password creates the single `main_admin` account. After confirming that login works, remove `INITIAL_ADMIN_USERNAME` and `INITIAL_ADMIN_PASSWORD` from Edge Function secrets. Keep `SUPABASE_SECRET_KEY`.

### Administrator accounts
The main administrator creates moderator accounts inside `admin.html`, assigning permissions for tournaments, players, and matches/results. There is no public registration, email, or Telegram dependency. Moderator passwords are hashed server-side with PBKDF2-SHA-256; only a short-lived random session token is kept in the browser's session storage. Accounts can be disabled and their passwords reset by the main administrator.

## Tournament formats
- Single Elimination — knockout bracket.
- Swiss System — standings-based pairings. Confirm the scoring/draw policy before implementing Swiss round generation.

## Deployment status
The username/password login and moderator-account management interface and Edge Function source are committed. They are **not live** until the SQL migration is applied, Edge Function secrets are configured, and the function is deployed. Tournament management UI actions still need to be connected to their backend operations.
