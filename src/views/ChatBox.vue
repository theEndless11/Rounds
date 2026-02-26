<template>
  <ion-page>
    <ion-header v-if="shouldShowInput">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/chat" style="color:#007aff"></ion-back-button>
        </ion-buttons>
        <div class="header-content" @click="viewProfile">
          <ion-avatar>
            <img v-if="profileImage" :src="profileImage" :alt="chatWith"/>
            <div v-else class="avatar-placeholder">{{ getInitials(chatWith) }}</div>
          </ion-avatar>
          <div class="user-info">
            <ion-title class="username-title">{{ chatWith }}</ion-title>
          </div>
        </div>
        <ion-buttons slot="end" style="margin-right: 15px;">
          <ion-button @click="startCall('voice')" v-if="!showActiveCall && requestAccepted">
            <ion-icon :icon="call"></ion-icon>
          </ion-button>
          <ion-button @click="startCall('video')" v-if="!showActiveCall && requestAccepted">
            <ion-icon :icon="videocam"></ion-icon>
          </ion-button>
          <ion-button @click="endCall" v-if="showActiveCall" color="danger">
            <ion-icon :icon="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <ion-toolbar v-if="showRequestBanner" class="request-toolbar-banner">
        <div class="request-banner">
          <div class="request-info">
            <ion-icon :icon="alertCircleOutline"></ion-icon>
            <div class="request-text">
              <strong>{{ chatWith }}</strong> wants to message you
            </div>
          </div>
          <div class="request-actions">
            <ion-button size="small" @click="acceptRequest">Accept</ion-button>
            <ion-button size="small" fill="outline" @click="showRejectOptions">Decline</ion-button>
          </div>
        </div>
      </ion-toolbar>

      <ion-toolbar v-if="showSenderLimitWarning" class="limit-toolbar">
        <div class="limit-warning">
          <ion-icon :icon="informationCircle"></ion-icon>
          <span>{{ messagesRemaining }} message{{ messagesRemaining !== 1 ? 's' : '' }} left until {{ chatWith }} accepts</span>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef">
      
      <!-- Incoming Call Overlay -->
      <div v-if="showIncomingCall" class="incoming-call-overlay">
        <div class="incoming-call-card">
          <ion-avatar class="caller-avatar">
            <img v-if="profileImage" :src="profileImage" :alt="chatWith"/>
            <div v-else class="avatar-placeholder">{{ getInitials(chatWith) }}</div>
          </ion-avatar>
          <div class="call-info">
            <h3>{{ chatWith }}</h3>
            <p class="call-type">{{ currentCallMode === 'voice' ? 'Voice' : 'Video' }} call</p>
            <p class="ringing-text">{{ callStatus === 'ringing' ? 'Ringing...' : 'Connecting...' }}</p>
          </div>
          <div class="call-actions">
            <ion-button @click="rejectCall" color="danger" shape="round" class="call-btn">
              <ion-icon :icon="close" slot="icon-only"></ion-icon>
            </ion-button>
            <ion-button @click="acceptCall" color="success" shape="round" class="call-btn">
              <ion-icon :icon="call" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
        </div>
      </div>

      <!-- Active Call Overlay -->
      <div v-if="showActiveCall" class="call-overlay">
        <div class="call-header">
          <div class="call-status">
            <span class="call-timer">{{ callDuration }}</span>
            <span class="call-type-badge">{{ currentCallMode === 'voice' ? 'Voice' : 'Video' }}</span>
          </div>
        </div>
        
        <div class="video-container" v-if="currentCallMode === 'video'">
          <div v-if="callStatus !== 'connected'" class="video-waiting-overlay">
            <ion-avatar class="video-waiting-avatar">
              <img v-if="profileImage" :src="profileImage" :alt="chatWith"/>
              <div v-else class="avatar-placeholder">{{ getInitials(chatWith) }}</div>
            </ion-avatar>
            <h2 class="video-waiting-name">{{ chatWith }}</h2>
            <p class="video-waiting-status">{{ callStatus === 'ringing' ? 'Ringing...' : 'Connecting...' }}</p>
          </div>
          <video ref="remoteVideoElement" autoplay playsinline class="remote-video" :class="{ 'video-hidden': callStatus !== 'connected' }"></video>
          <video ref="localVideoElement" autoplay muted playsinline class="local-video"></video>
        </div>

        <div class="voice-container" v-else>
          <ion-avatar class="voice-avatar">
            <img v-if="profileImage" :src="profileImage" :alt="chatWith"/>
            <div v-else class="avatar-placeholder">{{ getInitials(chatWith) }}</div>
          </ion-avatar>
          <h2 class="voice-name">{{ chatWith }}</h2>
          <p class="voice-status">{{ callStatus === 'ringing' ? 'Ringing...' : 'Connected' }}</p>
        </div>
        
        <div class="call-controls">
          <ion-button @click="endCall" color="danger" shape="round" class="end-call-btn">
            <ion-icon :icon="close" slot="icon-only"></ion-icon>
          </ion-button>
        </div>
      </div>

      <!-- Messages Container -->
      <div class="messages-container" ref="messagesContainer">
        <div v-for="(msg, index) in messages" :key="msg.id" :data-message-id="msg.id" class="message-wrapper">
          
          <!-- Date Separator -->
          <div v-if="shouldShowDateSeparator(index)" class="date-separator">
            <span class="date-separator-text">{{ formatDateSeparator(msg.created_at) }}</span>
          </div>
          
          <!-- Message -->
          <div 
            class="message" 
            :class="[isCurrentUserMessage(msg) ? 'message-sent' : 'message-received', msg.is_system ? 'message-system' : '']"
            @touchstart="handleTouchStart($event, msg)" 
            @touchmove="handleTouchMove" 
            @touchend="handleTouchEnd($event, msg)" 
            @contextmenu.prevent="setReplyMessage(msg)"
          >
            <!-- Received Message Avatar -->

            
            <div class="message-content">
              <!-- Reply Indicator -->
              <div v-if="msg.reply_to_id" class="reply-indicator" @click="scrollToReplyMessage(msg.reply_to_id)">
                <ion-icon :icon="returnDownForward"></ion-icon>
                <span>{{ getReplyPreview(msg.reply_to_id) }}</span>
              </div>
              
              <!-- Missed Call -->

               <div v-if="msg.is_missed_call" class="missed-call-bubble">
  <div class="missed-call-content">
    <ion-icon :icon="msg.missed_call_type === 'video' ? videocam : call" class="missed-call-icon"></ion-icon>
    <div class="missed-call-text-wrapper">
      <span class="missed-call-text">
        Missed {{ msg.missed_call_type }} call
        <span v-if="msg.caller_deleted" class="deleted-user-badge">(Deleted User)</span>
      </span>
      <span class="missed-call-timestamp">{{ formatMessageTime(msg.created_at) }}</span>
    </div>
  </div>
