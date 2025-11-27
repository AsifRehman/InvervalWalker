export enum IntervalType {
  SLOW = 'SLOW',
  FAST = 'FAST',
  IDLE = 'IDLE',
  FINISHED = 'FINISHED'
}

export interface IntervalConfig {
  slowDurationSec: number;
  fastDurationSec: number;
  slowBpm: number;
  fastBpm: number;
  totalCycles: number;
}

export interface MotivationResponse {
  message: string;
}

export const DEFAULT_CONFIG: IntervalConfig = {
  slowDurationSec: 180, // 3 minutes
  fastDurationSec: 180, // 3 minutes
  slowBpm: 85, // Lowered to 85 for a more relaxed normal walk
  fastBpm: 125, // ~125 steps per minute for fast walking
  totalCycles: 5, // Default to 5 repetitions
};