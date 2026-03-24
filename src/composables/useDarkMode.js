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

  // theme-color tells the browser/OS what color to paint the status bar area
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', bgColor);
};

const applyNativeStatusBar = async (light) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const platform = Capacitor.getPlatform();

    if (platform === 'ios') {
      // overlaysWebView: false means the status bar has its own native background
      // We just need to set the icon style to match the background color
      await StatusBar.setStyle({
        style: light ? Style.Dark : Style.Light,
      });
      // On iOS with overlaysWebView:false, the status bar background color
      // is controlled natively — it matches the app's top background automatically.
      // We still call setBackgroundColor as a hint for some Capacitor versions.
      await StatusBar.setBackgroundColor({
        color: light ? '#ffffff' : '#000000',
      });
    } else if (platform === 'android') {
      await StatusBar.setStyle({
        style: light ? Style.Dark : Style.Light,
      });
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