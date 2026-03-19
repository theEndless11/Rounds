<template>
<div 
  class="post-card" 
  @click="viewPost" 
  @dblclick="handleDoubleTap"
>
  <div class="post-header">
    <div class="avatar-row">
      <ion-avatar class="avatar" @click.stop="viewUserProfile">
        <img v-if="post.users?.profile_photo_url" :src="getOptimizedImageUrl(post.users.profile_photo_url, 100)" :alt="post.users.full_name" loading="lazy" />
        <div v-else class="avatar-placeholder">{{ getInitials(post.users?.full_name || 'U') }}</div>
      </ion-avatar>
      
      <div class="user-info-wrapper">
        <div class="user-info" @click.stop="viewUserProfile">
          <div class="user-name-wrapper">
            <div class="user-name-row">
              <span class="user-name">{{ post.users?.full_name || 'Unknown User' }}</span>
              <span class="post-age">· {{ formatDate(post.created_at) }}</span>
            </div>
            <div class="user-meta-row">
              <span class="user-meta">{{ post.users?.college_hospital || 'hospital' }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <ion-button fill="clear" size="small" @click.stop="openMoreOptions" class="more-btn">
        <ion-icon :icon="ellipsisVertical"></ion-icon>
      </ion-button>
    </div>
    
    <!-- Content directly below username -->
    <div v-if="post.content && !post.repost_of" class="post-content-inline">
      <div v-html="renderContent(post.content)" class="markdown-content"></div>
    </div>
    
    <!-- Repost comment above quoted post -->
    <div v-if="post.content && post.repost_of" class="repost-comment-inline">
      <div v-html="renderContent(post.content)" class="markdown-content"></div>
    </div>

    <!-- Quoted post inside same card for reposts -->
    <div v-if="post.repost_of && originalPost" class="quoted-post" @click.stop="navigateToOriginal">
      <div class="quoted-header">
        <ion-avatar class="quoted-avatar">
          <img v-if="originalAuthor?.profile_photo_url" :src="getOptimizedImageUrl(originalAuthor.profile_photo_url, 50)" :alt="originalAuthor.full_name" loading="lazy" />
          <div v-else class="avatar-placeholder">{{ getInitials(originalAuthor?.full_name || 'U') }}</div>
        </ion-avatar>
        <div class="quoted-user-info">
          <span class="quoted-user-name">{{ originalAuthor?.full_name || 'Unknown User' }}</span>
          <span class="quoted-meta">@{{ originalAuthor?.college_hospital || 'hospital' }}</span>
          <span class="quoted-timestamp">· {{ formatDate(originalPost.created_at) }}</span>
        </div>
      </div>
      <div v-if="originalPost.content" class="quoted-content">
        <div v-html="renderContent(originalPost.content)" class="markdown-content"></div>
      </div>
      
      <div v-if="originalMediaUrls.length > 0" class="quoted-media">
        <img v-if="originalMediaTypes[0] === 'image'" :src="getOptimizedImageUrl(originalMediaUrls[0], 400)" alt="Preview" />
        <div v-else class="quoted-video-thumb">
          <video 
            ref="quotedVideoPlayer"
            :src="originalMediaUrls[0]" 
            preload="metadata"
            autoplay
            muted
            loop
            playsinline
          ></video>
        </div>
        <div v-if="originalMediaUrls.length > 1" class="quoted-media-count">+{{ originalMediaUrls.length - 1 }}</div>
      </div>
    </div>

    <!-- Tags -->
    <div v-if="postTags.length > 0" class="post-tags">
      <span 
        v-for="(tag, index) in postTags" 
        :key="index" 
        class="tag-item"
        @click.stop="navigateToTag(tag)"
      >
        {{ tag }}
      </span>
    </div>

    <!-- Media for non-repost -->
    <div v-if="!post.repost_of && mediaUrls.length > 0" class="media-section">
      <div v-if="mediaUrls.length === 1 && mediaTypes[0] === 'image'" class="single-media" @click.stop="openMediaViewer(0)">
        <img :src="optimizedMediaUrls[0]" alt="Post image" loading="lazy" />
      </div>

      <div v-else-if="mediaUrls.length === 1 && mediaTypes[0] === 'video'" class="single-media video-container">
        <video ref="videoPlayer" :src="optimizedMediaUrls[0]" preload="metadata" playsinline muted autoplay loop @click.stop="toggleVideoPlay" @loadeddata="onVideoLoaded"></video>
        <div class="video-loading-shimmer" v-if="!videoLoaded">
          <div class="shimmer-content">
            <ion-icon :icon="play"></ion-icon>
            <span>Loading video...</span>
          </div>
        </div>
        <!-- Simple Progress Bar -->
        <div class="video-progress-bar" @click.stop="seekVideo" :style="{ '--progress': videoProgress + '%' }">
          <div class="video-progress-fill"></div>
        </div>
        <div v-if="!isPlaying && !showPlayButton" class="video-paused-indicator">
          <div class="pause-icon-persistent"><ion-icon :icon="play"></ion-icon></div>
        </div>
        <div v-if="showPlayButton" class="play-pause-overlay">
          <div class="play-pause-button"><ion-icon :icon="isPlaying ? pause : play"></ion-icon></div>
        </div>
      </div>

      <div v-else-if="mediaUrls.length > 1" class="media-carousel">
        <div class="carousel-container" ref="carouselContainer" @touchstart="handleCarouselTouchStart" @touchmove="handleCarouselTouchMove" @touchend="handleCarouselTouchEnd">
          <div class="carousel-track" :style="{ transform: `translateX(-${currentSlide * 100}%)` }">
            <div v-for="(url, index) in optimizedMediaUrls" :key="index" class="carousel-slide">
              <img v-if="mediaTypes[index] === 'image'" :src="url" :alt="`Image ${index + 1}`" @click.stop="openMediaViewer(index)" />
              <div v-else class="carousel-video" @click.stop="openMediaViewer(index)">
                <video :src="url" preload="metadata"></video>
                <div class="video-play-icon"><ion-icon :icon="playCircle"></ion-icon></div>
              </div>
            </div>
          </div>
        </div>
        <div class="carousel-indicators">
          <span v-for="(_, index) in mediaUrls" :key="index" class="carousel-dot" :class="{ active: index === currentSlide }"></span>
        </div>
      </div>
    </div>
    
    <div class="post-meta-bottom">
      <span class="meta-time">{{ formatFullDate(post.created_at).time }}</span>
      <span class="meta-separator">·</span>
      <span class="meta-date">{{ formatFullDate(post.created_at).date }}</span>
      <span class="meta-separator">·</span>
      <span class="meta-number">{{ formatCount(viewsCount) }}</span>
      <span class="meta-label">Views</span>
      <span v-if="repostsCount > 0" class="meta-separator">·</span>
      <span v-if="repostsCount > 0" class="meta-number">{{ formatCount(repostsCount) }}</span>
      <span v-if="repostsCount > 0" class="meta-label">Reposts</span>
    </div>

    <!-- Actions Bar -->
    <div class="actions-bar" @click.stop>
      <ion-button fill="clear" size="small" @click="toggleLike" class="action-btn">
        <ion-icon :icon="isLiked ? heart : heartOutline" :class="{ liked: isLiked }"></ion-icon>
        <span v-if="likesCount > 0">{{ formatCount(likesCount) }}</span>
      </ion-button>
      <ion-button fill="clear" size="small" @click="openComments" class="action-btn">
        <ion-icon :icon="chatbubbleOutline"></ion-icon>
        <span v-if="commentsCount > 0">{{ formatCount(commentsCount) }}</span>
      </ion-button>
      <ion-button fill="clear" size="small" @click="openRepostModal" class="action-btn">
        <ion-icon :icon="repeat"></ion-icon>
        <span v-if="repostsCount > 0">{{ formatCount(repostsCount) }}</span>
      </ion-button>
      <ion-button fill="clear" size="small" @click="toggleBookmark" class="action-btn">
        <ion-icon :icon="isBookmarked ? bookmark : bookmarkOutline" :class="{ bookmarked: isBookmarked }"></ion-icon>
      </ion-button>
      <ion-button fill="clear" size="small" @click="sharePost" class="action-btn">
        <ion-icon :icon="shareSocialOutline"></ion-icon>
      </ion-button>
    </div>
  </div>

  <div class="heart-animation-container" v-if="showHeartAnimation">
    <ion-icon :icon="heart" class="heart-burst"></ion-icon>
  </div>

  <ion-modal :is-open="showMediaViewer" @did-dismiss="closeMediaViewer" class="media-modal">
    <div class="modal-content">
      <div class="modal-header">
        <ion-button fill="clear" @click="closeMediaViewer"><ion-icon :icon="close"></ion-icon></ion-button>
      </div>
      <div class="modal-media" ref="modalMediaRef">
        <img v-if="currentMediaType === 'image'" :src="currentMediaUrl" alt="Full size image" class="zoomable-image" @dblclick="resetZoom" />
        <video v-else-if="currentMediaType === 'video'" :src="currentMediaUrl" controls autoplay></video>
      </div>
      <div v-if="mediaUrls.length > 1" class="modal-nav">
        <ion-button v-if="currentMediaIndex > 0" fill="clear" @click="prevMedia" class="nav-btn">
          <ion-icon :icon="chevronBack"></ion-icon>
        </ion-button>
        <ion-button v-if="currentMediaIndex < mediaUrls.length - 1" fill="clear" @click="nextMedia" class="nav-btn">
          <ion-icon :icon="chevronForward"></ion-icon>
        </ion-button>
      </div>
      <div class="modal-indicators">
        <span v-for="(_, index) in mediaUrls" :key="index" class="indicator" :class="{ active: index === currentMediaIndex }"></span>
      </div>
    </div>
  </ion-modal>

  <ion-modal :is-open="isRepostModalOpen" @did-dismiss="closeRepostModal" class="repost-modal">
    <ion-header>
      <ion-toolbar class="repost-toolbar">
        <ion-buttons slot="start">
          <ion-button fill="clear" class="cancel-btn" @click="closeRepostModal">Cancel</ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button class="repost-btn" @click="submitRepost">Post</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="repost-content">
      <div class="repost-input-area">
        <textarea v-model="repostComment" placeholder="Add your thoughts..." class="repost-textarea" rows="4"></textarea>
      </div>
      <div class="original-post-preview">
        <div class="preview-header">
          <ion-avatar class="avatar-small">
            <img v-if="post.users?.profile_photo_url" :src="getOptimizedImageUrl(post.users.profile_photo_url, 50)" />
            <div v-else class="avatar-placeholder">{{ getInitials(post.users?.full_name) }}</div>
          </ion-avatar>
          <div class="preview-user-info">
            <div class="preview-user-name">{{ post.users?.full_name }}</div>
            <div class="preview-timestamp">{{ formatDate(post.created_at) }}</div>
          </div>
        </div>
        <div class="preview-content">{{ post.content }}</div>
        <div v-if="mediaUrls.length > 0" class="preview-media">
          <img v-if="mediaTypes[0] === 'image'" :src="optimizedMediaUrls[0]" alt="Preview" />
          <div v-else class="video-preview-thumb"><ion-icon :icon="playCircle"></ion-icon></div>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useIonRouter } from '@ionic/vue' 
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import { Share } from '@capacitor/share'
import { blackFadeAnimation } from '@/animations/blackFade'
import { IonButton, IonIcon, IonAvatar, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonFooter, actionSheetController, alertController, toastController } from '@ionic/vue'
import { heartOutline, heart, chatbubbleOutline, playCircle, play, pause, pulseOutline, close, chevronBack, chevronForward, ellipsisVertical, trashOutline, bookmarkOutline, bookmark, flagOutline, downloadOutline, repeat,shareSocialOutline, shareOutline,banOutline } from 'ionicons/icons'

