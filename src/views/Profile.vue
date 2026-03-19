<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        
        <ion-button slot="start" fill="clear" @click="ionRouter.back(blackFadeAnimation)" style="margin: 0; --padding-start: 8px; --padding-end: 0; margin-left: 5px;">
          <ion-icon :icon="arrowBack" style="color: var(--text-primary); font-size: 24px;"></ion-icon>
        </ion-button>
        
        <ion-title style="font-size: 18px; font-weight: 600; padding-left: 15px;">
          {{ userProfile?.full_name || 'Profile' }}
        </ion-title>

        <ion-button
          slot="end"
          fill="clear"
          @click="openSettings"
          style="display: flex; align-items: center; gap: 4px; margin: 0; --padding-start: 4px; --padding-end: 8px;"
        >
          <ion-icon :icon="settings" style="color: var(--text-primary); font-size: 22px;margin-right: 10px;"></ion-icon>
          <span style="color: var(--text-primary); font-size: 13px; font-weight: 200;">Settings</span>
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="userProfile" class="profile-container">
        <!-- Cover/Banner Area -->
        <div class="profile-banner">
          <div class="banner-gradient"></div>
        </div>

        <!-- Profile Info Section -->
        <div class="profile-info-wrapper">
          <!-- Profile Photo -->
          <div class="profile-photo-section">
            <div class="profile-photo">
              <img 
                v-if="userProfile.profile_photo_url" 
                :src="getOptimizedImageUrl(userProfile.profile_photo_url)"
                alt="Profile"
                loading="lazy"
              />
              <div v-else class="profile-initials">
                {{ getInitials(userProfile.full_name) }}
              </div>
              
              <div v-if="uploadingPhoto" class="upload-overlay">
                <ion-spinner name="crescent"></ion-spinner>
                <p>{{ uploadProgress }}%</p>
              </div>

              <button 
                class="change-photo-btn"
                @click="changePhoto"
                :disabled="uploadingPhoto"
              >
                <ion-icon :icon="camera"></ion-icon>
              </button>
            </div>

            <div class="action-buttons">
              <button class="edit-profile-btn" @click="editProfile">
                Edit profile
              </button>
            </div>
          </div>

          <!-- User Details -->
          <div class="user-details">
            <h1 class="user-name">
              {{ userProfile.full_name }}
              <ion-icon 
                v-if="userProfile.verified" 
                :icon="checkmarkCircle" 
                class="verified-badge"
              ></ion-icon>
            </h1>

            <div v-if="userTags.length > 0" class="user-tags">
              <span 
                v-for="tag in userTags" 
                :key="tag"
                class="tag-item"
              >
                {{ tag }}
              </span>
            </div>

            <p v-if="userProfile.bio" class="user-bio">{{ userProfile.bio }}</p>

            <!-- College/Hospital and Join Date -->
            <div class="user-meta">
              <div v-if="userProfile.college_hospital" class="meta-item">
                <ion-icon :icon="locationOutline"></ion-icon>
                <span>{{ userProfile.college_hospital }}</span>
              </div>
              
              <div v-if="userProfile.created_at" class="meta-item">
                <ion-icon :icon="calendarOutline"></ion-icon>
                <span>Joined {{ formatJoinDate(userProfile.created_at) }}</span>
              </div>
            </div>

            <!-- Following/Followers Stats -->
            <div class="user-stats">
              <div class="stat-item" @click="showFollowing">
                <span class="stat-count">{{ followingCount }}</span>
                <span class="stat-label">Following</span>
              </div>
              <div class="stat-item" @click="showFollowers">
                <span class="stat-count">{{ followersCount }}</span>
                <span class="stat-label">Followers</span>
              </div>
            </div>
          </div>
        </div>
     
        <!-- Tabs Section -->
        <div class="profile-tabs">
          <ion-segment v-model="selectedSegment" @ionChange="segmentChanged" mode="md">
            <ion-segment-button value="posts">
              <ion-label>Posts</ion-label>
            </ion-segment-button>
            <ion-segment-button value="bookmarked">
              <ion-label>Bookmarked</ion-label>
            </ion-segment-button>
            <ion-segment-button value="recents">
              <ion-label>Recents</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <!-- Posts Content -->
        <div class="posts-content">
          <div v-if="selectedSegment === 'posts'">
            <div v-if="loading" class="loading-state">
              <ion-spinner name="circular"></ion-spinner>
            </div>
            
            <div v-else-if="userPosts.length === 0" class="empty-state">
              <div class="empty-icon">
                <ion-icon :icon="documentTextOutline"></ion-icon>
              </div>
              <p class="empty-text">No posts yet</p>
              <button class="create-post-btn" @click="router.push('/tabs/create')">
                Create Your First Post
              </button>
            </div>

            <post-card 
              v-else
              v-for="post in userPosts" 
              :key="post.id" 
              :post="post"
              @delete="handlePostDelete"
            />
          </div>

          <div v-if="selectedSegment === 'bookmarked'">
            <div v-if="loading" class="loading-state">
              <ion-spinner name="circular"></ion-spinner>
            </div>

            <div v-else-if="savedPosts.length === 0" class="empty-state">
              <div class="empty-icon">
                <ion-icon :icon="bookmarkOutline"></ion-icon>
              </div>
              <p class="empty-text">No bookmarked posts yet</p>
              <ion-button fill="outline" @click="router.push('/home')">
                Explore Posts
              </ion-button>
            </div>

            <post-card 
              v-else
              v-for="post in savedPosts" 
              :key="post.id" 
              :post="post"
              @delete="handlePostDelete"
            />

            <ion-infinite-scroll 
              v-if="savedPosts.length > 0 && hasMore"
              @ionInfinite="loadMorePosts"
              threshold="100px"
            >
              <ion-infinite-scroll-content
                loading-spinner="circular"
                loading-text="Loading more..."
              >
              </ion-infinite-scroll-content>
            </ion-infinite-scroll>
          </div>

          <div v-if="selectedSegment === 'recents'">
            <div v-if="loading" class="loading-state">
              <ion-spinner name="circular"></ion-spinner>
            </div>

            <div v-else-if="userComments.length === 0" class="empty-state">
              <div class="empty-icon">
                <ion-icon :icon="chatbubbleOutline"></ion-icon>
              </div>
              <p class="empty-text">No recent activity yet</p>
            </div>

            <div v-else class="comments-list">
              <div 
                v-for="comment in userComments" 
                :key="comment.id"
                class="comment-card"
                @click="router.push(`/post/${comment.post_id}`)"
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
                    </div>
                    <div class="comment-text">{{ comment.content }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="loading-state" style="height: 100vh; display: flex; align-items: center; justify-content: center;">
        <ion-spinner name="circular"></ion-spinner>
      </div>

      <input 
        ref="fileInputRef"
        type="file" 
        accept="image/*"
        style="display: none"
        @change="handlePhotoSelect"
      />
    </ion-content>

    <!-- Followers/Following Modal -->
    <followers-modal
      :is-open="showFollowersModal"
      :user-id="authStore.user?.id"
      :initial-tab="followModalTab"
      @close="closeFollowersModal"
    />
  </ion-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'

import { onIonViewWillEnter } from '@ionic/vue'

import { moon, sunny } from 'ionicons/icons'

import FollowersModal from '@/components/FollowersModal.vue'

import { useDarkMode } from '@/composables/useDarkMode'

import PostCard from '@/components/PostCard.vue'

import { useIonRouter } from '@ionic/vue'
import { blackFadeAnimation } from '@/animations/blackFade'

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  alertController,
  actionSheetController,
  toastController
} from '@ionic/vue'

