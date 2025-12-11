
export enum RoutineType {
  MORNING_PRODUCTIVE = 'Mañana Productiva',
  AFTERNOON_FOCUS = 'Tarde de Foco',
  SPLIT_SHIFT = 'Jornada Partida',
  CUSTOM = 'Personalizada',
  PDF_IMPORTED = 'Agenda Personal (Importada PDF)',
  EL_CAMBIO = 'El Cambio'
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TimeBlock {
  id: string;
  time: string;
  activity: string;
  type: 'work' | 'sacred' | 'personal' | 'break';
  // New customizable fields
  customColor?: string; // Hex or Tailwind class suffix
  location?: string;
  audioUrl?: string; // Base64 or Blob URL for voice note
  aiSuggestion?: string; // Cached suggestion
  alarmEnabled?: boolean; // New: Custom alarm per block
  subtasks?: Subtask[]; // New: Subtasks list
}

export interface Routine {
  id: string; // Changed from enum to string to allow custom IDs
  name: string;
  description: string;
  blocks: TimeBlock[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
  timestamp: number;
}

export enum ModelType {
  FLASH_LITE = 'fast',
  PRO = 'smart',
  THINKING = 'deep',
}

export interface DailyStats {
  date: string;
  focusMinutes: number;
  mood: number; // 1-5
  didCloseOnTime: boolean;
  candelabroStreak?: number; // New: Growth streak
}

export type GoalPeriod = 'diario' | 'semanal' | 'mensual' | 'anual';

export interface Goal {
  id: string;
  text: string;
  period: GoalPeriod;
  completed: boolean;
  category?: string;
}

export interface RetroEntry {
  date: string;
  wentWell: string;
  toImprove: string;
  actionItem: string;
}

export interface AppSettings {
  vitaminDTime: string;
  vitaminDEnabled: boolean;
  theme?: 'light' | 'dark';
  customAlarmUrl?: string; // Base64 string for custom alarm sound
}

// --- Fitness Types ---
export interface Exercise {
  name: string;
  sets: string;
  reps: string;
  notes?: string;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  targetMuscle: string;
  exercises: Exercise[];
}
