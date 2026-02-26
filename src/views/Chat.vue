<template>
  <ion-page>
    <ion-header>
      <ion-toolbar style="  margin-top: 40px;">
        <ion-title>Messages</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openNewChatModal">
            <ion-icon :icon="createOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Search Bar - Above conversations list -->
      <div class="search-container">
        <ion-searchbar
          v-model="searchQuery"
          placeholder="Search conversations..."
          @ionInput="handleSearch"
          debounce="300"
          mode="ios"
        ></ion-searchbar>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="center-content">
        <ion-spinner color="primary"></ion-spinner>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredConversations.length === 0" class="center-content">
        <ion-icon :icon="chatbubblesOutline" class="empty-icon"></ion-icon>
        <h3>{{ searchQuery ? 'No results found' : 'No messages yet' }}</h3>
        <p>{{ searchQuery ? 'Try a different search' : 'Start chatting with friends!' }}</p>
        <ion-button v-if="!searchQuery" fill="solid" shape="round" @click="openNewChatModal">
          <ion-icon :icon="createOutline" slot="start"></ion-icon>
          New Message
        </ion-button>
      </div>

      <!-- Conversations List -->
      <ion-list v-else lines="none">
        <ion-item
          v-for="conversation in filteredConversations"
          :key="conversation.id"
          button
          @click="openChat(conversation)"
          :class="{ 'unread': conversation.unread_count > 0 || conversation.is_request }"
        >
          <div class="chat-item" style="border-bottom: 1px solid #222;">
            <div class="avatar-wrapper">
              <ion-avatar>
                <img 
                  v-if="conversation.other_user?.profile_photo_url" 
                  :src="getOptimizedImageUrl(conversation.other_user.profile_photo_url)"
                  :alt="conversation.other_user?.full_name || 'User'"
                />
                <div v-else class="avatar-placeholder">
                  {{ getInitials(conversation.other_user?.full_name || 'User') }}
                </div>
              </ion-avatar>
              <div v-if="conversation.is_online" class="online-dot"></div>
            </div>

            <div class="chat-content">
              <div class="chat-header">
                <h3>{{ conversation.other_user?.full_name || 'Unknown User' }}</h3>
                <span class="time">{{ formatTime(conversation.last_message_at || conversation.created_at) }}</span>
              </div>
              <div class="chat-footer">
                <p :class="{ 'unread-msg': conversation.unread_count > 0 }">
                  <ion-badge v-if="conversation.is_request" color="warning" class="request-badge">Request</ion-badge>
                  <span v-else>{{ formatLastMessage(conversation) }}</span>
                </p>
                <ion-badge v-if="conversation.unread_count > 0" color="primary" class="count-badge">
                  {{ conversation.unread_count > 99 ? '99+' : conversation.unread_count }}
                </ion-badge>
              </div>
            </div>
          </div>
        </ion-item>
      </ion-list>

      <!-- Pull to Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
    </ion-content>

    <!-- New Chat Modal -->
    <ion-modal :is-open="showNewChatModal" @did-dismiss="showNewChatModal = false">
      <ion-header  style="  margin-top: 40px;">
        <ion-toolbar>
          <ion-title>New Contacts</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showNewChatModal = false">Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="search-container">
          <ion-searchbar
            v-model="newChatSearchQuery"
            placeholder="Search users..."
            @ionInput="searchUsers"
            debounce="300"
            mode="ios"
          ></ion-searchbar>
        </div>

        <ion-list lines="none">
          <ion-item 
            v-for="user in searchResults" 
            :key="user.id"
            button
            @click="startNewChat(user)"
          >
            <div class="user-item">
              <ion-avatar>
                <img 
                  v-if="user.profile_photo_url" 
                  :src="getOptimizedImageUrl(user.profile_photo_url)"
                  :alt="user.full_name"
                />
                <div v-else class="avatar-placeholder">
                  {{ getInitials(user.full_name) }}
                </div>
              </ion-avatar>
              <div class="user-info">
                <h3>{{ user.full_name }}</h3>
                <p>{{ user.college_hospital }}</p>
              </div>
            </div>
          </ion-item>

          <div v-if="searchResults.length === 0 && newChatSearchQuery" class="center-content">
            <p class="no-results">No users found</p>
          </div>
        </ion-list>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<style scoped>
