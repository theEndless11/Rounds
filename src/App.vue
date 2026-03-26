<template>
  <ion-app>

    <!-- STATUS BAR SHIM: fills the native status bar zone with the correct
         theme color. On iOS with overlaysWebView:true the status bar is
         transparent — this div sits behind the icons and gives them a
         readable background. Height is driven by --sat (set via
         StatusBar.getInfo() in useDarkMode) with env() and px fallbacks. -->
    <div
      id="status-bar-bg"
      style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: var(--sat, env(safe-area-inset-top, 44px));
        z-index: 99999;
        pointer-events: none;
        background-color: #000000;
        transition: background-color 0.2s;
      "
    ></div>

    <!-- Loading State -->
    <div 
      v-if="authLoading" 
      style="display: flex; align-items: center; justify-content: center; height: 100vh; background-color: var(--background);"
    >
      <ion-spinner></ion-spinner>
    </div>

    <!-- Main App Content - Always rendered after loading -->
    <template v-else>
      <ion-router-outlet />
      
      <!-- Verification Banner - Fixed at bottom -->
      <div 
        v-if="showVerificationBanner"
        class="verification-banner"
      >
        <ion-icon :icon="warningOutline" class="banner-icon"></ion-icon>
        <div class="banner-text">
          <span>Your account is not verified.</span>
          <ion-button
            size="small"
            fill="clear"
            color="light"
            @click="handleVerifyClick"
          >
            Verify Now
          </ion-button>
        </div>
        <ion-button
          size="small"
          fill="clear"
          color="light"
          @click="dismissBanner"
        >
          <ion-icon :icon="closeOutline"></ion-icon>
        </ion-button>
      </div>
    </template>
  </ion-app>
</template>


<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { IonApp, IonRouterOutlet, IonSpinner, IonButton, IonIcon } from '@ionic/vue'
import { useRouter, useRoute } from 'vue-router'
import { App as CapacitorApp } from '@capacitor/app'
import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { warningOutline, closeOutline } from 'ionicons/icons'

import { supabase } from '@/supabase'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const { initTheme, listenToSystemTheme } = useDarkMode()

const authLoading = ref(true)
const bannerDismissed = ref(false)
const initialCheckComplete = ref(false)

const PUSH_API_URL = 'https://octopus-push-api-production-677b.up.railway.app'

// Routes where banner should NOT be shown
const hideBannerRoutes = [
  '/complete-profile',
  '/tabs/select-specialties',
  '/select-specialties',
  '/auth/callback',
  '/login',
  '/reset-password'
]

const hideBannerPatterns = [
  /^\/post\/.+/,
  /^\/user\/.+/,
  /^\/chat\/.+/
]

const shouldShowBanner = computed(() => {
  const currentPath = route.path
  
  if (hideBannerRoutes.includes(currentPath)) {
    return false
  }
  
  if (hideBannerPatterns.some(pattern => pattern.test(currentPath))) {
    return false
  }
  
  return true
})

const showVerificationBanner = computed(() => {
  return (
    initialCheckComplete.value &&
    authStore.user &&
    !authStore.isVerified &&
    !bannerDismissed.value &&
    shouldShowBanner.value
  )
})

onMounted(async () => {
  // Initialize theme first
  await initTheme()
  listenToSystemTheme()

  // Initialize auth
  await authStore.initAuth?.() || await authStore.initialize?.()

  // Check verification status
  if (authStore.user) {
    await authStore.checkVerificationStatus(authStore.user.id)
    
    // Initialize push notifications after auth is ready
    await initializePushNotifications()
  }

  initialCheckComplete.value = true
  authLoading.value = false

  // Listen for auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      authStore.user = session.user
      authStore.session = session
      await authStore.checkVerificationStatus(session.user.id)
      await initializePushNotifications()
      initialCheckComplete.value = true
    }

    if (event === 'SIGNED_OUT') {
      authStore.user = null
      authStore.session = null
      authStore.isVerified = false
      initialCheckComplete.value = false
      bannerDismissed.value = false
      await cleanupPushNotifications()

      const currentPath = router.currentRoute.value.path
      if (currentPath !== '/login' && currentPath !== '/auth/callback') {
        await router.replace('/login')
      }
    }
  })

  await handleInitialRouting()
  setupAppStateListeners()
})

