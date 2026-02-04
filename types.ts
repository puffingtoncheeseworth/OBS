export interface DotPhrase {
  id: string;
  trigger: string; // The keyword without the dot (e.g., "soap")
  expansion: string; // The full text
  category: string;
}

export interface EditorState {
  content: string;
  cursorPosition: number;
}

export type PhraseMap = Record<string, DotPhrase>;