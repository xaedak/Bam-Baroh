import { useCallback, useEffect, useReducer, useRef } from 'react';
import { BoardTile, FoodType, GameStatus, LevelConfig } from '../types/game';
import { computeSolveOrder, generateBoard, getLevelConfig, isTileCovered } from '../data/levels';

const MAX_HISTORY = 50;
const MAGIC_STEP_MS = 130;
const HINT_DURATION_MS = 1800;

interface Snapshot {
  board: BoardTile[];
  tray: BoardTile[];
  peakTrayFill: number;
  matches: number;
  moves: number;
  score: number;
  combo: number;
}

interface EngineState {
  config: LevelConfig;
  board: BoardTile[];
  tray: BoardTile[];
  status: GameStatus;
  timeLeft: number | null;
  peakTrayFill: number;
  matches: number;
  moves: number;
  score: number;
  combo: number;
  matchFlash: number; // increments each time a match happens, for triggering effects
  loseFlash: number; // increments on a failed/blocked interaction, for shake feedback
  comboFlash: number; // increments on every combo increase, carries `combo` for display
  lastMatchType: FoodType | null;
  history: Snapshot[];
  future: Snapshot[];
  hintTileId: string | null;
  hintFlash: number;
  magicQueue: string[] | null; // non-null while Magic Solve is animating
  autoSolved: boolean;
  hintsUsedCount: number;
  magicSolvesUsedCount: number;
  bestCombo: number;
  startedAt: number;
}

type Action =
  | { type: 'INIT'; level: number }
  | { type: 'CLICK_TILE'; tileId: string }
  | { type: 'TICK' }
  | { type: 'RESTART' }
  | { type: 'RESET' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'HINT_REQUEST' }
  | { type: 'HINT_CLEAR' }
  | { type: 'MAGIC_SOLVE_START' }
  | { type: 'MAGIC_STEP' };

function snapshotOf(state: EngineState): Snapshot {
  return {
    board: state.board,
    tray: state.tray,
    peakTrayFill: state.peakTrayFill,
    matches: state.matches,
    moves: state.moves,
    score: state.score,
    combo: state.combo,
  };
}

function buildInitialState(level: number): EngineState {
  const config = getLevelConfig(level);
  return {
    config,
    board: generateBoard(config),
    tray: [],
    status: 'playing',
    timeLeft: config.timeLimitSeconds,
    peakTrayFill: 0,
    matches: 0,
    moves: 0,
    score: 0,
    combo: 0,
    matchFlash: 0,
    loseFlash: 0,
    comboFlash: 0,
    lastMatchType: null,
    history: [],
    future: [],
    hintTileId: null,
    hintFlash: 0,
    magicQueue: null,
    autoSolved: false,
    hintsUsedCount: 0,
    magicSolvesUsedCount: 0,
    bestCombo: 0,
    startedAt: Date.now(),
  };
}

/** Applies a single tile removal (as if clicked). Shared by CLICK_TILE and
 * MAGIC_STEP. When `bypassOverflow` is true (Magic Solve), a tray that would
 * overflow is instead force-cleared instantly rather than ending the game -
 * the "magic" ignores the normal fail condition since it always finishes
 * the level. */
function applyTileRemoval(
  state: EngineState,
  tile: BoardTile,
  bypassOverflow: boolean
): EngineState {
  const newBoard = state.board.map((t) => (t.id === tile.id ? { ...t, removed: true } : t));
  let newTray = [...state.tray, tile];

  let matched = false;
  let matchType: FoodType | null = null;
  const counts: Partial<Record<FoodType, number>> = {};
  for (const t of newTray) counts[t.type] = (counts[t.type] ?? 0) + 1;
  matchType = (Object.keys(counts) as FoodType[]).find((k) => (counts[k] ?? 0) >= 3) ?? null;

  if (matchType) {
    let removedCount = 0;
    newTray = newTray.filter((t) => {
      if (t.type === matchType && removedCount < 3) {
        removedCount += 1;
        return false;
      }
      return true;
    });
    matched = true;
  } else if (bypassOverflow && newTray.length >= state.config.traySize) {
    // Magic solve: nothing to force-clear yet (shouldn't normally happen
    // given the solve order), but never let the tray literally overflow.
    newTray = [];
  }

  const peak = Math.max(state.peakTrayFill, state.tray.length + 1);
  const remainingOnBoard = newBoard.filter((t) => !t.removed).length;

  let status: GameStatus = 'playing';
  if (remainingOnBoard === 0) status = 'won';
  else if (!bypassOverflow && newTray.length >= state.config.traySize) status = 'lost';

  const combo = matched ? state.combo + 1 : 0;
  const comboBonus = matched ? 30 + Math.max(0, combo - 1) * 15 : 0;

  return {
    ...state,
    board: newBoard,
    tray: newTray,
    status,
    peakTrayFill: peak,
    matches: matched ? state.matches + 1 : state.matches,
    moves: state.moves + 1,
    score: matched ? state.score + comboBonus : state.score,
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    matchFlash: matched ? state.matchFlash + 1 : state.matchFlash,
    comboFlash: matched && combo > 1 ? state.comboFlash + 1 : state.comboFlash,
    lastMatchType: matched ? matchType : state.lastMatchType,
  };
}

