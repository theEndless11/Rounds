<template>
  <ion-page>
    <ion-content class="reset-content">
      <div class="reset-container">
        <div class="logo-section">

          <h1 class="title">Reset Password</h1>
          <p class="subtitle">Enter your new password below</p>
        </div>
        
        <div class="form-section">
          <div v-if="error" class="error-text">
            {{ error }}
          </div>

          <div v-if="successMessage" class="success-text">
            {{ successMessage }}
          </div>

          <div v-if="!successMessage">
            <div class="input-wrapper">
              <label class="input-label">New Password</label>
              <input 
                v-model="newPassword" 
                type="password"
                placeholder="Enter new password"
                class="custom-input"
                @keyup.enter="handleResetPassword"
              />
              <p class="helper-text">Must be at least 6 characters</p>
            </div>
            
            <div class="input-wrapper">
              <label class="input-label">Confirm Password</label>
              <input 
                v-model="confirmPassword" 
                type="password"
                placeholder="Confirm new password"
                class="custom-input"
                @keyup.enter="handleResetPassword"
              />
            </div>
            
            <ion-button 
              expand="block" 
              @click="handleResetPassword"
              :disabled="loading"
              class="reset-btn"
            >
              {{ loading ? 'Resetting...' : 'Reset Password' }}
            </ion-button>
          </div>

          <div v-else class="success-actions">
            <ion-button 
              expand="block" 
              @click="navigateToLogin"
              class="login-btn"
            >
              Go to Login
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import {
  IonPage,
  IonContent,
  IonButton
} from '@ionic/vue'

const router = useRouter()

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const successMessage = ref('')

onMounted(async () => {
  // Handle deep link on native devices
  if (Capacitor.isNativePlatform()) {
    // Extract tokens from URL hash or query params
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const queryParams = new URLSearchParams(window.location.search)
    
    const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')
    
    if (accessToken && refreshToken) {
      // Set session with the tokens from the deep link
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      
      if (sessionError) {
        error.value = 'Invalid or expired reset link. Please request a new password reset.'
        return
      }
    }
  }
  
  // Check if user came from password reset email (web or native)
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    error.value = 'Invalid or expired reset link. Please request a new password reset.'
  }
})

async function handleResetPassword() {
  error.value = ''
  successMessage.value = ''

  if (!newPassword.value || !confirmPassword.value) {
    error.value = 'Please fill in both password fields'
    return
  }

  if (newPassword.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  loading.value = true

  try {
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword.value
    })

    if (updateError) {
      error.value = updateError.message
      loading.value = false
      return
    }

    successMessage.value = 'Password reset successfully! You can now login with your new password.'
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    error.value = 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}

function navigateToLogin() {
  router.replace('/login')
}
</script>

<style scoped>
.reset-content {
  --background: #000000;
}

.reset-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 40px 20px;
}

.logo-section {
  text-align: center;
  margin-bottom: 40px;
}

.logo-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 16px;
  color: #9ca3af;
  margin: 0;
}

.form-section {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.input-wrapper {
  margin-bottom: 20px;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #e5e7eb;
  margin-bottom: 8px;
}

.custom-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

.custom-input:focus {
  outline: none;
  border-color: #8b5cf6;
  background: rgba(255, 255, 255, 0.08);
}

.custom-input::placeholder {
  color: #6b7280;
}

.helper-text {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
  margin-bottom: 0;
}

.reset-btn, .login-btn {
  margin-top: 24px;
  --background: #8b5cf6;
  --background-hover: #7c3aed;
  --background-activated: #6d28d9;
  --border-radius: 50px;
  font-weight: 600;
  height: 48px;
  font-size: 16px;
}

.error-text {
  color: #fca5a5;
  font-size: 14px;
  margin-bottom: 16px;
  text-align: center;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  line-height: 1.6;
}

.success-text {
  color: #6ee7b7;
  font-size: 14px;
  margin-bottom: 16px;
  text-align: center;
  padding: 16px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
  line-height: 1.6;
}

.success-actions {
  margin-top: 24px;
}
</style>