import { ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

const THEME_KEY = 'app-theme';
const isLight = ref(false);

/**
 * Sets --sat CSS variable to the real status bar height.
 * env(safe-area-inset-top) is unreliable on early Capacitor paint cycles.
 * We read it from StatusBar.getInfo() which gives the actual native px value.
 */
const initSafeAreaVar = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const info = await StatusBar.getInfo();
    // info.height is pixels — convert to the right unit for CSS
    // On iOS this is typically 44px (standard) or 59px (Dynamic Island / notch)
    if (info && info.height) {
      document.documentElement.style.setProperty('--sat', `${info.height}px`);
    } else {
      // Fallback: read from the environment after a tick
      requestAnimationFrame(() => {
        const computed = getComputedStyle(document.documentElement)
          .getPropertyValue('--sat');
        if (!computed || computed.trim() === '0px' || computed.trim() === '') {
          // Hard fallback for iPhone with notch/island
          document.documentElement.style.setProperty('--sat', '44px');
        }
      });
    }
  } catch (e) {
    // If StatusBar.getInfo() not available, use safe fallback
    document.documentElement.style.setProperty('--sat', '44px');
  }
};

const applyThemeToDOM = (light) => {
  const bgColor = light ? '#ffffff' : '#000000';

  document.documentElement.style.backgroundColor = bgColor;
  document.body.style.backgroundColor = bgColor;
  document.body.classList.toggle('light', light);

  // theme-color meta for Android browser chrome
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', bgColor);

  // Update the status bar shim background
  const shim = document.getElementById('status-bar-bg');
  if (shim) shim.style.backgroundColor = bgColor;
};

const applyNativeStatusBar = async (light) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.show();

    // CRITICAL:
    // Style.Light = LIGHT (white) icons  → needed on DARK (black) background
    // Style.Dark  = DARK  (black) icons  → needed on LIGHT (white) background
    await StatusBar.setStyle({
      style: light ? Style.Dark : Style.Light,
    });

    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({
        color: light ? '#ffffff' : '#000000',
      });
      // On Android, also set overlaysWebView explicitly
      await StatusBar.setOverlaysWebView({ overlay: true });
    }

    // iOS: setBackgroundColor does nothing with overlaysWebView:true
    // The shim div handles the visual background
  } catch (error) {
    console.log('StatusBar error:', error);
  }
};

export const useDarkMode = () => {

  const initTheme = async () => {
    // First: initialize the --sat CSS variable so shim has correct height
    await initSafeAreaVar();

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