function reducer(state: EngineState, action: Action): EngineState {
  switch (action.type) {
    case 'INIT':
      return buildInitialState(action.level);
    case 'RESTART':
    case 'RESET':
      return buildInitialState(state.config.level);
    case 'TICK': {
      if (state.status !== 'playing' || state.timeLeft === null || state.magicQueue) return state;
      const next = state.timeLeft - 1;
      if (next <= 0) {
        return { ...state, timeLeft: 0, status: 'lost' };
      }
      return { ...state, timeLeft: next };
    }
    case 'CLICK_TILE': {
      if (state.status !== 'playing' || state.magicQueue) return state;
      const tile = state.board.find((t) => t.id === action.tileId);
      if (!tile || tile.removed) return state;
      if (isTileCovered(tile, state.board)) return state;
      if (state.tray.length >= state.config.traySize) {
        return { ...state, loseFlash: state.loseFlash + 1, combo: 0 };
      }

      const history = [snapshotOf(state), ...state.history].slice(0, MAX_HISTORY);
      const next = applyTileRemoval(state, tile, false);
      return { ...next, history, future: [], hintTileId: null };
    }
    case 'UNDO': {
      if (state.history.length === 0 || state.magicQueue) return state;
      const [prev, ...rest] = state.history;
      const future = [snapshotOf(state), ...state.future].slice(0, MAX_HISTORY);
      return {
        ...state,
        ...prev,
        status: 'playing',
        history: rest,
        future,
        hintTileId: null,
      };
    }
    case 'REDO': {
      if (state.future.length === 0 || state.magicQueue) return state;
      const [next, ...rest] = state.future;
      const history = [snapshotOf(state), ...state.history].slice(0, MAX_HISTORY);
      const remainingOnBoard = next.board.filter((t) => !t.removed).length;
      const status: GameStatus =
        remainingOnBoard === 0
          ? 'won'
          : next.tray.length >= state.config.traySize
            ? 'lost'
            : 'playing';
      return {
        ...state,
        ...next,
        status,
        history,
        future: rest,
        hintTileId: null,
      };
    }
    case 'HINT_REQUEST': {
      if (state.status !== 'playing' || state.magicQueue) return state;
      const order = computeSolveOrder(state.board);
      const hintTileId = order[0] ?? null;
      return {
        ...state,
        hintTileId,
        hintFlash: state.hintFlash + 1,
        hintsUsedCount: hintTileId ? state.hintsUsedCount + 1 : state.hintsUsedCount,
      };
    }
    case 'HINT_CLEAR':
      return { ...state, hintTileId: null };
    case 'MAGIC_SOLVE_START': {
      if (state.status !== 'playing' || state.magicQueue) return state;
      const order = computeSolveOrder(state.board);
      if (order.length === 0) return state;
      return {
        ...state,
        magicQueue: order,
        hintTileId: null,
        autoSolved: true,
        magicSolvesUsedCount: state.magicSolvesUsedCount + 1,
      };
    }
    case 'MAGIC_STEP': {
      if (!state.magicQueue || state.magicQueue.length === 0) {
        return { ...state, magicQueue: null };
      }
      const [nextId, ...rest] = state.magicQueue;
      const tile = state.board.find((t) => t.id === nextId && !t.removed);
      const withoutId = { ...state, magicQueue: rest.length > 0 ? rest : null };
      if (!tile) return withoutId;
      const applied = applyTileRemoval(withoutId, tile, true);
      return { ...applied, magicQueue: rest.length > 0 ? rest : null };
    }
    default:
      return state;
  }
}

export function computeStars(state: { peakTrayFill: number; config: LevelConfig; autoSolved?: boolean }): number {
  if (state.autoSolved) return 1;
  const { peakTrayFill, config } = state;
  if (peakTrayFill <= Math.ceil(config.traySize * 0.45)) return 3;
  if (peakTrayFill <= Math.ceil(config.traySize * 0.75)) return 2;
  return 1;
}

export function useGameEngine(level: number) {
  const [state, dispatch] = useReducer(reducer, level, buildInitialState);
  const levelRef = useRef(level);

  useEffect(() => {
    if (levelRef.current !== level) {
      levelRef.current = level;
      dispatch({ type: 'INIT', level });
    }
  }, [level]);

  useEffect(() => {
    if (state.status !== 'playing' || state.timeLeft === null) return;
    const id = window.setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => window.clearInterval(id);
  }, [state.status, state.timeLeft === null]);

  // Step Magic Solve forward on an interval so it plays out visually.
  useEffect(() => {
    if (!state.magicQueue) return;
    const id = window.setInterval(() => dispatch({ type: 'MAGIC_STEP' }), MAGIC_STEP_MS);
    return () => window.clearInterval(id);
  }, [state.magicQueue !== null]);

  // Auto-clear a hint highlight after a short delay.
  useEffect(() => {
    if (!state.hintTileId) return;
    const id = window.setTimeout(() => dispatch({ type: 'HINT_CLEAR' }), HINT_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [state.hintFlash]);

  const clickTile = useCallback((tileId: string) => {
    dispatch({ type: 'CLICK_TILE', tileId });
  }, []);

  const restart = useCallback(() => {
    dispatch({ type: 'RESTART' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const hint = useCallback(() => {
    dispatch({ type: 'HINT_REQUEST' });
  }, []);

  const magicSolve = useCallback(() => {
    dispatch({ type: 'MAGIC_SOLVE_START' });
  }, []);

  return {
    state,
    clickTile,
    restart,
    reset,
    undo,
    redo,
    hint,
    magicSolve,
    canUndo: state.history.length > 0 && !state.magicQueue,
    canRedo: state.future.length > 0 && !state.magicQueue,
    isSolving: state.magicQueue !== null,
  };
}
