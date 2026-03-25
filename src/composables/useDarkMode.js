import { ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

const THEME_KEY = 'app-theme';
const isLight = ref(false);

const initSafeAreaVar = async () => {
  if (!Capacitor.isNativePlatform()) return;
  // overlaysWebView:true — the status bar floats over our content.
  // We read the real pixel height from StatusBar.getInfo() and expose it
  // as --sat so ion-header can pad its first toolbar to clear the status bar.
  try {
    const info = await StatusBar.getInfo();
    if (info && info.height && info.height > 0) {
      document.documentElement.style.setProperty('--sat', `${info.height}px`);
    } else {
      // Dynamic Island iPhones: height can return 0 on first call — use env() fallback
      document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top, 54px)');
    }
  } catch (e) {
    document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top, 54px)');
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

  // apple-mobile-web-app-status-bar-style stays "black-translucent" always.
  // Icon color (white vs black) is driven purely by StatusBar.setStyle() below.
  // Do NOT touch that meta tag at runtime — it has no effect after page load anyway.

  const shim = document.getElementById('status-bar-bg');
  if (shim) shim.style.backgroundColor = bgColor;
};

const applyNativeStatusBar = async (light) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // Always show first — splash can leave it hidden
    await StatusBar.show();

    // Style.Light = WHITE icons → correct for DARK backgrounds
    // Style.Dark  = BLACK icons → correct for LIGHT backgrounds
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
    // Step 1: show status bar immediately (splash can leave it hidden)
    if (Capacitor.isNativePlatform()) {
      try { await StatusBar.show(); } catch(e) {}
    }

    // Step 2: measure real status bar height → set --sat CSS var
    await initSafeAreaVar();

    // Step 3: load saved theme
    try {
      const { value } = await Preferences.get({ key: THEME_KEY });
      isLight.value = value === 'light';
    } catch (error) {
      isLight.value = false;
    }

    // Step 4: apply theme to DOM + native status bar icon color
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