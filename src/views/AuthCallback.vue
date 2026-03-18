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
      // On native, session is already set by the appUrlOpen handler in main.js
      // Just read the existing session
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        statusMessage.value = 'Sign in failed. Redirecting...'
        router.replace('/login')
        return
      }

      authStore.user = session.user
      authStore.session = session

    } else {
      // Web: session comes from URL hash automatically via Supabase
      await new Promise(resolve => setTimeout(resolve, 150))

      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        statusMessage.value = 'Sign in failed. Redirecting...'
        router.replace('/login')
        return
      }

      authStore.user = session.user
      authStore.session = session
    }

    // Check verification status
    await authStore.checkVerificationStatus(authStore.user.id)

    // Check if profile exists
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authStore.user.id)
      .maybeSingle()

    // Clean up URL hash if present
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
    statusMessage.value = 'Something went wrong. Redirecting...'
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