</div>
              
              <!-- Regular Message -->
              <div v-else class="message-bubble" :class="{ 'message-seen': isCurrentUserMessage(msg) && msg.is_seen }">
                <p v-if="msg.message">{{ msg.message }}</p>
                <img v-if="msg.photo" :src="msg.photo" class="message-photo" @click="openFullscreen(msg.photo)"/>
              </div>
              
              <!-- Message Time -->
              <span class="message-time" v-if="!msg.is_system && !msg.is_missed_call">
                {{ formatMessageTime(msg.created_at) }}
              </span>
            </div>
            
            <!-- Sent Message Avatar -->

          </div>
        </div>
        <div ref="messagesEnd"></div>
      </div>
      
      <!-- Fullscreen Image Modal -->
      <ion-modal :is-open="!!fullscreenImage" @did-dismiss="fullscreenImage = null">
        <div class="fullscreen-modal" @click="fullscreenImage = null">
          <img :src="fullscreenImage" alt="Full size"/>
        </div>
      </ion-modal>
    </ion-content>

    <!-- Typing Indicator -->
    <div v-if="isTyping" class="typing-indicator">
      <span class="typing-text">{{ chatWith }} is typing</span>
      <span class="typing-dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </span>
    </div>

    <!-- Footer with Input -->
    <ion-footer v-if="shouldShowInput">
      <!-- Reply Preview -->
      <div v-if="replyMessage" class="reply-preview">
        <div class="reply-content">
          <div class="reply-bar"></div>
          <div class="reply-details">
            <p class="reply-to">{{ getReplyAuthor(replyMessage) }}</p>
            <p class="reply-text">{{ getReplyText(replyMessage) }}</p>
          </div>
        </div>
        <ion-button fill="clear" @click="cancelReply" class="cancel-reply-btn">
          <ion-icon :icon="close"></ion-icon>
        </ion-button>
      </div>
      
      <!-- Image Preview -->
      <div v-if="imagePreview" class="image-preview-container">
        <div class="image-preview-wrapper">
          <img :src="imagePreview" alt="Preview" class="image-preview"/>
          <ion-button fill="clear" @click="clearImagePreview" class="remove-preview-btn">
            <ion-icon :icon="close"></ion-icon>
          </ion-button>
        </div>
      </div>
      
      <!-- Input Toolbar -->
      <ion-toolbar class="input-toolbar">
        <div class="input-wrapper">
          <input type="file" ref="fileInput" accept="image/*" style="display: none" @change="handlePhotoSelect"/>
          
          <ion-button fill="clear" @click="$refs.fileInput.click()" :disabled="!canSendMessage" class="action-btn">
            <ion-icon :icon="camera"></ion-icon>
          </ion-button>
          
          <div class="textarea-wrapper">
            <ion-textarea 
              v-model="messageInput" 
              :placeholder="getInputPlaceholder()"
              :auto-grow="true" 
              :rows="1" 
              @ionInput="handleTyping" 
              @keydown.enter.prevent="sendMessage"
              :disabled="!canSendMessage"
            ></ion-textarea>
          </div>
          
          <ion-button 
            @click="sendMessage" 
            :disabled="!canSendMessage || (!messageInput.trim() && !imagePreview)" 
            fill="clear"
            class="send-btn"
            :class="{ 'send-btn-active': messageInput.trim() || imagePreview }"
          >
            <ion-icon :icon="send"></ion-icon>
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>



<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import { useWebRTC } from '@/composables/useWebRTC'
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, 
  IonButtons, IonButton, IonBackButton, IonIcon, IonAvatar, IonTextarea, 
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, 
  IonModal, actionSheetController, toastController 
} from '@ionic/vue'
import { 
  call, videocam, close, camera, send, checkmark, returnDownForward, 
  alertCircleOutline, informationCircle, micOff, videocamOff
} from 'ionicons/icons'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const chatWithId = ref(route.params.userId)
const chatWith = ref(route.query.username || 'User')
const profileImage = ref(route.query.profileImage || '')
const requestId = ref(route.query.requestId || '')
const requestAccepted = ref(false)
const currentUserProfilePic = ref('')
const messages = ref([])
const messageInput = ref('')
const imagePreview = ref(null)
const fullscreenImage = ref(null)
const replyMessage = ref(null)
const isTyping = ref(false)
const contentRef = ref(null)
const messagesContainer = ref(null)
const messagesEnd = ref(null)
const fileInput = ref(null)

const isReceiver = ref(false)
const isSender = ref(false)
const senderMessageCount = ref(0)
const MAX_MESSAGES_BEFORE_ACCEPT = 5

const localVideoElement = ref(null)
const remoteVideoElement = ref(null)

const showIncomingCall = ref(false)
const showActiveCall = ref(false)
const currentCallMode = ref('video')
const callDuration = ref('00:00')
let callStartTime = null
let callTimer = null