watch(
  () => authStore.isVerified,
  (isVerified) => {
    if (isVerified) {
      bannerDismissed.value = false
    }
  }
)

// ====================================
// PUSH NOTIFICATIONS
// ====================================

async function initializePushNotifications() {
  // Only works on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('⚠️ Push notifications only work on iOS/Android')
    return
  }

  if (!authStore.user) {
    console.log('⚠️ No user logged in')
    return
  }

  try {
    console.log('🔔 Initializing push notifications...')

    // 1. Request permission
    let permStatus = await PushNotifications.checkPermissions()

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions()
    }

    if (permStatus.receive !== 'granted') {
      console.log('❌ Push notification permission denied')
      return
    }

    console.log('✅ Push notification permission granted')

    // 2. Register with FCM/APNs
    await PushNotifications.register()

    // 3. Listen for registration success
    await PushNotifications.addListener('registration', async (token) => {
      console.log('📱 FCM Token:', token.value)
      await registerTokenWithBackend(token.value)
    })

    // 4. Handle registration errors
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Push registration error:', error)
    })

    // 5. Handle notification received (app in foreground)
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('🔔 Notification received (foreground):', notification)
      // You can show a toast or update UI here
    })

    // 6. Handle notification tapped (app in background/killed)
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('👆 Notification tapped:', notification)
      handleNotificationTap(notification.notification.data)
    })

    console.log('✅ Push notifications initialized')

  } catch (error) {
    console.error('❌ Error initializing push notifications:', error)
  }
}

