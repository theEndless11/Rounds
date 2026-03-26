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
    // Apply CSS classes and backgrounds
    document.body.classList.toggle('light', isLight.value);
    document.documentElement.classList.toggle('pre-light', isLight.value);
    const bg = isLight.value ? '#ffffff' : '#000000';
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;

    if (!Capacitor.isNativePlatform()) return;

    try {
      if (Capacitor.getPlatform() === 'ios') {
        // UIViewControllerBasedStatusBarAppearance = false
        // Style.Dark  = dark/black icons → LIGHT backgrounds
        // Style.Light = light/white icons → DARK backgrounds
        await StatusBar.setStyle({
          style: isLight.value ? Style.Dark : Style.Light
        });

        // Also notify AppDelegate natively for reliable style switching
        // This uses Capacitor's bridge to call native code
        try {
          const { Capacitor: Cap } = await import('@capacitor/core');
          if (Cap.isPluginAvailable('App')) {
            // Post notification via window object that AppDelegate listens to
            window.dispatchEvent(new CustomEvent('themeChange', {
              detail: { isLight: isLight.value }
            }));
          }
        } catch (e) {}

      } else {
        // Android
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