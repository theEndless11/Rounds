<template>
  <ion-modal :is-open="isOpen" @didDismiss="closeModal" class="followers-modal">
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="closeModal">
              <ion-icon :icon="close"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-title>{{ modalTitle }}</ion-title>
        </ion-toolbar>
        
        <!-- Tabs for switching between followers and following -->
        <ion-toolbar v-if="showTabs">
          <ion-segment v-model="activeTab" @ionChange="handleTabChange">
            <ion-segment-button value="followers">
              <ion-label>Followers</ion-label>
            </ion-segment-button>
            <ion-segment-button value="following">
              <ion-label>Following</ion-label>
            </ion-segment-button>
          </ion-segment>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <!-- Search Bar -->
        <div class="search-container">
          <ion-searchbar
            v-model="searchQuery"
            placeholder="Search"
            @ionInput="handleSearch"
            debounce="300"
          ></ion-searchbar>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-container">
          <ion-spinner></ion-spinner>
        </div>

        <!-- User List -->
        <div v-else-if="filteredUsers.length > 0" class="users-list">
          <div 
            v-for="user in filteredUsers" 
            :key="user.id"
            class="user-item"
            @click="openUserProfile(user.id)"
          >
            <div class="user-info">
              <ion-avatar class="user-avatar">
                <img 
                  v-if="user.profile_photo_url" 
                  :src="user.profile_photo_url"
                  :alt="user.full_name"
                />
                <div v-else class="avatar-placeholder">
                  {{ getInitials(user.full_name) }}
                </div>
              </ion-avatar>
              
              <div class="user-details">
                <div class="user-name-row">
                  <h3 class="user-name">{{ user.full_name }}</h3>
                  <ion-icon 
                    v-if="user.verified" 
                    :icon="checkmarkCircle" 
                    class="verified-badge"
                  ></ion-icon>
                </div>
                <p class="user-college">{{ user.college_hospital }}</p>
                <p v-if="user.bio" class="user-bio">{{ truncateText(user.bio, 60) }}</p>
              </div>
            </div>

            <!-- Action Button -->
            <button 
              v-if="!isCurrentUser(user.id)"
              class="follow-btn"
              :class="{ following: user.isFollowing }"
              @click.stop="toggleFollow(user)"
            >
              {{ user.isFollowing ? 'Following' : 'Follow' }}
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <ion-icon :icon="people"></ion-icon>
          <p v-if="searchQuery">No users found</p>
          <p v-else>{{ emptyMessage }}</p>
        </div>

        <!-- Infinite Scroll -->
        <ion-infinite-scroll
          v-if="hasMore && !loading"
          @ionInfinite="loadMore"
          threshold="100px"
        >
          <ion-infinite-scroll-content
            loading-spinner="circles"
            loading-text="Loading more..."
          >
          </ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </ion-content>
    </ion-page>
  </ion-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import {
  IonModal, IonPage, IonHeader, IonToolbar, IonContent,
  IonButtons, IonButton, IonIcon, IonTitle, IonAvatar,
  IonSpinner, IonSearchbar, IonSegment, IonSegmentButton,
  IonLabel, IonInfiniteScroll, IonInfiniteScrollContent
} from '@ionic/vue'
import { close, people, checkmarkCircle } from 'ionicons/icons'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  initialTab: {
    type: String,
    default: 'followers',
    validator: (value) => ['followers', 'following'].includes(value)
  },
  showTabs: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close'])

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref(props.initialTab)
const users = ref([])
const loading = ref(false)
const searchQuery = ref('')
const page = ref(0)
const pageSize = 20
const hasMore = ref(true)

const modalTitle = computed(() => {
  if (!props.showTabs) {
    return props.initialTab === 'followers' ? 'Followers' : 'Following'
  }
  return activeTab.value === 'followers' ? 'Followers' : 'Following'
})

const emptyMessage = computed(() => {
  return activeTab.value === 'followers' 
    ? 'No followers yet' 
    : 'Not following anyone yet'
})

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  
  const query = searchQuery.value.toLowerCase()
  return users.value.filter(user => 
    user.full_name?.toLowerCase().includes(query) ||
    user.college_hospital?.toLowerCase().includes(query)
  )
})

// Watch for modal opening
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    resetAndLoad()
  }
})

// Watch for tab changes
watch(activeTab, () => {
  resetAndLoad()
})

async function resetAndLoad() {
  users.value = []
  page.value = 0
  hasMore.value = true
  searchQuery.value = ''
  await loadUsers()
}