let typingTimeout = null
const CHAT_API_URL = 'https://octopus-chat-api-production-7a08.up.railway.app/api'
const CACHE_KEY_PREFIX = 'chat_messages_'
const CACHE_EXPIRY = 1000 * 60 * 60 * 24
const missedCallsLoaded = ref(false)

const { 
  connectionStatus, isOtherUserOnline, inCall, incomingCall, callMode, 
  callStatus, missedCallInfo, localVideo, remoteVideo, 
  init: initWebRTC, connectWebSocket, subscribeToChannels, 
  startCall: webrtcStartCall, acceptCall: webrtcAcceptCall, 
  rejectCall: webrtcRejectCall, endCall: webrtcEndCall, 
  sendTypingIndicator: sendTypingWS, sendChatMessage: sendChatWS, 
  sendMessageSeen: sendMessageSeenWS, cleanup: cleanupWebRTC 
} = useWebRTC()

const showRequestBanner = computed(() => {
  return isReceiver.value && !requestAccepted.value
})

const showSenderLimitWarning = computed(() => {
  return isSender.value && !requestAccepted.value && senderMessageCount.value > 0
})

const messagesRemaining = computed(() => {
  return Math.max(0, MAX_MESSAGES_BEFORE_ACCEPT - senderMessageCount.value)
})

const canSendMessage = computed(() => {
  if (requestAccepted.value) return true
  if (isSender.value) {
    return senderMessageCount.value < MAX_MESSAGES_BEFORE_ACCEPT
  }
  if (isReceiver.value) return false
  return true
})

const shouldShowInput = computed(() => {
  return !showActiveCall.value && !showIncomingCall.value
})

watch(inCall, async (newVal) => {
  showActiveCall.value = newVal
  if (newVal) {
    showIncomingCall.value = false
    currentCallMode.value = callMode.value
    
    await nextTick()
    await nextTick()
    
    if (localVideoElement.value && remoteVideoElement.value) {
      localVideo.value = localVideoElement.value
      remoteVideo.value = remoteVideoElement.value
    }
  }
})

watch(incomingCall, (newVal) => {
  showIncomingCall.value = newVal
  if (newVal) {
    currentCallMode.value = callMode.value
  }
})

watch(callMode, (newVal) => {
  currentCallMode.value = newVal
})

watch(callStatus, (newStatus) => {
  if (newStatus === 'connected') {
    startCallTimer()
  } else if (newStatus === 'idle') {
    stopCallTimer()
  }
})

watch(missedCallInfo, async (info) => {
  if (info) {
    // Store missed call in Supabase
    try {
      await supabase
        .from('missed_calls')
        .insert({
          caller_id: info.from,
          receiver_id: info.to,
          call_type: info.callType
        })
    } catch (error) {}
    
    // Show in UI
    const missedCallMessage = {
      id: `missed-${Date.now()}`,
      sender_id: 'system',
      receiver_id: authStore.user.id,
      message: null,
is_system: true,
is_missed_call: true,
missed_call_type: info.callType,
      created_at: new Date(info.timestamp).toISOString()
    }
    messages.value.push(missedCallMessage)
    updateMessageCache()
    await nextTick()
    scrollToBottom()
  }
})

function startCallTimer() {
  callStartTime = Date.now()
  callTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - callStartTime) / 1000)
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0')
    const seconds = (elapsed % 60).toString().padStart(2, '0')
    callDuration.value = `${minutes}:${seconds}`
  }, 1000)
}

function stopCallTimer() {
  if (callTimer) {
    clearInterval(callTimer)
    callTimer = null
  }
  callDuration.value = '00:00'
  callStartTime = null
}

async function startCall(mode) {
  currentCallMode.value = mode
  await webrtcStartCall(mode)
}

async function acceptCall() {
  await webrtcAcceptCall()
}

async function rejectCall() {
  // Store missed call in database when rejecting
  try {
    await supabase
      .from('missed_calls')
      .insert({
        caller_id: chatWithId.value,  // The person who called
        receiver_id: authStore.user.id,  // You (who rejected)
        call_type: currentCallMode.value
      })
  } catch (error) {
    console.error('Failed to store missed call:', error)
  }
  
  webrtcRejectCall()
  showIncomingCall.value = false
}

function endCall() {
  webrtcEndCall()
  showActiveCall.value = false
  showIncomingCall.value = false
}

onMounted(async () => {
  const tabBar = document.querySelector('ion-tab-bar')
  if (tabBar) tabBar.style.display = 'none'
  
  if (!chatWith.value || chatWith.value === 'User') {
    const { data } = await supabase
      .from('users')
      .select('full_name, profile_photo_url')
      .eq('id', chatWithId.value)
      .single()
    
    if (data) {
      chatWith.value = data.full_name
      profileImage.value = data.profile_photo_url
    }
  }
  
  await loadUserProfiles()
  await checkRequestStatus()
  await loadMessages()
  await countSenderMessages()
  await setupWebRTC()
  setupScrollObserver()
  
  // Handle incoming call from notification
  if (route.query.incomingCall === 'true') {
    const callType = route.query.callType || 'video'
    currentCallMode.value = callType
    showIncomingCall.value = true
    callStatus.value = 'ringing'
    
    // Clear query params
    router.replace({
      path: route.path,
      query: {
        username: route.query.username,
        profileImage: route.query.profileImage
      }
    })
  }
})

onUnmounted(() => {
  const tabBar = document.querySelector('ion-tab-bar')
  if (tabBar) tabBar.style.display = 'flex'
  stopCallTimer()
  cleanupWebRTC()
  if (typeof window !== 'undefined') delete window.webrtcMessageHandler
})

if (typeof window !== 'undefined') {
  window.webrtcMessageHandler = (message) => {
    const { type, payload, data } = message
    const actualPayload = payload || data
    if (type === 'newMessage' || type === 'message') handleNewMessage(actualPayload)
    else if (type === 'typing') handleTypingIndicator(actualPayload)
    else if (type === 'message-seen' || type === 'messageSeenAcknowledgment') handleMessageSeen(actualPayload)
  }
}

