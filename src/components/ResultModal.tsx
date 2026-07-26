import React from 'react';

interface ResultModalProps {
  status: 'won' | 'lost';
  level: number;
  stars: number;
  moves: number;
  score: number;
  isLastLevel: boolean;
  autoSolved?: boolean;
  onRetry: () => void;
  onNext: () => void;
  onMenu: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  status,
  level,
  stars,
  moves,
  score,
  isLastLevel,
  autoSolved,
  onRetry,
  onNext,
  onMenu,
}) => {
  const won = status === 'won';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dusk-950/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-3xl bg-cream-100 dark:bg-dusk-800 border-2 border-marigold-500/50 shadow-signboard p-6 text-center animate-popIn">
        <div className="text-5xl mb-2" aria-hidden="true">
          {won ? '🏮' : '💨'}
        </div>
        <h2 className="font-display text-2xl sm:text-3xl text-dusk-900 dark:text-cream-100">
          {won ? 'Plate Cleared!' : 'Tray Overflowed'}
        </h2>
        <p className="font-body text-sm text-dusk-700 dark:text-cream-200/70 mt-1">
          {won ? `Level ${level} complete` : `Level ${level} — try again`}
        </p>
        {won && autoSolved && (
          <p className="mt-1 inline-block rounded-full bg-betel-500/20 border border-betel-500/50 text-betel-500 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5">
            ✨ Auto-Solved
          </p>
        )}

        {won && (
          <div className="flex justify-center gap-2 my-4 text-3xl" aria-label={`${stars} out of 3 stars`}>
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= stars ? 'text-marigold-500' : 'text-dusk-600/30 dark:text-dusk-600'}>
                {i <= stars ? '★' : '☆'}
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-6 my-4 font-mono text-sm text-dusk-700 dark:text-cream-200/80">
          <div>
            <div className="text-lg font-semibold">{moves}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-70">Moves</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{score}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-70">Score</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-5">
          {won && !isLastLevel && (
            <button
              onClick={onNext}
              className="rounded-full bg-betel-500 hover:bg-betel-600 text-white font-display text-lg py-2.5 shadow-tile transition-colors"
            >
              Next Level
            </button>
          )}
          <button
            onClick={onRetry}
            className="rounded-full bg-marigold-500 hover:bg-marigold-600 text-dusk-950 font-display text-lg py-2.5 shadow-tile transition-colors"
          >
            {won ? 'Replay' : 'Try Again'}
          </button>
          <button
            onClick={onMenu}
            className="rounded-full border-2 border-dusk-700/30 dark:border-cream-100/20 text-dusk-800 dark:text-cream-100 font-body text-sm py-2 transition-colors hover:bg-dusk-700/5 dark:hover:bg-cream-100/5"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
