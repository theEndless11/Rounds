<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button></ion-back-button>
        </ion-buttons>
        <ion-title>Verify OTP</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="verify-container">
        <p class="ion-text-center">
          Enter the 6-digit code sent to<br>
          <strong>{{ phone }}</strong>
        </p>

        <ion-card>
          <ion-card-content>
            <ion-item>
              <ion-label position="stacked">OTP Code</ion-label>
              <ion-input 
                v-model="otp" 
                type="number"
                placeholder="123456"
                maxlength="6"
              ></ion-input>
            </ion-item>

            <ion-button 
              expand="block" 
              @click="handleVerifyOTP"
              :disabled="loading"
              class="ion-margin-top"
            >
              {{ loading ? 'Verifying...' : 'Verify OTP' }}
            </ion-button>

            <ion-text v-if="error" color="danger" class="ion-margin-top">
              <p>{{ error }}</p>
            </ion-text>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText
} from '@ionic/vue'

const router = useRouter()
const authStore = useAuthStore()

const phone = ref('')
const otp = ref('')
const loading = ref(false)
const error = ref('')

onMounted(() => {
  phone.value = sessionStorage.getItem('temp_phone') || ''
  if (!phone.value) {
    router.push('/login')
  }
})

async function handleVerifyOTP() {
  if (!otp.value || otp.value.length !== 6) {
    error.value = 'Please enter valid 6-digit OTP'
    return
  }

  loading.value = true
  error.value = ''

  const { data, error: verifyError } = await authStore.verifyOTP(
    phone.value, 
    otp.value
  )

  loading.value = false

  if (verifyError) {
    error.value = verifyError.message
  } else {
    sessionStorage.removeItem('temp_phone')
    // Check if user profile exists
    router.push('/complete-profile')
  }
}
</script>

<style scoped>
.verify-container {
  max-width: 400px;
  margin: 2rem auto;
}
</style>