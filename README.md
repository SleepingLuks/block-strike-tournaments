# Block Strike Tournaments

Responsive static frontend for the Block Strike community tournament platform.

## Pages
- `index.html` — homepage and tournament format overview.
- `tournaments.html` — tournament directory with format/status filters and results archive.
- `tournament.html` — reusable tournament detail template: overview, participants, matches, bracket and standings.
- `admin.html` — admin workspace layout for tournament creation, player management, match scores and administrator roles.
- `style.css` — shared responsive black/red design.
- `script.js` — Russian/English interface language switch and basic UI interactions.

## Publish with GitHub Pages
Repository Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

## Important implementation status
The public pages intentionally start empty. No fake tournaments, players, scores or demo brackets are included. The admin form is disabled until a real backend is connected.

This repository is currently a static frontend. Telegram login, server-side Telegram signature validation, administrator allowlisting/roles, database persistence, tournament generation and score management are NOT implemented yet. Do not treat the visual admin page as an authenticated admin system.

## Planned backend
Use a database (e.g. Supabase/PostgreSQL) and trusted server-side endpoints. Telegram authentication must validate the Telegram payload hash on the server. Main administrator privileges must be assigned from trusted configuration/database state, never from client-side values.

Tournament formats:
- Single Elimination: knockout bracket.
- Swiss System: configurable rounds and standings-based pairings. Confirm scoring/draw policy before implementing tournament logic.
