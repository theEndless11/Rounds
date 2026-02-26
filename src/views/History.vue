<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <ion-icon :icon="arrowBack"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>History</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="confirmClearHistory" v-if="viewHistory.length > 0">
            <ion-icon :icon="trashOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>Loading history...</p>
      </div>

      <div v-else-if="viewHistory.length === 0" class="empty-state">
        <div class="empty-icon-wrapper">
          <ion-icon :icon="timeOutline" class="empty-icon"></ion-icon>
        </div>
        <h2>No History Yet</h2>
        <p>Posts you view will appear here</p>
      </div>

      <div v-else class="history-list">
        <div class="history-section" v-for="section in groupedHistory" :key="section.date">
          <div class="date-header">
            <h3>{{ section.dateLabel }}</h3>
          </div>

          <div 
            v-for="item in section.items" 
            :key="item.id"
            class="history-item-wrapper"
          >
            <ion-item-sliding @ionDrag="handleDrag">
              <ion-item lines="none" class="swipe-container">
                <div class="post-wrapper">
                  <post-card 
                    :post="item.posts"
                    @delete="handlePostDelete"
                  />
                </div>
              </ion-item>

              <ion-item-options side="end" @ionSwipe="removeFromHistory(item.id)">
                <ion-item-option color="danger" expandable @click="removeFromHistory(item.id)">
                  <ion-icon :icon="trashOutline" slot="icon-only"></ion-icon>
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>

            <div class="view-time-badge">
              <ion-icon :icon="timeOutline" class="time-icon"></ion-icon>
              Viewed {{ formatTime(item.viewed_at) }}
            </div>
          </div>
        </div>
      </div>

      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import PostCard from '../components/PostCard.vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  alertController,
  toastController
} from '@ionic/vue'
import {
  arrowBack,
  timeOutline,
  trashOutline
} from 'ionicons/icons'

const router = useRouter()
const authStore = useAuthStore()

const viewHistory = ref([])
const loading = ref(true)

const groupedHistory = computed(() => {
  const groups = {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)

  viewHistory.value.forEach(item => {
    const viewDate = new Date(item.viewed_at)
    viewDate.setHours(0, 0, 0, 0)
    
    let dateLabel
    if (viewDate.getTime() === today.getTime()) {
      dateLabel = 'Today'
    } else if (viewDate.getTime() === yesterday.getTime()) {
      dateLabel = 'Yesterday'
    } else if (viewDate > lastWeek) {
      dateLabel = viewDate.toLocaleDateString('en-US', { weekday: 'long' })
    } else {
      dateLabel = viewDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: viewDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }

    if (!groups[dateLabel]) {
      groups[dateLabel] = {
        date: viewDate,
        dateLabel,
        items: []
      }
    }
    groups[dateLabel].items.push(item)
  })

  return Object.values(groups).sort((a, b) => b.date - a.date)
})

onMounted(async () => {
  await loadHistory()
})

async function loadHistory() {
  loading.value = true

  try {
    const { data, error } = await supabase
      .from('post_views')
      .select(`
        id,
        post_id,
        viewed_at,
        posts (
          id,
          content,
          media_urls,
          media_type,
          user_id,
          created_at,
          users (
            id,
            full_name,
            profile_photo_url,
            college_hospital
          )
        )
      `)
      .eq('user_id', authStore.user.id)
      .order('viewed_at', { ascending: false })
      .limit(50)

    if (error) throw error

    // Filter out posts that have been deleted
    viewHistory.value = (data || []).filter(item => item.posts !== null)

  } catch (error) {
    console.error('Error loading history:', error)
    const toast = await toastController.create({
      message: 'Failed to load history',
      duration: 2000,
      color: 'danger'
    })
    await toast.present()
  } finally {
    loading.value = false
  }
}

async function handleRefresh(event) {
  await loadHistory()
  event.target.complete()
}

function handleDrag(event) {
  // Optional: Add haptic feedback during drag
  console.log('Dragging...', event.detail.ratio)
}

