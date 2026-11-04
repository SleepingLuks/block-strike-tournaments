# Block Strike Tournaments

Responsive static frontend for the Block Strike community tournament platform.

## Pages
- `index.html` — homepage and tournament format overview.
- `tournaments.html` — tournament directory with format/status filters and results archive.
- `tournament.html` — reusable tournament detail template: overview, participants, matches, bracket and standings.
- `admin.html` — admin workspace layout for tournament creation, player management, match scores and administrator roles.
- `style.css` — shared responsive black/red design.
- `script.js` — Russian/English interface language switch and basic UI interactions.
- `database.js` — public read-only Supabase integration for the homepage, tournament directory and tournament details.

## Publish with GitHub Pages
Repository Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

## Important implementation status
The public pages intentionally start empty. No fake tournaments, players, scores or demo brackets are included. The admin form is disabled until a real backend is connected.

This repository is a static frontend connected to Supabase for public tournament reads. The homepage, tournament directory and tournament detail page load published tournament data from the database. Admin writes, Telegram login, server-side Telegram signature validation, administrator allowlisting/roles, bracket generation and score management are NOT implemented yet. Do not treat the visual admin page as an authenticated admin system.

## Planned backend
Supabase project: `https://cmnkimnhogeatciffpkm.supabase.co`. The browser uses the publishable key in `database.js`; RLS policies restrict it to public read access. Never place the Supabase secret key in frontend files. Use trusted server-side endpoints. Telegram authentication must validate the Telegram payload hash on the server. Main administrator privileges must be assigned from trusted configuration/database state, never from client-side values.

Tournament formats:
- Single Elimination: knockout bracket.
- Swiss System: configurable rounds and standings-based pairings. Confirm scoring/draw policy before implementing tournament logic.
