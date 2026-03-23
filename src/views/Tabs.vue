<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      
      <ion-tab-bar 
        slot="bottom"
        v-show="!isTabBarHidden"
        class="tab-bar-animated"
      >
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon :icon="home" />
          <ion-label>Home</ion-label>
        </ion-tab-button>
        
        <ion-tab-button tab="jobs" href="/tabs/jobs">
          <ion-icon :icon="globeOutline" />
          <ion-label>Jobs</ion-label>
        </ion-tab-button>
        
        <ion-tab-button tab="create" href="/tabs/create" class="create-tab">
          <ion-icon :icon="flashOutline" />
          <ion-label>Create</ion-label>
        </ion-tab-button>
        
        <ion-tab-button tab="chat" href="/tabs/chat">
          <ion-icon :icon="chatbubblesOutline" />
          <ion-label>Chat</ion-label>
          <ion-badge v-if="unreadMessages > 0" class="tab-badge">
            {{ unreadMessages > 99 ? '99+' : unreadMessages }}
          </ion-badge>
        </ion-tab-button>
        
        <ion-tab-button tab="notifications" href="/tabs/notifications">
          <ion-icon :icon="notificationsOutline" />
          <ion-label>Notifs</ion-label>
          <ion-badge v-if="unreadNotifications > 0" class="tab-badge">
            {{ unreadNotifications > 99 ? '99+' : unreadNotifications }}
          </ion-badge>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<style scoped>

ion-tab-bar {
  --background: #000;
  --border-color: transparent;
  border-top: 1px solid #1a1a1a;
  height: 49px;  /* iOS standard tab bar height */
  padding-bottom: 0;
}

body.light ion-tab-bar {
  --background: #fff;
  --border-color: transparent;
  border-top: 1px solid #e5e5e5;
}

ion-tab-button ion-icon {
  color: #999;
  font-size: 22px;
  margin-bottom: 1px;
  transition: color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

body.light ion-tab-button ion-icon {
  color: #666;
}

ion-tab-button ion-label {
  color: #888;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
  -webkit-font-smoothing: antialiased;
  margin-top: 0;
}

body.light ion-tab-button ion-label {
  color: #666;
}

ion-tab-button.tab-selected ion-icon,
ion-tab-button.tab-selected ion-label {
  color: #fff;
}

body.light ion-tab-button.tab-selected ion-icon,
body.light ion-tab-button.tab-selected ion-label {
  color: #000;
}

@media (hover: hover) and (pointer: fine) {
  ion-tab-button:hover ion-icon,
  ion-tab-button:hover ion-label { color: #ccc; }
  body.light ion-tab-button:hover ion-icon,
  body.light ion-tab-button:hover ion-label { color: #333; }
}

.create-tab ion-icon {
  font-size: 24px;
  margin-bottom: 1px;
}
.create-tab ion-label {
  font-size: 10px;
  font-weight: 600;
}
.create-tab.tab-selected ion-icon {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}
</style>

<style>
/* Kill default ion-tab-button padding */
ion-tab-button::part(native) {
  padding-top: 2px !important;
  padding-bottom: 2px !important;
  min-height: unset !important;
  height: 100% !important;
}

/* Remove white line above tab bar from ion-tabs */
ion-tabs::part(container) {
  border-top: none !important;
}

.tab-bar-animated {
  height: calc(49px + env(safe-area-inset-bottom)) !important;
  padding-bottom: env(safe-area-inset-bottom) !important;
}
</style>

<script setup>
import { ref, onMounted, onUnmounted, provide, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  IonPage,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonBadge,
  createAnimation
} from '@ionic/vue'
import { home, notificationsOutline, globeOutline, flashOutline, chatbubblesOutline } from 'ionicons/icons'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'

const route = useRoute()
const authStore = useAuthStore()
const unreadMessages = ref(0)
const unreadNotifications = ref(0)
const isTabBarHidden = ref(false)

let messageChannel = null
let notificationChannel = null

const CHAT_API_URL = 'https://octopus-chat-api-production-7a08.up.railway.app/api'

// Routes where tab bar should be hidden
const hideTabBarPatterns = [
  /^\/post\/.+/,                 // Post detail pages
  /^\/user\/.+/,                 // User profile pages
  /^\/chat\/.+/,                 // Chat conversation pages (e.g., /chat/123)
  /^\/tabs\/profile$/,           // Own profile page
  /^\/edit-profile$/,            // Edit profile page
  /^\/verify-account$/,          // Verify account page
  /^\/privacy-settings$/,        // Privacy settings page
  /^\/history$/,                 // History page
  /^\/terms-and-conditions$/,    // Terms and conditions page
  /^\/complete-profile$/         // Complete profile page
]

// Watch for route changes to show/hide tab bar
watch(() => route.path, (newPath) => {
  checkTabBarVisibility(newPath)
}, { immediate: true })

function checkTabBarVisibility(path) {
  isTabBarHidden.value = hideTabBarPatterns.some(pattern => pattern.test(path))
}

// Provide the tab bar control to child components (for manual control if needed)
provide('tabBarControl', {
  hide: () => { isTabBarHidden.value = true },
  show: () => { isTabBarHidden.value = false },
  setHidden: (hidden) => { isTabBarHidden.value = hidden }
})

onMounted(async () => {
  if (authStore.user) {
    await fetchUnreadCounts()
    setupRealtimeSubscriptions()
  }
  checkTabBarVisibility(route.path)
})

const blackFadeTransition = (baseEl, opts) => {
  const enterEl = opts.enteringEl
  const leaveEl = opts.leavingEl

  const enterAnim = createAnimation()
    .addElement(enterEl)
    .fromTo('opacity', 0, 1)
    .duration(200)

  const leaveAnim = createAnimation()
    .addElement(leaveEl)
    .fromTo('opacity', 1, 0)
    .duration(200)

  return createAnimation()
    .addAnimation([enterAnim, leaveAnim])
}

onUnmounted(() => {
  if (messageChannel) messageChannel.unsubscribe()
  if (notificationChannel) notificationChannel.unsubscribe()
})

async function fetchUnreadCounts() {
  try {
    const response = await fetch(`${CHAT_API_URL}/conversations?user_id=${authStore.user.id}`)
    const data = await response.json()

    if (data.conversations) {
      unreadMessages.value = data.conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
    }

    const { data: chatRequests } = await supabase
      .from('chat_requests')
      .select('id')
      .eq('receiver_id', authStore.user.id)
      .eq('status', 'pending')

    if (chatRequests) {
      unreadMessages.value += chatRequests.length
    }

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', authStore.user.id)
      .eq('is_read', false)

    unreadNotifications.value = count || 0
  } catch (error) {
    // Silent fail
  }
}

function setupRealtimeSubscriptions() {
  messageChannel = supabase
    .channel('message_updates')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `receiver_id=eq.${authStore.user.id}`
      },
      () => fetchUnreadCounts()
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_requests',
        filter: `receiver_id=eq.${authStore.user.id}`
      },
      () => fetchUnreadCounts()
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `receiver_id=eq.${authStore.user.id}`
      },
      () => fetchUnreadCounts()
    )
    .subscribe()

  notificationChannel = supabase
    .channel('notification_updates')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${authStore.user.id}`
      },
      () => fetchUnreadCounts()
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${authStore.user.id}`
      },
      () => fetchUnreadCounts()
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${authStore.user.id}`
      },
      () => fetchUnreadCounts()
    )
    .subscribe()
}
</script>