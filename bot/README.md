# Bam Baroh Discord Bot

A companion bot with read-only profile/leaderboard/fun slash commands. It
never plays the game or mutates progress — it only reads what the game
server already tracks in its own SQLite `accounts` table (xp, wins, matches,
accuracy, speed) plus a few read-only fields from each player's synced save
blob (tokens, achievements, daily streak, playtime).

## Why some commands aren't here

Two categories were left out on purpose:

1. **Needs a new game system** — gems, seasons, friends/parties, quests,
   shop/inventory/redeem/gifting, badges/history as separate concepts. None
   of that data exists yet; adding these commands would just be decoration
   around numbers that don't mean anything.
2. **Unsafe to mutate via the bot right now** — anything that *writes* to a
   player's save blob (claiming a daily/weekly reward, granting XP/coins,
   resetting a player). The game client is the sole writer of that blob
   today (a debounced push ~1.5s after any local change — see
   `SaveContext.tsx`), so a bot-side write would very likely get silently
   overwritten the next time that player's client autosaves. Fixing this
   safely means adding a small conflict-check to the client's save sync
   first — worth doing, but it's a real change to an existing system, which
   is exactly what you asked to avoid this round.

`/bb-daily` and `/bb-streak` are included as **read-only** status checks for
that reason — they tell you whether today's reward is claimed and what your
streak is, but you still claim it in the game itself.

## Setup

1. **Discord Developer Portal** → your application (can be the same one the
   Activity uses) → **Bot** tab:
   - Create/reset the bot token → this is `DISCORD_BOT_TOKEN`.
   - Under **Privileged Gateway Intents**, enable **Server Members Intent**
     (only used to scope `/bb-leaderboard` to the current server — every
     other command works without it).
   - **General Information** tab → Application ID is `DISCORD_APPLICATION_ID`.
   - Invite the bot to your server with the `bot` and `applications.commands`
     scopes (OAuth2 → URL Generator).

2. **Game server** (`server/.env`): add a `BOT_API_KEY` — any long random
   string. Restart the game server after adding it.

3. **This bot** (`bot/.env`, copy from `.env.example`):
   ```
   DISCORD_BOT_TOKEN=...
   DISCORD_APPLICATION_ID=...
   DISCORD_DEV_GUILD_ID=...        # optional, for instant command updates while developing
   GAME_SERVER_URL=http://localhost:3001
   BOT_API_KEY=...                 # must exactly match the game server's BOT_API_KEY
   ```

4. Install and register commands, then run the bot:
   ```
   cd bot
   npm install
   npm run deploy-commands   # registers the /bb-* commands with Discord
   npm start
   ```

   Global command registration can take up to ~1 hour to show up everywhere;
   set `DISCORD_DEV_GUILD_ID` to your test server's ID for instant updates
   while you're iterating.

## How a command resolves

```
/bb-profile  ──▶  bot reads interaction.user.id (Discord user id)
                  ──▶  GET {GAME_SERVER_URL}/api/bot/profile/:discordId
                       (header: x-bot-api-key)
                  ──▶  game server looks up accounts.discord_id
                  ──▶  bot formats an embed, replies
```

If someone runs a command who has never opened the Activity (no account
linked to their Discord id yet), they get a friendly "not linked yet"
message instead of an error.

## Commands

**Player:** `/bb-profile` `/bb-level` `/bb-rank` `/bb-stats`
`/bb-achievements` `/bb-titles` `/bb-coins` `/bb-streak` `/bb-daily`

**Leaderboards:** `/bb-leaderboard` (this server) `/bb-global` `/bb-xpboard`
`/bb-levelboard` `/bb-winboard` `/bb-streakboard` `/bb-playtime`

**Fun (no backend needed):** `/bb-foodfact` `/bb-randomdish` `/bb-tip`
`/bb-meme`
