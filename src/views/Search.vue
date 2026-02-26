<template>
  <ion-page>
    <ion-header style="margin-top: 40px;">
      
      <!-- Search Bar -->
      <ion-toolbar>
        <div class="search-container">
          <ion-searchbar 
            v-model="searchQuery"
            placeholder="Search users and tags..."
            @ionInput="handleSearch"
            @ionClear="clearSearch"
            debounce="200"
            class="pill-search"
          ></ion-searchbar>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Combined Search Results (Mixed) -->
      <div v-if="searchQuery && mixedResults.length > 0" class="results-section">
        <ion-list class="results-list">
          <ion-item 
            v-for="result in mixedResults" 
            :key="result.type + '-' + result.id"
            button
            @click="handleResultClick(result)"
            lines="none"
            class="result-item"
          >
            <!-- Tag Icon -->
            <div v-if="result.type === 'tag'" class="tag-icon" slot="start">
              <ion-icon :icon="pricetag"></ion-icon>
            </div>
            
            <!-- User Avatar -->
            <ion-avatar v-else slot="start">
              <img 
                v-if="result.profile_photo_url" 
                :src="result.profile_photo_url"
                :alt="result.full_name"
              />
              <div v-else class="avatar-placeholder">
                {{ getInitials(result.full_name) }} 
              </div>
            </ion-avatar>
            
            <ion-label>
              <h2 v-if="result.type === 'tag'">
                #{{ result.name }}
              </h2>
              <h2 v-else>
                {{ result.full_name }}
                <ion-icon 
                  v-if="result.verified" 
                  :icon="checkmarkCircle" 
                  class="verified-badge-small"
                ></ion-icon>
              </h2>
              <p>{{ result.subtitle }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>

      <!-- No Results -->
      <div v-else-if="searchQuery && !searching && mixedResults.length === 0" class="empty-state">
        <ion-icon :icon="searchOutline"></ion-icon>
        <p>No results found</p>
      </div>

      <!-- Searching Spinner -->
      <div v-else-if="searching" class="loading-state">
        <ion-spinner color="light"></ion-spinner>
      </div>

      <!-- Trending Section (when no search) -->
      <div v-else-if="!searchQuery">
        <div class="trending-header">
          <h2>
            <ion-icon :icon="trendingUp"></ion-icon>
            Trending Today
          </h2>
        </div>

        <div v-if="loadingTrending" class="loading-state">
          <ion-spinner color="light"></ion-spinner>
        </div>

        <div v-else-if="trendingPosts.length > 0" class="posts-container">
          <post-card 
            v-for="post in trendingPosts" 
            :key="post.id" 
            :post="post"
          />
        </div>

        <div v-else class="empty-state">
          <ion-icon :icon="flameOutline"></ion-icon>
          <p>No trending posts today</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import PostCard from '@/components/PostCard.vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonIcon,
  IonSpinner
} from '@ionic/vue'
import { searchOutline, checkmarkCircle, trendingUp, flameOutline, pricetag } from 'ionicons/icons'

const router = useRouter()

const searchQuery = ref('')
const searchResults = ref([])
const tagResults = ref([])
const searching = ref(false)

const trendingPosts = ref([])
const loadingTrending = ref(true)

// Computed property to mix and sort results alphabetically
const mixedResults = computed(() => {
  const users = searchResults.value.map(user => ({
    type: 'user',
    id: user.id,
    name: user.full_name,
    full_name: user.full_name,
    profile_photo_url: user.profile_photo_url,
    verified: user.verified,
    subtitle: user.college_hospital,
    sortKey: user.full_name.toLowerCase()
  }))

  const tags = tagResults.value.map(tag => ({
    type: 'tag',
    id: tag.name,
    name: tag.name,
    subtitle: `${tag.count} ${tag.count === 1 ? 'post' : 'posts'}`,
    sortKey: tag.name.toLowerCase()
  }))

  // Combine and sort alphabetically
  return [...users, ...tags].sort((a, b) => a.sortKey.localeCompare(b.sortKey))
})

onMounted(async () => {
  await loadTrending()
})

async function handleSearch(event) {
  const query = event.target.value?.trim()
  searchQuery.value = query
  
  if (!query || query.length < 1) {
    searchResults.value = []
    tagResults.value = []
    return
  }
  
  searching.value = true
  
  // Search both users and tags simultaneously
  await Promise.all([
    searchUsers(query),
    searchTags(query)
  ])
  
  searching.value = false
}

async function searchUsers(query) {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, college_hospital, profile_photo_url, verified')
    .ilike('full_name', `%${query}%`)
    .limit(20)
  
  if (!error) {
    searchResults.value = data || []
  }
}