async function loadUserProfiles() {
  const { data: currentUser } = await supabase
    .from('users')
    .select('profile_photo_url')
    .eq('id', authStore.user.id)
    .single()
  if (currentUser) currentUserProfilePic.value = currentUser.profile_photo_url || ''
}

async function checkRequestStatus() {
  try {
    const { data } = await supabase
      .from('chat_requests')
      .select('*')
      .or(`and(sender_id.eq.${authStore.user.id},receiver_id.eq.${chatWithId.value}),and(sender_id.eq.${chatWithId.value},receiver_id.eq.${authStore.user.id})`)
      .maybeSingle()
    if (data) {
      requestId.value = data.id
      requestAccepted.value = data.status === 'accepted'
      if (data.receiver_id === authStore.user.id) {
        isReceiver.value = true
        isSender.value = false
      } else if (data.sender_id === authStore.user.id) {
        isSender.value = true
        isReceiver.value = false
      }
    }
  } catch (error) {}
}

async function countSenderMessages() {
  if (!isSender.value || requestAccepted.value) return
  try {
    const response = await fetch(`${CHAT_API_URL}/messages?user1=${authStore.user.id}&user2=${chatWithId.value}&limit=100`)
    const data = await response.json()
    if (data.messages) {
      senderMessageCount.value = data.messages.filter(
        msg => msg.sender_id === authStore.user.id
      ).length
    }
  } catch (error) {}
}

async function acceptRequest() {
  if (!requestId.value) return
  try {
    const { error } = await supabase
      .from('chat_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId.value)
    if (!error) {
      requestAccepted.value = true
      isReceiver.value = false
      const toast = await toastController.create({
        message: 'Message request accepted',
        duration: 2000,
        color: 'success'
      })
      await toast.present()
    }
  } catch (error) {}
}

async function showRejectOptions() {
  const actionSheet = await actionSheetController.create({
    header: 'Decline Request',
    buttons: [
      {
        text: 'Decline',
        role: 'destructive',
        handler: () => declineRequest()
      },
      {
        text: 'Block User',
        role: 'destructive',
        handler: () => blockUser()
      },
      {
        text: 'Cancel',
        role: 'cancel'
      }
    ]
  })
  await actionSheet.present()
}

async function declineRequest() {
  if (!requestId.value) return
  try {
    const { error } = await supabase
      .from('chat_requests')
      .update({ status: 'ignored' })
      .eq('id', requestId.value)
    if (!error) {
      router.push('/tabs/chat')
      const toast = await toastController.create({
        message: 'Message request declined',
        duration: 2000,
        color: 'medium'
      })
      await toast.present()
    }
  } catch (error) {}
}

async function blockUser() {
  if (!requestId.value) return
  try {
    await supabase
      .from('blocked_users')
      .insert({
        blocker_id: authStore.user.id,
        blocked_id: chatWithId.value
      })
    await supabase
      .from('chat_requests')
      .update({ status: 'blocked' })
      .eq('id', requestId.value)
    router.push('/tabs/chat')
    const toast = await toastController.create({
      message: 'User blocked',
      duration: 2000,
      color: 'danger'
    })
    await toast.present()
  } catch (error) {}
}

async function loadMessages() {
  const cacheKey = `${CACHE_KEY_PREFIX}${authStore.user.id}_${chatWithId.value}`
  
  const cachedData = localStorage.getItem(cacheKey)
  if (cachedData) {
    try {
      const { messages: cachedMessages, timestamp } = JSON.parse(cachedData)
      const now = Date.now()
      
      if (now - timestamp < CACHE_EXPIRY) {
        messages.value = cachedMessages
        await nextTick()
        scrollToBottom()
        markVisibleMessagesAsSeen()
      }
    } catch (error) {
      localStorage.removeItem(cacheKey)
    }
  }
  
  try {
    const response = await fetch(`${CHAT_API_URL}/messages?user1=${authStore.user.id}&user2=${chatWithId.value}&limit=100`)
    const data = await response.json()
    if (data.messages) { 
      messages.value = data.messages
      
      localStorage.setItem(cacheKey, JSON.stringify({
        messages: data.messages,
        timestamp: Date.now()
      }))
      
      await nextTick()
      scrollToBottom()
      markVisibleMessagesAsSeen() 
    }
  } catch (error) {}
  
  // Load missed calls after messages
  if (!missedCallsLoaded.value) {
    await loadMissedCalls()
    missedCallsLoaded.value = true
  }
}

async function loadMissedCalls() {
  try {
    const { data: missedCalls, error } = await supabase
      .from('missed_calls')
      .select('*')
      .or(`and(caller_id.eq.${authStore.user.id},receiver_id.eq.${chatWithId.value}),and(caller_id.eq.${chatWithId.value},receiver_id.eq.${authStore.user.id})`)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    if (missedCalls && missedCalls.length > 0) {
      missedCalls.forEach(missedCall => {
        // Only show if receiver is current user
        if (missedCall.receiver_id !== authStore.user.id) return
        
        const isCallerDeleted = missedCall.caller_deleted || !missedCall.caller_id
        const isReceiverDeleted = missedCall.receiver_deleted || !missedCall.receiver_id
        
        const missedCallMessage = {
          id: `missed-${missedCall.id}`,
          sender_id: 'system',
          receiver_id: authStore.user.id,
          message: null,
          is_system: true,
          is_missed_call: true,
          missed_call_type: missedCall.call_type,
          missed_call_id: missedCall.id,
          caller_deleted: isCallerDeleted,
          receiver_deleted: isReceiverDeleted,
          created_at: missedCall.created_at
        }
        
        const existsInMessages = messages.value.some(m => m.id === missedCallMessage.id)
        if (!existsInMessages) {
          messages.value.push(missedCallMessage)
        }
      })
      
      messages.value.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      
      updateMessageCache()
      await nextTick()
      scrollToBottom()
    }
  } catch (error) {}
}
        
function updateMessageCache() {
  const cacheKey = `${CACHE_KEY_PREFIX}${authStore.user.id}_${chatWithId.value}`
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      messages: messages.value,
      timestamp: Date.now()
    }))
  } catch (error) {}
}