import { 
  settings, 
  camera, 
  business, 
  pencil, 
  documentText, 
  arrowBack,
  personCircle,
  bookmarkOutline,
  logOut,
  checkmarkCircle,
  shield,
  images as imagesIcon,
  timeOutline,
  clipboardOutline,
  shieldCheckmarkOutline,
  documentTextOutline,
  chatbubbleOutline,
  chatboxOutline,
  locationOutline,
  calendarOutline
} from 'ionicons/icons'

const router = useRouter()
const authStore = useAuthStore()

const { isLight, toggleTheme } = useDarkMode() // Changed from isDark to isLight

const userProfile = ref(null)
const userPosts = ref([])
const savedPosts = ref([])
const userTags = ref([])
const selectedSegment = ref('posts')
const loading = ref(true)

const ionRouter = useIonRouter()

const postsCount = ref(0)
const followersCount = ref(0)
const followingCount = ref(0)

const uploadingPhoto = ref(false)
const uploadProgress = ref(0)
const fileInputRef = ref(null)

const showFollowersModal = ref(false)
const followModalTab = ref('followers')
const userComments = ref([])
const commentsLoaded = ref(false)

const BACKEND_API_URL = 'https://octopus-push-api-production-e5b8.up.railway.app/api'
//cred3//

const formatJoinDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

