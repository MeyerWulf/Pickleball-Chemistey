# Pickleball Intelligence — Version 1.2.1 (Flat Upload Fix)

A static, browser-based prototype for planning and operating multi-stage pickleball events.

## New in 1.2

- Event terminology: Event → Stage → Game → Team → Player
- Planned stages: 1, 2, 3, Custom, or Open-ended
- Flexible stage statuses: planned, in progress, completed, skipped, cancelled
- Add stage, start next stage, skip stage, cancel stage, and end event
- Stage formats:
  - Round-robin calibration
  - Ranked partner pairing
  - Fixed-partner competition
  - Re-sort by current standings
  - Custom
- Live forward projections for future ranked-pairing stages
- Editable and deletable scores with automatic recalculation
- Session Rating and delta from DUPR in standings
- PF, PA, and differential tooltips
- Chemistry entered with scores and retained as private organizer intelligence
- JSON backup/import and CSV standings export
- Modular file structure suitable for continued development

## Upload to GitHub Pages

Upload all seven files directly to the top level of your GitHub repository:

- `index.html`
- `styles.css`
- `app.js`
- `data.js`
- `engine.js`
- `store.js`
- `README.md`

This flattened maintenance build avoids missing-folder problems on GitHub Pages.

After GitHub Pages deploys, hard refresh the page:

- Mac: `Command + Shift + R`
- Windows: `Ctrl + F5`

## Storage

This prototype uses `localStorage`, so data is saved only in the current browser/device. Real-time phone scoring, QR joins, and multi-device synchronization will require a small cloud database in a future phase.
