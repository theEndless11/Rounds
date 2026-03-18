<template>
  <ion-page>
    <ion-content class="login-content">
      <div class="login-container">
        <div class="logo-section">
         <div class="logo-icon">
  <img src="@/assets/splash_screen.jpeg" alt="Rounds Logo" style="width: 100%; height: 100%; object-fit: contain;" />
</div>
          <p>Medical Social Network</p>
        </div>
        
        <div class="form-section">
          <!-- Success Message -->
          <div v-if="successMessage" class="success-text">
            {{ successMessage }}
          </div>
          
          <!-- Error Message -->
          <div v-if="error" class="error-text">
            {{ error }}
          </div>

          <div class="input-wrapper">
            <label class="input-label">Email</label>
            <input 
              v-model="email" 
              type="email"
              placeholder="Doctor@gmail.com"
              class="custom-input"
              @keyup.enter="handleLogin"
              :disabled="loading"
              autocomplete="email"
              autocorrect="off"
              autocapitalize="none"
              spellcheck="false"
            />
          </div>
          
          <div class="input-wrapper">
            <label class="input-label">Password</label>
            <input 
              v-model="password" 
              type="password"
              placeholder="*********"
              class="custom-input"
              @keyup.enter="handleLogin"
              :disabled="loading"
              autocomplete="current-password"
            />
            <div class="forgot-password-wrapper">
              <span @click="handleForgotPassword" class="forgot-password-link">Forgot password?</span>
            </div>
          </div>
          
          <ion-button 
            expand="block" 
            @click="handleLogin"
            :disabled="loading"
            class="login-btn"
          >
            {{ loading ? 'Logging in...' : 'Login' }}
          </ion-button>
          
          <div class="divider">
            <span style="font-size: 16px;">or</span>
          </div>

          <button 
            @click="handleGoogleSignIn" 
            :disabled="loading"
            class="google-btn"
            type="button"
          >
            <svg class="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {{ loading ? 'Signing in...' : 'Continue with Google' }}
          </button>

          <div class="signup-text">
            Don't have an account? <span @click="navigateToSignup" class="signup-link">Sign Up</span>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.success-text {
  color: #6ee7b7;
  font-size: 14px;
  margin-bottom: 16px;
  text-align: center;
  padding: 16px;
  background: #000000;
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
  line-height: 1.6;
  white-space: pre-line;
}

.error-text {
  color: #fca5a5;
  font-size: 14px;
  margin-bottom: 16px;
  text-align: center;
  padding: 12px;
  background: #000000;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  line-height: 1.6;
  white-space: pre-line;
}

.forgot-password-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.forgot-password-link {
  font-size: 14px;
  color: #8b5cf6;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s;
  /* iOS tap fix */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.forgot-password-link:hover {
  color: #7c3aed;
  text-decoration: underline;
}
</style>

<style scoped>
.login-content {
  --background: #000;
}
.login-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100%;
  max-width: 380px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}