/* Base Styles */
ion-content{--background:var(--background)}
ion-toolbar{--background:var(--background);--color:var(--text-primary)}
ion-list{background:transparent}
ion-spinner{--color:#667eea}

/* Searchbar */
ion-searchbar{--background:var(--search-background,#1a1a1a);--color:var(--text-primary);--placeholder-color:var(--placeholder-color);--icon-color:#667eea;--clear-button-color:#667eea;--border-radius:24px;--box-shadow:none}
body.light ion-searchbar{--background:#f5f5f5}
ion-searchbar.searchbar-has-focus{--background:rgba(102,126,234,.15);--icon-color:#8b9aff;--placeholder-color:#a5b4fc}
ion-searchbar::part(native){border-radius:24px}
.search-container{padding:12px 16px 8px;background:var(--background)}

/* List Items */
ion-item{--background:transparent;--color:var(--text-primary);--padding-start:16px;--padding-end:16px;--inner-padding-end:0;margin-bottom:4px;cursor:pointer;transition:all .2s ease}
ion-item:hover{--background:var(--item-hover,#0f0f0f)}
body.light ion-item:hover{--background:#f0f0f0}
ion-item:active{--background:rgba(102,126,234,.15);transform:scale(.98)}

/* Empty State */
.center-content{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;text-align:center;min-height:60vh;color:var(--text-secondary)}
.empty-icon{font-size:64px;color:var(--icon-color,#333);margin-bottom:16px}
body.light .empty-icon{color:#ccc}
.center-content h3{margin:0 0 8px;color:var(--text-primary);font-size:20px;font-weight:600}
.center-content p{margin:0 0 24px;color:var(--text-secondary);font-size:14px}

/* Chat Item */
.chat-item,.user-item{display:flex;align-items:center;gap:12px;width:100%;padding:12px 0}

/* Avatar */
.avatar-wrapper{position:relative}
ion-avatar{width:46px;height:46px}
.avatar-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;font-weight:700;font-size:18px;border-radius:50%}
.online-dot{position:absolute;bottom:2px;right:2px;width:14px;height:14px;border-radius:50%;background:#10b981;border:3px solid var(--background)}

/* Chat Content */
.chat-content,.user-info{flex:1;min-width:0}
.chat-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.chat-header h3,.user-info h3{margin:0;font-size:16px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.time{font-size:12px;color:var(--text-secondary);white-space:nowrap;margin-left:8px}
.chat-footer{display:flex;justify-content:space-between;align-items:center;gap:8px}
.chat-footer p,.user-info p{margin:0;font-size:14px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px}
.unread-msg{color:var(--text-primary);font-weight:500}

/* Badges */
.request-badge{font-size:10px;padding:2px 6px;border-radius:4px}
.count-badge{font-size:11px;padding:2px 7px;border-radius:12px;min-width:20px;text-align:center;font-weight:600}
.unread{background:rgba(102,126,234,.08)}
body.light .unread{background:rgba(102,126,234,.12)}
.no-results{color:var(--text-secondary);padding:24px}

/* ========== NEW CHAT MODAL FIX ========== */
ion-modal{--width:100%;--height:100%;--border-radius:16px 16px 0 0;--max-width:600px}
ion-modal::part(backdrop){background:rgba(0,0,0,.75)!important;backdrop-filter:blur(4px)}
body.light ion-modal::part(backdrop){background:rgba(0,0,0,.6)!important}
ion-modal::part(content){background:#000!important;border-radius:16px 16px 0 0;overflow:hidden;display:flex;flex-direction:column}
body.light ion-modal::part(content){background:#fff!important}

/* Modal Header */
ion-modal ion-header{background:#000!important;border-bottom:1px solid #2a2a2a;box-shadow:none;flex-shrink:0}
body.light ion-modal ion-header{background:#fff!important;border-bottom:1px solid #e8e8e8}
ion-modal ion-toolbar{--background:#000!important;--color:#fff!important;--border-color:#2a2a2a;padding:0 16px;--min-height:56px;display:flex;align-items:center}
body.light ion-modal ion-toolbar{--background:#fff!important;--color:#000!important;--border-color:#e8e8e8}
ion-modal ion-title{color:#fff!important;font-weight:700!important;font-size:1.1rem!important;padding:0}
body.light ion-modal ion-title{color:#000!important}
ion-modal ion-buttons{height:100%;margin:0}
ion-modal ion-buttons ion-button{--color:#fff!important;font-weight:600;font-size:.95rem;margin:0;text-transform:uppercase;letter-spacing:.5px}
body.light ion-modal ion-buttons ion-button{--color:#000!important}

/* Modal Content */
ion-modal ion-content{--background:#000!important;--color:#fff!important;flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
body.light ion-modal ion-content{--background:#fff!important;--color:#000!important}
ion-modal .search-container{padding:16px;background:#000!important;border-bottom:1px solid #2a2a2a}
body.light ion-modal .search-container{background:#fff!important;border-bottom:1px solid #e8e8e8}
ion-modal ion-searchbar{--background:#0a0a0a!important;--color:#fff!important;--placeholder-color:#666!important;--icon-color:#667eea!important;--clear-button-color:#667eea!important}
body.light ion-modal ion-searchbar{--background:#f5f5f5!important;--color:#000!important;--placeholder-color:#8b98a5!important}

/* Modal List Items */
ion-modal ion-list{background:transparent!important;padding:0}
ion-modal ion-item{--background:transparent!important;--color:#fff!important;margin:0;border-bottom:1px solid #1a1a1a}
body.light ion-modal ion-item{--color:#000!important;border-bottom:1px solid #f0f0f0}
ion-modal ion-item:hover{--background:#0f0f0f!important}
body.light ion-modal ion-item:hover{--background:#f7f9fa!important}
ion-modal ion-item:active{--background:rgba(102,126,234,.15)!important}

/* Modal User Item */
ion-modal .user-item{display:flex;align-items:center;gap:14px;width:100%;padding:14px 0}
ion-modal .user-item ion-avatar{width:48px;height:48px}
ion-modal .user-info h3{color:#fff!important;font-size:16px;font-weight:600;margin:0 0 4px 0}
body.light ion-modal .user-info h3{color:#000!important}
ion-modal .user-info p{color:#888!important;font-size:14px;margin:0}
body.light ion-modal .user-info p{color:#536471!important}

/* Modal Empty State */
ion-modal .center-content{min-height:40vh;padding:32px 24px}
ion-modal .center-content p{color:#888!important}
body.light ion-modal .center-content p{color:#536471!important}
</style>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonIcon, IonBadge, IonList, IonItem, IonAvatar, IonSpinner, IonModal,
  IonSearchbar, IonRefresher, IonRefresherContent, toastController
} from '@ionic/vue'
import { createOutline, chatbubblesOutline } from 'ionicons/icons'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const conversations = ref([])
const chatRequests = ref([])
const showNewChatModal = ref(false)
const searchQuery = ref('')
const newChatSearchQuery = ref('')
const searchResults = ref([])

let realtimeChannel = null

const CHAT_API_URL = 'https://octopus-chat-api-production-7a08.up.railway.app/api'
                     

const allConversations = computed(() => {
  const requestConversations = chatRequests.value.map(request => ({
    id: `request-${request.id}`,
    request_id: request.id,
    other_user: request.sender,
    last_message: null,
    last_message_at: request.created_at,
    created_at: request.created_at,
    unread_count: 1,
    is_request: true
  }))

  return [...conversations.value, ...requestConversations].sort((a, b) => 
    new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at)
  )
})

const filteredConversations = computed(() => {
  if (!searchQuery.value.trim()) return allConversations.value
  const query = searchQuery.value.toLowerCase()
  return allConversations.value.filter(conv => 
    conv.other_user?.full_name?.toLowerCase().includes(query) ||
    conv.last_message?.message?.toLowerCase().includes(query)
  )
})

onMounted(async () => {
  await loadConversations()
  setupRealtimeSubscription()
})

onUnmounted(() => {
  if (realtimeChannel) realtimeChannel.unsubscribe()
})

async function loadConversations() {
  loading.value = true
  try {
    const response = await fetch(`${CHAT_API_URL}/conversations?user_id=${authStore.user.id}`)
    const data = await response.json()

    if (data.conversations) {
      conversations.value = await Promise.all(
        data.conversations.map(async (conv) => {
          const { data: userData } = await supabase
            .from('users')
            .select('id, full_name, profile_photo_url, college_hospital')
            .eq('id', conv.other_user_id)
            .single()

          return {
            ...conv,
            other_user: userData || {},
            last_message: { message: conv.last_message_text, photo: conv.last_message_photo },
            last_message_at: conv.last_message_time,
            is_online: false
          }
        })
      )
    }

    const { data: requestsData, error: requestsError } = await supabase
      .from('chat_requests')
      .select('id, sender_id, receiver_id, status, created_at, sender:sender_id(id, full_name, profile_photo_url, college_hospital)')
      .eq('receiver_id', authStore.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (!requestsError && requestsData) chatRequests.value = requestsData
  } catch (error) {
    console.error('Error loading conversations:', error)
  } finally {
    loading.value = false
  }
}

function setupRealtimeSubscription() {
  realtimeChannel = supabase
    .channel('chat_updates')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `receiver_id=eq.${authStore.user.id}` }, () => loadConversations())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_requests', filter: `receiver_id=eq.${authStore.user.id}` }, () => loadConversations())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_requests', filter: `receiver_id=eq.${authStore.user.id}` }, () => loadConversations())
    .subscribe()
}

function handleSearch() {}

function openChat(conversation) {
  router.push({
    path: `/chat/${conversation.other_user.id}`,
    query: {
      username: conversation.other_user.full_name,
      profileImage: conversation.other_user.profile_photo_url,
      isRequest: conversation.is_request ? 'true' : 'false',
      requestId: conversation.request_id || ''
    }
  })
}

function openNewChatModal() {
  showNewChatModal.value = true
  searchResults.value = []
  newChatSearchQuery.value = ''
}

async function searchUsers() {
  if (!newChatSearchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  const { data } = await supabase
    .from('users')
    .select('id, full_name, profile_photo_url, college_hospital')
    .or(`full_name.ilike.%${newChatSearchQuery.value}%,college_hospital.ilike.%${newChatSearchQuery.value}%`)
    .neq('id', authStore.user.id)
    .limit(20)

  searchResults.value = data || []
}

async function startNewChat(user) {
  showNewChatModal.value = false
  newChatSearchQuery.value = ''

  try {
    const existingConv = conversations.value.find(c => c.other_user.id === user.id)
    if (existingConv) {
      openChat(existingConv)
      return
    }

    const existingRequest = chatRequests.value.find(r => r.sender.id === user.id)
    if (existingRequest) {
      openChat({ id: `request-${existingRequest.id}`, request_id: existingRequest.id, other_user: existingRequest.sender, is_request: true })
      return
    }

    const { data: friendship } = await supabase.from('friend_requests').select('status')
      .or(`and(sender_id.eq.${authStore.user.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${authStore.user.id})`).maybeSingle()

    const { data: following } = await supabase.from('follows').select('id')
      .eq('follower_id', authStore.user.id).eq('following_id', user.id).maybeSingle()

    if (friendship?.status === 'accepted' || following) {
      router.push({ path: `/chat/${user.id}`, query: { username: user.full_name, profileImage: user.profile_photo_url } })
    } else {
      const { error: requestError } = await supabase.from('chat_requests').insert({ sender_id: authStore.user.id, receiver_id: user.id, status: 'pending' })
      if (requestError && !requestError.message.includes('duplicate')) console.error('Error creating chat request:', requestError)
      router.push({ path: `/chat/${user.id}`, query: { username: user.full_name, profileImage: user.profile_photo_url } })
    }
  } catch (error) {
    console.error('Error starting new chat:', error)
    const toast = await toastController.create({ message: 'Failed to start chat. Please try again.', duration: 2000, color: 'danger' })
    await toast.present()
  }
}

async function handleRefresh(event) {
  await loadConversations()
  event.target.complete()
}

function getOptimizedImageUrl(url) {
  return url ? `${url}?width=100&quality=85&format=auto` : ''
}

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'
}

function formatLastMessage(conversation) {
  if (conversation.is_request) return 'Message request'
  if (!conversation.last_message) return 'No messages yet'
  if (conversation.last_message.photo) return '📷 Photo'
  return conversation.last_message.message || 'No messages yet'
}

function formatTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

