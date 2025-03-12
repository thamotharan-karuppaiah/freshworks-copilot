import { create } from 'zustand';

type Theme = 'default' | 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'dark',
  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'default' 
      ? 'light' 
      : state.theme === 'light' 
        ? 'dark' 
        : 'default' 
  })),
  setTheme: (theme) => set({ theme }),
}));

export default useThemeStore; 