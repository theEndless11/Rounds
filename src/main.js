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

// Show status bar immediately at boot — before Vue mounts.
// splashImmersive:true leaves the status bar hidden after splash dismisses
// and Capacitor does not restore it automatically. Calling show() here
// guarantees it is visible before any component renders.
if (Capacitor.isNativePlatform()) {
  StatusBar.show().catch(() => {})
  StatusBar.setStyle({ style: Style.Light }).catch(() => {}) // white icons (dark bg default)
}

const app = createApp(App)
const pinia = createPinia()

app.use(IonicVue)
app.use(pinia)
app.use(router)

// Handle deep links for OAuth callback (mobile only)
if (Capacitor.isNativePlatform()) {
  CapApp.addListener('appUrlOpen', async (event) => {
    // Close the in-app browser if open (after Google OAuth redirect)
    try {
      await Browser.close()
    } catch (_) {
      // Browser might not be open, ignore
    }

    try {
      const url = new URL(event.url)

      // Handle auth callback: com.rounds.social://auth/callback
      if (url.host === 'auth' && url.pathname === '/callback') {
        const hashParams = new URLSearchParams(url.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          // Implicit flow — set session directly
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error || !data.session) {
            router.push('/login')
            return
          }

          router.push('/auth/callback')
        } else {
          // PKCE flow — check for code in query params
          const queryParams = new URLSearchParams(url.search)
          const code = queryParams.get('code')

          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            if (error || !data.session) {
              router.push('/login')
              return
            }
            router.push('/auth/callback')
          } else {
            router.push('/login')
          }
        }
        return
      }

      // Handle password reset: com.rounds.social://reset-password
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