<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <ion-icon :icon="arrowBack"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button @click="openOptions">
            <ion-icon :icon="ellipsisVertical"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
      </div>

      <div v-else-if="userProfile" class="profile-container">
        <!-- Header Banner -->
        <div class="header-banner" :style="{ background: headerGradient }"></div>

        <!-- Profile Info Section -->
        <div class="profile-info-section">
          <div class="avatar-row">
            <div class="avatar-container">
              <ion-avatar class="main-avatar">
                <img 
                  v-if="userProfile.profile_photo_url" 
                  :src="getOptimizedImageUrl(userProfile.profile_photo_url)"
                  :alt="userProfile.full_name"
                />
                <div v-else class="avatar-placeholder">
                  {{ getInitials(userProfile.full_name) }}
                </div>
              </ion-avatar>
              <div class="status-dot" :class="{ online: isOnline }"></div>
            </div>

            <div v-if="isOwnProfile" class="profile-actions">
              <button class="btn-edit-profile" @click="() => router.push('/edit-profile')">
                Edit profile
              </button>
            </div>
            <div v-else class="profile-actions">
              <button class="btn-message" @click="openChat">
                <ion-icon :icon="chatbubble"></ion-icon>
              </button>
              <button 
                class="btn-follow" 
                @click="toggleFollow"
                :class="{ following: isFollowing }"
              >
                {{ isFollowing ? 'Following' : 'Follow' }}
              </button>
            </div>
          </div>

          <div class="user-details">
            <h1 class="user-name">
              {{ userProfile.full_name }}
              <ion-icon 
                v-if="userProfile.verified" 
                :icon="checkmarkCircle" 
                class="verified-badge"
              ></ion-icon>
            </h1>
            
            <div v-if="userInterests.length > 0" class="interests" style="margin-top: 15px;color: aqua;">
              <span v-for="interest in userInterests" :key="interest.id" class="interest-tag">
                {{ interest.name }}
              </span>
            </div>

            <p v-if="userProfile.bio" class="bio">{{ userProfile.bio }}</p>

            <div class="meta-row">
              <div class="meta-item">
                <ion-icon :icon="location"></ion-icon>
                <span>{{ userProfile.college_hospital }}</span>
              </div>
              <div class="meta-item">
                <ion-icon :icon="calendar"></ion-icon>
                <span>Joined {{ formatJoinDate(userProfile.created_at) }}</span>
              </div>
              <div v-if="userProfile.website" class="meta-item">
                <ion-icon :icon="school"></ion-icon>
                <a :href="userProfile.website" target="_blank">{{ userProfile.website }}</a>
              </div>
            </div>

            <!-- Updated follow stats with click handlers -->
            <div class="follow-stats">
              <span class="stat-item" @click="openFollowersModal('following')">
                <strong>{{ formatCount(stats.following) }}</strong> Following
              </span>
              <span class="stat-item" @click="openFollowersModal('followers')">
                <strong>{{ formatCount(stats.followers) }}</strong> Followers
              </span>
            </div>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="tab-navigation">
          <div 
            class="tab-item" 
            :class="{ active: currentTab === 'posts' }"
            @click="currentTab = 'posts'"
          >
            Posts
          </div>
          <div 
            class="tab-item" 
            :class="{ active: currentTab === 'media' }"
            @click="currentTab = 'media'"
          >
            Media
          </div>
          <div 
            class="tab-item" 
            :class="{ active: currentTab === 'comments' }"
            @click="currentTab = 'comments'"
          >
            Recents
          </div>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Posts Tab -->
          <div v-show="currentTab === 'posts'" class="posts-section">
            <div v-if="userPosts.length === 0" class="empty-state">
              <ion-icon :icon="documentText"></ion-icon>
              <p>No posts yet</p>
            </div>
            <div v-else class="posts-list">
              <post-card 
                v-for="post in userPosts" 
                :key="post.id" 
                :post="post"
                @delete="handlePostDelete"
              />
            </div>
          </div>

          <!-- Media Tab -->
          <div v-show="currentTab === 'media'" class="media-section">
            <div v-if="mediaPosts.length === 0" class="empty-state">
              <ion-icon :icon="grid"></ion-icon>
              <p>No media yet</p>
            </div>
            <div v-else class="media-grid">
              <div 
                v-for="post in mediaPosts" 
                :key="post.id"
                class="media-item"
                @click="openPost(post)"
              >
                <img 
                  v-if="post.media_type && post.media_type[0] === 'image'"
                  :src="getOptimizedImageUrl(post.media_urls[0])" 
                  :alt="post.content"
                  loading="lazy"
                />
                <video 
                  v-else-if="post.media_type && post.media_type[0] === 'video'"
                  :src="post.media_urls[0]"
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  loading="lazy"
                  @mouseenter="e => e.target.play()"
                  @mouseleave="e => e.target.pause()"
                  @click.stop="openPost(post)"
                ></video>
                <img 
                  v-else
                  :src="getOptimizedImageUrl(post.media_urls[0])" 
                  :alt="post.content"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          <!-- Comments Tab -->
          <div v-show="currentTab === 'comments'" class="comments-section">
            <div v-if="userComments.length === 0" class="empty-state">
              <ion-icon :icon="chatbubble"></ion-icon>
              <p>No comments yet</p>
            </div>
            <div v-else class="comments-list">
              <div 
                v-for="comment in userComments" 
                :key="comment.id"
                class="comment-card"
                @click="openPost({ id: comment.post_id })"
              >
                <!-- Post Context Header -->
                <div v-if="comment.posts" class="post-context">
                  <div class="context-icon">
                   <ion-icon :icon="chatboxOutline"></ion-icon>
                  </div>
                  <div class="context-content">
                    <div class="context-post-title">{{ truncateText(comment.posts.content, 100) }}</div>
                    <div class="context-meta">
                      <span>Posted by</span>
                      <strong>{{ comment.posts.users?.full_name }}</strong>
                      <span>•</span>
                      <span>{{ formatCommentTime(comment.posts.created_at) }}</span>
                    </div>
                  </div>
                  <div 
                    v-if="comment.posts.media_urls && comment.posts.media_urls.length > 0"
                    class="context-thumbnail"
                  >
                    <img 
                      v-if="comment.posts.media_type && comment.posts.media_type[0] === 'image'"
                      :src="getOptimizedImageUrl(comment.posts.media_urls[0])" 
                      alt="Post media"
                    />
                  </div>
                </div>

                <!-- User's Comment -->
                <div class="comment-reply-section">
                  <div class="reply-indicator-line"></div>
                  <ion-avatar class="comment-avatar">
                    <img v-if="userProfile.profile_photo_url" :src="userProfile.profile_photo_url" />
                    <div v-else class="avatar-placeholder">{{ getInitials(userProfile.full_name) }}</div>
                  </ion-avatar>
                  <div class="comment-body">
                    <div class="comment-header">
                      <strong class="comment-author">{{ userProfile.full_name }}</strong>
                      <span class="comment-label">commented</span>
                      <span class="comment-time">{{ formatCommentTime(comment.created_at) }}</span>
                      <span v-if="comment.parent_comment_id" class="reply-tag">
                        <ion-icon :icon="arrowUndo"></ion-icon>
                        reply
                      </span>
                    </div>
                    <div class="comment-text">{{ comment.content }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>

    <!-- Followers/Following Modal -->
    <followers-modal
      :is-open="showFollowersModal"
      :user-id="userId"
      :initial-tab="followModalTab"
      @close="closeFollowersModal"
    />
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import PostCard from '@/components/PostCard.vue'
import FollowersModal from '@/components/FollowersModal.vue'
import {
  IonPage, IonHeader, IonToolbar, IonContent, IonButtons, IonButton,
  IonIcon, IonAvatar, IonSpinner,
  actionSheetController, toastController, alertController
} from '@ionic/vue'
import {
  arrowBack, ellipsisVertical, calendar, location, school, checkmarkCircle,
  documentText, people, grid, chatbubble, arrowUndo, chatbubbleOutline, chatboxOutline
} from 'ionicons/icons'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const userId = ref(route.params.id)
const loading = ref(true)
const userProfile = ref(null)
const userPosts = ref([])
const isFollowing = ref(false)
const isOnline = ref(false)
const currentTab = ref('posts')

const stats = ref({
  posts: 0,
  followers: 0,
  following: 0
})

const userComments = ref([])
const userInterests = ref([])
const headerGradient = ref('')
const commentsLoaded = ref(false)

// Modal state
const showFollowersModal = ref(false)
const followModalTab = ref('followers')

const isOwnProfile = computed(() => authStore.user?.id === userId.value)

// Computed property for media posts
const mediaPosts = computed(() => {
  return userPosts.value.filter(p => 
    p.media_urls && 
    Array.isArray(p.media_urls) && 
    p.media_urls.length > 0
  )
})

onMounted(async () => {
  generateRandomGradient()
  await loadUserProfile()
})

// Watch for tab changes to lazy load comments
watch(currentTab, async (newTab) => {
  if (newTab === 'comments' && !commentsLoaded.value) {
    await loadUserComments()
    commentsLoaded.value = true
  }
})

function generateRandomGradient() {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #8ec5fc 0%, #e0c3fc 100%)',
    'linear-gradient(135deg, #74ebd5 0%, #9face6 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #f77062 0%, #fe5196 100%)',
    'linear-gradient(135deg, #d66efd 0%, #ff8cc6 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)',
    'linear-gradient(135deg, #a1ffce 0%, #faffd1 100%)',
    'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    'linear-gradient(135deg, #56ab2f 0%, #f9d423 100%)',
    'linear-gradient(135deg, #9be15d 0%, #f9f586 100%)',
    'linear-gradient(135deg, #c2e59c 0%, #64b3f4 100%)',
    'linear-gradient(135deg, #dce35b 0%, #45b649 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
    'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
    'linear-gradient(135deg, #ff512f 0%, #dd2476 100%)',
    'linear-gradient(135deg, #f85032 0%, #e73827 100%)',
    'linear-gradient(135deg, #2ecc71 0%, #f1c40f 50%, #e74c3c 100%)',
    'linear-gradient(135deg, #00b09b 0%, #f9d423 50%, #ff416c 100%)',
    'linear-gradient(135deg, #7ed56f 0%, #f7d046 50%, #ff4b2b 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
  ]
  
  headerGradient.value = gradients[Math.floor(Math.random() * gradients.length)]
}

async function loadUserProfile() {
  loading.value = true
  try {
    // Load all essential data in parallel
    const [profileResult, postsResult, followersResult, followingResult, interestsResult, followStatusResult] = await Promise.all([
      // User profile - only select needed fields
      supabase
        .from('users')
        .select('id, full_name, bio, profile_photo_url, college_hospital, website, created_at, verified')
        .eq('id', userId.value)
        .single(),
      
      // User posts - reduced initial limit
      supabase
        .from('posts')
        .select('id, content, media_urls, media_type, created_at, user_id, repost_of, users!inner(full_name, college_hospital, profile_photo_url)')
        .eq('user_id', userId.value)
        .order('created_at', { ascending: false })
        .limit(10),
      
      // Followers count
      supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId.value),
      
      // Following count
      supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', userId.value),
      
      // User interests - limit to 3
      supabase
        .from('user_interests')
        .select('interest_id, interests!inner(id, name)')
        .eq('user_id', userId.value)
        .limit(3),
      
      // Follow status (only if not own profile and user is logged in)
      (!isOwnProfile.value && authStore.user) 
        ? supabase
            .from('follows')
            .select('id')
            .eq('follower_id', authStore.user.id)
            .eq('following_id', userId.value)
            .maybeSingle()
        : Promise.resolve({ data: null })
    ])

    // Handle errors
    if (profileResult.error) throw profileResult.error

    // Set user profile
    userProfile.value = profileResult.data

    // Set posts
    if (!postsResult.error && postsResult.data) {
      userPosts.value = postsResult.data
      stats.value.posts = postsResult.data.length
    }

    // Set stats
    stats.value.followers = followersResult.count || 0
    stats.value.following = followingResult.count || 0

    // Set interests
    userInterests.value = interestsResult.data?.map(ui => ui.interests) || []

    // Set follow status
    isFollowing.value = !!followStatusResult.data

    // Random online status
    isOnline.value = Math.random() > 0.5

  } catch (error) {
    console.error('Error loading profile:', error)
    const toast = await toastController.create({
      message: 'Failed to load profile',
      duration: 2000,
      color: 'danger'
    })
    await toast.present()
  } finally {
    loading.value = false
  }
}

