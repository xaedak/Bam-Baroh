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

- **Main Menu** — animated, festival-themed home screen with an endless vertical level path (lock/star/milestone state), continue/play, daily rewards
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

## Discord Activity: account-based progression

When launched as a Discord Activity, the game signs the player in with their
real Discord identity instead of the old device-local save. Progress
(unlocked level, stars, achievements, stats, tokens, settings) is then
stored server-side against that Discord account, so it follows the player
to any other server where they open the Activity — not just this device.

**Setup:**

1. Create (or open) your app at the
   [Discord Developer Portal](https://discord.com/developers/applications).
2. Under **OAuth2**, copy the **Client ID** and (generate/copy) the **Client Secret**.
3. Server side — copy `server/.env.example` to `server/.env` and fill in:
   ```
   DISCORD_CLIENT_ID=...
   DISCORD_CLIENT_SECRET=...
   ```
4. Client side — copy `.env.example` (project root) to `.env` and fill in:
   ```
   VITE_DISCORD_CLIENT_ID=...
   ```
   (Same ID as above — this one is public and safe to ship to the browser;
   the secret must only ever live in `server/.env`.)
5. Under **Activities → URL Mappings** in the Developer Portal, map your
   root URL to wherever the client is deployed, per
   [Discord's Activities docs](https://discord.com/developers/docs/activities/development-guides/setting-up-authentication).

**How it works under the hood:**
- `src/discord/sdk.ts` detects whether the game is actually running inside
  Discord (vs. a plain browser tab) and, if so, drives the
  `@discord/embedded-app-sdk` authorize flow to get a one-time code.
- That code is sent to `POST /api/auth/discord` on the server, which is the
  only place the client secret is used, to exchange it for the player's
  real Discord user id.
- The server finds-or-creates one account per `discord_id` (never two, no
  matter how many servers/guilds the player launches from) and returns a
  normal session token — the same shape the existing username/password
  login already produces, so multiplayer and the leaderboard needed no
  changes.
- `GET`/`PUT /api/save` load and persist the full progression blob against
  that account. `SaveContext` hydrates from there once and then
  debounce-pushes local changes back up while signed in via Discord.
- Outside Discord (plain browser, local dev), none of this runs — the app
  falls back to the original `localStorage` save and the existing
  username/password login untouched.

**Important caveat:** the OAuth code exchange and the Embedded App SDK
handshake can only be exercised for real from inside the Discord client
itself, against a real Discord application. Both were built to Discord's
documented Activities flow, but neither could be run end-to-end in the
environment this was developed in (no network access, and no way to open
an actual Discord client) — please test the full login handshake for real
once you have Discord app credentials wired up.

## Project Structure

```
src/
  components/   Main Menu, Play Screen, Settings, Tutorial, Tile, Tray, ResultModal,
                Multiplayer Menu/Lobby/PlayScreen, LevelPath, FloatingFoods
  data/         procedural level generator + seeded RNG
  discord/      Discord Embedded App SDK wrapper (Activity detection + auth handshake)
  hooks/        game engine (state machine) + audio manager
  multiplayer/  socket connection helper + shared client-side types
  state/        save/settings context (localStorage + Discord-account sync)
                and multiplayer context (Socket.IO)
  types/        shared TypeScript types
server/         standalone Socket.IO + Express server: rooms, host controls, authoritative
                board/match logic, accounts (password or Discord), and cross-server
                progression storage
```
