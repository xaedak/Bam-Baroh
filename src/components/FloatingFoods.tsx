import React, { useMemo } from 'react';

// Reuses the game's own food emojis so the "Northeast India food festival"
// menu theme stays consistent with what players actually match in-game,
// plus a couple of festival-only accents (lantern, sparkle) that never
// appear on the board.
const FLOATERS = ['🥩', '🐟', '🍗', '🍚', '🥮', '🏮', '✨', '🌶️'];

interface Floater {
  emoji: string;
  left: number; // percent
  top: number; // percent
  size: number; // px
  duration: number; // seconds
  delay: number; // seconds
  opacity: number;
}

function makeFloaters(count: number): Floater[] {
  // Deterministic pseudo-random spread (no Math.random in render) so the
  // layout doesn't reshuffle on every re-render / StrictMode double-invoke.
  const floaters: Floater[] = [];
  for (let i = 0; i < count; i++) {
    const seed = i * 137.5; // golden-angle spread for a natural-looking scatter
    floaters.push({
      emoji: FLOATERS[i % FLOATERS.length],
      left: (seed % 100),
      top: ((seed * 1.618) % 100),
      size: 22 + ((i * 7) % 20),
      duration: 7 + ((i * 3) % 6),
      delay: (i % 5) * 0.8,
      opacity: 0.12 + ((i % 4) * 0.05),
    });
  }
  return floaters;
}

interface FloatingFoodsProps {
  count?: number;
}

export const FloatingFoods: React.FC<FloatingFoodsProps> = ({ count = 14 }) => {
  const floaters = useMemo(() => makeFloaters(count), [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {floaters.map((f, i) => (
        <span
          key={i}
          className="absolute animate-floatSlow select-none"
          style={{
            left: `${f.left}%`,
            top: `${f.top}%`,
            fontSize: `${f.size}px`,
            opacity: f.opacity,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            filter: 'blur(0.2px)',
          }}
        >
          {f.emoji}
        </span>
      ))}
    </div>
  );
};
