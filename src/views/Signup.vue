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
          <h2 style="margin-bottom: 24px; text-align: center;">Create Account</h2>
          
          <!-- Success Message - Shown at top when account created -->
          <div v-if="successMessage" class="success-banner">
            <div class="success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#10b981" stroke-width="2"/>
                <path d="M8 12l2 2 4-4" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3 class="success-title">Account Created Successfully!</h3>
            <p class="success-message">{{ successMessage }}</p>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="error-banner">
            <p class="error-message">{{ error }}</p>
          </div>

          <!-- Form Fields - Hidden when success message shown -->
          <div v-if="!successMessage">
            <div class="input-wrapper">
              <label class="input-label">Email</label>
              <input 
                v-model="email" 
                type="email"
                placeholder="Doctor@gmail.com"
                class="custom-input"
                @keyup.enter="handleSignup"
                :disabled="loading"
              />
            </div>
            
            <div class="input-wrapper">
              <label class="input-label">Password</label>
              <input 
                v-model="password" 
                type="password"
                placeholder="*********"
                class="custom-input"
                @keyup.enter="handleSignup"
                :disabled="loading"
              />
              <p class="helper-text">Must be at least 6 characters</p>
            </div>

            <ion-button 
              expand="block" 
              @click="handleSignup"
              :disabled="loading"
              class="login-btn"
            >
              {{ loading ? 'Creating Account...' : 'Sign Up' }}
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
              Already have an account? <span @click="navigateToLogin" class="signup-link">Login</span>
            </div>
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
import { useAuthStore } from '@/stores/auth'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
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
    const scheme = Capacitor.getPlatform() === 'ios' ? 'com.rounds.social' : 'com.rounds.app'
    return `${scheme}://auth/callback`
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
    if (Capacitor.isNativePlatform()) {
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl(),
          skipBrowserRedirect: true
        }
      })

      if (signInError) {
        error.value = signInError.message
        return
      }

      if (data?.url) {
        await Browser.open({
          url: data.url,
          windowName: '_self'
        })
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl(),
          skipBrowserRedirect: false
        }
      })

      if (signInError) {
        error.value = signInError.message
      }
    }
  } catch (err) {
    console.error('Google sign in error:', err)
    error.value = 'Failed to sign in with Google'
  } finally {
    setTimeout(() => {
      loading.value = false
      isProcessing.value = false
    }, 1000)
  }
}

async function handleSignup() {
  if (isProcessing.value) return

  if (!email.value || !password.value) {
    error.value = 'Please enter email and password'
    return
  }

  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }

  isProcessing.value = true
  loading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.value.trim(),
      password: password.value,
      options: {
        emailRedirectTo: getRedirectUrl()
      }
    })

    if (signupError) {
      if (signupError.message.includes('User already registered') ||
          signupError.message.includes('already been registered')) {
        error.value = `An account with ${email.value} already exists. Please login instead or use a different email address.`
      } else if (signupError.message.includes('password')) {
        error.value = 'Password does not meet requirements. Please use at least 6 characters.'
      } else {
        error.value = signupError.message
      }
      return
    }

    if (!data.user) {
      error.value = 'Signup failed. Please try again.'
      return
    }

    if (data.user && !data.session && data.user.identities && data.user.identities.length === 0) {
      error.value = `An account with ${email.value} already exists. Please login instead.`
      return
    }

    if (data.session) {
      authStore.user = data.user
      authStore.session = data.session
      successMessage.value = 'Account created successfully! Redirecting...'
      email.value = ''
      password.value = ''
      setTimeout(() => {
        router.replace('/complete-profile')
      }, 1000)
    } else {
      successMessage.value = `We have sent a confirmation email to ${email.value}\n\nPlease check your email inbox and click on the confirmation link to activate your account. Once confirmed, you will be able to log in and access all features.\n\nThe email should arrive within a few minutes. If you do not see it, please check your spam or junk folder.`
      email.value = ''
      password.value = ''
      setTimeout(() => {
        router.push('/login')
      }, 8000)
    }
  } catch (err) {
    console.error('Signup error:', err)
    error.value = 'An unexpected error occurred. Please try again.'
  } finally {
    loading.value = false
    isProcessing.value = false
  }
}

function navigateToLogin() {
  if (isProcessing.value) return
  router.push('/login')
}

onMounted(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await router.replace('/tabs/home')
    }
  } catch (err) {
    console.error('Session check error:', err)
  }
})
</script>

<style scoped>
.helper-text {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  margin-bottom: 0;
}

.success-banner {
  background: #000;
  border-radius: 16px;
  padding: 32px 24px;
  margin-bottom: 24px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
  animation: slideDown 0.5s ease-out;
}

.success-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.success-title {
  font-size: 20px;
  font-weight: 600;
  color: #065f46;
  margin: 0 0 12px 0;
}

.success-message {
  font-size: 14px;
  color: #047857;
  line-height: 1.6;
  margin: 0;
  white-space: pre-line;
}

.error-banner {
  background: #000;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  border-left: 4px solid #ef4444;
}

.error-message {
  color: #991b1b;
  font-size: 14px;
  margin: 0;
  line-height: 1.6;
  white-space: pre-line;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  font-size: 0.9375rem;
  font-family: inherit;
  transition: all 0.2s ease;
  -webkit-text-fill-color: #e5e7eb !important;
  -webkit-box-shadow: 0 0 0 1000px #000 inset !important;
}
.custom-input::placeholder {
  color: #4b5563;
}
.custom-input:focus {
  background: #0a0a0a !important;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
  -webkit-box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15), 0 0 0 1000px #0a0a0a inset !important;
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
}
.signup-link:hover {
  color: #34d399;
}
.error-text {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: #000;
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
