# Pickleball Intelligence — Version 1.1

This browser prototype adds persistent named sessions and makes recorded results immediately visible.

## New in 1.1

- Session name, date, and automatically displayed day of week
- Load a roster from a previous session
- Search/select players for the current session
- Matchmaking mode emphasized inside Session Setup
- Team A and Team B labels on generated matches
- Player names directly above score inputs
- Typed score entry from 0–21 with common-value suggestions
- Results tab with:
  - ranked standings
  - wins and losses
  - win percentage
  - points for and against
  - point differential
  - complete game log
- Live results summary on the Session page
- Chemistry page with:
  - session filter
  - player filter
  - all-partnership ranking
  - detailed two-player chemistry profile
- Gender choices changed to Male and Female
- Existing Version 1 browser data is migrated where possible

## Install on GitHub Pages

Replace these four files in the repository root:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`

Commit the replacement files. GitHub Pages should rebuild automatically.

## Statistical status

The current build uses an explainable Elo/Glicko-inspired approximation, confidence/error-bar logic, partnership outcome effects, side/style bonuses, and multi-objective matchup scoring. It is not yet a formally calibrated Glicko-2 implementation. A later server-backed version should implement and test true Glicko-2 updates, doubles contribution modeling, Bayesian chemistry shrinkage, and optimizer calibration.
