<template>
  <ion-page>
    <ion-header 
  v-show="!isHeaderHidden"
  ref="headerRef"
>
     <link href="https://api.fontshare.com/v2/css?f[]=chillax@600&display=swap" rel="stylesheet">
      <ion-toolbar>
        <!-- Profile Picture on Left -->
        <ion-buttons slot="start">
          <ion-button @click="navigateToProfile" style="margin-left: 18px; --padding-start: 0; --padding-end: 0;">
            <ion-avatar style="width: 38px; height: 38px;">
              <img 
                v-if="userProfile?.profile_photo_url" 
                :src="userProfile.profile_photo_url"
                :alt="userProfile.full_name"
              />
              <div v-else style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">
                {{ getInitials(userProfile?.full_name) }}
              </div>
            </ion-avatar>
          </ion-button>
        </ion-buttons>
        
        <!-- Centered Rounds Text -->
        <ion-title style="text-align: center;">
          <span style="font-family: 'Chillax', sans-serif; font-size: 25px; font-weight: 200; color: #fff; letter-spacing: 0.5px;">rounds</span>
        </ion-title>
        
        <!-- Search Icon on Right -->
        <ion-buttons slot="end">
          <ion-button @click="navigateToSearch" style="font-size: 18px; margin-right: 8px;">
            <ion-icon :icon="search" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
         
      
      <!-- For You / Following Tabs -->
      <ion-toolbar style="--min-height:48px; --padding-start: 0; --padding-end: 0;">
        <div style="display: flex; height: 100%;">
          <button 
            @click="switchTab('forYou')"
            :style="{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: activeTab === 'forYou' ? '#3B82F6' : '#666',
              fontSize: '15px',
              fontWeight: '600',
              padding: '12px',
              borderBottom: activeTab === 'forYou' ? '3px solid #3B82F6' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }"
          >
            For You
          </button>
          <button 
            @click="switchTab('following')"
            :style="{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: activeTab === 'following' ? '#3B82F6' : '#666',
              fontSize: '15px',
              fontWeight: '600',
              padding: '12px',
              borderBottom: activeTab === 'following' ? '3px solid #3B82F6' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }"
          >
            Following
          </button>
        </div>
      </ion-toolbar>

      <ion-toolbar v-if="activeTag" style="--min-height: 44px; --background: rgba(59, 130, 246, 0.1); --padding-start: 16px; --padding-end: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="color: #3B82F6; font-size: 14px; font-weight: 500;">
            Showing posts tagged: <strong>{{ activeTag }}</strong>
          </span>
          <ion-button fill="clear" size="small" @click="clearFilter" style="--color: #3B82F6;">
            <ion-icon :icon="close" slot="icon-only"></ion-icon>
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-header>


    <ion-content 
      :fullscreen="false"
      :scroll-events="true"
      @ionScroll="handleScroll"
      ref="contentRef"
    >
      <div style="height: 4px;"></div>
      
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content
          pulling-icon="chevron-down-circle-outline"
          refreshing-spinner="crescent"
        ></ion-refresher-content>
      </ion-refresher>

      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
      </div>
      
      <post-card 
        v-for="post in displayedPosts" 
        :key="post.id" 
        :post="post"
        @delete="handlePostDelete"
      />

      <div v-if="!loading && displayedPosts.length === 0" class="empty-state ion-padding">
        <p v-if="activeTab === 'forYou'">No posts yet. Be the first to post!</p>
        <p v-else>No posts from people you follow yet. Start following users to see their posts here!</p>
      </div>

      <ion-infinite-scroll @ionInfinite="loadMore" :disabled="!hasMore">
        <ion-infinite-scroll-content
          loading-spinner="crescent"
        ></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted, inject, defineAsyncComponent } from 'vue'

import { useRoute } from 'vue-router'
import { supabase } from '@/supabase'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import { useIonRouter } from '@ionic/vue'

import { blackFadeAnimation } from '@/animations/blackFade'

const PostCard = defineAsyncComponent(() => import('../components/PostCard.vue'))

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonAvatar
} from '@ionic/vue'
import { search, close } from 'ionicons/icons'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const ionRouter = useIonRouter()

const activeTab = ref('forYou')
const allPosts = ref([])
const followingPosts = ref([])
const userProfile = ref(null)
const loading = ref(true)
const followingUserIds = ref([])
const blockedUserIds = ref([])
const contentRef = ref(null)
const headerRef = ref(null)
const isHeaderHidden = ref(false)
const tabBarControl = inject('tabBarControl', null)

let lastScrollTop = 0
const scrollThreshold = 5

const POSTS_PER_PAGE = 10
let forYouPage = 0
let followingPage = 0
const hasMore = ref(true)

const activeTag = computed(() => route.query.tag || null)

const displayedPosts = computed(() => {
  const posts = activeTab.value === 'forYou' ? allPosts.value : followingPosts.value
  
  if (!activeTag.value) return posts
  
  return posts.filter(post => {
    if (!post.tag) return false
    
    let tags = post.tag
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags)
      } catch (e) {
        return false
      }
    }
    
    return Array.isArray(tags) && tags.includes(activeTag.value)
  })
})

function navigateToProfile() {
  ionRouter.push('/tabs/profile', blackFadeAnimation)
}

function navigateToSearch() {
  ionRouter.push('/tabs/search', blackFadeAnimation)
}

function navigateToTag(tag) {
  router.push({ path: '/tabs/home', query: { tag: tag } })
}

