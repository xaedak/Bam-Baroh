import React from 'react';
import { BoardTile, FOOD_META } from '../types/game';

interface TrayProps {
  tray: BoardTile[];
  traySize: number;
  shake: boolean;
  registerSlotRef?: (index: number, el: HTMLDivElement | null) => void;
}

export const Tray: React.FC<TrayProps> = ({ tray, traySize, shake, registerSlotRef }) => {
  const slots = Array.from({ length: traySize }, (_, i) => tray[i] ?? null);

  return (
    <div
      className={[
        'relative mx-auto w-full max-w-md rounded-[28px] px-3 py-3 sm:px-4 sm:py-4',
        'bg-gradient-to-b from-marigold-500/20 to-marigold-600/10',
        'border-2 border-marigold-500/40 shadow-signboard',
        shake ? 'animate-shake' : '',
      ].join(' ')}
    >
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {slots.map((tile, i) => {
          const meta = tile ? FOOD_META[tile.type] : null;
          return (
            <div
              key={i}
              ref={(el) => registerSlotRef?.(i, el)}
              className={[
                'aspect-square rounded-lg sm:rounded-xl flex items-center justify-center',
                'text-lg sm:text-2xl border-2',
                tile
                  ? 'border-white/40 dark:border-white/20 shadow-tile animate-popIn'
                  : 'border-dashed border-marigold-500/30 bg-dusk-800/30',
              ].join(' ')}
              style={tile ? { background: `linear-gradient(155deg, ${meta!.color}, ${meta!.color}cc)` } : undefined}
            >
              {tile ? <span aria-hidden="true">{meta!.emoji}</span> : null}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10px] sm:text-xs font-body tracking-wide text-marigold-600 dark:text-marigold-400">
        {tray.length}/{traySize} slots filled
      </p>
    </div>
  );
};
