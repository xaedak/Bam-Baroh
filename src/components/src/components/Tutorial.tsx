import React from 'react';
import { ALL_FOOD_TYPES, FOOD_META } from '../types/game';

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
          <p className="font-display text-marigold-400 text-sm mb-2">1. Tap tiles from the plate</p>
          <p className="font-body text-sm text-cream-200/80 leading-relaxed">
            The board is a stack of food tiles. Only uncovered tiles (nothing sitting on top of them) can be
            tapped. Tapping sends a tile down to your tray.
          </p>
        </section>

        <section className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4">
          <p className="font-display text-marigold-400 text-sm mb-2">2. Match 3 identical tiles</p>
          <p className="font-body text-sm text-cream-200/80 leading-relaxed">
            The tray holds up to 7 tiles. The moment three tiles of the same food appear in the tray, they
            clear out automatically.
          </p>
        </section>

        <section className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4">
          <p className="font-display text-marigold-400 text-sm mb-2">3. Win &amp; lose conditions</p>
          <p className="font-body text-sm text-cream-200/80 leading-relaxed">
            Clear every tile from the board to win the level. But if your 7 tray slots fill up with no match
            available — or the timer on later levels runs out — the level is lost. Plan which tiles you
            uncover carefully!
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
          <p className="font-display text-marigold-400 text-sm mb-2">4. Level up, endlessly</p>
          <p className="font-body text-sm text-cream-200/80 leading-relaxed">
            Levels are generated on the fly and never run out — difficulty keeps climbing well past level
            1000 with bigger boards, more layers, more food types, and tighter timers. Earn up to 3 stars
            per level by keeping your tray from filling up too much.
          </p>
        </section>

        <section className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4">
          <p className="font-display text-marigold-400 text-sm mb-2">5. Toolbar helpers</p>
          <p className="font-body text-sm text-cream-200/80 leading-relaxed">
            Undo/Redo step a move back or forward, Reset restarts the level, Hint glows a tile worth tapping
            next, and Magic Solve auto-clears the whole board for you (worth 1 star instead of up to 3).
            Chain matches back-to-back to build a Combo for bonus score.
          </p>
        </section>

        <section className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4">
          <p className="font-display text-marigold-400 text-sm mb-2">6. Daily rewards &amp; achievements</p>
          <p className="font-body text-sm text-cream-200/80 leading-relaxed">
            Open the 🎁 Daily button on the main menu once a day for free Market Tokens — come back on
            consecutive days for bigger rewards. Achievements on the main menu track milestones like combos,
            streaks, and perfect levels, and each one pays out tokens too.
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
