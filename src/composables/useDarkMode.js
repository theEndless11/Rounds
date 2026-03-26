import { ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

const THEME_KEY = 'app-theme';
const isLight = ref(false);

export const useDarkMode = () => {

  const initTheme = async () => {
    try {
      const { value } = await Preferences.get({ key: THEME_KEY });
      if (value) {
        isLight.value = value === 'light';
      } else {
        isLight.value = false;
      }
      await applyTheme();
    } catch (error) {
      isLight.value = false;
      await applyTheme();
    }
  };

  const applyTheme = async () => {
    // Apply CSS class and background
    document.body.classList.toggle('light', isLight.value);
    // Also toggle on html element for status bar area coverage
    document.documentElement.classList.toggle('pre-light', isLight.value);
    const bg = isLight.value ? '#ffffff' : '#000000';
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;

    if (!Capacitor.isNativePlatform()) return;

    try {
      if (Capacitor.getPlatform() === 'ios') {
        // overlaysWebView: true - webview extends under status bar
        // Status bar background = whatever CSS renders at the top of the page
        // We only control the icon color:
        // Style.Dark  = dark/black icons → use on LIGHT backgrounds
        // Style.Light = light/white icons → use on DARK backgrounds
        await StatusBar.setStyle({
          style: isLight.value ? Style.Dark : Style.Light
        });
        // NO setBackgroundColor on iOS - it causes artifacts with overlaysWebView
      } else {
        // Android - can set background color directly
        await StatusBar.setStyle({
          style: isLight.value ? Style.Dark : Style.Light
        });
        await StatusBar.setBackgroundColor({ color: bg });
      }
    } catch (error) {
      console.log('StatusBar not available:', error);
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