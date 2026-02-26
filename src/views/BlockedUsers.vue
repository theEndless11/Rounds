<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <ion-icon :icon="arrowBack"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Blocked Users</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="blocked-container">
        <div v-if="!loading && blockedUsers.length === 0" class="empty-state">
          <ion-icon :icon="banOutline" class="empty-icon"></ion-icon>
          <h2>No Blocked Users</h2>
          <p>You haven't blocked anyone yet. Blocked users won't be able to see your posts or interact with you.</p>
        </div>

        <div v-if="loading" class="loading-state">
          <ion-spinner></ion-spinner>
          <p>Loading blocked users...</p>
        </div>

        <ion-list v-if="!loading && blockedUsers.length > 0" lines="none">
          <ion-item v-for="block in blockedUsers" :key="block.id">
            <ion-avatar slot="start">
              <img :src="block.users?.profile_photo_url || 'https://ionicframework.com/docs/img/demos/avatar.svg'" :alt="block.users?.full_name || 'User'">
            </ion-avatar>
            
            <ion-label>
              <h2>{{ block.users?.full_name || 'Unknown User' }}</h2>
              <p v-if="block.reason" class="block-reason">Reason: {{ block.reason }}</p>
              <p class="block-date">Blocked {{ formatDate(block.created_at) }}</p>
            </ion-label>

            <ion-button 
              fill="outline" 
              slot="end"
              @click="unblockUser(block)"
              class="unblock-btn"
            >
              Unblock
            </ion-button>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonSpinner,
  alertController,
  toastController
} from '@ionic/vue'
import {
  arrowBack,
  banOutline
} from 'ionicons/icons'

const router = useRouter()
const authStore = useAuthStore()

const blockedUsers = ref([])
const loading = ref(true)

onMounted(async () => {
  await loadBlockedUsers()
})

async function loadBlockedUsers() {
  loading.value = true
  
  try {
    const { data: simpleData, error: simpleError } = await supabase
      .from('blocked_users')
      .select('*')
      .eq('blocker_id', authStore.user.id)

    const userIds = (simpleData || []).map(b => b.blocked_id)
    
    const { data: usersData } = await supabase
      .from('users')
      .select('id, full_name, profile_photo_url, specialization')
      .in('id', userIds)

    blockedUsers.value = (simpleData || []).map(block => ({
      ...block,
      users: (usersData || []).find(u => u.id === block.blocked_id)
    }))

  } catch (error) {
    const toast = await toastController.create({
      message: 'Failed to load blocked users',
      duration: 2000,
      color: 'danger'
    })
    await toast.present()
  } finally {
    loading.value = false
  }
}

async function unblockUser(block) {
  const alert = await alertController.create({
    header: 'Unblock User',
    message: `Are you sure you want to unblock ${block.users?.full_name || 'this user'}? They will be able to see your posts and interact with you again.`,
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Unblock',
        handler: async () => {
          try {
            const { error } = await supabase
              .from('blocked_users')
              .delete()
              .eq('id', block.id)

            blockedUsers.value = blockedUsers.value.filter(b => b.id !== block.id)

            const toast = await toastController.create({
              message: `${block.users?.full_name || 'User'} has been unblocked`,
              duration: 2000,
              color: 'success'
            })
            await toast.present()

          } catch (error) {
            const toast = await toastController.create({
              message: 'Failed to unblock user',
              duration: 2000,
              color: 'danger'
            })
            await toast.present()
          }
        }
      }
    ]
  })

  await alert.present()
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

function goBack() {
  router.back()
}
</script>

<style scoped>
.blocked-container {
  padding: 0px;
  background-color: var(--background);
}

.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.empty-state h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-state p,
.loading-state p {
  color: var(--text-secondary);
  margin: 0;
  max-width: 300px;
  line-height: 1.5;
}

ion-list {
  background: var(--background);
  
}

ion-item {
  --background: var(--background);
  --color: var(--text-primary);
  --border-color: var(--border-color);
  margin-bottom: 10px;
}

ion-item:hover {
  --background: var(--card-hover);
}

ion-avatar {
  width: 48px;
  height: 48px;
}

ion-avatar img {
  border-radius: 50%;
  object-fit: cover;
}

ion-label h2 {
  font-size: 15px;
  margin-left: 10px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

ion-label p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 2px 0;
}

.block-reason {
  font-size: 13px;
  color: var(--text-secondary);
  font-style: italic;
  margin-top: 4px;
}

.block-date {
    margin-left: 10px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

ion-button {
  --color: var(--text-primary);
  --border-color: var(--border-color);
  font-size: 14px;
  font-weight: 500;
  text-transform: none;
}

.unblock-btn {
  --border-radius: 20px;
  --padding-start: 16px;
  --padding-end: 16px;
  height: 32px;
  font-size: 13px;
}
</style>