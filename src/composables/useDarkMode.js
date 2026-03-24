import { ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

const THEME_KEY = 'app-theme';
const isLight = ref(false);

const applyThemeToDOM = (light) => {
  const bgColor = light ? '#ffffff' : '#000000';

  document.documentElement.style.backgroundColor = bgColor;
  document.body.style.backgroundColor = bgColor;
  document.body.classList.toggle('light', light);

  // Update theme-color meta (browser chrome on Android)
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', bgColor);

  // Update the status bar background shim div (see App.vue)
  // This is what actually makes the status bar area visible on iOS
  const shim = document.getElementById('status-bar-bg');
  if (shim) {
    shim.style.backgroundColor = bgColor;
  }
};

const applyNativeStatusBar = async (light) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Style.Dark  = dark icons → use on LIGHT backgrounds
    // Style.Light = light icons → use on DARK backgrounds
    await StatusBar.setStyle({
      style: light ? Style.Dark : Style.Light,
    });

    // Android only — on iOS with overlaysWebView:true,
    // setBackgroundColor is ignored by the OS. The shim div handles it.
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