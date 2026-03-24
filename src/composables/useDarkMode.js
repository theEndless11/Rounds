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

    // Set background color on html and body to cover safe areas
    const bgColor = isLight.value ? '#ffffff' : '#000000';
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;

    try {
      if (Capacitor.getPlatform() === 'ios') {
        // iOS with overlaysWebView: true in capacitor.config.json
        // Style.Dark = dark/black icons  → use on LIGHT/WHITE backgrounds
        // Style.Light = light/white icons → use on DARK/BLACK backgrounds
        await StatusBar.setStyle({
          style: isLight.value ? Style.Dark : Style.Light
        })
      } else {
        // Android: can set background color directly
        if (isLight.value) {
          await StatusBar.setStyle({ style: Style.Dark })
          await StatusBar.setBackgroundColor({ color: '#ffffff' })
        } else {
          await StatusBar.setStyle({ style: Style.Light })
          await StatusBar.setBackgroundColor({ color: '#000000' })
        }
      }
    } catch (error) {
      console.log('Status bar not available:', error);
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