const props = defineProps(['post'])
const emit = defineEmits(['delete', 'repost', 'block-user'])
const router = useRouter()
const authStore = useAuthStore()
const ionRouter = useIonRouter()


const postTags = ref([])
const originalPost = ref(null)
const originalAuthor = ref(null)
const originalMediaUrls = computed(() => { if (!originalPost.value?.media_urls) return []; if (Array.isArray(originalPost.value.media_urls)) return originalPost.value.media_urls; return [] })
const originalMediaTypes = computed(() => { if (!originalPost.value?.media_type) return []; if (Array.isArray(originalPost.value.media_type)) return originalPost.value.media_type; return [] })
const isLiked = ref(false)
const isSaved = ref(false)
const likesCount = ref(0)
const commentsCount = ref(0)
const viewsCount = ref(0)
const repostsCount = ref(0)
const showMediaViewer = ref(false)
const currentMediaIndex = ref(0)
const modalMediaRef = ref(null)
const scale = ref(1)
const posX = ref(0)
const posY = ref(0)
let initialDistance = 0
let initialScale = 1
let isPinching = false
let touchStartX = 0
let touchStartY = 0
let isDragging = false
const videoPlayer = ref(null)
const isPlaying = ref(false)
const videoProgress = ref(0)
const showPlayButton = ref(false)
const videoLoaded = ref(false)
let playButtonTimeout = null
const showHeartAnimation = ref(false)
const isRepostModalOpen = ref(false)
const repostComment = ref('')
let lastTap = 0
const currentSlide = ref(0)
const carouselContainer = ref(null)
let touchEndX = 0

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};


