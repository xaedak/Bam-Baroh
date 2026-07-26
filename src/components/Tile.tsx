import React from 'react';
import { BoardTile, FOOD_META } from '../types/game';

interface TileProps {
  tile: BoardTile;
  covered: boolean;
  cols: number;
  rows: number;
  onClick: (id: string) => void;
  hinted?: boolean;
  registerRef?: (id: string, el: HTMLButtonElement | null) => void;
}

export const Tile: React.FC<TileProps> = React.memo(
  ({ tile, covered, cols, rows, onClick, hinted, registerRef }) => {
    const meta = FOOD_META[tile.type];
    const cellW = 100 / cols;
    const cellH = 100 / rows;
    const layerOffset = tile.layer * 3.5;

    return (
      <button
        type="button"
        ref={(el) => registerRef?.(tile.id, el)}
        aria-label={covered ? `${meta.label} tile (covered)` : `${meta.label} tile`}
        disabled={covered}
        onClick={() => onClick(tile.id)}
        style={{
          position: 'absolute',
          left: `calc(${tile.col * cellW}% - ${layerOffset}px)`,
          top: `calc(${tile.row * cellH}% - ${layerOffset}px)`,
          width: `${cellW}%`,
          height: `${cellH}%`,
          zIndex: 10 + tile.layer,
        }}
        className={[
          'p-[3px] sm:p-1 transition-transform duration-150 ease-out',
          covered ? 'cursor-not-allowed' : 'cursor-pointer active:scale-90 hover:-translate-y-0.5',
        ].join(' ')}
      >
        <div
          className={[
            'relative w-full h-full rounded-xl sm:rounded-2xl flex items-center justify-center select-none',
            'text-[20px] sm:text-3xl border-2',
            covered
              ? 'brightness-[0.42] saturate-50 border-black/20 shadow-tile'
              : 'shadow-tileup border-white/40 dark:border-white/20',
            hinted && !covered ? 'animate-hintPulse ring-4 ring-marigold-400' : '',
          ].join(' ')}
          style={{
            background: covered
              ? '#3a3a3a'
              : `linear-gradient(155deg, ${meta.color}, ${meta.color}cc)`,
          }}
        >
          <span className="drop-shadow-sm" aria-hidden="true">
            {meta.emoji}
          </span>
        </div>
      </button>
    );
  }
);

Tile.displayName = 'Tile';