async function loadProfile() {
  loading.value = true
  
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authStore.user.id)
    .single()

  userProfile.value = profile

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      users (full_name, college_hospital, profile_photo_url)
    `)
    .eq('user_id', authStore.user.id)
    .order('created_at', { ascending: false })

  userPosts.value = posts || []
  postsCount.value = posts?.length || 0

  const { count: followersCountData } = await supabase
  .from('follows')
  .select('*', { count: 'exact', head: true })
  .eq('following_id', authStore.user.id)

const { count: followingCountData } = await supabase
  .from('follows')
  .select('*', { count: 'exact', head: true })
  .eq('follower_id', authStore.user.id)

followersCount.value = followersCountData || 0
followingCount.value = followingCountData || 0

userTags.value = ['Cardiology', 'Surgery', 'Research']

loading.value = false
}

function getOptimizedImageUrl(url) {
  if (!url) return ''
  // Add Cloudflare optimization for profile photos
  return `${url}?width=400&quality=85&format=auto`
}

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

async function changePhoto() {
  const actionSheet = await actionSheetController.create({
    header: 'Change Profile Photo',
    buttons: [
      {
        text: 'Choose from Gallery',
        icon: imagesIcon,
        handler: () => {
          fileInputRef.value?.click()
        }
      },
      {
        text: 'Remove Photo',
        role: 'destructive',
        icon: 'trash-outline',
        handler: () => {
          removePhoto()
        }
      },
      {
        text: 'Cancel',
        role: 'cancel'
      }
    ]
  })

  await actionSheet.present()
}

async function handlePhotoSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    const toast = await toastController.create({
      message: 'Please select an image file',
      duration: 2000,
      color: 'danger'
    })
    await toast.present()
    return
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    const toast = await toastController.create({
      message: 'Image must be less than 5MB',
      duration: 2000,
      color: 'danger'
    })
    await toast.present()
    return
  }

  try {
    uploadingPhoto.value = true
    uploadProgress.value = 0

    // Compress image
    const compressedFile = await compressImage(file)
    console.log(`Compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`)

    // Get presigned URL
    const response = await fetch(
      `${BACKEND_API_URL}/generate-upload-url?filename=${encodeURIComponent(compressedFile.name)}&contentType=${encodeURIComponent(compressedFile.type)}`
    )

    if (!response.ok) {
      throw new Error('Failed to get upload URL')
    }

    const { url: presignedUrl, key, publicUrl } = await response.json()

    // Upload to R2 with progress
    await uploadWithProgress(presignedUrl, compressedFile)

    // Update user profile in database
    const { error } = await supabase
      .from('users')
      .update({ profile_photo_url: publicUrl })
      .eq('id', authStore.user.id)

    if (error) throw error

    // Update local state
    userProfile.value.profile_photo_url = publicUrl

    const toast = await toastController.create({
      message: 'Profile photo updated successfully!',
      duration: 2000,
      color: 'success'
    })
    await toast.present()

  } catch (error) {
    console.error('Photo upload error:', error)
    const toast = await toastController.create({
      message: 'Failed to upload photo. Please try again.',
      duration: 3000,
      color: 'danger'
    })
    await toast.present()
  } finally {
    uploadingPhoto.value = false
    uploadProgress.value = 0
    event.target.value = ''
  }
}

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // Profile photos - max 800px
        const maxSize = 800
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        } else if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }

        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }))
          } else {
            canvas.toBlob((jpegBlob) => {
              resolve(new File([jpegBlob], file.name, { type: 'image/jpeg' }))
            }, 'image/jpeg', 0.85)
          }
        }, 'image/webp', 0.90)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function uploadWithProgress(presignedUrl, file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        uploadProgress.value = Math.round((e.loaded / e.total) * 100)
      }
    })
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve()
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`))
      }
    })
    
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })
    
    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

