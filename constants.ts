import { DreamCategory } from './types';

export const CATEGORY_COLORS: Record<DreamCategory, string> = {
  [DreamCategory.NIGHTMARE]: '#FF4444',   // Red
  [DreamCategory.SURREAL]: '#D300FF',     // Neon Purple
  [DreamCategory.ROMANTIC]: '#FFC0CB',    // Pink
  [DreamCategory.PROPHETIC]: '#00FFCC',   // Cyan
  [DreamCategory.MUNDANE]: '#AAAAAA',     // Grey
  [DreamCategory.LUCID]: '#FFD700',       // Neon Gold
  [DreamCategory.STRESS]: '#FFA500',      // Orange
  [DreamCategory.ADVENTURE]: '#0088FF',   // Electric Blue
};

export const CATEGORY_DESCRIPTIONS: Record<DreamCategory, string> = {
  [DreamCategory.NIGHTMARE]: 'Fear, anxiety, or danger.',
  [DreamCategory.SURREAL]: 'Bizarre, logic-defying visuals.',
  [DreamCategory.ROMANTIC]: 'Love, connection, or longing.',
  [DreamCategory.PROPHETIC]: 'Visions of the future or deep intuition.',
  [DreamCategory.MUNDANE]: 'Everyday life, normal events.',
  [DreamCategory.LUCID]: 'Awareness and control within the dream.',
  [DreamCategory.STRESS]: 'Pressure, deadlines, or feelings of inadequacy.',
  [DreamCategory.ADVENTURE]: 'Exploration, flying, or epic journeys.',
};

export const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const MAX_DAILY_DREAMS = 2;
export const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours