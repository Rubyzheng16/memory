export interface Word {
  id: string;
  text: string;
  translation: string;
  example: string;
  exampleTranslation?: string;
  status: 'new' | 'familiar' | 'unfamiliar';
  lastLearnedDate?: string; // ISO string YYYY-MM-DD
  familiarCount: number;
  firstLearnedDate?: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  learnedWordIds: string[];
  familiarWordIds: string[];
  unfamiliarWordIds: string[];
}

export interface AppSettings {
  newWordsPerDay: number;
}

export interface WordBook {
  id: string;
  name: string;
  wordIds: string[];
  createdAt: string;
}

export type ViewMode = 'home' | 'history' | 'settings' | 'books' | 'book_detail';
