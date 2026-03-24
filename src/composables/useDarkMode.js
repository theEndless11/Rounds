import { ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

const THEME_KEY = 'app-theme';
const isLight = ref(false);

const applyThemeToDOM = (light) => {
  const bgColor = light ? '#ffffff' : '#000000';

  document.documentElement.style.backgroundColor = bgColor;
  document.documentElement.style.setProperty('background-color', bgColor, 'important');
  document.body.style.backgroundColor = bgColor;
  document.body.classList.toggle('light', light);

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', bgColor);

  let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleMeta) {
    appleMeta = document.createElement('meta');
    appleMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
    document.head.appendChild(appleMeta);
  }
  // black-translucent = transparent overlay, icons adapt to bg
  appleMeta.setAttribute('content', 'black-translucent');
};

const applyNativeStatusBar = async (light) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({
      // Style.Dark  = DARK icons/text → use on LIGHT (white) backgrounds
      // Style.Light = LIGHT icons/text → use on DARK (black) backgrounds
      style: light ? Style.Dark : Style.Light,
    });

    // Android only — iOS is transparent when overlaysWebView: true
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({
        color: light ? '#ffffff' : '#000000',
      });
    }
  } catch (error) {
    console.log('StatusBar error:', error);
  }
};

export const useDarkMode = () => {

  const initTheme = async () => {
    try {
      const { value } = await Preferences.get({ key: THEME_KEY });
      isLight.value = value === 'light';
    } catch (error) {
      isLight.value = false;
    }
    applyThemeToDOM(isLight.value);
    await applyNativeStatusBar(isLight.value);
  };

  const applyTheme = async () => {
    applyThemeToDOM(isLight.value);
    await applyNativeStatusBar(isLight.value);
  };

  const toggleTheme = async () => {
    isLight.value = !isLight.value;
    await Preferences.set({
      key: THEME_KEY,
      value: isLight.value ? 'light' : 'dark',
    });
    await applyTheme();
  };

  const setTheme = async (theme) => {
    isLight.value = theme === 'light';
    await Preferences.set({
      key: THEME_KEY,
      value: theme,
    });
    await applyTheme();
  };

  const listenToSystemTheme = () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    prefersDark.addEventListener('change', async (e) => {
      try {
        const { value } = await Preferences.get({ key: THEME_KEY });
        if (!value) {
          isLight.value = !e.matches;
          await applyTheme();
        }
      } catch (error) {
        console.log('System theme listener error:', error);
      }
    });
  };

  const reapplyTheme = async () => {
    applyThemeToDOM(isLight.value);
    await applyNativeStatusBar(isLight.value);
  };

  return {
    isLight,
    isDark: ref(!isLight.value),
    initTheme,
    applyTheme,
    toggleTheme,
    setTheme,
    listenToSystemTheme,
    reapplyTheme,
  };
};