async function registerTokenWithBackend(token) {
  try {
    console.log('📤 Registering token with backend...')
    
    const response = await fetch(`${PUSH_API_URL}/api/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: authStore.user.id,
        token: token,
        platform: Capacitor.getPlatform()
      })
    })

    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Push token registered successfully')
    } else {
      console.error('❌ Failed to register token:', result.error)
    }
  } catch (error) {
    console.error('❌ Error registering token:', error)
  }
}

async function handleNotificationTap(data) {
  console.log('🔔 Handling notification tap with data:', data)
  
  const { type, id, userId, chatWithId, callType, callerId, callerName } = data

  if (type === 'call') {
    // Fetch caller details if not in data
    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name, profile_photo_url')
      .eq('id', callerId)
      .single()

    router.push({
      path: `/chat/${callerId}`,
      query: {
        username: userData?.full_name || callerName || 'User',
        profileImage: userData?.profile_photo_url || '',
        incomingCall: 'true',
        callType: callType
      }
    })
  } else if (type === 'message' && chatWithId) {
    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name, profile_photo_url')
      .eq('id', chatWithId)
      .single()

    router.push({
      path: `/chat/${chatWithId}`,
      query: {
        username: userData?.full_name || chatWith || 'User',
        profileImage: userData?.profile_photo_url || ''
      }
    })
  } else if (type === 'like' || type === 'comment') {
    if (id) router.push(`/post/${id}`)
  } else if (type === 'follow' || type === 'friend_request') {
    if (userId) router.push(`/user/${userId}`)
  } else {
    router.push('/tabs/notifications')
  }
}

async function cleanupPushNotifications() {
  if (!Capacitor.isNativePlatform()) return

  try {
    await PushNotifications.removeAllListeners()
    console.log('✅ Push notifications cleaned up')
  } catch (error) {
    console.error('❌ Error cleaning up push:', error)
  }
}

// ====================================
// ROUTING & APP STATE
// ====================================

async function handleInitialRouting() {
  const currentPath = router.currentRoute.value.path

  if (currentPath === '/auth/callback') return

  if (authStore.user) {
    if (currentPath === '/' || currentPath === '/login') {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authStore.user.id)
        .maybeSingle()

      if (profile) {
        router.replace('/tabs/home')
      } else {
        router.replace('/complete-profile')
      }
    }
  } else {
    if (currentPath !== '/login') {
      router.replace('/login')
    }
  }
}

function setupAppStateListeners() {
  CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive && authStore.user) {
      console.log('📱 App became active')
      // You can refresh data here
    }
  })

  // Handle deep links when app is running
  CapacitorApp.addListener('appUrlOpen', (data) => {
    console.log('🔗 Deep link received:', data.url)
    handleDeepLink(data.url)
  })
  
  // Check for launch URL when app starts
  CapacitorApp.getLaunchUrl().then((result) => {
    if (result?.url) {
      console.log('🔗 App launched with URL:', result.url)
      handleDeepLink(result.url)
    }
  })
}

function handleDeepLink(url) {
  try {
    console.log('Processing deep link:', url)
    
    const urlWithoutScheme = url.replace('com.rounds.app://', '')
    
    let path = ''
    let paramsString = ''
    
    if (urlWithoutScheme.includes('#')) {
      [path, paramsString] = urlWithoutScheme.split('#')
      paramsString = '#' + paramsString
    } else if (urlWithoutScheme.includes('?')) {
      [path, paramsString] = urlWithoutScheme.split('?')
      paramsString = '?' + paramsString
    } else {
      path = urlWithoutScheme
    }
    
    console.log('📍 Path:', path, 'Params:', paramsString)
    
    let targetRoute = ''
    
    if (path === 'reset-password' || path.startsWith('reset-password')) {
      targetRoute = '/reset-password'
    } else if (path === 'auth/callback' || path.startsWith('auth')) {
      targetRoute = '/auth/callback'
    } else {
      console.warn('⚠️ Unknown deep link path:', path)
      return
    }
    
    const fullPath = targetRoute + paramsString
    console.log('✅ Navigating to:', fullPath)
    
    setTimeout(() => {
      router.push(fullPath)
    }, 300)
    
  } catch (error) {
    console.error('❌ Error handling deep link:', error)
  }
}

async function handleVerifyClick() {
  await router.push('/verify-account')
  bannerDismissed.value = true
}

function dismissBanner() {
  bannerDismissed.value = true
}
</script>

<style>
/* ============================================
   CSS Variables - Dark Mode (Default)
   ============================================ */
:root {
  --background: #000000;
  --background-secondary: #111111;
  --text-primary: #ffffff;
  --text-secondary: #8b98a5;
  --border-color: #2f3336;
  --card-background: #111111;
  --card-hover: #1a1a1a;
  --input-background: #1a1a1a;
  --placeholder-color: #536471;
  --scrollbar-track: #111111;
  --scrollbar-thumb: #333;
  --scrollbar-thumb-hover: #555;
  --media-background: #1a1a1a;
  --code-background: #1a1a1a;
  --quote-background: rgba(255, 255, 255, 0.05);
  --shimmer-start: #1a1a1a;
  --shimmer-mid: #2a2a2a;
  --video-background: #000000;
  --modal-background: #111111;
  --modal-text: #ffffff;
}

/* ============================================
   CSS Variables - Light Mode
   ============================================ */
body.light {
  --background: #ffffff;
  --background-secondary: #ffffff;
  --text-primary: #0f1419;
  --text-secondary: #536471;
  --border-color: #eff1f3;
  --card-background: #fff;
  --card-hover: #f8f9fa;
  --input-background: #f0f2f5;
  --placeholder-color: #8b98a5;
  --scrollbar-track: #f5f5f5;
  --scrollbar-thumb: #ccc;
  --scrollbar-thumb-hover: #999;
  --media-background: #f7f9fa;
  --code-background: #f0f2f5;
  --quote-background: rgba(0, 0, 0, 0.02);
  --shimmer-start: #e8ecf0;
  --shimmer-mid: #f2f5f8;
  --video-background: #1a1a1a;
  --modal-background: #fff;
  --modal-text: #000;
}

/* ============================================
   BASE - background fills status bar area
   ============================================ */

html {
  height: 100%;
  /* This fills the status bar area on iOS with overlaysWebView: true */
  background-color: #000000;
}

/* pre-light toggled by JS when light mode is active */
html.pre-light {
  background-color: #ffffff;
}

body {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #000000;
}

body.light {
  background-color: #ffffff;
}

ion-app {
  background-color: var(--background);
}

ion-page {
  background-color: var(--background);
}

/* ============================================
   HEADER
   With overlaysWebView: true, the toolbar's background
   visually fills the status bar area because it's the
   topmost element. padding-top pushes content below
   the status bar while the background extends behind it.
   ============================================ */

.header-ios::after,
.header-md::after {
  display: none !important;
  height: 0 !important;
  background: none !important;
}

ion-header::after {
  display: none !important;
}

ion-header {
  box-shadow: none !important;
}

ion-header ion-toolbar {
  --background: #000000;
  --color: var(--text-primary);
  --border-width: 0;
  --border-color: transparent;
  --box-shadow: none;
  box-shadow: none;
}

body.light ion-header ion-toolbar {
  --background: #ffffff;
  --color: #0f1419;
}

/* First toolbar gets padding for status bar safe area */
ion-header ion-toolbar:first-child {
  padding-top: env(safe-area-inset-top);
  --background: #000000;
}

body.light ion-header ion-toolbar:first-child {
  --background: #ffffff;
}

ion-toolbar {
  --border-width: 0 !important;
  --border-color: transparent !important;
  --box-shadow: none !important;
}

/* ============================================
   NATIVE TRANSITION OPTIMIZATIONS
   ============================================ */

ion-router-outlet {
  contain: layout style size;
}

ion-page {
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

ion-content {
  --overflow: auto;
}

/* ============================================
   GLOBAL STYLES
   ============================================ */

body {
  background-color: var(--background);
}

ion-content {
  --background: var(--background);
  --color: var(--text-primary);
}

ion-tab-button {
  --color: var(--text-secondary);
  --color-selected: var(--text-primary);
}

ion-card {
  --background: var(--card-background);
  --color: var(--text-primary);
}

ion-item {
  --background: var(--background-secondary);
  --color: var(--text-primary);
  --border-color: var(--border-color);
}

ion-list {
  --background: var(--background);
}

ion-input,
ion-textarea {
  --background: var(--input-background);
  --color: var(--text-primary);
  --placeholder-color: var(--placeholder-color);
}

ion-button {
  --color: var(--text-primary);
}

ion-label,
ion-text,
p,
h1, h2, h3, h4, h5, h6 {
  color: var(--text-primary);
}

ion-spinner {
  color: var(--text-primary);
}

ion-modal {
  --background: var(--background);
}

ion-modal ion-content {
  --background: var(--background);
}

/* ============================================
   ACTION SHEET
   ============================================ */

ion-action-sheet {
  --background: #000000 !important;
  --color: #ffffff !important;
  --button-color: #ffffff !important;
  --button-background: #000000 !important;
  --button-background-selected: #111111 !important;
}

body.light ion-action-sheet {
  --background: #ffffff !important;
  --color: #000000 !important;
  --button-color: #000000 !important;
  --button-background: #ffffff !important;
  --button-background-selected: #f8f9fa !important;
}

ion-action-sheet::part(wrapper) {
  background: #000000 !important;
}

body.light ion-action-sheet::part(wrapper) {
  background: #ffffff !important;
}

ion-action-sheet::part(header) {
  background: #000000 !important;
  color: #ffffff !important;
}

body.light ion-action-sheet::part(header) {
  background: #ffffff !important;
  color: #000000 !important;
}

ion-alert {
  --background: var(--card-background);
  --color: var(--text-primary);
}

ion-toast {
  --background: var(--background-secondary);
  --color: var(--text-primary);
}

/* ============================================
   SCROLLBAR
   ============================================ */

::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--scrollbar-track); }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }
/* ============================================
   VERIFICATION BANNER
   ============================================ */

.verification-banner {
  position: fixed;
  top: 83%;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  padding: 6px 12px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.banner-icon {
  font-size: 20px;
  margin-right: 8px;
  flex-shrink: 0;
  color: white;
}

.banner-text {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 4px;
  flex-wrap: nowrap;
}

.banner-text span {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  color: white;
}

.verification-banner ion-button {
  --color: white;
}

.verification-banner ion-icon {
  color: white;
}
</style>