.logo-section {
  text-align: center;
  margin-bottom: 3rem;
}
.logo-icon {
  width: 90px;
  height: 90px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
.logo-icon img {
  width: 90%;
  height: 90%;
  object-fit: contain;
}
.logo-section p {
  color: #6b7280;
  font-size: 0.9375rem;
  margin: 0;
}
.form-section {
  width: 100%;
}
.input-wrapper {
  margin-bottom: 1.25rem;
}
.input-label {
  display: block;
  color: #9ca3af;
  font-weight: 500;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}
.custom-input {
  width: 100%;
  height: 44px;
  background: #000 !important;
  border: 1px solid #262626;
  border-radius: 21px;
  padding: 0 1.25rem;
  color: #e5e7eb !important;
  /* 
    KEY FIX: font-size must be >= 16px on iOS to prevent auto-zoom on focus.
    We use 16px here and rely on the container's max-width to keep it looking right.
  */
  font-size: 16px;
  font-family: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  -webkit-text-fill-color: #e5e7eb !important;
  -webkit-box-shadow: 0 0 0 1000px #000 inset !important;
  /* Prevent iOS tap flash */
  -webkit-tap-highlight-color: transparent;
  /* Prevent double-tap zoom on inputs */
  touch-action: manipulation;
  /* Prevent iOS rounded corners override */
  -webkit-appearance: none;
  appearance: none;
  box-sizing: border-box;
}
.custom-input::placeholder {
  color: #4b5563;
}
.custom-input:focus {
  outline: none;
  background: #0a0a0a !important;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
  -webkit-box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15), 0 0 0 1000px #0a0a0a inset !important;
}
.custom-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.login-btn {
  --background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  --background-hover: linear-gradient(135deg, #9333ea 0%, #6d28d9 100%);
  --color: #fff;
  --border-radius: 24px;
  --box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
  height: 41px;
  margin-top: 0.5rem;
  font-weight: 300;
  margin-left: 5%;
  width: 90%;
  font-size: 0.9375rem;
  /* iOS tap fix */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.login-btn:hover:not([disabled]) {
  --box-shadow: 0 6px 16px rgba(139, 92, 246, 0.35);
}
.divider {
  position: relative;
  text-align: center;
  margin: 1.75rem 0 1.5rem;
}
.divider::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  background: #1a1a1a;
}
.divider span {
  position: relative;
  background: #000;
  padding: 0 1rem;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}
.google-btn {
  width: 90%;
  height: 42px;
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 24px;
  color: #1f2937;
  font-size: 0.9375rem;
  font-weight: 600;
  margin-left: 5%;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  /* iOS tap fixes */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  -webkit-appearance: none;
  appearance: none;
}
.google-btn:hover:not([disabled]) {
  background: #f9fafb;
  border-color: #d1d5db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.google-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.google-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
.signup-text {
  text-align: center;
  margin-top: 1.5rem;
  color: #9ca3af;
  font-size: 0.9375rem;
}
.signup-link {
  color: #10b981;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s ease;
  /* iOS tap fix */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.signup-link:hover {
  color: #34d399;
}
.error-text {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #f87171;
  font-size: 0.875rem;
  text-align: center;
}
@media (max-width: 576px) {
  .login-container {
    padding: 1.5rem 1.25rem;
  }
  .logo-section {
    margin-bottom: 2.5rem;
  }
}
</style>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import { useAuthStore } from '@/stores/auth'
import { Capacitor } from '@capacitor/core'
import {
  IonPage,
  IonContent,
  IonButton
} from '@ionic/vue'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const successMessage = ref('')
const isProcessing = ref(false)

const getRedirectUrl = () => {
  if (Capacitor.isNativePlatform()) {
    return 'com.rounds.app://auth/callback'
  } else {
    return `${window.location.origin}/auth/callback`
  }
}

async function handleGoogleSignIn() {
  if (isProcessing.value) return
  
  isProcessing.value = true
  loading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const { data, error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectUrl(),
        skipBrowserRedirect: false
      }
    })

    if (signInError) {
      error.value = signInError.message
    }
  } catch (err) {
    console.error('Google sign in error:', err)
    error.value = 'Failed to sign in with Google'
  } finally {
    // Don't reset loading immediately for OAuth as redirect happens
    setTimeout(() => {
      loading.value = false
      isProcessing.value = false
    }, 1000)
  }
}

async function handleLogin() {
  if (isProcessing.value) return
  
  if (!email.value || !password.value) {
    error.value = 'Please enter email and password'
    return
  }

  isProcessing.value = true
  loading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value
    })

    if (loginError) {
      if (loginError.message.includes('Email not confirmed')) {
        error.value = `Please confirm your email before logging in.

Check your inbox (${email.value}) for the confirmation link we sent you.

Have not received it? Check your spam folder.`
      } else {
        error.value = 'Invalid email or password. Please try again.'
      }
      return
    }

    // Update auth store
    authStore.user = data.user
    authStore.session = data.session
    
    // Check for profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError && profileError.code !== 'PGRST116') {
      error.value = 'Error loading profile'
      return
    }

    // Clear form
    email.value = ''
    password.value = ''

    // Navigate based on profile completion
    if (!profile) {
      await router.replace('/complete-profile')
    } else {
      await router.replace('/tabs/home')
    }
  } catch (err) {
    console.error('Login error:', err)
    error.value = 'An unexpected error occurred'
  } finally {
    loading.value = false
    isProcessing.value = false
  }
}

function navigateToSignup() {
  if (isProcessing.value) return
  router.push('/signup')
}

async function handleForgotPassword() {
  if (isProcessing.value) return
  
  if (!email.value) {
    error.value = 'Please enter your email address first'
    return
  }

  isProcessing.value = true
  loading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const resetUrl = Capacitor.isNativePlatform() 
      ? 'com.rounds.app://reset-password'
      : `${window.location.origin}/reset-password`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.value.trim(), 
      {
        redirectTo: resetUrl
      }
    )

    if (resetError) {
      error.value = resetError.message
    } else {
      successMessage.value = `Password reset link sent to ${email.value}. Please check your email.`
    }
  } catch (err) {
    console.error('Password reset error:', err)
    error.value = 'Failed to send password reset email'
  } finally {
    loading.value = false
    isProcessing.value = false
  }
}

// Clear any stale auth state on mount
onMounted(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      // User already logged in, redirect
      await router.replace('/tabs/home')
    }
  } catch (err) {
    console.error('Session check error:', err)
  }
})
</script>

