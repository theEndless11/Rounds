import { ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

const THEME_KEY = 'app-theme';
const isLight = ref(false);

const initSafeAreaVar = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const info = await StatusBar.getInfo();
    if (info && info.height && info.height > 0) {
      document.documentElement.style.setProperty('--sat', `${info.height}px`);
    } else {
      document.documentElement.style.setProperty('--sat', '44px');
    }
  } catch (e) {
    document.documentElement.style.setProperty('--sat', '44px');
  }
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

  const shim = document.getElementById('status-bar-bg');
  if (shim) shim.style.backgroundColor = bgColor;
};

const applyNativeStatusBar = async (light) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // ALWAYS show first — splashImmersive can leave it hidden
    await StatusBar.show();

    // Small delay to ensure show() completes before setting style
    await new Promise(resolve => setTimeout(resolve, 50));

    // Style.Light = white icons  → for DARK backgrounds
    // Style.Dark  = black icons  → for LIGHT backgrounds
    await StatusBar.setStyle({
      style: light ? Style.Dark : Style.Light,
    });

    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({
        color: light ? '#ffffff' : '#000000',
      });
      await StatusBar.setOverlaysWebView({ overlay: true });
    }
  } catch (error) {
    console.log('StatusBar error:', error);
  }
};

export const useDarkMode = () => {

  const initTheme = async () => {
    // Step 1: show status bar immediately (before anything else)
    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.show();
      } catch(e) {}
    }

    // Step 2: get real safe area height and set --sat
    await initSafeAreaVar();

    // Step 3: load saved theme
    try {
      const { value } = await Preferences.get({ key: THEME_KEY });
      isLight.value = value === 'light';
    } catch (error) {
      isLight.value = false;
    }

    // Step 4: apply theme + status bar icon style
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