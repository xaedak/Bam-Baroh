# Bam Baroh 🥮

A Bengali night-market themed tile-matching game. Tap food tiles from a
layered board into a 7-slot tray — match three identical tiles to clear
them before the tray overflows.

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS (custom "night market" theme, dark mode via `class` strategy)

## Getting Started

```bash
npm install
npm run dev       # start local dev server
npm run build      # production build to dist/
npm run preview    # preview the production build
```

## Features

- **Main Menu** — title, continue/play, scrollable 100-level select grid with lock/star state
- **Play Screen** — layered board, 7-slot tray, live tile counter, optional countdown timer
- **Settings** — dark mode, music, and SFX toggles, plus a progress reset
- **Tutorial** — walkthrough of the match-3 tray mechanic and the food tiles, shown automatically on first launch

## Game Rules

- Tap any **uncovered** tile (nothing stacked on top of it) to send it to the tray.
- The moment **3 identical tiles** land in the tray, they clear automatically.
- **Win** a level by clearing every tile from the board.
- **Lose** a level if the 7-slot tray fills up with no match available, or (on later levels) if the timer runs out.
- **100 procedurally generated levels** scale difficulty smoothly: bigger boards, more stacked layers, more food types (Pork, Fish, Chicken, Rice, Pitha), and tighter timers as you progress. Each level is deterministically generated from its level number, so the same level always looks the same.
- Progress (unlocked levels, stars, settings) is saved automatically to `localStorage`.

## Audio

All music and sound effects are synthesized in-browser with the Web Audio
API — there are no external audio files, so the game has zero binary
asset dependencies.

## Multiplayer (co-op)

Play the shared board together in real time over Socket.IO — up to 8 players per room.

**1. Start the multiplayer server** (separate Node process, in `server/`):

```bash
cd server
npm install
npm start          # listens on :3001 by default (PORT env var to change)
```

**2. Point the client at it** (only needed if not using the default `http://localhost:3001`):

```bash
# in the project root, before `npm run dev` / `npm run build`
echo "VITE_SOCKET_URL=http://your-server:3001" > .env
```

You can also change the server URL at runtime from the in-app Multiplayer menu ("Show server settings").

**How it works:**
- One player **creates a room** and gets a 4-character room code to share; others **join** with that code.
- The **host** picks the level and controls **Start**, **Restart**, and can **kick** any player.
- The board and tray are fully shared — any player can tap a tile, and the match/score updates sync to everyone instantly. The server is authoritative (it runs the same board generator and match-3 logic as single-player) so all clients always agree on state.
- Rooms are capped at 8 players and close automatically once everyone leaves.

## Project Structure

```
src/
  components/   Main Menu, Play Screen, Settings, Tutorial, Tile, Tray, ResultModal,
                Multiplayer Menu/Lobby/PlayScreen
  data/         procedural level generator + seeded RNG
  hooks/        game engine (state machine) + audio manager
  multiplayer/  socket connection helper + shared client-side types
  state/        save/settings context + multiplayer context (both backed by
                localStorage / Socket.IO respectively)
  types/        shared TypeScript types
server/         standalone Socket.IO server: rooms, host controls, authoritative
                board/match logic (ported from src/data + the game engine)
```