const formatFullDate = (dateString) => {
  const date = new Date(dateString);
  const time = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const dateStr = `${day} ${month} ${year}`;
  return { time, date: dateStr };
};

const mediaUrls = computed(() => { if (!props.post.media_urls) return []; if (Array.isArray(props.post.media_urls)) return props.post.media_urls; return [] })
const mediaTypes = computed(() => { if (!props.post.media_type) return []; if (Array.isArray(props.post.media_type)) return props.post.media_type; return [] })
const optimizedMediaUrls = computed(() => { return mediaUrls.value.map((url, index) => { if (mediaTypes.value[index] === 'image') { return getOptimizedImageUrl(url, 800) } return url }) })
const currentMediaUrl = computed(() => { const url = mediaUrls.value[currentMediaIndex.value] || ''; if (mediaTypes.value[currentMediaIndex.value] === 'image') { return getOptimizedImageUrl(url, 1920) } return url })
const currentMediaType = computed(() => mediaTypes.value[currentMediaIndex.value] || 'image')
const isOwnPost = computed(() => { return authStore.user && authStore.user.id === props.post.user_id })
const isBookmarked = computed(() => isSaved.value)

function escapeHtml(text) { const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }; return text.replace(/[&<>"']/g, m => map[m]) }
function renderContent(content) { if (!content) return ''; let html = escapeHtml(content); html = html.replace(/@([a-zA-Z][a-zA-Z0-9\s]*)/g, (match, username) => { return `<span class="mention" style="color: #ef4444; font-weight: 600; cursor: pointer;" onclick="window.viewUserByMention('${username.trim()}')">@${username}</span>` }); html = html.replace(/`([^`]+)`/g, '<code>$1</code>'); html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>'); html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>'); html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>'); html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>'); html = html.replace(/^## (.+)$/gm, '<h2>$2</h2>'); html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>'); html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>'); html = html.replace(/\n/g, '<br>'); return html }
function getOptimizedImageUrl(url, width) { if (!url) return ''; return `${url}?width=${width}&quality=85&format=auto` }

onMounted(async () => { 
  if (props.post.repost_of) { 
    await fetchOriginalPost() 
  } 
  await loadStats(); 
  await recordView();  
  loadPostTags(); 
  setupVideoListeners(); 
  await checkIfBookmarked(); 
  if (videoPlayer.value) { 
    isPlaying.value = true 
  } 
  window.viewUserByMention = async (username) => { 
    const { data: user } = await supabase.from('users').select('id').ilike('full_name', username).single(); 
    if (user) { 
      ionRouter.push(`/user/${user.id}`, blackFadeAnimation)
    } 
  }; 
  setupZoomListeners() 
})

onUnmounted(() => { 
  if (videoPlayer.value) { 
    videoPlayer.value.removeEventListener('timeupdate', updateVideoProgress) 
  } 
  if (playButtonTimeout) { 
    clearTimeout(playButtonTimeout) 
  } 
})

async function checkIfBookmarked() { 
  if (!authStore.user) return; 
  try { 
    const { data } = await supabase.from('bookmarks').select('id').eq('user_id', authStore.user.id).eq('post_id', props.post.id).maybeSingle(); 
    isSaved.value = !!data 
  } catch (error) { 
    console.error('Check bookmark error:', error) 
  } 
}

async function fetchOriginalPost() { 
  try { 
    const { data: postData, error: postError } = await supabase.from('posts').select('*, users(*)').eq('id', props.post.repost_of).single(); 
    if (postError) throw postError; 
    originalPost.value = postData; 
    originalAuthor.value = postData.users 
  } catch (error) { 
    console.error('Error fetching original post:', error); 
    originalPost.value = null; 
    originalAuthor.value = props.post.users 
  } 
}

async function openMoreOptions(){
  const buttons=[];
  isOwnPost.value
    ? buttons.push({text:"Delete Post",icon:trashOutline,role:"destructive",handler:async()=>{await confirmDelete();return true}})
    : buttons.push({text:"Block User",icon:banOutline,role:"destructive",handler:async()=>{await confirmBlockUser();return true}});

  buttons.push({text:isSaved.value?"Remove Bookmark":"Save to Bookmarks",icon:isSaved.value?bookmark:bookmarkOutline,handler:()=>toggleBookmark()});
  mediaUrls.value.length&&buttons.push({text:"Download Media",icon:downloadOutline,handler:()=>downloadMedia()});
  buttons.push({text:"Report Post",icon:flagOutline,handler:()=>reportPost()},{text:"Cancel",role:"cancel"});

  (await actionSheetController.create({header:"Post Options",cssClass:"custom-action-sheet",buttons})).present();
}

async function confirmBlockUser(){
  const alert=await alertController.create({
    header:"Block User",
    message:`Are you sure you want to block ${props.post.users?.full_name}? You won't see their posts anymore.`,
    buttons:[
      {text:"Cancel",role:"cancel"},
      {text:"Block",role:"destructive",handler:async()=>{await blockUser()}}
    ]
  });
  await alert.present();
}

async function blockUser(){
  if(!authStore.user)return;
  try{
    const {error}=await supabase.from("blocked_users").insert({
      blocker_id:authStore.user.id,
      blocked_id:props.post.user_id,
      created_at:new Date().toISOString()
    });
    if(error)throw error;

    emit("block-user",props.post.user_id);
    (await toastController.create({message:`Blocked ${props.post.users?.full_name}`,duration:2e3,color:"success"})).present();
  }catch(error){
    console.error("Block error:",error);
    (await toastController.create({message:"Failed to block user",duration:2e3,color:"danger"})).present();
  }
}


