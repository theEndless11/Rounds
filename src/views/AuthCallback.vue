<template>
  <ion-page>
    <ion-content class="ion-padding">
      <div class="callback-container">
        <ion-spinner></ion-spinner>
        <p>{{ statusMessage }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import { Capacitor } from '@capacitor/core'
import {
  IonPage,
  IonContent,
  IonSpinner
} from '@ionic/vue'

const router = useRouter()
const authStore = useAuthStore()
const statusMessage = ref('Completing sign in...')

let callbackProcessed = false

onMounted(async () => {
  if (callbackProcessed) return
  callbackProcessed = true

  try {
    
    if (Capacitor.isNativePlatform()) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const queryParams = new URLSearchParams(window.location.search)
      
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')
      
      if (!accessToken || !refreshToken) {
        router.replace('/login')
        return
      }
      
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      
      if (sessionError || !sessionData.session) {
        router.replace('/login')
        return
      }
      
      authStore.user = sessionData.session.user
      authStore.session = sessionData.session
      
    } else {
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        router.replace('/login')
        return
      }
      
      authStore.user = session.user
      authStore.session = session
    }
    
    await authStore.checkVerificationStatus(authStore.user.id)
    
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authStore.user.id)
      .maybeSingle()
    
    if (window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    
    await new Promise(resolve => setTimeout(resolve, 150))
    
    if (!profile) {
      await router.replace('/complete-profile')
    } else {
      await router.replace('/tabs/home')
    }
    
  } catch (error) {
    router.replace('/login')
  }
})
</script>

<style scoped>
.callback-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 20px;
}

.callback-container p {
  color: var(--ion-color-medium);
  font-size: 16px;
  text-align: center;
  padding: 0 20px;
}
</style>

