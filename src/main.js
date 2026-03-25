import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { supabase } from './supabase'
// Ionic imports
import { IonicVue } from '@ionic/vue'
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'
// Capacitor imports
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { StatusBar, Style } from '@capacitor/status-bar'

// Show status bar AND set correct icon style immediately at boot —
// before Vue mounts, before router, before auth.
// This closes the gap where the status bar is visible but icons are wrong color.
if (Capacitor.isNativePlatform()) {
  StatusBar.show().catch(() => {})
  StatusBar.setStyle({ style: Style.Light }).catch(() => {}) // white icons for dark bg
}

const app = createApp(App)
const pinia = createPinia()
app.use(IonicVue)
app.use(pinia)
app.use(router)

// Handle deep links for OAuth callback (mobile only)
if (Capacitor.isNativePlatform()) {
  CapApp.addListener('appUrlOpen', async (event) => {
    try {
      await Browser.close()
    } catch (_) {}
    try {
      const url = new URL(event.url)
      if (url.host === 'auth' && url.pathname === '/callback') {
        const hashParams = new URLSearchParams(url.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          if (error || !data.session) { router.push('/login'); return }
          router.push('/auth/callback')
        } else {
          const queryParams = new URLSearchParams(url.search)
          const code = queryParams.get('code')
          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            if (error || !data.session) { router.push('/login'); return }
            router.push('/auth/callback')
          } else {
            router.push('/login')
          }
        }
        return
      }
      if (url.host === 'reset-password') {
        const hashParams = new URLSearchParams(url.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        if (accessToken) {
          router.push({ path: '/reset-password', query: { access_token: accessToken } })
        } else {
          router.push('/login')
        }
        return
      }
    } catch (err) {
      console.error('Deep link error:', err)
      router.push('/login')
    }
  })
}

// Wait for router to be ready and initialize auth
router.isReady().then(async () => {
  const { useAuthStore } = await import('./stores/auth')
  const authStore = useAuthStore()
  await authStore.initAuth()
  app.mount('#app')
})