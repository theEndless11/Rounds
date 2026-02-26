import { ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';

const THEME_KEY = 'app-theme';
const isLight = ref(false);

export const useDarkMode = () => {
  
  // Initialize theme from storage or system preference
  const initTheme = async () => {
    try {
      // Check stored preference first
      const { value } = await Preferences.get({ key: THEME_KEY });
      
      if (value) {
        isLight.value = value === 'light';
      } else {
        // Default to dark (no class needed)
        isLight.value = false;
      }
      
      await applyTheme();
    } catch (error) {
      console.error('Error loading theme:', error);
      // Default to dark if error
      isLight.value = false;
      await applyTheme();
    }
  };

  // Apply theme to DOM and Status Bar
  const applyTheme = async () => {
    document.body.classList.toggle('light', isLight.value);
    
    // Update status bar
    try {
      if (isLight.value) {
        // Light mode - use DARK text on status bar
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
      } else {
        // Dark mode - use LIGHT text on status bar
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#000000' });
      }
    } catch (error) {
      // Status bar might not be available on web
      console.log('Status bar not available:', error);
    }
  };

  // Toggle theme
  const toggleTheme = async () => {
    isLight.value = !isLight.value;
    await Preferences.set({
      key: THEME_KEY,
      value: isLight.value ? 'light' : 'dark'
    });
    await applyTheme();
  };

  // Set specific theme
  const setTheme = async (theme) => {
    isLight.value = theme === 'light';
    await Preferences.set({
      key: THEME_KEY,
      value: theme
    });
    await applyTheme();
  };

  // Listen for system theme changes
  const listenToSystemTheme = () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    prefersDark.addEventListener('change', async (e) => {
      // Only auto-switch if user hasn't set a preference
      const { value } = await Preferences.get({ key: THEME_KEY });
      if (!value) {
        isLight.value = !e.matches;
        await applyTheme();
      }
    });
  };

  return {
    isLight,
    isDark: ref(!isLight.value),
    initTheme,
    toggleTheme,
    setTheme,
    listenToSystemTheme
  };
};