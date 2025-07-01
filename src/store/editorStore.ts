import { create } from 'zustand';

interface EditorStore {
  content: string;
  setContent: (content: string) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  content: '',
  setContent: (content) => set({ content }),
})); 