async function confirmDelete() { 
  const alert = await alertController.create({ header: 'Delete Post', message: 'Are you sure you want to delete this post? This action cannot be undone.', buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Delete', role: 'destructive', handler: async () => { await deletePost() } }] }); 
  await alert.present() 
}

async function deletePost() { 
  try { 
    const { error } = await supabase.from('posts').delete().eq('id', props.post.id); 
    if (error) throw error; 
    emit('delete', props.post.id); 
    const toast = await toastController.create({ message: 'Post deleted successfully', duration: 2000, color: 'success' }); 
    await toast.present() 
  } catch (error) { 
    console.error('Delete error:', error); 
    const toast = await toastController.create({ message: 'Failed to delete post', duration: 2000, color: 'danger' }); 
    await toast.present() 
  } 
}

async function toggleBookmark() { 
  if (!authStore.user) { 
    ionRouter.push('/login', blackFadeAnimation);
    return 
  } 
  try { 
    if (isSaved.value) { 
      await supabase.from('bookmarks').delete().eq('user_id', authStore.user.id).eq('post_id', props.post.id); 
      isSaved.value = false; 
      showToast('Removed from bookmarks') 
    } else { 
      await supabase.from('bookmarks').insert({ user_id: authStore.user.id, post_id: props.post.id }); 
      isSaved.value = true; 
      showToast('Saved to bookmarks') 
    } 
  } catch (error) { 
    console.error('Bookmark error:', error); 
    showToast('Failed to update bookmark') 
  } 
}

async function downloadMedia() { 
  if (mediaUrls.value.length === 0) return; 
  try { 
    const toast = await toastController.create({ message: 'Downloading...', duration: 1000 }); 
    await toast.present(); 
    const url = mediaUrls.value[currentMediaIndex.value] || mediaUrls.value[0]; 
    const type = mediaTypes.value[currentMediaIndex.value] || mediaTypes.value[0]; 
    const response = await fetch(url); 
    const blob = await response.blob(); 
    const downloadUrl = window.URL.createObjectURL(blob); 
    const link = document.createElement('a'); 
    link.href = downloadUrl; 
    link.download = `medconnect-${type}-${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`; 
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link); 
    window.URL.revokeObjectURL(downloadUrl); 
    const successToast = await toastController.create({ message: 'Download complete!', duration: 2000, color: 'success' }); 
    await successToast.present() 
  } catch (error) { 
    console.error('Download error:', error); 
    const errorToast = await toastController.create({ message: 'Failed to download media', duration: 2000, color: 'danger' }); 
    await errorToast.present() 
  } 
}

async function reportPost() { 
  const alert = await alertController.create({ header: 'Report Post', message: 'Why are you reporting this post?', inputs: [{ type: 'radio', label: 'Spam', value: 'spam', checked: true }, { type: 'radio', label: 'Inappropriate content', value: 'inappropriate' }, { type: 'radio', label: 'Harassment', value: 'harassment' }, { type: 'radio', label: 'False information', value: 'false_info' }, { type: 'radio', label: 'Other', value: 'other' }], buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Report', handler: async (reason) => { await submitReport(reason) } }] }); 
  await alert.present() 
}

async function submitReport(reason) { 
  try { 
    await supabase.from('reports').insert({ post_id: props.post.id, reported_by: authStore.user.id, reason: reason, created_at: new Date().toISOString() }); 
    const toast = await toastController.create({ message: 'Report submitted. Thank you for helping keep our community safe.', duration: 3000, color: 'success' }); 
    await toast.present() 
  } catch (error) { 
    console.error('Report error:', error); 
    const toast = await toastController.create({ message: 'Failed to submit report', duration: 2000, color: 'danger' }); 
    await toast.present() 
  } 
}

async function showToast(message) { 
  const toast = await toastController.create({ message, duration: 2000, color: 'medium' }); 
  await toast.present() 
}

async function loadPostTags() {
  try {
    if (props.post.tag) {
      let tags = props.post.tag
      if (typeof tags === 'string') {
        tags = JSON.parse(tags)
      }
      if (Array.isArray(tags)) {
        postTags.value = tags.filter(tag => tag && tag.trim() !== '')
      }
    }
  } catch (error) {
    postTags.value = []
  }
}

function setupVideoListeners() { 
  if (videoPlayer.value) { 
    videoPlayer.value.addEventListener('timeupdate', updateVideoProgress); 
    videoPlayer.value.addEventListener('play', () => isPlaying.value = true); 
    videoPlayer.value.addEventListener('pause', () => isPlaying.value = false); 
    videoPlayer.value.addEventListener('ended', () => isPlaying.value = false) 
  } 
}

function updateVideoProgress() { 
  if (videoPlayer.value) { 
    const progress = (videoPlayer.value.currentTime / videoPlayer.value.duration) * 100; 
    videoProgress.value = progress 
  } 
}

function onVideoLoaded() { 
  videoLoaded.value = true 
}

function toggleVideoPlay() { 
  if (videoPlayer.value) { 
    if (isPlaying.value) { 
      videoPlayer.value.pause() 
    } else { 
      videoPlayer.value.play() 
    } 
    showPlayButton.value = true; 
    if (playButtonTimeout) { 
      clearTimeout(playButtonTimeout) 
    } 
    playButtonTimeout = setTimeout(() => { 
      showPlayButton.value = false 
    }, 800) 
  } 
}

function seekVideo(event) {
  if (!videoPlayer.value || !videoPlayer.value.duration) return
  const rect = event.currentTarget.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = (clickX / rect.width) * 100
  videoPlayer.value.currentTime = (percentage / 100) * videoPlayer.value.duration
}

function openMediaViewer(index) { 
  currentMediaIndex.value = index; 
  showMediaViewer.value = true; 
  setupZoomListeners() 
}

function closeMediaViewer() { 
  showMediaViewer.value = false; 
  resetZoomState(); 
  if (modalMediaRef.value) { 
    const img = modalMediaRef.value.querySelector('.zoomable-image'); 
    if (img) { 
      img.removeEventListener('touchstart', handleTouchStart); 
      img.removeEventListener('touchmove', handleTouchMove); 
      img.removeEventListener('touchend', handleTouchEnd) 
    } 
  } 
}

function resetZoomState() { 
  scale.value = 1; 
  posX.value = 0; 
  posY.value = 0; 
  initialScale = 1; 
  isPinching = false; 
  isDragging = false 
}

function setupZoomListeners() { 
  setTimeout(() => { 
    if (modalMediaRef.value) { 
      const img = modalMediaRef.value.querySelector('.zoomable-image'); 
      if (img) { 
        img.addEventListener('touchstart', handleTouchStart, { passive: false }); 
        img.addEventListener('touchmove', handleTouchMove, { passive: false }); 
        img.addEventListener('touchend', handleTouchEnd, { passive: false }) 
      } 
    } 
  }, 100) 
}

function resetZoom() { 
  const img = modalMediaRef.value?.querySelector('.zoomable-image'); 
  if (img) { 
    scale.value = 1; 
    posX.value = 0; 
    posY.value = 0; 
    img.style.transform = 'scale(1) translate(0, 0)'; 
    img.style.transition = 'transform 0.3s ease'; 
    setTimeout(() => { 
      img.style.transition = '' 
    }, 300) 
  } 
}

function getDistance(touches) { 
  const dx = touches[0].clientX - touches[1].clientX; 
  const dy = touches[0].clientY - touches[1].clientY; 
  return Math.sqrt(dx * dx + dy * dy) 
}

function getCenter(touches) { 
  return { 
    x: (touches[0].clientX + touches[1].clientX) / 2, 
    y: (touches[0].clientY + touches[1].clientY) / 2 
  } 
}

function handleTouchStart(e) { 
  if (e.touches.length === 2) { 
    e.preventDefault(); 
    isPinching = true; 
    isDragging = false; 
    initialDistance = getDistance(e.touches); 
    initialScale = scale.value 
  } else if (e.touches.length === 1) { 
    isDragging = false; 
    touchStartX = e.touches[0].clientX - posX.value; 
    touchStartY = e.touches[0].clientY - posY.value 
  } 
}

function handleTouchMove(e) { 
  if (e.touches.length === 2 && isPinching) { 
    e.preventDefault(); 
    const currentDistance = getDistance(e.touches); 
    const scaleChange = currentDistance / initialDistance; 
    const newScale = initialScale * scaleChange; 
    scale.value = Math.min(Math.max(1, newScale), 5); 
    const img = e.currentTarget; 
    img.style.transform = `scale(${scale.value}) translate(${posX.value}px, ${posY.value}px)` 
  } else if (e.touches.length === 1 && scale.value > 1) { 
    e.preventDefault(); 
    isDragging = true; 
    const touch = e.touches[0]; 
    posX.value = touch.clientX - touchStartX; 
    posY.value = touch.clientY - touchStartY; 
    const img = e.currentTarget; 
    img.style.transform = `scale(${scale.value}) translate(${posX.value}px, ${posY.value}px)` 
  } 
}

function handleTouchEnd(e) { 
  if (e.touches.length < 2) { 
    isPinching = false 
  } 
  if (e.touches.length === 0) { 
    if (scale.value < 1.05) { 
      const img = e.currentTarget; 
      scale.value = 1; 
      posX.value = 0; 
      posY.value = 0; 
      img.style.transform = 'scale(1) translate(0, 0)'; 
      img.style.transition = 'transform 0.3s ease'; 
      setTimeout(() => { 
        img.style.transition = '' 
      }, 300) 
    } 
    isDragging = false 
  } 
}

function prevMedia() { 
  if (currentMediaIndex.value > 0) { 
    currentMediaIndex.value-- 
  } 
}

function nextMedia() { 
  if (currentMediaIndex.value < mediaUrls.value.length - 1) { 
    currentMediaIndex.value++ 
  } 
}

function navigateToTag(tag) {
  ionRouter.push({ path: '/tabs/home', query: { tag: tag } }, blackFadeAnimation)
}

function prevSlide() { 
  if (currentSlide.value > 0) { 
    currentSlide.value-- 
  } 
}

function nextSlide() { 
  if (currentSlide.value < mediaUrls.value.length - 1) { 
    currentSlide.value++ 
  } 
}

function handleCarouselTouchStart(e) { 
  touchStartX = e.touches[0].clientX 
}

function handleCarouselTouchMove(e) { 
  touchEndX = e.touches[0].clientX 
}

function handleCarouselTouchEnd() { 
  const swipeThreshold = 50; 
  const diff = touchStartX - touchEndX; 
  if (Math.abs(diff) > swipeThreshold) { 
    if (diff > 0) { 
      nextSlide() 
    } else { 
      prevSlide() 
    } 
  } 
  touchStartX = 0; 
  touchEndX = 0 
}

async function loadStats() { 
  const { count: likes } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', props.post.id); 
  likesCount.value = likes || 0; 
  if (authStore.user) { 
    const { data: userLike } = await supabase.from('likes').select('id').eq('post_id', props.post.id).eq('user_id', authStore.user.id).maybeSingle(); 
    isLiked.value = !!userLike 
  } 
  const { count: comments } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', props.post.id); 
  commentsCount.value = comments || 0; 
  const { count: views } = await supabase.from('post_views').select('*', { count: 'exact', head: true }).eq('post_id', props.post.id); 
  viewsCount.value = views || 0; 
  const { count: reposts } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('repost_of', props.post.id); 
  repostsCount.value = reposts || 0 
}

async function recordView() { 
  if (!authStore.user) return; 
  try { 
    await supabase.from('post_views').upsert({ post_id: props.post.id, user_id: authStore.user.id, viewed_at: new Date().toISOString() }, { onConflict: 'post_id,user_id', ignoreDuplicates: true }) 
  } catch (error) { 
    console.log('View already recorded') 
  } 
}

async function toggleLike() { 
  if (!authStore.user) { 
    ionRouter.push('/login', blackFadeAnimation); 
    return 
  } 
  if (isLiked.value) { 
    await supabase.from('likes').delete().eq('post_id', props.post.id).eq('user_id', authStore.user.id); 
    isLiked.value = false; 
    likesCount.value-- 
  } else { 
    await supabase.from('likes').insert({ post_id: props.post.id, user_id: authStore.user.id }); 
    isLiked.value = true; 
    likesCount.value++; 
    triggerHeartAnimation() 
  } 
}

function handleDoubleTap(e) { 
  const currentTime = new Date().getTime(); 
  const tapLength = currentTime - lastTap; 
  if (tapLength < 300 && tapLength > 0) { 
    if (!isLiked.value) { 
      toggleLike(); 
      createFloatingHeart(e.clientX, e.clientY) 
    } 
    e.preventDefault() 
  } 
  lastTap = currentTime 
}

function triggerHeartAnimation() { 
  showHeartAnimation.value = true; 
  setTimeout(() => { 
    showHeartAnimation.value = false 
  }, 1000) 
}

function createFloatingHeart(x, y) { 
  const heart = document.createElement('div'); 
  heart.innerHTML = `<svg viewBox="0 0 24 24" fill="#ef4444" width="60" height="60"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`; 
  heart.className = 'floating-heart'; 
  heart.style.cssText = `position: fixed; left: ${x}px; top: ${y}px; pointer-events: none; z-index: 9999; animation: floatUp 1s ease-out forwards;`; 
  document.body.appendChild(heart); 
  setTimeout(() => heart.remove(), 1000) 
}

function viewPost() { 
  ionRouter.push(`/post/${props.post.id}`, blackFadeAnimation)
}

function openRepostModal() { 
  if (!authStore.user) { 
    ionRouter.push('/login', blackFadeAnimation)
    return 
  } 
  isRepostModalOpen.value = true; 
  repostComment.value = '' 
}

function closeRepostModal() { 
  isRepostModalOpen.value = false; 
  repostComment.value = '' 
}

async function submitRepost() { 
  if (!authStore.user || !repostComment.value.trim()) return; 
  try { 
    const { data, error } = await supabase.from('posts').insert({ user_id: authStore.user.id, content: repostComment.value, repost_of: props.post.id, created_at: new Date().toISOString() }).select(); 
    if (error) throw error; 
    repostsCount.value++; 
    emit('repost', { originalPostId: props.post.id, newPostId: data[0].id }); 
    closeRepostModal(); 
    const toast = await toastController.create({ message: 'Reposted successfully!', duration: 2000, color: 'success' }); 
    await toast.present() 
  } catch (error) { 
    console.error('Repost error:', error); 
    const toast = await toastController.create({ message: 'Failed to repost', duration: 2000, color: 'danger' }); 
    await toast.present() 
  } 
}

function navigateToOriginal() {
  if (props.post.repost_of) {
    ionRouter.push(`/post/${props.post.repost_of}`, blackFadeAnimation)
  }
}

function openComments() { 
  ionRouter.push(`/post/${props.post.id}`, blackFadeAnimation)
}

function viewUserProfile() {
  const userId = props.post.user_id
  if (userId) {
    ionRouter.push(`/user/${userId}`, blackFadeAnimation)
  }
}

async function sharePost() { 
  const shareData = { title: `Post by ${props.post.users?.full_name}`, text: props.post.content || 'Check out this post!', url: `${window.location.origin}/post/${props.post.id}` }; 
  try { 
    await Share.share(shareData) 
  } catch (error) { 
    if (navigator.share) { 
      try { 
        await navigator.share(shareData) 
      } catch (err) { 
        console.log('Share cancelled') 
      } 
    } else { 
      await navigator.clipboard.writeText(shareData.url); 
      alert('Link copied to clipboard!') 
    } 
  } 
}

function getInitials(name) { 
  if (!name) return 'U'; 
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2) 
}

function formatCount(count) { 
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M'; 
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K'; 
  return count 
}
</script>

<style scoped>
.post-card{background:var(--background);border-bottom:1px solid var(--border-color);cursor:pointer;position:relative;transition:background .15s}
body.light .post-card{background:#fff;border-bottom:1px solid #eff1f3}
.post-card:hover{background:var(--card-hover)}
body.light .post-card:hover{background:#f7f9fa}
.post-header{display:flex;flex-direction:column;padding:12px 12px 0;gap:0;position:relative;}
.avatar-row{display:flex;gap:8px;align-items:flex-start;margin-left: 8px;}
.avatar{width:36px;height:36px;flex-shrink:0;border-radius:50%;overflow:hidden;cursor:pointer}
.avatar-placeholder{width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.9rem}
.more-btn{position:absolute;top:12px;right:8px;--padding-start:8px;--padding-end:8px;--color:var(--text-secondary)}
.user-info-wrapper{flex:1;min-width:0;overflow:hidden;padding-right:32px}
.user-name-row{display:flex;align-items:baseline;gap:4px;margin-bottom:2px;position:relative}
.user-name{color:var(--text-primary);font-size:15px;font-weight:700;line-height:20px;white-space:nowrap;flex-shrink:0}
body.light .user-name{color:#0f1419}
.user-meta-row{display:flex;align-items:center}
.user-meta{color:var(--text-secondary);font-size:13px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.light .user-meta{color:#536471}
.post-age{color:var(--text-secondary);font-size:15px;font-weight:400;white-space:nowrap}
body.light .post-age{color:#536471}

.post-content-inline,.repost-comment-inline{margin-top:10px;width:100%;max-width:100%;margin-left: 10px;}
.markdown-content{ color:#e7e9ea;font-size:14px;line-height:20px;word-wrap:break-word;overflow-wrap:break-word;white-space:pre-wrap;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;width:100%;max-width:100%}
body.light .markdown-content{color:#0f1419}
.post-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}

.tag-item{background:rgba(29,155,240,.1);color:#1d9bf0;font-size:14px;font-weight:400;padding:4px 9px;border-radius:20px;cursor:pointer;border:1px solid rgba(29,155,240,.2);transition:all .2s ease}
body.light .tag-item{background:rgba(29,155,240,.08);border-color:rgba(29,155,240,.15)}
.tag-item:hover{background:rgba(29,155,240,.2);border-color:rgba(29,155,240,.4);transform:translateY(-1px)}
body.light .tag-item:hover{background:rgba(29,155,240,.15);border-color:rgba(29,155,240,.3)}
.tag-item:active{transform:translateY(0)}


.media-section{margin:8px 0 12px 0;border:1px solid var(--border-color);border-radius:16px;overflow:hidden;background:var(--media-background);box-shadow:0 2px 8px rgba(0,0,0,.08);transition:all .2s cubic-bezier(.4,0,.2,1)}
body.light .media-section{background:#f7f9fa;box-shadow:0 1px 3px rgba(0,0,0,.04);border:1px solid #eff1f3}
.single-media{height:auto;position:relative;width:100%;background:var(--media-background);display:flex;max-height:300px;align-items:center;justify-content:center;padding:0;margin:0}
body.light .single-media{background:#f7f9fa}
.single-media img{object-fit:contain;width:100%;height:auto;max-height:300px;display:block;margin:0;padding:0;vertical-align:top}
.video-container{position:relative;cursor:pointer}
.video-container video{width:100%;height:auto;max-height:300px;object-fit:contain}
.video-loading-shimmer{position:absolute;inset:0;background:linear-gradient(90deg,#1a1a1a 0%,#2a2a2a 50%,#1a1a1a 100%);background-size:200% 100%;animation:shimmer 1.5s infinite;display:flex;align-items:center;justify-content:center;z-index:1}
.video-loading-shimmer .shimmer-content{display:flex;flex-direction:column;align-items:center;gap:12px;color:var(--text-secondary)}
.video-loading-shimmer ion-icon{font-size:48px}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.video-progress-bar{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,.2);pointer-events:all;cursor:pointer;z-index:2}
.video-progress-fill{height:100%;background:#1d9bf0;width:var(--progress);transition:width .1s linear;pointer-events:none}
.video-paused-indicator{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none}
.pause-icon-persistent{width:64px;height:64px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);border-radius:50%}
.pause-icon-persistent ion-icon{font-size:32px;color:#fff}
.play-pause-overlay{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);animation:fadeOut .8s forwards;pointer-events:none}
@keyframes fadeOut{0%{opacity:1}60%{opacity:1}100%{opacity:0}}
.play-pause-button{width:80px;height:80px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);border-radius:50%}
.play-pause-button ion-icon{font-size:48px;color:#fff}


.media-carousel{position:relative;width:100%;background:var(--media-background);overflow:hidden;display:flex;flex-direction:column}
body.light .media-carousel{background:#f7f9fa}
.carousel-container{position:relative;width:100%;overflow:hidden;height:300px}
.carousel-track{display:flex;transition:transform .3s ease-out;height:100%;width:100%}
.carousel-slide{width:100%;height:100%;flex-shrink:0;flex-grow:0;display:flex;align-items:center;justify-content:center;background:var(--media-background)}
body.light .carousel-slide{background:#f7f9fa}
.carousel-slide img{width:100%;height:100%;display:block;object-fit:contain;object-position:center}
.carousel-video{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center}
.carousel-video video{width:100%;height:100%;display:block;object-fit:contain}
.carousel-video .video-play-icon{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3)}
.carousel-video .video-play-icon ion-icon{font-size:64px;color:#fff}
.carousel-indicators{display:flex;justify-content:center;gap:4px;padding:8px 0}
.carousel-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.4);transition:all .3s}
.carousel-dot.active{background:#1d9bf0;width:18px;border-radius:3px}
.post-meta-bottom{display:flex;align-items:center;gap:4px;padding:16px 0 0 10px;margin-left:0}
.meta-time{color:var(--text-primary);font-size:14px;font-weight:400}
body.light .meta-time{color:#536471}
.meta-date{color:var(--text-secondary);font-size:14px;font-weight:400}
body.light .meta-date{color:#0f1419}
.meta-separator{color:var(--text-secondary);font-size:14px;font-weight:400}
body.light .meta-separator{color:#536471}
.meta-number{color:var(--text-primary);font-size:14px;font-weight:600}
body.light .meta-number{color:#0f1419}
.meta-label{color:var(--text-secondary);font-size:14px;font-weight:400}
body.light .meta-label{color:#536471}

.actions-bar{display:flex;align-items:center;justify-content:space-between;padding:0 0 6px;margin-top:1px;padding-top:6px;max-width:100%}
body.light .actions-bar{border-top-color:#eff1f3}

.action-btn{--padding-start:0;--padding-end:0;min-width:unset;height:34px;margin:0;font-size:14px;font-weight:400;--color:#71767b;flex:1;justify-content:center}
body.light .action-btn{--color:#536471}

.action-btn:nth-child(1) ion-icon{font-size:20px;transition:color .2s}
.action-btn:nth-child(1):hover{--color:#f91880}
.action-btn:nth-child(1):hover ion-icon{color:#f91880}
.action-btn ion-icon.liked{color:#f91880!important}

.action-btn:nth-child(2) ion-icon{font-size:18px;transition:color .2s}
.action-btn:nth-child(2):hover{--color:#1d9bf0}
.action-btn:nth-child(2):hover ion-icon{color:#1d9bf0}

.action-btn:nth-child(3) ion-icon{font-size:22px;transition:color .2s}
.action-btn:nth-child(3):hover{--color:#00ba7c}
.action-btn:nth-child(3):hover ion-icon{color:#00ba7c}

.action-btn:nth-child(4) ion-icon{font-size:18px;transition:color .2s}
.action-btn:nth-child(4):hover{--color:#f59e0b}
.action-btn:nth-child(4):hover ion-icon{color:#f59e0b}

.action-btn:nth-child(5) ion-icon{font-size:18px;transition:color .2s}
.action-btn:nth-child(5):hover{--color:#1d9bf0}
.action-btn:nth-child(5):hover ion-icon{color:#1d9bf0}
.action-btn ion-icon.bookmarked{color:#1d9bf0!important}

.action-btn span{margin-left:8px;font-size:13px}


.heart-animation-container{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:100}
.heart-burst{font-size:100px;color:#f91880;animation:heartBurst .6s ease-out forwards}
@keyframes heartBurst{0%{opacity:0;transform:scale(.5)}50%{opacity:1;transform:scale(1.1)}100%{opacity:0;transform:scale(1.3)}}

.quoted-post{margin:12px 0 0 10px;border:1px solid var(--border-color);border-radius:16px;padding:10px;cursor:pointer;transition:background .2s}
body.light .quoted-post{border:1px solid #cfd9de;background:#f7f9fa}
.quoted-post:hover{background:var(--card-hover)}
body.light .quoted-post:hover{background:#f0f2f5}
.quoted-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.quoted-avatar{width:20px;height:20px;min-width:20px}
.quoted-user-info{display:flex;align-items:center;gap:4px;flex:1;flex-wrap:nowrap;min-width:0}
.quoted-user-name{color:var(--text-primary);font-weight:700;font-size:14px;white-space:nowrap;flex-shrink:0}
body.light .quoted-user-name{color:#0f1419}
.quoted-meta{color:var(--text-secondary);font-size:14px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
body.light .quoted-meta{color:#536471}
.quoted-timestamp{color:var(--text-secondary);font-size:14px;white-space:nowrap;flex-shrink:0;margin-left:auto}
body.light .quoted-timestamp{color:#536471}
.quoted-content{color:var(--text-primary);font-size:15px;line-height:20px;margin-top:4px;margin-left:0}
body.light .quoted-content{color:#0f1419}
.quoted-media{margin-top:12px;border-radius:12px;overflow:hidden;max-height:200px;border:1px solid var(--border-color)}
body.light .quoted-media{border-color:#cfd9de}
.quoted-media img{width:100%;height:100%;object-fit:cover}
.quoted-video-thumb{position:relative;width:100%;height:200px;background:#000;display:flex;align-items:center;justify-content:center}
.quoted-video-thumb video{width:100%;height:100%;object-fit:cover}
.quoted-video-thumb .video-play-icon{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3)}
.quoted-video-thumb .video-play-icon ion-icon{font-size:48px;color:#fff}
.quoted-media-count{position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.8);color:#fff;padding:4px 8px;border-radius:12px;font-size:.75rem;font-weight:600}

/* Media Modal */
.media-modal{--background:var(--modal-background)}
body.light .media-modal{--background:#fff}
.modal-content{position:relative;width:100%;height:100%;background:var(--modal-background)}
body.light .modal-content{background:#fff}
.modal-header{position:absolute;top:0;left:0;right:0;padding:16px;z-index:10}
.modal-header ion-button{--color:var(--modal-text)}
body.light .modal-header ion-button{--color:#000}
.modal-media{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
.modal-media img,.modal-media video{max-width:100%;max-height:100%;object-fit:contain}
.modal-nav{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 16px;pointer-events:none}
.nav-btn{--background:rgba(0,0,0,.6);--color:#fff;pointer-events:all;width:48px;height:48px;border-radius:50%}
body.light .nav-btn{--background:rgba(255,255,255,.8);--color:#000}
.modal-indicators{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);display:flex;gap:8px}
.indicator{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.4);transition:all .2s}
.indicator.active{background:#fff;width:24px;border-radius:4px}
body.light .indicator{background:rgba(0,0,0,.4)}
body.light .indicator.active{background:#000}

/* Repost Modal */
.repost-modal{--width:100%;--height:100%;--border-radius:16px 16px 0 0;--max-width:600px}
.repost-modal::part(backdrop){background:rgba(0,0,0,.75)!important;backdrop-filter:blur(4px)}
body.light .repost-modal::part(backdrop){background:rgba(0,0,0,.6)!important}
.repost-modal::part(content){background:#000!important;border-radius:16px 16px 0 0;overflow:hidden;display:flex;flex-direction:column}
body.light .repost-modal::part(content){background:#fff!important}
.repost-modal ion-header{background:#000!important;border-bottom:1px solid #333;box-shadow:none;flex-shrink:0}
body.light .repost-modal ion-header{background:#fff!important;border-bottom:1px solid #eff1f3}
.repost-modal ion-toolbar{--background:#000!important;--color:#fff!important;--border-color:#333;padding:0 16px;--min-height:56px;display:flex;align-items:center}
body.light .repost-modal ion-toolbar{--background:#fff!important;--color:#000!important;--border-color:#eff1f3}
.repost-modal ion-title{color:#a855f7!important;font-weight:700!important;font-size:1.1rem!important;padding:0}
.repost-modal ion-buttons{height:100%;margin:0}
.repost-modal ion-buttons ion-button{--color:#fff!important;font-weight:600;font-size:.95rem;margin:0;text-transform:uppercase;letter-spacing:.5px}
body.light .repost-modal ion-buttons ion-button{--color:#000!important}
.repost-toolbar{--background:#0f0f0f;border-bottom:1px solid var(--background-secondary);--border-width:0;padding:8px 12px}
.repost-btn{background:#464242;color:#fff;height:35px;padding:0 15px;border-radius:9999px;font-weight:600;display:inline-flex;align-items:center;justify-content:center}
.cancel-btn{--color:#e5e7eb;font-weight:500;font-size:15px;--border-radius:9999px;height:40px;padding:0 18px}
.repost-content{--background:#000!important;--color:#fff!important;padding:20px 16px 100px 16px;overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch}
body.light .repost-content{--background:#fff!important;--color:#000!important}
.repost-input-area{margin-bottom:20px}
.repost-textarea{width:100%;background:#0a0a0a!important;border:2px solid #2a2a2a!important;padding:16px;color:#fff!important;font-size:1rem;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;resize:vertical;min-height:120px;max-height:200px;outline:none;transition:all .25s ease;line-height:1.5}
.repost-textarea::placeholder{color:#666!important;font-weight:400}
body.light .repost-textarea{background:#f7f9fa!important;border-color:#eff1f3!important;color:#000!important}
.repost-textarea:focus{border-color:#a855f7!important;background:#0f0f0f!important;box-shadow:0 0 0 3px rgba(168,85,247,.15)}
body.light .repost-textarea:focus{border-color:#a855f7!important;background:#fff!important;box-shadow:0 0 0 3px rgba(168,85,247,.15)}
body.light .repost-textarea::placeholder{color:#536471!important}
.original-post-preview{background:#0a0a0a!important;border:1px solid #2a2a2a!important;border-radius:16px;padding:16px;box-shadow:0 4px 12px rgba(0,0,0,.3);transition:all .2s ease}
body.light .original-post-preview{background:#f7f9fa!important;border-color:#eff1f3!important;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.preview-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.avatar-small{width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0}
.avatar-small img{width:100%;height:100%;object-fit:cover}
.avatar-small .avatar-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#a855f7 0%,#7c3aed 100%);color:#fff;font-weight:700;font-size:.95rem;border-radius:50%}
.preview-user-info{flex:1;min-width:0}
.preview-user-name{color:#fff!important;font-weight:700;font-size:1rem;margin-bottom:4px;line-height:1.2}
body.light .preview-user-name{color:#0f1419!important}
.preview-timestamp{color:#888!important;font-size:.85rem}
body.light .preview-timestamp{color:#536471!important}
.preview-content{color:#e0e0e0!important;font-size:.95rem;line-height:1.5;word-wrap:break-word;overflow-wrap:break-word;margin-top:8px}
body.light .preview-content{color:#0f1419!important}
.preview-media{margin-top:12px;border-radius:12px;overflow:hidden;max-height:240px;border:1px solid #2a2a2a;background:#000}
body.light .preview-media{border-color:#eff1f3;background:#f7f9fa}
.preview-media img{width:100%;height:100%;object-fit:cover;display:block}
.video-preview-thumb{width:100%;height:200px;background:#000;display:flex;align-items:center;justify-content:center;position:relative}
.video-preview-thumb ion-icon{font-size:56px;color:rgba(255,255,255,.9);filter:drop-shadow(0 2px 8px rgba(0,0,0,.5))}
.repost-modal ion-footer{background:#000!important;border-top:1px solid #2a2a2a!important;padding:0;box-shadow:0 -4px 12px rgba(0,0,0,.3);position:sticky;bottom:0;z-index:100}
body.light .repost-modal ion-footer{background:#fff!important;border-top:1px solid #eff1f3!important;box-shadow:0 -2px 8px rgba(0,0,0,.04)}
.repost-modal ion-footer ion-toolbar{--background:#000!important;padding:16px;--min-height:auto;border:none}
body.light .repost-modal ion-footer ion-toolbar{--background:#fff!important}
.repost-modal ion-footer ion-button{background:#1d4ed8!important;color:#fff!important;margin:0;width:100%;height:48px;font-weight:700;border-radius:24px;font-size:1rem;text-transform:uppercase;letter-spacing:.8px;transition:all .2s cubic-bezier(.4,0,.2,1);box-shadow:0 4px 12px rgba(29,78,216,.35);border:none;cursor:pointer}
.repost-modal ion-footer ion-button:not([disabled]):hover{background:#1e40af!important;transform:translateY(-2px);box-shadow:0 6px 20px rgba(29,78,216,.5)}
.repost-modal ion-footer ion-button:not([disabled]):active{transform:translateY(0);box-shadow:0 3px 10px rgba(29,78,216,.4)}
.repost-modal ion-footer ion-button[disabled]{background:#1a1a1a!important;color:#555!important;opacity:.5;cursor:not-allowed;box-shadow:none}
body.light .repost-modal ion-footer ion-button[disabled]{background:#e8e8e8!important;color:#999!important}

/* Markdown Content Styling */
.markdown-content strong{font-weight:700}
.markdown-content em{font-style:italic}
.markdown-content code{background:var(--code-background);border:1px solid var(--border-color);border-radius:4px;padding:2px 6px;font-family:'Courier New',monospace;font-size:.9em;color:#1d9bf0}
body.light .markdown-content code{background:#f0f2f5;border-color:#eff1f3}
.markdown-content .mention{color:#1d9bf0;font-weight:400;cursor:pointer}
.markdown-content .mention:hover{text-decoration:underline}
.zoomable-image{touch-action:none;user-select:none;transition:transform .1s ease-out;max-width:100%;max-height:100%;object-fit:contain}
</style>