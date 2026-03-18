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

const app = createApp(App)
const pinia = createPinia()

app.use(IonicVue)
app.use(pinia)
app.use(router)

// Handle deep links for OAuth callback (mobile only)
if (Capacitor.isNativePlatform()) {
  CapApp.addListener('appUrlOpen', async (event) => {
    try {
      const url = new URL(event.url)

      // Handle auth callback: com.rounds.social://auth/callback#access_token=...
      if (url.host === 'auth' && url.pathname === '/callback') {
        const hashParams = new URLSearchParams(url.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error || !data.session) {
            router.push('/login')
            return
          }

          // Session is set — navigate to callback route which will handle the rest
          router.push('/auth/callback')
        } else {
          router.push('/login')
        }
        return
      }

      // Handle password reset: com.rounds.social://reset-password#access_token=...
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