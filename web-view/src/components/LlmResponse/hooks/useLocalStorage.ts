import { useCallback } from 'react';
import { LocalStorageHelpers } from '../types';

export const useLocalStorage = (messageKey?: string): LocalStorageHelpers => {
  // Create a key for localStorage
  const getLocalStorageKey = useCallback((fileName: string) => {
    return `fw_copilot_file_${messageKey || 'latest'}_${fileName}`;
  }, [messageKey]);

  // Save content to localStorage
  const saveContentToLocalStorage = useCallback((fileName: string, content: string) => {
    if (!content || content.length === 0) return;
    try {
      localStorage.setItem(getLocalStorageKey(fileName), content);
    } catch (err) {
      console.error('Failed to save file content to localStorage:', err);
    }
  }, [getLocalStorageKey]);

  // Get content from localStorage
  const getContentFromLocalStorage = useCallback((fileName: string) => {
    try {
      return localStorage.getItem(getLocalStorageKey(fileName));
    } catch (err) {
      console.error('Failed to get file content from localStorage:', err);
      return null;
    }
  }, [getLocalStorageKey]);

  return {
    getLocalStorageKey,
    saveContentToLocalStorage,
    getContentFromLocalStorage
  };
}; 