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
      console.error('Error loading theme:', error);
      isLight.value = false;
      await applyTheme();
    }
  };

  const applyTheme = async () => {
    document.body.classList.toggle('light', isLight.value);
    document.documentElement.style.backgroundColor = isLight.value ? '#ffffff' : '#000000';
    document.body.style.backgroundColor = isLight.value ? '#ffffff' : '#000000';

    if (!Capacitor.isNativePlatform()) return;

    try {
      if (Capacitor.getPlatform() === 'ios') {
        // UIViewControllerBasedStatusBarAppearance = false in Info.plist
        // so StatusBar plugin controls style globally
        // overlaysWebView = false so status bar has its own native background
        // We only need to set the icon style (light/dark)
        await StatusBar.setStyle({
          style: isLight.value ? Style.Dark : Style.Light
        });
        await StatusBar.setBackgroundColor({
          color: isLight.value ? '#ffffff' : '#000000'
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