async function removeFromHistory(viewId) {
  try {
    const { error } = await supabase
      .from('post_views')
      .delete()
      .eq('id', viewId)

    if (error) throw error

    viewHistory.value = viewHistory.value.filter(item => item.id !== viewId)

    const toast = await toastController.create({
      message: 'Removed from history',
      duration: 1500,
      color: 'medium'
    })
    await toast.present()

  } catch (error) {
    console.error('Error removing from history:', error)
    const toast = await toastController.create({
      message: 'Failed to remove from history',
      duration: 2000,
      color: 'danger'
    })
    await toast.present()
  }
}

function handlePostDelete(postId) {
  // Remove the deleted post from history
  viewHistory.value = viewHistory.value.filter(item => item.post_id !== postId)
}

async function confirmClearHistory() {
  const alert = await alertController.create({
    header: 'Clear History',
    message: 'Are you sure you want to clear all your viewing history? This action cannot be undone.',
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Clear All',
        role: 'destructive',
        handler: async () => {
          await clearHistory()
        }
      }
    ]
  })

  await alert.present()
}

async function clearHistory() {
  try {
    const { error } = await supabase
      .from('post_views')
      .delete()
      .eq('user_id', authStore.user.id)

    if (error) throw error

    viewHistory.value = []

    const toast = await toastController.create({
      message: 'History cleared',
      duration: 2000,
      color: 'success'
    })
    await toast.present()

  } catch (error) {
    console.error('Error clearing history:', error)
    const toast = await toastController.create({
      message: 'Failed to clear history',
      duration: 2000,
      color: 'danger'
    })
    await toast.present()
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true 
  })
}

function goBack() {
  router.back()
}
</script>

<style scoped>
ion-content {
  --background: #000;
}

ion-toolbar {
  --background: #000;
  --color: #fff;
  --border-color: #222;
}

ion-title {
  color: #fff;
  font-weight: 600;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.loading-container ion-spinner {
  --color: #667eea;
}

.loading-container p {
  color: #888;
  font-size: 14px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  text-align: center;
}

.empty-icon-wrapper {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

.empty-icon {
  font-size: 64px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.empty-state h2 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: #fff;
}

.empty-state p {
  font-size: 15px;
  color: #888;
  margin: 0;
}

.history-list {
  padding-bottom: 20px;
}

.history-section {
  margin-bottom: 32px;
}

.date-header {
  padding: 16px 20px 12px;
  position: sticky;
  top: 0;
  background: #000;
  z-index: 10;
  border-bottom: 1px solid #1a1a1a;
}

.date-header h3 {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: 1px;
}

.history-item-wrapper {
  position: relative;
  margin-bottom: 16px;
  width: 100%;
}

ion-item-sliding {
  --background: transparent;
  width: 100%;
}

.swipe-container {
  --background: transparent;
  --padding-start: 0;
  --padding-end: 0;
  --inner-padding-end: 0;
  --inner-padding-start: 0;
  --min-height: auto;
  width: 100%;
}

.swipe-container::part(native) {
  padding: 0;
}

.post-wrapper {
  width: 100%;
  display: block;
}

.post-wrapper :deep(.post-card) {
  margin: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
}

.view-time-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  padding: 10px 18px;
  margin: 12px auto 0; /* centers horizontally */

  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.3);

  border-radius: 9999px; /* perfect pill */
  font-size: 12px;
  color: #667eea;
  font-weight: 600;

  width: fit-content; /* shrink to content */
  backdrop-filter: blur(10px);
}

.time-icon {
  font-size: 14px;
  color: #667eea;
}

ion-item-option {
  font-weight: 600;
}

ion-item-option ion-icon {
  font-size: 24px;
}

/* Swipe action styling */
ion-item-options {
  border: none;
}

/* Custom scrollbar for webkit browsers */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #0a0a0a;
}

::-webkit-scrollbar-thumb {
  background: #667eea;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #764ba2;
}
</style>