import React from 'react';
import { BoardTile, FOOD_META, POWERUP_META } from '../types/game';

interface TileProps {
  tile: BoardTile;
  covered: boolean;
  cols: number;
  rows: number;
  dragging?: boolean;
  hinted?: boolean;
  onPickUp: (id: string, clientX: number, clientY: number) => void;
  registerRef?: (id: string, el: HTMLDivElement | null) => void;
}

export const Tile: React.FC<TileProps> = React.memo(
  ({ tile, covered, cols, rows, dragging, hinted, onPickUp, registerRef }) => {
    const meta = FOOD_META[tile.type];
    const powerupMeta = tile.powerup ? POWERUP_META[tile.powerup] : null;
    const cellW = 100 / cols;
    const cellH = 100 / rows;

    // Classic mahjong solitaire stacking: each layer steps visibly up and to
    // the side of the one beneath it (not a subtle 1-2px hint) so the tile
    // underneath always peeks out - you can always tell there's more buried
    // in a pile without having to dig first. Shadow deepens with it so
    // higher layers read as physically lifted off the board.
    const layerOffsetX = tile.layer * 11;
    const layerOffsetY = tile.layer * 9;
    const shadowDepth = 3 + tile.layer * 2.5;

    const color = powerupMeta ? powerupMeta.color : meta.color;
    const emoji = powerupMeta ? powerupMeta.emoji : meta.emoji;
    const label = powerupMeta ? `${powerupMeta.label} powerup` : meta.label;

    return (
      <div
        ref={(el) => registerRef?.(tile.id, el)}
        role="button"
        tabIndex={covered ? -1 : 0}
        aria-label={covered ? `${label} tile (covered)` : `${label} tile`}
        aria-disabled={covered}
        onPointerDown={(e) => {
          if (covered) return;
          onPickUp(tile.id, e.clientX, e.clientY);
        }}
        style={{
          position: 'absolute',
          left: `calc(${tile.col * cellW}% - ${layerOffsetX}px)`,
          top: `calc(${tile.row * cellH}% - ${layerOffsetY}px)`,
          width: `${cellW}%`,
          height: `${cellH}%`,
          zIndex: 10 + tile.layer,
          touchAction: 'none',
          opacity: dragging ? 0 : 1,
        }}
        className={[
          'p-[3px] sm:p-1 transition-transform duration-150 ease-out select-none',
          covered ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:-translate-y-0.5',
        ].join(' ')}
      >
        <div
          className={[
            'relative w-full h-full rounded-xl sm:rounded-2xl flex items-center justify-center select-none',
            'text-[20px] sm:text-3xl border-2',
            covered
              ? 'brightness-[0.55] saturate-50 border-black/30'
              : 'border-white/40 dark:border-white/20',
            powerupMeta && !covered ? 'ring-2 ring-white/80' : '',
            hinted && !covered ? 'animate-hintPulse ring-4 ring-marigold-400' : '',
          ].join(' ')}
          style={{
            background: covered ? '#3a3a3a' : `linear-gradient(155deg, ${color}, ${color}cc)`,
            boxShadow: covered
              ? `0 ${shadowDepth}px 0 rgba(0,0,0,0.35), 0 ${shadowDepth + 4}px ${shadowDepth + 6}px -4px rgba(0,0,0,0.5)`
              : `0 ${shadowDepth}px 0 rgba(0,0,0,0.3), 0 ${shadowDepth + 6}px ${shadowDepth + 10}px -4px rgba(0,0,0,0.55)`,
          }}
        >
          <span className="drop-shadow-sm" aria-hidden="true">
            {emoji}
          </span>
        </div>
      </div>
    );
  }
);

Tile.displayName = 'Tile';
