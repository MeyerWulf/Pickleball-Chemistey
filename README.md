# Pickleball Chemistry — Browser Prototype

A no-install prototype for balanced pickleball open-play matchmaking.

## Run it

Open `index.html` in Chrome, Safari, Edge, or Firefox.

For the most reliable local experience, serve the folder with any simple web server, for example:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Included

- Player roster and active-session selection
- 1.0–5.0 skill ratings
- Multi-court match generation
- Team balancing based on skill plus partnership chemistry
- Fairness based on games played
- Repeat-partner penalty
- Predicted win probabilities
- Match-result entry
- Learned chemistry ratings
- Local browser persistence using `localStorage`

## Prototype limitations

This version is single-device and local only. It has no user accounts, cloud database, DUPR integration, authentication, or real-time club management yet.
