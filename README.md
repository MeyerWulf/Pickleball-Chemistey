# Pickleball IQ Alpha — Organizer Core

A mobile-friendly, local-first organizer application for player check-in, doubles stages, scoring, and standings. The legacy v1 prototype remains unchanged on `main`; this branch is the V2 implementation.

## Architecture

- **Domain** (`src/domain`): validated schemas and pure scoring, lifecycle, scheduling, and standings rules.
- **Application** (`src/application`): commands create immutable state transitions; UI handlers never mutate entities.
- **Infrastructure** (`src/infrastructure`): schema-versioned local persistence and validated JSON backup/restore.
- **UI** (`src/App.tsx`): React feature views with accessible labels, keyboard focus, responsive layouts, and visible errors.

Data is local to the browser. Every command is validated and explicitly persisted; rendering has no persistence side effects. Version 1 backups are validated with Zod and incompatible data is rejected.

## Development and preview

Requires Node 22+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. For an exact production preview:

```bash
npm run build
npm run preview -- --host 0.0.0.0
```

Then open `http://localhost:4173`.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:integration
npm run test:e2e
npm run build
```

Install Playwright once with `npx playwright install chromium` if Chromium is not already present.

## Manual QA checklist

- Create, open, complete, reopen, and delete an event.
- Override target score, win-by rule, and court count during event creation.
- Add, edit, search, archive, and restore players.
- Check players in and confirm archived historical players remain visible.
- Generate a balanced stage and verify byes are named explicitly.
- Adjust generated teams and courts before starting the stage.
- Start a stage; record, correct, and delete a score; verify standings update.
- Verify an invalid or tied score shows a visible error.
- Refresh and verify data remains.
- Export, clear in browser storage, and restore a backup.
- Verify completed events are read-only until reopened.
- Repeat core actions at a mobile viewport using keyboard navigation.

## Known Alpha limitations

Local, single-browser storage only. There is no authentication, sync, server backup, QR support, DUPR integration, chemistry, advanced Match IQ, leagues, ladders, or TV mode. Balanced generation currently creates one wave, fills available courts, and assigns remaining checked-in players explicit byes. Reopen controls write access to completed events. Manual assignments are edited within each generated match; adding entirely new ad-hoc matches is not yet supported.