function clearFilter() {
  router.push({ path: '/tabs/home' })
}
function handleScroll(event) {
  const scrollTop = event.detail.scrollTop
  const scrollDelta = scrollTop - lastScrollTop

  if (scrollTop < 50) {
    isHeaderHidden.value = false
    if (tabBarControl) tabBarControl.setHidden(false)
  } 
  else if (scrollDelta > scrollThreshold && scrollTop > 100) {
    isHeaderHidden.value = true
    if (tabBarControl) tabBarControl.setHidden(true)
  } 
  else if (scrollDelta < -scrollThreshold) {
    isHeaderHidden.value = false
    if (tabBarControl) tabBarControl.setHidden(false)
  }

  lastScrollTop = scrollTop
}

async function loadUserProfile() {
  if (!authStore.user) return

  const { data } = await supabase
    .from('users')
    .select('full_name, profile_photo_url')
    .eq('id', authStore.user.id)
    .single()

  if (data) userProfile.value = data
}

async function loadBlockedUsers() {
  if (!authStore.user) {
    blockedUserIds.value = []
    return
  }

  const { data } = await supabase
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', authStore.user.id)

  if (data) blockedUserIds.value = data.map(b => b.blocked_id)
}

async function loadFollowingUsers() {
  if (!authStore.user) return

  const { data } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', authStore.user.id)

  if (data) followingUserIds.value = data.map(f => f.following_id)
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

async function loadForYouFeed() {
  try {
    const from = forYouPage * POSTS_PER_PAGE

    const { data, error } = await supabase.rpc('get_ranked_feed', {
      p_user_id: authStore.user.id,
      p_limit: POSTS_PER_PAGE,
      p_offset: from,
      p_blocked_ids: blockedUserIds.value
    })

    if (error) throw error

    if (data && data.length > 0) {
      // Transform RPC data to match PostCard expected structure
      const postsWithUsers = data.map(post => ({
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        tag: post.tag,
        created_at: post.created_at,
        media_urls: post.media_urls,
        media_type: post.media_type,
        like_count: post.like_count,
        comment_count: post.comment_count,
        view_count: post.view_count,
        users: {
          id: post.user_id,
          full_name: post.full_name,
          college_hospital: post.college_hospital,
          profile_photo_url: post.profile_photo_url
        }
      }))

      if (forYouPage === 0) {
        allPosts.value = postsWithUsers
      } else {
        allPosts.value = [...allPosts.value, ...postsWithUsers]
      }
      
      forYouPage++
      hasMore.value = data.length === POSTS_PER_PAGE
    } else {
      hasMore.value = false
    }
  } catch (error) {
    console.error('Error loading For You feed:', error)
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

async function loadFollowingFeed() {
  const activeFollowingIds = followingUserIds.value.filter(
    id => !blockedUserIds.value.includes(id)
  )

  if (activeFollowingIds.length === 0) {
    followingPosts.value = []
    loading.value = false
    hasMore.value = false
    return
  }

  try {
    const from = followingPage * POSTS_PER_PAGE
    const to = from + POSTS_PER_PAGE - 1

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users!inner (
          id,
          full_name,
          college_hospital,
          profile_photo_url
        )
      `)
      .in('user_id', activeFollowingIds)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    if (data) {
      if (followingPage === 0) {
        followingPosts.value = data
      } else {
        followingPosts.value = [...followingPosts.value, ...data]
      }
      
      followingPage++
      hasMore.value = data.length === POSTS_PER_PAGE
    }
  } catch (error) {
    console.error('Error loading Following feed:', error)
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

async function switchTab(tab) {
  if (activeTab.value === tab) return
  
  activeTab.value = tab
  loading.value = true
  
  isHeaderHidden.value = false
  if (contentRef.value) {
    contentRef.value.$el.scrollToTop(300)
  }

  if (tab === 'forYou') {
    if (allPosts.value.length === 0) {
      await loadForYouFeed()
    } else {
      loading.value = false
    }
  } else {
    if (followingPosts.value.length === 0) {
      await loadFollowingFeed()
    } else {
      loading.value = false
    }
  }
}

async function handleRefresh(event) {
  isHeaderHidden.value = false
  if (tabBarControl) tabBarControl.setHidden(false)
  
  if (activeTab.value === 'forYou') {
    forYouPage = 0
    allPosts.value = []
  } else {
    followingPage = 0
    followingPosts.value = []
  }
  
  hasMore.value = true
  
  await Promise.all([
    loadUserProfile(),
    loadBlockedUsers(),
    loadFollowingUsers()
  ])
  
  if (activeTab.value === 'forYou') {
    await loadForYouFeed()
  } else {
    await loadFollowingFeed()
  }
  
  event.target.complete()
}

async function loadMore(event) {
  if (!hasMore.value) {
    event.target.complete()
    return
  }

  try {
    if (activeTab.value === 'forYou') {
      await loadForYouFeed()
    } else {
      await loadFollowingFeed()
    }
  } catch (error) {
    console.error('Error loading more posts:', error)
  } finally {
    event.target.complete()
  }
}

function handlePostDelete(postId) {
  allPosts.value = allPosts.value.filter(post => post.id !== postId)
  followingPosts.value = followingPosts.value.filter(post => post.id !== postId)
}

function handleBlockUser(blockedUserId) {
  if (!blockedUserIds.value.includes(blockedUserId)) {
    blockedUserIds.value.push(blockedUserId)
  }
  
  allPosts.value = allPosts.value.filter(post => post.user_id !== blockedUserId)
  followingPosts.value = followingPosts.value.filter(post => post.user_id !== blockedUserId)
}

onMounted(async () => {
  await Promise.all([
    loadUserProfile(),
    loadBlockedUsers(),
    loadFollowingUsers()
  ])
  
  await loadForYouFeed()
})
</script>

<style scoped>
.loading-container {
  margin-top: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  will-change: transform;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  color: var(--text-secondary);
  margin-top: 60px;
  font-size: 15px;
}

ion-title {
  padding: 0;
}

ion-header {
  border-bottom: 1px solid var(--border-color);
}
</style>

