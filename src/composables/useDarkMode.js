import { ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

const THEME_KEY = 'app-theme';
const isLight = ref(false);

// Apply theme immediately on module load to prevent flash
const applyThemeToDOM = (light) => {
  const bgColor = light ? '#ffffff' : '#000000';
  document.documentElement.style.backgroundColor = bgColor;
  document.body.style.backgroundColor = bgColor;
  document.body.classList.toggle('light', light);
  
  // Also set a meta theme-color for the browser chrome
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = bgColor;
};

export const useDarkMode = () => {

  const initTheme = async () => {
    try {
      const { value } = await Preferences.get({ key: THEME_KEY });
      isLight.value = value === 'light';
    } catch (error) {
      isLight.value = false;
    }
    await applyTheme();
  };

  const applyTheme = async () => {
    applyThemeToDOM(isLight.value);

    if (!Capacitor.isNativePlatform()) return;

    try {
      if (Capacitor.getPlatform() === 'ios') {
        // With overlaysWebView: true, status bar overlays the app
        // Style.Dark  = DARK icons/text on status bar → for LIGHT backgrounds
        // Style.Light = LIGHT icons/text on status bar → for DARK backgrounds
        await StatusBar.setStyle({
          style: isLight.value ? Style.Dark : Style.Light
        });
      } else {
        // Android
        await StatusBar.setStyle({
          style: isLight.value ? Style.Dark : Style.Light
        });
        await StatusBar.setBackgroundColor({
          color: isLight.value ? '#ffffff' : '#000000'
        });
      }
    } catch (error) {
      console.log('StatusBar error:', error);
    }
  };

  const toggleTheme = async () => {
    isLight.value = !isLight.value;
    await Preferences.set({
      key: THEME_KEY,
      value: isLight.value ? 'light' : 'dark'
    });
    await applyTheme();
  };

  const setTheme = async (theme) => {
    isLight.value = theme === 'light';
    await Preferences.set({
      key: THEME_KEY,
      value: theme
    });
    await applyTheme();
  };

  const listenToSystemTheme = () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    prefersDark.addEventListener('change', async (e) => {
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