async function loadUsers() {
  if (loading.value || !hasMore.value) return
  
  loading.value = true
  try {
    const offset = page.value * pageSize
    
    let query
    if (activeTab.value === 'followers') {
      // Get users who follow this profile
      query = supabase
        .from('follows')
        .select(`
          follower_id,
          users!follows_follower_id_fkey (
            id,
            full_name,
            college_hospital,
            profile_photo_url,
            bio,
            verified
          )
        `)
        .eq('following_id', props.userId)
        .range(offset, offset + pageSize - 1)
    } else {
      // Get users that this profile follows
      query = supabase
        .from('follows')
        .select(`
          following_id,
          users!follows_following_id_fkey (
            id,
            full_name,
            college_hospital,
            profile_photo_url,
            bio,
            verified
          )
        `)
        .eq('follower_id', props.userId)
        .range(offset, offset + pageSize - 1)
    }

    const { data, error } = await query

    if (error) throw error

    // Extract user data
    const newUsers = data.map(item => {
      const user = activeTab.value === 'followers' 
        ? item.users 
        : item.users
      return { ...user, isFollowing: false }
    }).filter(user => user.id) // Filter out any null users

    // Check which users the current user is following
    if (authStore.user && newUsers.length > 0) {
      const userIds = newUsers.map(u => u.id)
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', authStore.user.id)
        .in('following_id', userIds)

      const followingIds = new Set(followData?.map(f => f.following_id) || [])
      newUsers.forEach(user => {
        user.isFollowing = followingIds.has(user.id)
      })
    }

    users.value = [...users.value, ...newUsers]
    page.value++
    hasMore.value = newUsers.length === pageSize

  } catch (error) {
    console.error('Error loading users:', error)
  } finally {
    loading.value = false
  }
}

async function loadMore(event) {
  await loadUsers()
  event.target.complete()
}

function handleTabChange(event) {
  activeTab.value = event.detail.value
}

function handleSearch() {
  // Search is handled by computed property
}

async function toggleFollow(user) {
  if (!authStore.user) {
    router.push('/login')
    return
  }

  try {
    if (user.isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', authStore.user.id)
        .eq('following_id', user.id)
      user.isFollowing = false
    } else {
      await supabase
        .from('follows')
        .insert({
          follower_id: authStore.user.id,
          following_id: user.id
        })
      user.isFollowing = true
    }
  } catch (error) {
    console.error('Error toggling follow:', error)
  }
}

function openUserProfile(userId) {
  closeModal()
  router.push(`/user/${userId}`)
}

function isCurrentUser(userId) {
  return authStore.user?.id === userId
}

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'
}

function truncateText(text, maxLength) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function closeModal() {
  emit('close')
}
</script>

<style scoped>
/* Modal Background Fix */
ion-modal.followers-modal {
  --background: var(--modal-background);
}

ion-modal.followers-modal ion-page {
  background: var(--background);
}

ion-modal.followers-modal ion-content {
  --background: var(--background);
}

ion-modal.followers-modal ion-header {
  background: var(--background);
}

ion-modal.followers-modal ion-toolbar {
  --background: var(--background);
  --color: var(--text-primary);
  --border-color: var(--border-color);
}

ion-modal.followers-modal ion-title {
  color: var(--text-primary);
}

ion-modal.followers-modal ion-segment {
  --background: var(--background);
}

ion-modal.followers-modal ion-segment-button {
  --color: var(--text-secondary);
  --color-checked: var(--text-primary);
  --indicator-color: var(--text-primary);
}

.search-container {
  padding: 12px 16px;
  background: var(--background);
  border-bottom: 1px solid var(--border-color);
}

ion-searchbar {
  --background: var(--input-background);
  --color: var(--text-primary);
  --placeholder-color: var(--placeholder-color);
  --icon-color: var(--text-secondary);
  --clear-button-color: var(--text-secondary);
  --border-radius: 20px;
  --box-shadow: none;
}

ion-searchbar::part(container) {
  border-radius: 20px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.users-list {
  padding: 0;
  background: var(--background);
}

.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background 0.2s;
  background: var(--background);
}

.user-item:hover {
  background: var(--card-hover);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.user-avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.verified-badge {
  font-size: 16px;
  color: #1da1f2;
}

.user-college {
  margin: 2px 0 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.user-bio {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.follow-btn {
  padding: 6px 20px;
  border-radius: 20px;
  border: none;
  background: #1da1f2;
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.follow-btn:hover {
  opacity: 0.9;
}

.follow-btn.following {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.follow-btn.following:hover {
  background: rgba(244, 67, 54, 0.1);
  border-color: #f44336;
  color: #f44336;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  background: var(--background);
}

.empty-state ion-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
  color: var(--text-secondary);
}

.empty-state p {
  margin: 0;
  font-size: 16px;
  color: var(--text-secondary);
}

ion-infinite-scroll-content {
  color: var(--text-primary);
}
</style>