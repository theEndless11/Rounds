import { ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

const THEME_KEY = 'app-theme';
const isLight = ref(false);

const initSafeAreaVar = async () => {
  if (!Capacitor.isNativePlatform()) return;
  // With overlaysWebView:false, iOS manages the status bar area natively.
  // Ionic's ion-header already accounts for it automatically.
  // Set --sat to 0px so any legacy manual padding in CSS doesn't double-pad.
  document.documentElement.style.setProperty('--sat', '0px');
};

const applyThemeToDOM = (light) => {
  const bgColor = light ? '#ffffff' : '#000000';
  document.documentElement.style.backgroundColor = bgColor;
  document.body.style.backgroundColor = bgColor;
  document.body.classList.toggle('light', light);

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', bgColor);

  // Legacy shim support — safe to keep even if shim element doesn't exist
  const shim = document.getElementById('status-bar-bg');
  if (shim) shim.style.backgroundColor = bgColor;
};

const applyNativeStatusBar = async (light) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // Always ensure the status bar is visible first
    await StatusBar.show();

    // Style.Light = white icons  → use on DARK backgrounds
    // Style.Dark  = black icons  → use on LIGHT backgrounds
    await StatusBar.setStyle({
      style: light ? Style.Dark : Style.Light,
    });

    // Android only: set a background color for the status bar
    // Do NOT call setOverlaysWebView here — it is controlled via capacitor.config.json only
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
    // Step 1: ensure status bar is visible immediately
    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.show();
      } catch(e) {}
    }

    // Step 2: set --sat CSS variable (0px with overlaysWebView:false)
    await initSafeAreaVar();

    // Step 3: load saved theme preference
    try {
      const { value } = await Preferences.get({ key: THEME_KEY });
      isLight.value = value === 'light';
    } catch (error) {
      isLight.value = false;
    }

    // Step 4: apply theme to DOM and native status bar
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
    await Preferences.set({ key: THEME_KEY, value: theme });
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