async function loadUserComments() {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      created_at,
      parent_comment_id,
      user_id,
      post_id,
      posts!inner (
        id,
        content,
        media_urls,
        media_type,
        created_at,
        users!inner (
          id,
          full_name,
          college_hospital,
          profile_photo_url
        )
      )
    `)
    .eq('user_id', userId.value)
    .order('created_at', { ascending: false })
    .limit(20)
  
  if (!error) {
    userComments.value = data || []
  }
}

function openChat() {
  router.push(`/chat/${userId.value}`)
}

function openFollowersModal(tab = 'followers') {
  followModalTab.value = tab
  showFollowersModal.value = true
}

function closeFollowersModal() {
  showFollowersModal.value = false
}

async function toggleFollow() {
  if (!authStore.user) return router.push('/login')
  
  try {
    if (isFollowing.value) {
      await supabase.from('follows').delete()
        .eq('follower_id', authStore.user.id)
        .eq('following_id', userId.value)
      isFollowing.value = false
      stats.value.followers--
    } else {
      await supabase.from('follows').insert({
        follower_id: authStore.user.id,
        following_id: userId.value
      })
      isFollowing.value = true
      stats.value.followers++
    }
  } catch (error) {
    console.error('Follow error:', error)
  }
}

async function openOptions() {
  const buttons = isOwnProfile.value ? [
    {
      text: 'Edit Profile',
      handler: () => router.push('/edit-profile')
    }
  ] : []

  buttons.push(
    { text: 'Share Profile', handler: () => {} },
    { text: 'Report', role: 'destructive', handler: () => {} },
    { text: 'Cancel', role: 'cancel' }
  )

  const actionSheet = await actionSheetController.create({
    header: 'Options',
    buttons
  })
  await actionSheet.present()
}

function goBack() {
  router.back()
}

function openPost(post) {
  router.push(`/post/${post.id}`)
}

function openUserProfile(id) {
  router.push(`/user/${id}`)
}

function getOptimizedImageUrl(url) {
  return url ? `${url}?width=400&quality=85&format=auto` : ''
}

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'
}

function formatJoinDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })
}

function formatCommentTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } else if (days > 0) {
    return `${days}d ago`
  } else if (hours > 0) {
    return `${hours}h ago`
  } else if (minutes > 0) {
    return `${minutes}m ago`
  } else {
    return 'Just now'
  }
}

function formatCount(count) {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
  return count
}

function truncateText(text, maxLength) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function handlePostDelete(postId) {
  userPosts.value = userPosts.value.filter(p => p.id !== postId)
  stats.value.posts--
}
</script>

<style scoped>
  .follow-stats {
  display: flex;
  gap: 20px;
  margin-top: 12px;
}

.stat-item {
  cursor: pointer;
  transition: opacity 0.2s;
  font-size: 14px;
  color: var(--ion-color-step-600);
}

.stat-item:hover {
  opacity: 0.7;
}

.stat-item strong {
  color: var(--ion-text-color);
  font-weight: 600;
}
  .verified-badge {
  display: inline-block;
  font-size: 20px;
  color: #1d9bf0;
  margin-left: 4px;
  vertical-align: middle;
}

/* Comments Section */
.comments-section{padding:0;background:var(--background)}
.comments-list{display:flex;flex-direction:column;gap:0}
.comment-card{padding:0;border-bottom:8px solid var(--background-secondary);background:var(--card-background);cursor:pointer;transition:background 0.15s}
.comment-card:hover{background:var(--card-hover)}

/* Post Context - Shows the original post */
.post-context{display:flex;gap:12px;padding:16px;background:var(--input-background);border-left:3px solid var(--text-secondary)}
.context-icon{flex-shrink:0;width:20px;height:20px;display:flex;align-items:center;justify-content:center;color:var(--text-secondary)}
.context-icon ion-icon{font-size:1.1rem}
.context-content{flex:1;min-width:0}
.context-post-title{font-size:0.95rem;line-height:1.5;color:var(--text-primary);margin-bottom:6px;font-weight:500}
.context-meta{display:flex;align-items:center;gap:6px;font-size:0.8rem;color:var(--text-secondary);flex-wrap:wrap}
.context-meta strong{color:var(--text-primary);font-weight:600}
.context-thumbnail{width:70px;height:70px;flex-shrink:0;border-radius:8px;overflow:hidden;background:var(--media-background);border:1px solid var(--border-color)}
.context-thumbnail img{width:100%;height:100%;object-fit:cover;display:block}

/* Comment Reply Section - Shows user's comment */
.comment-reply-section{display:flex;gap:12px;padding:16px;position:relative}
.reply-indicator-line{position:absolute;left:26px;top:0;bottom:0;width:2px;background:var(--border-color)}
.comment-avatar{width:32px;height:32px;flex-shrink:0;position:relative;z-index:1;border:2px solid var(--card-background)}
.comment-body{flex:1;min-width:0;position:relative;z-index:1}
.comment-header{display:flex;align-items:center;gap:6px;margin-bottom:8px;font-size:0.85rem;flex-wrap:wrap}
.comment-author{color:var(--text-primary);font-weight:600;font-size:0.9rem}
.comment-label{color:var(--text-secondary);font-weight:400}
.comment-time{color:var(--text-secondary)}
.reply-tag{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:var(--background-secondary);border-radius:10px;color:var(--text-secondary);font-size:0.75rem;margin-left:4px}
.reply-tag ion-icon{font-size:0.8rem}
.comment-text{font-size:0.95rem;line-height:1.6;color:var(--text-primary);word-wrap:break-word;white-space:pre-wrap}
/* Loading State */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.profile-container {
  padding-bottom: 20px;
}

/* Header Banner */
.header-banner {
  width: 100%;
  height: 100px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Profile Info Section */
.profile-info-section {
  padding: 0 16px;
  position: relative;
  margin-top: -40px;
}

.avatar-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 12px;
}

.avatar-container {
  position: relative;
  flex-shrink: 0;
}

.main-avatar {
  width: 120px;
  height: 120px;
  border: 4px solid var(--background);
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 42px;
  font-weight: 700;
}

.status-dot {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 16px;
  height: 16px;
  background: #666;
  border: 3px solid var(--background);
  border-radius: 50%;
}

.status-dot.online {
  background: #10dc60;
}

/* Buttons */
.profile-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-message {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-message:hover {
  background: var(--card-hover);
}

.btn-edit-profile,
.btn-follow {
  height: 36px;
  padding: 0 20px;
  border-radius: 18px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
}

.btn-follow {
  background: white;
  color: black;
  border: none;
}

.btn-follow.following {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-edit-profile:hover,
.btn-follow:hover,
.btn-message:hover {
  opacity: 0.9;
}

/* User Details */
.user-details {
  margin-top: 4px;
}

.user-name {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
}

.username {
  font-size: 15px;
  color: var(--text-secondary);
  display: block;
  margin-top: 2px;
}
.interests {
  display: flex;
  flex-wrap: wrap;
  gap: 6px; /* space between bubbles */
  margin-top: 15px;
}

.interest-tag {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 400;
  color :#1d9bf0;
 background:rgba(29,155,240,.1); /* soft aqua */
  border-radius: 999px; /* fully round */
  white-space: nowrap;
  border:1px solid rgba(29,155,240,.2);
}

.bio {
  margin: 12px 0 0 0;
  font-size: 15px;
  color: var(--text-primary);
  line-height: 1.5;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  color: var(--text-secondary);
}

.meta-item ion-icon {
  font-size: 18px;
}

.meta-item a {
  color: #1d9bf0;
  text-decoration: none;
}

.follow-stats {
  display: flex;
  gap: 20px;
  margin-top: 12px;
}

.stat-link {
  font-size: 15px;
  color: var(--text-secondary);
  cursor: pointer;
}

.stat-link:hover {
  text-decoration: underline;
}

.stat-link strong {
  color: var(--text-primary);
  font-weight: 700;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-top: 16px;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 16px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.tab-item:hover {
  background: var(--card-hover);
}

.tab-item.active {
  color: var(--text-primary);
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 4px;
  background: #1d9bf0;
  border-radius: 2px;
}

/* Tab Content */
.tab-content {
  min-height: 400px;
}

/* Posts Section */
.posts-section {
  background: transparent;
}

.posts-list {
  display: flex;
  flex-direction: column;
}

/* Media Section */
.media-section {
  padding: 4px;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.media-item {
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;
  background: var(--media-background);
}

.media-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}

.media-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
  background: #000;
}

.media-item:hover img,
.media-item:hover video {
  transform: scale(1.05);
}

/* User List (Followers/Following) */
.user-list {
  display: flex;
  flex-direction: column;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  transition: background 0.2s;
  border-bottom: 1px solid var(--border-color);
}

.user-item:hover {
  background: var(--card-hover);
}

.user-item ion-avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  cursor: pointer;
}

.user-item .avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 18px;
  font-weight: 700;
}

.user-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.user-info .user-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.user-info .user-handle {
  font-size: 15px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.btn-follow-small {
  height: 32px;
  padding: 0 16px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  color: black;
  border: none;
  flex-shrink: 0;
}

.btn-follow-small.following {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-follow-small:hover {
  opacity: 0.9;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 16px;
  color: var(--text-secondary);
}

.empty-state ion-icon {
  font-size: 64px;
  opacity: 0.3;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

/* Light Mode Adjustments */
body.light .profile-container {
  background-color: #fff;
}

body.light .stat-divider {
  background: #555;
}

body.light .stats-bar {
  border: 1px solid #cccccc;
}

/* Responsive */
@media (max-width: 360px) {
  .header-banner {
    height: 150px;
  }

  .main-avatar {
    width: 110px;
    height: 110px;
  }

  .profile-info-section {
    margin-top: -30px;
  }
}
</style>