async function setupWebRTC() {
  const WS_URL = 'wss://websocket-server-production-6f51.up.railway.app'
  await initWebRTC(authStore.user.id, chatWithId.value, WS_URL)
  await connectWebSocket(WS_URL)
  setTimeout(() => subscribeToChannels(), 300)
}

function isCurrentUserMessage(msg) { 
  return msg.sender_id === authStore.user.id 
}

async function sendMessage() {
  if (!canSendMessage.value || (!messageInput.value.trim() && !imagePreview.value)) return
  if (isSender.value && !requestAccepted.value) {
    if (senderMessageCount.value >= MAX_MESSAGES_BEFORE_ACCEPT) {
      const toast = await toastController.create({
        message: `You've reached the message limit. Wait for ${chatWith.value} to accept.`,
        duration: 3000,
        color: 'warning'
      })
      await toast.present()
      return
    }
  }
  const tempId = `temp-${Date.now()}`
  const tempMessage = { 
    id: tempId, 
    sender_id: authStore.user.id, 
    receiver_id: chatWithId.value, 
    message: messageInput.value.trim() || null, 
    photo: imagePreview.value || null, 
    reply_to_id: replyMessage.value?.id || null, 
    is_seen: false, 
    created_at: new Date().toISOString() 
  }
  messages.value.push(tempMessage)
  const textToSend = messageInput.value.trim()
  messageInput.value = ''
  imagePreview.value = null
  replyMessage.value = null
  if (isSender.value && !requestAccepted.value) {
    senderMessageCount.value++
  }
  await nextTick()
  scrollToBottom()
  try {
    const response = await fetch(`${CHAT_API_URL}/messages`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        sender_id: authStore.user.id, 
        receiver_id: chatWithId.value, 
        message: textToSend || null, 
        photo: tempMessage.photo, 
        reply_to_id: tempMessage.reply_to_id 
      }) 
    })
    const data = await response.json()
    if (data.message) {
      const index = messages.value.findIndex(m => m.id === tempId)
      if (index !== -1) {
        messages.value[index] = { ...data.message }
      }
      updateMessageCache()
      sendChatWS(data.message)
    }
  } catch (error) { 
    messages.value = messages.value.filter(m => m.id !== tempId)
    messageInput.value = textToSend
    if (isSender.value && !requestAccepted.value) {
      senderMessageCount.value--
    }
  }
}

function getInputPlaceholder() {
  if (requestAccepted.value) return 'Type a message...'
  if (isReceiver.value) return 'Accept request to reply...'
  if (isSender.value) {
    const remaining = messagesRemaining.value
    if (remaining === 0) return `Wait for ${chatWith.value} to accept...`
    return `${remaining} message${remaining !== 1 ? 's' : ''} remaining...`
  }
  return 'Type a message...'
}

function handleNewMessage(incomingMsg) {
  if (!incomingMsg || messages.value.some(m => m.id === incomingMsg.id)) return
  messages.value.push(incomingMsg)
  updateMessageCache()
  nextTick(() => { scrollToBottom(); markVisibleMessagesAsSeen() })
}

function handleTypingIndicator(data) {
  if (!data || !data.senderId) return
  if (String(data.senderId) !== String(chatWithId.value)) return
  isTyping.value = data.typing
  clearTimeout(typingTimeout)
  if (data.typing) typingTimeout = setTimeout(() => { isTyping.value = false }, 3000)
}

async function handleMessageSeen(data) {
  if (!data) return
  const messageId = data.messageId || data.id
  const index = messages.value.findIndex(m => m.id === messageId)
  if (index !== -1) {
    messages.value[index] = { ...messages.value[index], is_seen: true }
    updateMessageCache()
  }
}

function handleTyping() {
  if (connectionStatus.value === 'connected') {
    sendTypingWS(true)
    clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => sendTypingWS(false), 2000)
  }
}

async function markVisibleMessagesAsSeen() {
  const unseenMessages = messages.value.filter(m => !isCurrentUserMessage(m) && !m.is_seen)
  if (unseenMessages.length === 0) return
  const messageIds = unseenMessages.map(m => m.id)
  try {
    await fetch(`${CHAT_API_URL}/messages/seen`, { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ message_ids: messageIds, user_id: authStore.user.id }) 
    })
    messageIds.forEach(messageId => {
      const index = messages.value.findIndex(m => m.id === messageId)
      if (index !== -1) {
        messages.value[index] = { ...messages.value[index], is_seen: true }
        sendMessageSeenWS(messageId)
      }
    })
    updateMessageCache()
  } catch (error) {}
}

function setupScrollObserver() {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(entry => { 
      if (entry.isIntersecting) markVisibleMessagesAsSeen() 
    }), 
    { threshold: 0.5 }
  )
  nextTick(() => { if (messagesEnd.value) observer.observe(messagesEnd.value) })
}

function scrollToBottom() { 
  nextTick(() => messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })) 
}

function scrollToReplyMessage(replyId) {
  const element = document.querySelector(`[data-message-id="${replyId}"]`)
  if (element) { 
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    element.classList.add('highlight')
    setTimeout(() => element.classList.remove('highlight'), 2000) 
  }
}

function setReplyMessage(msg) { replyMessage.value = msg }
function cancelReply() { replyMessage.value = null }
function getReplyAuthor(msg) { return isCurrentUserMessage(msg) ? 'You' : chatWith.value }
function getReplyText(msg) { if (msg.photo) return 'Photo'; return msg.message || '[Message]' }
function getReplyPreview(replyId) {
  const msg = messages.value.find(m => m.id === replyId)
  return msg ? getReplyText(msg) : 'Original message'
}

