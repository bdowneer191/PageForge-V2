
export interface UserProfile {
  id: string; // Unique identifier from your auth provider
  email: string;
  full_name?: string;
  avatar_url?: string;
  roles?: string[]; // For role-based access control
}

export interface Session {
  id: string;
  url: string;
  startTime: string;
  endTime: string;
  duration: number;
  beforeScores: { mobile: number, desktop: number };
  afterScores: { mobile: number, desktop: number };
}

export interface ApiKeys {
  pageSpeedApiKey?: string;
  geminiApiKey?: string;
}

export interface CleaningOptions {
  stripComments: boolean;
  collapseWhitespace: boolean;
  minifyInlineCSSJS: boolean;
  removeEmptyAttributes: boolean;
  preserveIframes: boolean;
  preserveLinks: boolean;
  preserveShortcodes: boolean;
  semanticRewrite: boolean;
  lazyLoadEmbeds: boolean;
  lazyLoadImages: boolean;
  optimizeCssLoading: boolean;
  optimizeFontLoading: boolean;
  addPrefetchHints: boolean;
  deferScripts: boolean;
}

export interface ImpactSummary {
  originalBytes: number;
  cleanedBytes: number;
  bytesSaved: number;
  nodesRemoved: number;
  estimatedSpeedGain: string;
}

export interface Recommendation {
  title: string;
  description: string;
  priority?: 'High' | 'Medium' | 'Low';
}