async function removePhoto() {
  const alert = await alertController.create({
    header: 'Remove Photo',
    message: 'Are you sure you want to remove your profile photo?',
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Remove',
        role: 'destructive',
        handler: async () => {
          const { error } = await supabase
            .from('users')
            .update({ profile_photo_url: null })
            .eq('id', authStore.user.id)

          if (!error) {
            userProfile.value.profile_photo_url = null
            
            const toast = await toastController.create({
              message: 'Profile photo removed',
              duration: 2000,
              color: 'success'
            })
            await toast.present()
          }
        }
      }
    ]
  })

  await alert.present()
}

function editProfile() {
  router.push('/edit-profile')
}

async function openSettings() {
  const actionSheet = await actionSheetController.create({
    header: 'Settings',
    cssClass: 'custom-action-sheet',
    buttons: [
      {
        text: isLight.value ? 'Dark Mode' : 'Light Mode', // Changed from isDark to isLight
        icon: isLight.value ? moon : sunny, // Changed from isDark to isLight
        handler: () => {
          toggleTheme()
        }
      },
      {
        text: 'Edit Profile',
        icon: pencil,
        handler: () => {
          editProfile()
        }
      },
      {
        text: 'Verify Account',
        icon: checkmarkCircle,
        handler: () => {
          router.push('/verify-account')
        }
      },
      {
        text: 'Account Settings',
        icon: shield,
        handler: () => {
          router.push('/privacy-settings')
        }
      },
      {
        text: 'History',
        icon: timeOutline,
        handler: () => {
          router.push('/history')
        }
      },
      {
  text: 'Terms Of Service',
  icon: documentTextOutline,
  handler: () => {
    router.push('/terms-and-conditions')
  }
},
{
  text: 'Privacy Policy',
  icon: shieldCheckmarkOutline,
  handler: () => {
    router.push('/privacy-policy')
  }
},

      {
        text: 'Logout',
        icon: logOut,
        role: 'destructive',
        handler: () => {
          handleLogout()
        }
      },
      {
        text: 'Cancel',
        role: 'cancel'
      }
    ]
  })

await actionSheet.present()
}
async function handleLogout() {
  const alert = await alertController.create({
    header: 'Logout',
    message: 'Are you sure you want to logout?',
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Logout',
        role: 'confirm',
        handler: async () => {
          try {
            const toast = await toastController.create({
              message: 'Logging out...',
              duration: 1000
            })
            await toast.present()
            
            await authStore.signOut()
            await router.replace('/login')
            
            const successToast = await toastController.create({
              message: 'Logged out successfully',
              duration: 2000,
              color: 'success'
            })
            await successToast.present()
          } catch (error) {
            console.error('Logout error:', error)
            
            const errorToast = await toastController.create({
              message: 'Failed to logout. Please try again.',
              duration: 3000,
              color: 'danger'
            })
            await errorToast.present()
          }
        }
      }
    ]
  })

  await alert.present()
}

async function deletePost(postId) {
  const alert = await alertController.create({
    header: 'Delete Post',
    message: 'Are you sure you want to delete this post?',
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Delete',
        role: 'destructive',
        handler: async () => {
          const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId)

          if (!error) {
            userPosts.value = userPosts.value.filter(p => p.id !== postId)
            postsCount.value--
          }
        }
      }
    ]
  })

  await alert.present()
}

function segmentChanged(event) {
  selectedSegment.value = event.detail.value
  
  if (selectedSegment.value === 'bookmarked') {
    loadSavedPosts()
  } else if (selectedSegment.value === 'recents' && !commentsLoaded.value) {
    loadUserComments()
  }
}

async function loadSavedPosts() {
  if (!authStore.user) {
    router.push('/login')
    return
  }
  
  loading.value = true
  savedPosts.value = []
  
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        id,
        created_at,
        post_id,
        posts (
          *,
          users (
            id,
            full_name,
            profile_photo_url,
            college_hospital
          )
        )
      `)
      .eq('user_id', authStore.user.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Transform the data to match PostCard component props
  savedPosts.value = data
  .filter(bookmark => bookmark.posts)  // Add this filter line
  .map(bookmark => ({
      ...bookmark.posts,
      bookmark_id: bookmark.id,
      bookmarked_at: bookmark.created_at
    }))
    
  } catch (error) {
    console.error('Error loading saved posts:', error)
    const toast = await toastController.create({
      message: 'Failed to load saved posts',
      duration: 2000,
      color: 'danger'
    })
    await toast.present()
  } finally {
    loading.value = false
  }
}

// Optional: Load more with pagination
async function loadMoreSavedPosts(page = 0, pageSize = 20) {
  if (!authStore.user) return
  
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        id,
        created_at,
        post_id,
        posts (
          *,
          users (
            id,
            full_name,
            profile_photo_url,
            college_hospital
          )
        )
      `)
      .eq('user_id', authStore.user.id)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)
    
    if (error) throw error
    
    const morePosts = data.map(bookmark => ({
      ...bookmark.posts,
      bookmark_id: bookmark.id,
      bookmarked_at: bookmark.created_at
    }))
    
    savedPosts.value = [...savedPosts.value, ...morePosts]
    
  } catch (error) {
    console.error('Error loading more saved posts:', error)
  }
}

