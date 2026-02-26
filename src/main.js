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
      
      if (url.pathname === '//auth/callback' || url.host === 'auth') {
        const hashParams = new URLSearchParams(url.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) {
            router.push('/login')
            return
          }
          
          if (data.session) {
            router.push('/auth/callback')
          } else {
            router.push('/login')
          }
        } else {
          router.push('/login')
        }
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