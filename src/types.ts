export type SoundType = 'organic_rain' | 'forest_birds' | 'bowl_gong' | 'heartbeat_sba' | 'binaural_beat' | 'handpan_sba' | 'hang_drum_sba' | 'tongue_drum_sba' | 'bol_tibetan_premium' | 'kalimba_sba';

export type TrajectoryType = 'circle' | 'infinity' | 'up_down' | 'left_right' | 'teleport_left_right' | 'teleport_up_down';

export interface SoundPosition {
  x: number; // Left-Right ([-5, 5])
  y: number; // Elevation ([-5, 5])
  z: number; // Front-Back ([-5, 5])
}

export interface SoundOption {
  id: SoundType;
  name: string;
  englishName: string;
  description: string;
  isIdeal?: boolean;
}

export interface TrajectoryOption {
  id: TrajectoryType;
  name: string;
  description: string;
}

export interface EarLevels {
  left: number; // Real-time volume level [0, 1]
  right: number; // Real-time volume level [0, 1]
}
