import React from 'react';
import { ALL_FOOD_TYPES, FOOD_META, POWERUP_META } from '../types/game';

interface TutorialProps {
  onBack: () => void;
}

export const Tutorial: React.FC<TutorialProps> = ({ onBack }) => {
  return (
    <div className="min-h-[100dvh] bg-dusk-800 dark:bg-dusk-950 text-cream-100 px-4 pt-6 pb-10">
      <header className="flex items-center gap-3 mb-6 max-w-md mx-auto">
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-10 h-10 rounded-full bg-dusk-700/70 border border-cream-100/10 flex items-center justify-center text-xl active:scale-90 transition-transform"
        >
          ←
        </button>
        <h1 className="font-display text-2xl text-marigold-400">How to Play</h1>
      </header>

      <div className="max-w-md mx-auto flex flex-col gap-4">
        <section className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4">
          <p className="font-display text-marigold-400 text-sm mb-2">1. Pick up &amp; drag tiles to your tray</p>
          <p className="font-body text-sm text-cream-200/80 leading-relaxed">
            The board is a stack of food tiles piled mahjong-style — you can always see a peek of what's
            buried underneath. Only uncovered tiles (nothing sitting on top of them) can be picked up. Drag
            one onto the tray to place it; let go anywhere else and it stays put.
          </p>
        </section>

        <section className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4">
          <p className="font-display text-marigold-400 text-sm mb-2">2. Match 3 identical tiles</p>
          <p className="font-body text-sm text-cream-200/80 leading-relaxed">
            The tray only holds 4 tiles — tight on purpose. The moment three of the same food land in the
            tray, they clear out automatically.
          </p>
        </section>

        <section className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4">
          <p className="font-display text-marigold-400 text-sm mb-2">3. Win &amp; lose conditions</p>
          <p className="font-body text-sm text-cream-200/80 leading-relaxed">
            Clear every tile from the board to win the level. But if your 4 tray slots fill up with no match
            available — or the timer runs out — the level is lost. Difficulty is real from level 1, so plan
            which tiles you uncover carefully!
          </p>
        </section>

        <section className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4">
          <p className="font-display text-marigold-400 text-sm mb-3">The food tiles</p>
          <div className="grid grid-cols-5 gap-2">
            {ALL_FOOD_TYPES.map((type) => {
              const meta = FOOD_META[type];
              return (
                <div key={type} className="flex flex-col items-center gap-1">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-tile border-2 border-white/30"
                    style={{ background: `linear-gradient(155deg, ${meta.color}, ${meta.color}cc)` }}
                  >
                    <span aria-hidden="true">{meta.emoji}</span>
                  </div>
                  <span className="font-mono text-[10px] text-cream-200/70">{meta.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4">
          <p className="font-display text-marigold-400 text-sm mb-3">Powerup tiles</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(POWERUP_META).map((p) => (
              <div key={p.kind} className="flex flex-col items-center gap-1 text-center">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-tile border-2 border-white/30"
                  style={{ background: `linear-gradient(155deg, ${p.color}, ${p.color}cc)` }}
                >
                  <span aria-hidden="true">{p.emoji}</span>
                </div>
                <span className="font-mono text-[10px] text-cream-200/70">{p.description}</span>
              </div>
            ))}
          </div>
          <p className="font-body text-xs text-cream-200/60 mt-3 leading-relaxed">
            Powerup tiles are always uncovered the moment they appear — grab them any time, they never take
            up a tray slot.
          </p>
        </section>

        <section className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4">
          <p className="font-display text-marigold-400 text-sm mb-2">4. One shared table, always on</p>
          <p className="font-body text-sm text-cream-200/80 leading-relaxed">
            There's no single-player mode and no room code to share. Just be in the same Discord
            voice/text channel as everyone else — opening the game drops you straight onto the one table
            for that channel, mid-level if it's already going. When the table clears a level (or overflows),
            it automatically moves on to the next one after a short countdown — anyone can skip that wait
            instead of waiting it out.
          </p>
        </section>

        <section className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4">
          <p className="font-display text-marigold-400 text-sm mb-2">5. Daily rewards &amp; achievements</p>
          <p className="font-body text-sm text-cream-200/80 leading-relaxed">
            Open the 🎁 Daily button on the main menu once a day for free Market Tokens — come back on
            consecutive days for bigger rewards. Achievements on the main menu track milestones like combos,
            wins, and joining a game already in progress, and each one pays out tokens too.
          </p>
        </section>

        <button
          onClick={onBack}
          className="rounded-full bg-marigold-500 hover:bg-marigold-600 text-dusk-950 font-display text-lg py-3 mt-2 shadow-tile active:scale-95 transition-transform"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};