// Optional: Remove bookmark from saved posts page
async function removeBookmark(postId) {
  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', authStore.user.id)
      .eq('post_id', postId)
    
    if (error) throw error
    
    // Remove from local array
    savedPosts.value = savedPosts.value.filter(post => post.id !== postId)
    
    const toast = await toastController.create({
      message: 'Removed from bookmarks',
      duration: 2000,
      color: 'success'
    })
    await toast.present()
    
  } catch (error) {
    console.error('Error removing bookmark:', error)
    const toast = await toastController.create({
      message: 'Failed to remove bookmark',
      duration: 2000,
      color: 'danger'
    })
    await toast.present()
  }
}
function truncateText(text, maxLength) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
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

async function loadUserComments() {
  if (!authStore.user) return
  
  loading.value = true
  try {
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
      .eq('user_id', authStore.user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (!error) {
      userComments.value = data || []
      commentsLoaded.value = true
    }
  } catch (error) {
    console.error('Error loading comments:', error)
  } finally {
    loading.value = false
  }
}
////////////////////////////////////////////////////////
function showFollowers() {
  followModalTab.value = 'followers'
  showFollowersModal.value = true
}

function showFollowing() {
  followModalTab.value = 'following'
  showFollowersModal.value = true
}

function closeFollowersModal() {
  showFollowersModal.value = false
}
function handlePostDelete(postId) {
  userPosts.value = userPosts.value.filter(p => p.id !== postId)
  postsCount.value--
}

onIonViewWillEnter(() => {
  loadProfile()
  // Load saved posts if bookmarked tab is selected
  if (selectedSegment.value === 'bookmarked') {
    loadSavedPosts()
  }
})
</script>

<style scoped>
/* Comments/Recents */
.comments-list{display:flex;flex-direction:column;gap:0;background:var(--background)}
.comment-card{background:var(--background);border-bottom:1px solid var(--border-color);padding:0;cursor:pointer;transition:background .2s}
.comment-card:hover{background:var(--card-hover)}

/* Post Context */
.post-context{display:flex;align-items:flex-start;gap:12px;padding:16px;border-bottom:1px solid var(--border-color)}
.context-icon{flex-shrink:0;color:var(--text-secondary);font-size:20px;margin-top:2px}
.context-content{flex:1;min-width:0}
.context-post-title{font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:6px;line-height:1.4}
.context-meta{font-size:13px;color:var(--text-secondary);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.context-meta span{color:var(--text-secondary)}
.context-meta strong{color:var(--text-primary);font-weight:600}
.context-thumbnail{width:60px;height:60px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--media-background)}
.context-thumbnail img{width:100%;height:100%;object-fit:cover}

/* Comment Reply */
.comment-reply-section{display:flex;gap:12px;padding:12px 16px 16px 16px;position:relative;background:var(--background)}
.reply-indicator-line{position:absolute;left:36px;top:-1px;height:13px;width:2px;background:var(--border-color)}
.comment-avatar{width:40px;height:40px;flex-shrink:0}
.comment-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.avatar-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;
background:linear-gradient(135deg,#667eea,#764ba2);color:white;font-size:18px;font-weight:700}
.comment-body{flex:1;min-width:0}
.comment-header{display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap}
.comment-author{color:var(--text-primary);font-size:15px;font-weight:600}
.comment-label{color:var(--text-secondary);font-size:14px;font-weight:400}
.comment-time{color:var(--text-secondary);font-size:14px;font-weight:400}
.comment-text{color:var(--text-primary);font-size:15px;line-height:1.5;word-wrap:break-word;margin-top:2px}

/* Profile */
.profile-container{min-height:100vh;background:var(--background)}
.profile-banner{height:100px;position:relative;background:linear-gradient(135deg,#ea66d2 0%,#764ba2 100%);overflow:hidden}
.banner-gradient{width:100%;height:100%;background:linear-gradient(180deg,transparent 0%,rgba(0,0,0,.3) 100%)}
.profile-info-wrapper{padding:0 16px;margin-top:-50px;position:relative}
.profile-photo-section{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
.profile-photo{width:115px;height:115px;border-radius:50%;border:4px solid var(--background);
background:var(--card-background);overflow:hidden;position:relative;flex-shrink:0}
.profile-photo img{width:100%;height:100%;object-fit:cover}
.profile-initials{width:100%;height:100%;display:flex;align-items:center;justify-content:center;
font-size:48px;font-weight:600;color:var(--text-primary);
background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)}
.change-photo-btn{position:absolute;bottom:4px;right:4px;width:36px;height:36px;border-radius:50%;
background:var(--background);border:none;display:flex;align-items:center;justify-content:center;
cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,.2)}
.change-photo-btn ion-icon{font-size:20px;color:var(--text-primary)}
.upload-overlay{position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);
display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.upload-overlay p{color:white;font-size:14px;font-weight:500}
.action-buttons{display:flex;gap:8px;margin-top:12px}
.edit-profile-btn{height:36px;padding:0 20px;border-radius:18px;background:transparent;
border:1px solid var(--border-color);color:var(--text-primary);font-size:15px;font-weight:600;
cursor:pointer;transition:all .2s;flex:1}
.edit-profile-btn:hover{background:var(--card-hover)}

/* User Details */
.user-details{margin-top:4px}
.user-name{font-size:22px;font-weight:700;color:var(--text-primary);margin:0 0 2px 0;
display:flex;align-items:center}
.verified-badge{display:inline-block;font-size:20px;color:#1d9bf0;margin-left:4px;vertical-align:middle}
.user-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}
.tag-item{padding:6px 12px;font-size:13px;font-weight:500;color:#1d9bf0;
background:rgba(29,155,240,.1);border-radius:999px;white-space:nowrap;
border:1px solid rgba(29,155,240,.2)}
.user-bio{font-size:15px;line-height:20px;color:var(--text-primary);margin:12px 0;
white-space:pre-wrap;word-wrap:break-word}

/* User Meta - FIXED */
.user-meta{display:flex;flex-direction:column;gap:8px;margin:12px 0;padding:0}
.meta-item{display:flex;align-items:center;gap:4px;color:var(--text-secondary);
font-size:15px;flex-shrink:0;margin:0;padding:0}
.meta-item ion-icon{font-size:16px}

/* User Stats */
.user-stats{display:flex;gap:20px;margin-top:12px}
.stat-item{display:flex;gap:4px;cursor:pointer;transition:text-decoration .2s}
.stat-item:hover .stat-label{text-decoration:underline}
.stat-count{font-size:15px;font-weight:700;color:var(--text-primary)}
.stat-label{font-size:15px;color:var(--text-secondary)}

/* Tabs */
.profile-tabs{margin-top:16px;border-bottom:1px solid var(--border-color);
position:relative;top:0;background:var(--background);z-index:10}
ion-segment{--background:transparent;width:100%}
ion-segment-button{--color:var(--text-secondary);--color-checked:var(--text-primary);
--indicator-color:#1d9bf0;--indicator-height:4px;min-height:53px;font-size:15px;
font-weight:500;text-transform:none;letter-spacing:0}

/* Content States */
.posts-content{background:var(--background)}
.loading-state{display:flex;flex-direction:column;align-items:center;justify-content:center;
padding:60px 20px;gap:12px}
.loading-state p{color:var(--text-secondary);font-size:15px}
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;
padding:60px 20px;text-align:center}
.empty-icon{width:64px;height:64px;display:flex;align-items:center;justify-content:center;
margin-bottom:16px}
.empty-icon ion-icon{font-size:64px;color:var(--text-tertiary)}
.empty-text{font-size:17px;color:var(--text-secondary);margin:0 0 20px 0}
.create-post-btn,.empty-state ion-button{margin-top:8px}
.create-post-btn{height:36px;padding:0 20px;border-radius:18px;background:#1d9bf0;
border:none;color:white;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s}
.create-post-btn:hover{background:#1a8cd8}

</style>