<template>
  <ion-page>
    <ion-header style="border-bottom: 1px solid #222;">
      <ion-toolbar>
        <ion-title>
          <span 
            v-for="(word, index) in titleWords" 
            :key="index"
            class="word"
            :style="{ animationDelay: `${index * 0.15}s` }"
          >
            {{ word }}
          </span>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="markAllAsRead" v-if="unreadCount > 0" class="mark-read-btn">
            <ion-icon :icon="checkmarkDone"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Filter Tabs -->
      <ion-toolbar class="filter-toolbar">
        <div class="filter-tabs">
          <button
            v-for="filter in filters"
            :key="filter.value"
            @click="selectedFilter = filter.value"
            :class="['filter-tab', { active: selectedFilter === filter.value }]"
          >
            {{ filter.label }}
            <span v-if="filter.value === 'all' && unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <ion-spinner color="primary"></ion-spinner>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredNotifications.length === 0" class="empty-state">
        <ion-icon :icon="notificationsOffOutline" class="empty-icon"></ion-icon>
        <h3>
          <span 
            v-for="(word, index) in emptyWords" 
            :key="index"
            class="word"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            {{ word }}
          </span>
        </h3>
        <p>When someone interacts with you, notifications will appear here</p>
      </div>

      <!-- Notifications List -->
      <div v-else class="notifications-list">
        <notification-item
          v-for="(notification, index) in filteredNotifications"
          :key="notification.id"
          :notification="notification"
          :index="index"
          @click="handleNotificationClick(notification)"
          @accept="handleAcceptRequest"
          @reject="handleRejectRequest"
          @delete="handleDeleteNotification"
        />
      </div>

      <!-- Load More -->
      <div v-if="hasMore && !loading" class="load-more">
        <ion-button expand="block" fill="clear" @click="loadMore">
          Load More
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import NotificationItem from '@/components/NotificationItem.vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonIcon, IonSpinner, toastController
} from '@ionic/vue'
import { checkmarkDone, notificationsOffOutline } from 'ionicons/icons'

const router = useRouter()
const authStore = useAuthStore()

const titleWords = ref(['Notifications'])
const emptyWords = ref(['No', 'notifications', 'yet'])
const notifications = ref([])
const loading = ref(true)
const selectedFilter = ref('all')
const page = ref(0)
const pageSize = 20
const hasMore = ref(true)
const notificationSettings = ref({
  likes: true,
  comments: true,
  followers: true,
  email: false
})

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Likes', value: 'likes' },
  { label: 'Comments', value: 'comments' },
  { label: 'Follows', value: 'follows' }
]

const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.is_read).length
})

const filteredNotifications = computed(() => {
  let filtered = notifications.value

  // Filter out blocked users
  filtered = filtered.filter(n => {
    // Check if actor is blocked
    return !n.actor_blocked
  })

  // Apply category filter
  if (selectedFilter.value === 'likes') {
    filtered = filtered.filter(n => 
      n.type === 'like' || n.type === 'comment_like' || n.type === 'like_milestone'
    )
  } else if (selectedFilter.value === 'comments') {
    filtered = filtered.filter(n => 
      n.type === 'post_comment' || n.type === 'comment_reply'
    )
  } else if (selectedFilter.value === 'follows') {
    filtered = filtered.filter(n => 
      n.type === 'follow' || n.type === 'friend_request' || n.type === 'friend_accept'
    )
  }

  return filtered
})

onMounted(async () => {
  await loadNotificationSettings()
  await loadNotifications()
  setupRealtimeSubscription()
})

async function loadNotificationSettings() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user?.user_metadata?.notification_settings) {
      notificationSettings.value = user.user_metadata.notification_settings
    } else {
      const saved = localStorage.getItem('notification_settings')
      if (saved) {
        notificationSettings.value = JSON.parse(saved)
      }
    }
  } catch (error) {
    console.error('Error loading notification settings:', error)
  }
}

function shouldShowNotification(type) {
  // Check if notification type is enabled in settings
  if (type === 'like' || type === 'comment_like' || type === 'like_milestone') {
    return notificationSettings.value.likes
  } else if (type === 'post_comment' || type === 'comment_reply') {
    return notificationSettings.value.comments
  } else if (type === 'follow' || type === 'friend_request' || type === 'friend_accept') {
    return notificationSettings.value.followers
  }
  return true // Show other types by default
}

async function loadNotifications() {
  loading.value = true

  try {
    // Get blocked users list
    const { data: blockedData } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', authStore.user.id)

    const blockedIds = blockedData?.map(b => b.blocked_id) || []

    // Load notifications
    let query = supabase
      .from('notifications')
      .select(`
        *,
        actor:actor_id (
          id,
          full_name,
          profile_photo_url
        ),
        post:post_id (
          id,
          content,
          media_urls
        )
      `)
      .eq('recipient_id', authStore.user.id)
      .order('created_at', { ascending: false })

    // Filter out notifications from blocked users
    if (blockedIds.length > 0) {
      query = query.not('actor_id', 'in', `(${blockedIds.join(',')})`)
    }

    const { data, error } = await query
      .range(page.value * pageSize, (page.value + 1) * pageSize - 1)

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log('Loaded notifications:', data)

    // Filter based on notification settings
    const filteredData = data?.filter(n => shouldShowNotification(n.type)) || []

    if (page.value === 0) {
      notifications.value = filteredData
    } else {
      notifications.value.push(...filteredData)
    }

    hasMore.value = data?.length === pageSize

  } catch (error) {
    console.error('Error loading notifications:', error)
  } finally {
    loading.value = false
  }
}

