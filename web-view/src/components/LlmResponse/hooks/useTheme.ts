import { useMemo } from 'react';
import useThemeStore from '../../../store/theme-store';
import { darkTheme, lightTheme } from '../themes';

export const useTheme = () => {
  const { theme } = useThemeStore();
  
  const syntaxTheme = useMemo(() => {
    return theme === 'light' ? lightTheme : darkTheme;
  }, [theme]);
  
  return {
    theme,
    syntaxTheme
  };
}; 