<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Post</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="post-page-content">
      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
      </div>

      <div v-else-if="post" class="post-container">
        <!-- Post Card -->
        <PostCard :post="post" />

        <!-- Comments Section -->
        <div class="comments-section">
          <div class="comments-header">
            <h3>Comments ({{ comments.length }})</h3>
          </div>

          <!-- Comment Input -->
          <div class="comment-input-container">
            <ion-avatar class="input-avatar">
              <img 
                v-if="authStore.user?.user_metadata?.avatar_url" 
                :src="authStore.user.user_metadata.avatar_url"
                alt="Your avatar"
              />
              <div v-else class="avatar-placeholder">
                {{ getInitials(authStore.user?.user_metadata?.full_name) }}
              </div>
            </ion-avatar>

            <div class="input-wrapper">
              <textarea
                v-model="newComment"
                placeholder="Add a comment..."
                rows="1"
                @input="autoResize"
                @keydown.enter.exact.prevent="addComment"
                ref="commentInput"
              ></textarea>
              
              <ion-button 
                v-if="newComment.trim()"
                fill="clear"
                @click="addComment"
                :disabled="submitting"
                class="send-btn"
              >
                <ion-icon 
                  :icon="submitting ? hourglassOutline : sendSharp"
                ></ion-icon>
              </ion-button>
            </div>
          </div>

          <!-- Comments List -->
          <div class="comments-list">
            <CommentItem 
              v-for="comment in comments" 
              :key="comment.id"
              :comment="comment"
              @reply="handleReply"
            />

            <div v-if="comments.length === 0" class="no-comments">
              <ion-icon :icon="chatbubbleOutline"></ion-icon>
              <p>No comments yet</p>
              <p class="subtext">Be the first to comment!</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="error-container">
        <ion-icon :icon="alertCircle"></ion-icon>
        <p>Post not found</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import PostCard from '@/components/PostCard.vue'
import CommentItem from '@/components/CommentItem.vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonSpinner,
  IonAvatar,
  IonButton,
  IonIcon
} from '@ionic/vue'
import { 
  chatbubbleOutline, 
  sendSharp, 
  hourglassOutline,
  alertCircle 
} from 'ionicons/icons'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const post = ref(null)
const comments = ref([])
const newComment = ref('')
const submitting = ref(false)
const commentInput = ref(null)

onMounted(async () => {
  await loadPost()
  await loadComments()
})

async function loadPost() {
  loading.value = true
  
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      users (
        id,
        full_name,
        college_hospital,
        profile_photo_url
      )
    `)
    .eq('id', route.params.id)
    .single()

  if (error) {
    console.error('Error loading post:', error)
    loading.value = false
    return
  }

  post.value = data
  loading.value = false
}

async function loadComments() {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      users (
        id,
        full_name,
        profile_photo_url
      )
    `)
    .eq('post_id', route.params.id)
    .order('created_at', { ascending: true })

  if (!error && data) {
    comments.value = data
  }
}

async function addComment() {
  if (!newComment.value.trim() || submitting.value) return

  if (!authStore.user) {
    router.push('/login')
    return
  }

  submitting.value = true

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: route.params.id,
      user_id: authStore.user.id,
      content: newComment.value.trim()
    })
    .select(`
      *,
      users (
        id,
        full_name,
        profile_photo_url
      )
    `)
    .single()

  submitting.value = false

  if (error) {
    console.error('Error adding comment:', error)
    return
  }

  comments.value.push(data)
  newComment.value = ''
  
  // Reset textarea height
  if (commentInput.value) {
    commentInput.value.style.height = 'auto'
  }
}

function autoResize(event) {
  const textarea = event.target
  textarea.style.height = 'auto'
  textarea.style.height = textarea.scrollHeight + 'px'
}

function handleReply(commentId) {
  // Focus on input and add @mention
  if (commentInput.value) {
    const comment = comments.value.find(c => c.id === commentId)
    if (comment) {
      newComment.value = `@${comment.users.full_name} `
      commentInput.value.focus()
    }
  }
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
.post-page-content {
  --background: var(--background);
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  gap: 16px;
}

.error-container ion-icon {
  font-size: 64px;
  color: var(--text-secondary);
}

.error-container p {
  font-size: 1.1rem;
  margin: 0;
  color: var(--text-primary);
}

.post-container {
  max-width: 640px;
  margin: 0 auto;
  background: var(--background);
}

/* Toolbar Styling */
ion-toolbar {
  --background: var(--background);
  --border-color: var(--border-color);
}

ion-title {
  color: var(--text-primary);
}

ion-back-button {
  --color: var(--text-primary);
}
</style>