function setupRealtimeSubscription() {
  supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${authStore.user.id}`
      },
      async (payload) => {
        // Check if notification type is enabled
        if (!shouldShowNotification(payload.new.type)) {
          return
        }

        // Check if actor is blocked
        const { data: isBlocked } = await supabase
          .from('blocked_users')
          .select('id')
          .eq('blocker_id', authStore.user.id)
          .eq('blocked_id', payload.new.actor_id)
          .single()

        if (isBlocked) {
          return
        }

        const { data } = await supabase
          .from('notifications')
          .select(`
            *,
            actor:actor_id (
              id,
              full_name,
              profile_photo_url
            ),
            post:post_id (
              id,
              content,
              media_urls
            )
          `)
          .eq('id', payload.new.id)
          .single()

        if (data) {
          notifications.value.unshift(data)
        }
      }
    )
    .subscribe()
}

async function handleNotificationClick(notification) {
  if (!notification.is_read) {
    await markAsRead(notification.id)
  }

  // Navigate based on type
  if (notification.type === 'like' || notification.type === 'post_comment' || 
      notification.type === 'comment_reply' || notification.type === 'comment_like' || 
      notification.type === 'like_milestone') {
    if (notification.post_id) {
      router.push(`/post/${notification.post_id}`)
    } else if (notification.comment_id) {
      const { data: comment } = await supabase
        .from('comments')
        .select('post_id')
        .eq('id', notification.comment_id)
        .single()
      
      if (comment) {
        router.push(`/post/${comment.post_id}`)
      }
    }
  } else if (notification.type === 'follow' || notification.type === 'friend_request' || 
             notification.type === 'friend_accept') {
    router.push(`/user/${notification.actor_id}`)
  } else if (notification.type === 'verification') {
    router.push('/verify-account')
  }
}

async function markAsRead(notificationId) {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  const notification = notifications.value.find(n => n.id === notificationId)
  if (notification) {
    notification.is_read = true
  }
}

async function markAllAsRead() {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', authStore.user.id)
    .eq('is_read', false)

  notifications.value.forEach(n => {
    n.is_read = true
  })

  const toast = await toastController.create({
    message: 'All notifications marked as read',
    duration: 2000,
    color: 'success'
  })
  await toast.present()
}

async function handleAcceptRequest(notificationId, actorId) {
  try {
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('sender_id', actorId)
      .eq('receiver_id', authStore.user.id)

    await supabase
      .from('notifications')
      .insert({
        recipient_id: actorId,
        actor_id: authStore.user.id,
        type: 'friend_accept',
        is_read: false
      })

    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    notifications.value = notifications.value.filter(n => n.id !== notificationId)

    const toast = await toastController.create({
      message: 'Friend request accepted!',
      duration: 2000,
      color: 'success'
    })
    await toast.present()

  } catch (error) {
    console.error('Error accepting request:', error)
  }
}

async function handleRejectRequest(notificationId, actorId) {
  try {
    await supabase
      .from('friend_requests')
      .delete()
      .eq('sender_id', actorId)
      .eq('receiver_id', authStore.user.id)

    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    notifications.value = notifications.value.filter(n => n.id !== notificationId)

    const toast = await toastController.create({
      message: 'Friend request rejected',
      duration: 2000,
      color: 'medium'
    })
    await toast.present()

  } catch (error) {
    console.error('Error rejecting request:', error)
  }
}

async function handleDeleteNotification(notificationId) {
  await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  notifications.value = notifications.value.filter(n => n.id !== notificationId)
}

async function loadMore() {
  page.value++
  await loadNotifications()
}
</script>

<style scoped>
ion-toolbar { --background: var(--background); --color: var(--text-primary); }
ion-content { --background: var(--background); }

.word {
  display: inline-block; margin-right: 0.3em; opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
  background: var(--text-primary);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.mark-read-btn {
  --color: #667eea;
}

.filter-toolbar {
  --background: var(--background);
  padding: 0;
}

.filter-tabs {
  display: flex; gap: 0; padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
}

.filter-tab {
  flex: 1; background: none; border: none; color: var(--text-secondary);
  padding: 12px 16px; font-size: 14px; font-weight: 500;
  cursor: pointer; position: relative; transition: color 0.2s;
  border-bottom: 2px solid transparent;
}

.filter-tab:hover {
  color: var(--text-primary);
  opacity: 0.7;
}

.filter-tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.unread-badge {
  display: inline-block; background: #ef4444; color: #fff;
  font-size: 11px; padding: 2px 6px; border-radius: 10px;
  margin-left: 6px; font-weight: 600;
}

.loading-container, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 60px 20px; text-align: center;
}

.empty-icon {
  font-size: 72px; color: var(--empty-icon-color, #333); margin-bottom: 20px;
}

body.light .empty-icon {
  color: #ccc;
}

.empty-state h3 {
  margin: 0 0 12px; font-size: 18px; font-weight: 600;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0; color: var(--text-secondary); font-size: 14px;
}

.notifications-list {
  padding: 0;
}

.load-more {
  padding: 16px;
}

.load-more ion-button {
  --color: #667eea;
}
</style>