let touchStartX = 0
let touchCurrentElement = null

function handleTouchStart(event, msg) { 
  touchStartX = event.touches[0].clientX
  touchCurrentElement = event.currentTarget 
}

function handleTouchMove(event) {
  if (!touchCurrentElement) return
  const deltaX = event.touches[0].clientX - touchStartX
  if (deltaX > 0 && deltaX < 100) touchCurrentElement.style.transform = `translateX(${deltaX}px)`
}

function handleTouchEnd(event, msg) {
  if (!touchCurrentElement) return
  const deltaX = event.changedTouches[0].clientX - touchStartX
  touchCurrentElement.style.transform = ''
  if (deltaX > 70) setReplyMessage(msg)
  touchStartX = 0
  touchCurrentElement = null
}

function handlePhotoSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => imagePreview.value = e.target.result
  reader.readAsDataURL(file)
}

function clearImagePreview() { 
  imagePreview.value = null
  fileInput.value.value = '' 
}

function openFullscreen(photoUrl) { fullscreenImage.value = photoUrl }
function viewProfile() { router.push(`/user/${chatWithId.value}`) }
function getInitials(name) { 
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) 
}

function formatMessageTime(timestamp) { 
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) 
}
function formatDateSeparator(timestamp) {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function shouldShowDateSeparator(index) {
  if (index === 0) return true
  const current = new Date(messages.value[index].created_at)
  const previous = new Date(messages.value[index - 1].created_at)
  return current.toDateString() !== previous.toDateString()
}
</script>

<style scoped>

.deleted-user-badge {
  color: var(--ion-color-medium);
  font-size: 11px;
  font-weight: 400;
  font-style: italic;
}

/* Date Separator */
.date-separator{display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 0;width:100%}
.date-separator-line{flex:1;height:1px;background:rgba(var(--ion-color-medium-rgb),.4)}
.date-separator-text{color:var(--ion-color-medium);font-size:12px;font-weight:600;background:var(--ion-background-color,#1a1a1a);padding:4px 10px;border-radius:10px;white-space:nowrap}
body.light .date-separator-text{background:rgba(142,142,147,.08);color:#8e8e93}
/* Video Waiting Overlay */
.video-waiting-overlay{position:absolute;inset:0;z-index:4;background:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
.video-waiting-avatar{width:120px;height:120px;border:3px solid var(--ion-color-primary);box-shadow:0 0 24px rgba(var(--ion-color-primary-rgb),.4);border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center}
.video-waiting-avatar img,.video-waiting-avatar .avatar-placeholder{width:100%;height:100%;object-fit:cover;border-radius:50%}
.video-waiting-name{color:#fff;font-size:22px;font-weight:600;margin:0}
.video-waiting-status{color:var(--ion-color-primary);font-size:15px;margin:0;font-weight:500;animation:pulse 1.5s ease-in-out infinite}
.video-hidden{opacity:0!important}
/* Missed Call */

.missed-call-text-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.missed-call-text {
  color: var(--ion-color-danger);
  font-size: 14px;
  font-weight: 500;
}

.missed-call-timestamp {
  color: var(--ion-color-medium);
  font-size: 11px;
}

.missed-call-bubble{display:flex;flex-direction:column;align-items:center;background:var(--ion-background-color,#1e1e1e);border:1px solid rgba(var(--ion-color-danger-rgb),.4);border-radius:10px;padding:8px 14px;gap:4px;min-width:160px}
body.light .missed-call-bubble{background:rgba(255,59,48,.08);border:1px solid rgba(255,59,48,.2)}
.missed-call-icon-row{display:flex;align-items:center;gap:8px}
.missed-call-icon{color:var(--ion-color-danger);font-size:18px}
.missed-call-text{color:var(--ion-color-danger);font-size:14px;font-weight:600}
.missed-call-time{color:var(--ion-color-medium);font-size:11px;align-self:flex-end}
/* Incoming Call */
.incoming-call-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.85);backdrop-filter:blur(10px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px}
.incoming-call-card{background:var(--ion-background-color,#1a1a1a);border-radius:24px;padding:32px 24px;max-width:340px;width:100%;display:flex;flex-direction:column;align-items:center;gap:16px;box-shadow:0 8px 32px rgba(0,0,0,.4)}
body.light .incoming-call-card{background:rgba(28,28,30,.95)}
.caller-avatar{width:130px;height:130px;border:3px solid var(--ion-color-primary);box-shadow:0 4px 12px rgba(var(--ion-color-primary-rgb),.3)}
.caller-avatar img{width:36.8%;height:21.99%;object-fit:cover;border-radius:50%;display:block;position:absolute;top:34.2%;left:50%;transform:translate(-50%,-50%)}
.call-info{text-align:center}
.call-info h3{margin:0 0 8px 0;font-size:22px;font-weight:600;color:#fff}
.call-type{margin:0;color:var(--ion-color-medium);font-size:15px}
.ringing-text{margin:8px 0 0 0;animation:pulse 1.5s ease-in-out infinite;color:var(--ion-color-primary);font-weight:500}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.call-actions{display:flex;gap:20px;margin-top:8px}
.call-actions ion-button ion-icon{font-size:20px;width:50px;height:50px;color:#fff}
/* Call Overlay */
.call-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.95);z-index:9999;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;padding:0}
.call-header{position:relative;margin-top:50px;width:100%;padding:16px 20px;z-index:10;display:flex;justify-content:flex-start;align-items:center;gap:12px;background:transparent}
.call-status{display:flex;gap:12px;align-items:center}
.call-timer{color:#fff;font-size:15px;font-weight:600;background:rgba(0,0,0,.6);padding:6px 14px;border-radius:16px;text-shadow:0 2px 4px rgba(0,0,0,.5)}
.call-type-badge{background:rgba(var(--ion-color-primary-rgb),.9);color:#fff;padding:6px 14px;border-radius:16px;font-size:13px;font-weight:500}
/* Video Container */
.video-container{position:relative;width:100%;flex:1;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;margin:0;padding:0}
.remote-video{width:100%;height:100%;object-fit:contain;background:#000;display:block}
.local-video{position:absolute;top:30%;right:16px;width:100px;height:140px;border-radius:12px;object-fit:cover;border:2px solid rgba(255,255,255,.4);box-shadow:0 4px 16px rgba(0,0,0,.6);background:#1a1a1a;display:block;z-index:5}
@media(max-width:400px){.local-video{width:80px;height:110px;top:30%;right:12px}}
/* Voice Container */
.voice-container{width:100%;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:48px 32px}
.voice-avatar{width:150px;height:150px;border:4px solid var(--ion-color-primary);box-shadow:0 8px 24px rgba(var(--ion-color-primary-rgb),.4);overflow:hidden;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative}
.voice-avatar img,.voice-avatar .avatar-placeholder{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;position:absolute;top:47%;left:50%;transform:translate(-50%,-50%)}
.voice-name{color:var(--ion-text-color,#fff);font-size:24px;font-weight:600;margin:0;text-align:center}
.voice-status{color:var(--ion-color-success);font-size:15px;margin:0;font-weight:500}
/* Call Controls */
.call-controls{position:relative;width:100%;display:flex;justify-content:center;align-items:center;padding:24px 20px 40px 20px;background:transparent;z-index:10}
.call-controls ion-button{width:40px;height:40px;--border-radius:50%;box-shadow:0 4px 16px rgba(220,53,69,.5);margin-bottom:15%}
/* Main Layout */
ion-page{display:flex;flex-direction:column;height:100vh}
ion-header{flex-shrink:0;border-bottom:none}

ion-content{flex:1;--background:var(--background);overflow:hidden}
ion-footer{flex-shrink:0;background:var(--background)}
/* Messages Container */
.messages-container{height:100%;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;transition:background .5s ease}
.online-header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)!important;--background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)!important}
.message-wrapper{display:flex;flex-direction:column;margin-bottom:8px}
.message{display:flex;align-items:flex-end;gap:8px;width:100%}
.message-sent{justify-content:flex-end}
.message-received{justify-content:flex-start}
.message-content{display:flex;flex-direction:column;gap:2px;max-width:70%}
.message-sent .message-content{align-items:flex-end}
.message-received .message-content{align-items:flex-start}
.msg-avatar{width:32px;height:32px;flex-shrink:0}
.msg-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}
/* Message Bubbles */
.message-bubble{padding:7px 9px;border-radius:20px;word-break:break-word;line-height:1.5;box-shadow:0 2px 4px rgba(0,0,0,.2);background:var(--input-background);color:var(--text-primary);transition:all .3s ease;max-width:100%}
.message-sent .message-bubble{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff}
.message-received .message-bubble{background:var(--input-background);color:var(--text-primary)}
body.light .message-sent .message-bubble{background:#007aff;color:#fff;border-radius:18px 18px 4px 18px;box-shadow:0 1px 2px rgba(0,0,0,.1)}
body.light .message-received .message-bubble{background:#e9e9eb;color:#000;border-radius:18px 18px 18px 4px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.message-bubble.message-seen{background:#2ed573!important;color:#fff!important}
body.light .message-bubble.message-seen{background:#34c759!important}
.message-bubble p{margin:0;color:inherit;font-size:15px}
body.light .message-bubble p{font-size:16px}
.message-photo{max-width:100%;width:280px;height:auto;max-height:400px;border-radius:12px;cursor:pointer;display:block;object-fit:cover;padding:0}
body.light .message-photo{width:250px;max-height:350px;border-radius:18px}
.message-bubble:has(.message-photo){padding:4px;background:transparent;box-shadow:none}
.message-sent .message-bubble:has(.message-photo){background:transparent}
body.light .message-bubble:has(.message-photo){padding:0}
.message-time{font-size:.7rem;color:var(--text-secondary);padding:0 4px;align-self:flex-end}
body.light .message-time{font-size:11px;color:#8e8e93;padding:2px 8px 0 8px;margin-top:2px}
/* Reply */
.reply-indicator{font-size:.75rem;color:var(--text-secondary);padding:6px 10px;margin-bottom:4px;background:var(--card-hover);border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;max-width:fit-content}
body.light .reply-indicator{font-size:13px;background:rgba(0,0,0,.08);border-radius:12px;border-left:3px solid #007aff;color:#000}
body.light .message-sent .reply-indicator{background:rgba(255,255,255,.2);color:#fff;border-left-color:#fff}
.reply-preview{background:var(--input-background);padding:8px 12px;border-top:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center}
body.light .reply-preview{background:#f2f2f7;padding:10px 16px;gap:12px}
.reply-content{display:flex;align-items:center;gap:8px;flex:1}
body.light .reply-content{gap:10px;min-width:0}
.reply-bar{display:none}
body.light .reply-bar{display:block;width:3px;height:36px;background:#007aff;border-radius:2px;flex-shrink:0}
.reply-details{display:none}
body.light .reply-details{display:block;flex:1;min-width:0}
.reply-to{font-size:.75rem;color:#09d5fd;margin:0}
body.light .reply-to{font-size:13px;color:#007aff;margin:0 0 2px 0;font-weight:600}
.reply-text{font-size:1rem;color:var(--text-secondary);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}
body.light .reply-text{font-size:14px;color:#8e8e93}
.cancel-reply-btn{display:block}
body.light .cancel-reply-btn{--padding-start:4px;--padding-end:4px;margin:0;min-width:32px;height:32px}
/* Typing */
.typing-status{position:absolute;top:85%;left:5%;font-size:16px;font-style:italic;color:#09d5fd;margin:0;padding:0;animation:pulse 1.5s ease-in-out infinite}
body.light .typing-status{display:none}
.typing-indicator{display:none}
body.light .typing-indicator{display:flex;position:absolute;bottom:72px;left:16px;align-items:center;gap:8px;padding:6px 12px;background:rgba(142,142,147,.12);border-radius:12px;z-index:10}
.typing-text{display:none}
body.light .typing-text{display:block;font-size:13px;color:#8e8e93;font-weight:500}
.typing-dots{display:none}
body.light .typing-dots{display:flex;gap:3px;align-items:center}
.dot{width:6px;height:6px;background:#8e8e93;border-radius:50%;animation:typingDot 1.4s infinite}
.dot:nth-child(2){animation-delay:.2s}
.dot:nth-child(3){animation-delay:.4s}
@keyframes typingDot{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-4px)}}
/* Input */
.input-wrapper{display:flex;align-items:flex-end;gap:4px;padding:8px;background:var(--background);width:100%}
body.light .input-wrapper{gap:8px;padding:8px 12px;width:100%}
.input-wrapper ion-textarea{flex:1;--background:var(--input-background);--color:var(--text-primary);--padding-start:12px;--padding-end:12px;--padding-top:8px;--padding-bottom:8px;--border-radius:16px;font-size:14px;min-height:40px}
body.light .input-wrapper ion-textarea{font-size:16px;min-height:36px}
.textarea-wrapper{flex:1;min-width:0;width:100%}
body.light .textarea-wrapper{flex:1;background:#f2f2f7;border-radius:20px;overflow:hidden}
body.light .textarea-wrapper ion-textarea{--background:transparent;--color:#000;--padding-start:14px;--padding-end:14px;--padding-top:10px;--padding-bottom:10px;max-height:120px}
.input-wrapper ion-button{margin:0;--padding-start:8px;--padding-end:8px;min-width:40px;height:40px}
body.light .input-wrapper ion-button{--padding-start:6px;--padding-end:6px;min-width:36px;height:36px;color:#007aff}
ion-header ion-button{color:#007aff}
body.light ion-header ion-button{--color:#007aff}
ion-header ion-button ion-icon{color:#007aff}
body.light .action-btn{color:#007aff}
body.light .send-btn{color:#007aff;opacity:.4;transition:opacity .2s}
body.light .send-btn-active{opacity:1}
/* Header */
ion-header ion-avatar{width:50px;height:50px;margin-left: 30px;}
ion-avatar img{width:100%;height:100%;margin-top:5px;object-fit:cover;border-radius:50%}

.header-content{display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;flex:1;text-align:center}
body.light .header-content{flex-direction:column;gap:4px;padding:0;}
.user-info{display:flex;flex-direction:column;min-width:0;margin-left: 30px;}
.username-title{font-size:1rem;font-weight:100;color:var(--text-primary);padding:0;margin:0}
body.light .username-title{font-size:17px}
.avatar-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#667eea;color:#fff;font-weight:700;border-radius:50%}
body.light .avatar-placeholder{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);font-size:14px;font-weight:600}

body.light ion-footer{background:#fff;border-top:1px solid #e5e5ea}
body.light .messages-container{background:#fff;gap:2px;padding:8px 12px 16px 12px}
body.light .msg-avatar{width:28px;height:28px}
body.light .message-content{min-width:60px}
/* Request Banner */
.request-banner,.request-toolbar,.limit-warning{background-color:var(--background);color:var(--text-primary);border-radius:12px}
.request-info,.request-text,.limit-warning{display:flex;align-items:center;gap:6px}
.request-info ion-icon,.limit-warning ion-icon{color:var(--text-primary)}
.request-toolbar{position:fixed;bottom:15%;left:6%;width:90%;padding:16px;display:flex;align-items:center;border:1px solid red;z-index:1000}
body.light .request-toolbar-banner{--background:#fff3cd}
body.light .request-banner{padding:12px 16px}
body.light .request-info{gap:8px;margin-bottom:12px}
body.light .request-text{flex:1;font-size:14px}
.request-actions{display:flex;gap:8px}
body.light .request-actions{gap:8px}
.request-actions ion-button{--border-radius:9999px;--padding-start:12px;--padding-end:12px;--padding-top:6px;--padding-bottom:6px}
body.light .request-actions ion-button{--border-radius:20px;--padding-start:16px;--padding-end:16px;font-size:14px;height:32px}
.limit-warning{padding:6px 12px;border-radius:10px}
body.light .limit-toolbar{--background:rgba(255,149,0,.1)}
body.light .limit-warning{padding:8px 16px;color:#ff9500;font-size:13px}
/* Image Preview */
.image-preview-container{padding:8px;display:flex;justify-content:center;align-items:center;position:relative;background:var(--background);border-top:1px solid var(--border-color)}
body.light .image-preview-container{padding:12px 16px;background:#f2f2f7}
body.light .image-preview-wrapper{position:relative;display:inline-block}
.image-preview{width:80px;height:80px;object-fit:cover;border-radius:8px}
body.light .image-preview{border-radius:12px;display:block}
.remove-preview{position:absolute;top:4px;right:4px;--background:rgba(0,0,0,.7);--color:#fff;width:24px;height:24px;--padding-start:0;--padding-end:0}
body.light .remove-preview-btn{position:absolute;top:-6px;right:-6px;border-radius:50%;width:24px;height:24px}
/* Fullscreen */
.fullscreen-modal{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.95)}
body.light .fullscreen-modal{background:rgba(0,0,0,.95)}
.fullscreen-modal img{max-width:90%;max-height:90%}
body.light .fullscreen-modal img{border-radius:12px}
/* Misc */
.highlight{animation:highlightAnim 2s ease}
@keyframes highlightAnim{0%,100%{background:transparent}50%{background:var(--card-hover)}}
ion-textarea:disabled,ion-button:disabled{opacity:.5}
ion-toolbar{--background:var(--background);--border-color:var(--border-color)}

</style>