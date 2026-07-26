import { BoardTile, FoodType, LevelConfig } from '../types/game';

export type RoomStatus = 'playing' | 'won' | 'lost';

export interface RoomPlayer {
  id: string;
  name: string;
  username: string | null;
}

export interface RoomState {
  channelKey: string;
  hostId: string | null;
  players: RoomPlayer[];
  maxPlayers: number;
  level: number;
  config: LevelConfig;
  board: BoardTile[];
  tray: BoardTile[];
  status: RoomStatus;
  score: number;
  combo: number;
  matches: number;
  moves: number;
  lastMatchType: FoodType | null;
  /** ms epoch timestamp the table will auto-advance at (won -> next level,
   * lost -> retry), or null while still in play. */
  advanceAt: number | null;
}

export interface JoinTableAck {
  ok: boolean;
  room?: RoomState;
  selfId?: string;
  joinedInProgress?: boolean;
  error?: string;
}
