import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define theme colors
export const lightTheme = {
  primary: '#1e40af',
  primaryLight: '#3b82f6',
  background: '#f1f5f9',
  surface: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  icon: '#64748b',
  warning: '#f59e0b',
  warningBackground: '#fef3c7',
  warningText: '#000000',
  success: '#10b981',
  successBackground: '#d1fae5',
  successText: '#065f46',
  error: '#ef4444',
  errorBackground: '#fee2e2',
  errorText: '#991b1b',
};

export const darkTheme = {
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#334155',
  icon: '#94a3b8',
  warning: '#f59e0b',
  warningBackground: '#3d2c02',
  warningText: '#fef3c7',
  success: '#10b981',
  successBackground: '#134e4a',
  successText: '#d1fae5',
  error: '#ef4444',
  errorBackground: '#3b1d1d',
  errorText: '#fee2e2',
  accent: '#19C6C1',
  accentLight: '#E6F8F7',
  card: '#232E42',
  cardBorder: '#2D3A4F',
  modal: '#232E42',
  modalInput: '#1A2536',
  fabShadow: '#19C6C1',
  sortActive: '#19C6C1',
  sortInactive: '#23303F',
  buttonRed: '#F56565',
  buttonGreen: '#22C55E',
  white: '#fff',
  overlay: 'rgba(16,24,40,0.18)',
  searchBar: '#23303F',
  divider: '#2D3A4F',
  header: '#101828',
  subtitle: '#94a3b8',
};

const ThemeContext = createContext({
  isDarkMode: false,
  theme: lightTheme,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      } else {
        setIsDarkMode(systemColorScheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        theme: isDarkMode ? darkTheme : lightTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 