async function searchTags(query) {
  const { data, error } = await supabase
    .from('posts')
    .select('tag')
    .not('tag', 'is', null)
  
  if (!error && data) {
    const tagMap = new Map()
    
    data.forEach(post => {
      let tags = post.tag
      if (typeof tags === 'string') {
        try {
          tags = JSON.parse(tags)
        } catch (e) {
          return
        }
      }
      
      if (Array.isArray(tags)) {
        tags.forEach(tag => {
          const lowerTag = tag.toLowerCase()
          if (lowerTag.includes(query.toLowerCase())) {
            const count = tagMap.get(tag) || 0
            tagMap.set(tag, count + 1)
          }
        })
      }
    })
    
    tagResults.value = Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }
}

function handleResultClick(result) {
  if (result.type === 'tag') {
    viewTagPosts(result.name)
  } else {
    viewUserProfile(result.id)
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  tagResults.value = []
}

async function loadTrending() {
  loadingTrending.value = true

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      users (full_name, college_hospital, profile_photo_url, verified)
    `)
    .gte('created_at', todayStr)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!error && data) {
    const postsWithEngagement = await Promise.all(
      data.map(async (post) => {
        const [likesResult, viewsResult] = await Promise.all([
          supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id),
          supabase
            .from('post_views')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)
        ])

        const likes = likesResult.count || 0
        const views = viewsResult.count || 0

        return { 
          ...post, 
          likes_count: likes,
          views_count: views,
          engagement_score: likes * 2 + views
        }
      })
    )

    trendingPosts.value = postsWithEngagement
      .filter(p => p.engagement_score > 0)
      .sort((a, b) => b.engagement_score - a.engagement_score)
      .slice(0, 10)
  }

  loadingTrending.value = false
}

function viewUserProfile(userId) {
  router.push(`/user/${userId}`)
}

function viewTagPosts(tagName) {
  router.push({ path: '/tabs/home', query: { tag: tagName } })
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
</script>

<style scoped>
.search-container {
  padding: 10px;
  display: flex;
  justify-content: center;
}

.pill-search {
  --background: var(--background-secondary);
  --border-radius: 20px;
  --box-shadow: none;
  --icon-color: var(--text-secondary);
  --placeholder-color: var(--placeholder-color);
  --color: var(--text-primary);
  width: 95%; /* Responsive width */
  max-width: 600px; /* Maximum width on larger screens */
}

body.light .pill-search {
  --background: #f5f5f5;
}

.results-section {
  padding: 0;
}

.section-group {
  margin-bottom: 24px;
}

.section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  padding: 0 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.results-list {
  background: transparent;
  padding: 0;
}

.result-item {
  --background: var(--card-background);
  --color: var(--text-primary);
  --border-radius: 12px;
  --padding-start: 1px;
  --padding-end: 16px;
  margin-bottom: 12px;
}

.result-item ion-avatar {
  width: 48px;
  height: 48px;
  margin-right: 12px;
}

.tag-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.tag-icon ion-icon {
  font-size: 24px;
  color: #3B82F6;
}

.result-item ion-label h2 {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
  margin: 0;
}

.result-item ion-label p {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin: 4px 0 0 0;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--avatar-placeholder-bg, #444);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
}

body.light .avatar-placeholder {
  background: #999;
}

.verified-badge-small {
  display: inline-block;
  font-size: 16px;
  color: #1d9bf0;
  margin-left: 4px;
  vertical-align: middle;
}
.results-section,
.trending-header {
  margin-top: 24px;
  padding: 0 16px;
}

.section-header h3,
.trending-header h2 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.trending-header {
  margin-bottom: 16px;
}

.trending-header h2 {
  margin: 0 0 24px 0;
}

.posts-container {
  margin: 0 -7px;
}

.user-list {
  background: transparent;
  padding: 0;
}

.user-item {
  --background: var(--card-background);
  --color: var(--text-primary);
  --border-radius: 12px;
  --padding-start: 1px;
  --padding-end: 16px;
  margin-bottom: 25px;
}

.user-item ion-avatar {
  width: 48px;
  height: 48px;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--avatar-placeholder-bg, #444);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
}

body.light .avatar-placeholder {
  background: #999;
}

.user-item ion-label h2 {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
  margin: 0;
}

.user-item ion-label p {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin: 4px 0 0 0;
}

.empty-state,
.loading-state {
  text-align: center;
  padding: 80px 24px;
  color: var(--text-secondary);
}

.empty-state ion-icon {
  font-size: 4rem;
  opacity: 0.3;
  color: var(--text-secondary);
}

.empty-state p {
  margin-top: 16px;
  font-size: 0.95rem;
  color: var(--text-secondary);
}
</style>