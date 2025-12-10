export enum DreamCategory {
  NIGHTMARE = 'Nightmare',
  SURREAL = 'Surreal',
  ROMANTIC = 'Romantic',
  PROPHETIC = 'Prophetic',
  MUNDANE = 'Mundane',
  LUCID = 'Lucid',
  STRESS = 'Stress',
  ADVENTURE = 'Adventure',
}

export interface Dream {
  id: string;
  text: string;
  category: DreamCategory;
  summary: string;
  interpretation: string;
  timestamp: number;
  location: {
    lat: number;
    lng: number;
    // We store the randomized location, not the real one.
  };
}

export interface AnalysisResult {
  category: DreamCategory;
  summary: string;
  interpretation: string;
}

export type ViewState = 'map' | 'list' | 'input';