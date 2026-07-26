import { BoardTile, FoodType, LevelConfig } from '../types/game';

export type RoomStatus = 'lobby' | 'playing' | 'won' | 'lost';

export interface RoomPlayer {
  id: string;
  name: string;
  username: string | null;
}

export interface RoomState {
  code: string;
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
}

export interface CreateRoomAck {
  ok: boolean;
  room?: RoomState;
  selfId?: string;
  error?: string;
}

export interface JoinRoomAck {
  ok: boolean;
  room?: RoomState;
  selfId?: string;
  error?: string;
}
