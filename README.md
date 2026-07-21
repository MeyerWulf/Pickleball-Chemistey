# Pickleball Intelligence — Version 1 prototype

Open `index.html` on a desktop browser, or publish all four files together through GitHub Pages, Netlify, or Vercel. On iPhone, use the hosted website rather than the Files preview.

## Included

- Add and edit players with Cancel, X, and tap-outside dismissal
- Archive and restore players without deleting history
- Required age
- External/DUPR rating, internal rating, and session rating
- Rating uncertainty shown as error bars
- Handedness, optional gender, preferred side, play style, club, contact fields, DUPR profile ID, notes, and consent
- Up to 25 courts
- Competitive, balanced, chemistry-discovery, and social matchmaking modes
- Win/loss records and win percentage
- Communication, court coverage, transition game, finishing, consistency, and enjoyment chemistry dimensions
- Chemistry confidence and error bars
- Transparent “Why?” explanations
- Session health score
- CSV import and CSV/JSON export
- Browser-local data persistence

## Important limitation

This is still a browser prototype. The rating update is an explainable Elo/Glicko-inspired approximation, not yet a formally validated Glicko-2 service. A club-ready build requires secure accounts, encrypted contact data, administrator permissions, legal/privacy review, a server database, and an approved DUPR API/OAuth connection. It must never collect DUPR passwords.
