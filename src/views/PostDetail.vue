<template>
  <ion-page>
    <ion-header :style="{ borderBottom: `1px solid var(--border-color)` }">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Post</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="!post" class="loading-state"><ion-spinner color="primary"></ion-spinner></div>
      <div v-else :style="{ background: 'var(--background)', marginBottom: '8px', borderBottom: `1px solid #777` }">
        <post-card :post="post" />
      </div>

      <div class="comments-container">
        <div class="comments-header">
          <h3>
            <span v-for="(word, index) in ['Comments', `(${comments.length})`]" :key="index" class="word" :style="{ animationDelay: `${index * 0.15}s` }">{{ word }}</span>
          </h3>
        </div>

        <div class="comment-input-section">
          <ion-avatar class="input-avatar" style="margin-left: 18px;">
            <img v-if="authStore.user?.profile_photo_url" :src="authStore.user.profile_photo_url" :alt="authStore.user.full_name" />
            <div v-else class="avatar-placeholder">{{ getInitials(authStore.user?.full_name || authStore.user?.email) }}</div>
          </ion-avatar>
          <textarea v-model="newComment" placeholder="Add a comment..." rows="1" class="comment-input" style="margin-left: 5px;" @input="autoResize" ref="commentInput"></textarea>
          <button @click="submitComment" :disabled="!newComment.trim() || submitting" class="send-btn">
            <ion-icon :icon="send"></ion-icon>
          </button>
        </div>

        <div v-if="loading" class="loading-state"><ion-spinner color="primary"></ion-spinner></div>
        <div v-else-if="comments.length === 0" class="empty-state">
          <ion-icon :icon="chatbubbleOutline" class="empty-icon"></ion-icon>
          <p class="empty-text">No comments yet</p>
          <p class="empty-subtext">Be the first to share your thoughts!</p>
        </div>

        <div v-else class="comments-list">
          <comment-item v-for="(comment, index) in comments" :key="comment.id" :comment="comment" :index="index" />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-header{border-bottom:1px solid var(--border-color)}
ion-toolbar{--background:var(--background);--color:var(--text-primary)}
ion-content{--background:var(--background)}
.word{display:inline-block;margin-right:.3em;opacity:0;animation:fadeInUp .6s ease-out forwards;background:var(--text-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
@keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.comments-container{padding:0 0 12px 0;background:var(--background);min-height:calc(100vh - 200px)}
.comments-header{padding:8px 12px 6px}
.comments-header h3{margin:0;font-size:15px;font-weight:600;color:var(--text-primary)}
.comment-input-section{padding:10px 12px;border-bottom:1px solid var(--border-color);display:flex;align-items:flex-end;gap:8px;background:var(--background)}
.loading-state,.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center}
.empty-icon{font-size:64px;color:var(--text-secondary);margin-bottom:16px;opacity:.5}
.empty-text{margin:0 0 8px;color:var(--text-primary);font-size:16px;font-weight:600}
.empty-subtext{margin:0;color:var(--text-secondary);font-size:14px}
.comments-list{padding:0}
.input-avatar{width:32px;height:32px;flex-shrink:0}
.avatar-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;font-weight:700;font-size:13px;border-radius:50%}
.comment-input{
  flex:1;
  background:var(--input-background);
  border-radius:18px;
  padding:8px 14px;
  color:var(--text-primary);
  /* KEY FIX: 16px prevents iOS auto-zoom on focus */
  font-size:16px;
  resize:none;
  font-family:inherit;
  outline:none;
  max-height:120px;
  overflow-y:auto;
  transition:border-color .2s;
  /* iOS fixes */
  -webkit-tap-highlight-color:transparent;
  touch-action:manipulation;
  -webkit-appearance:none;
  appearance:none;
}
.comment-input:focus{border-color:#667eea}
.comment-input::placeholder{color:var(--placeholder-color)}
.send-btn{
  width:36px;
  height:36px;
  border-radius:50%;
  background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
  border:none;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  transition:all .2s;
  flex-shrink:0;
  /* iOS fixes */
  -webkit-tap-highlight-color:transparent;
  touch-action:manipulation;
  -webkit-appearance:none;
  appearance:none;
}
.send-btn:hover:not(:disabled){transform:scale(1.05);filter:brightness(1.1)}
.send-btn:disabled{background:#333;cursor:not-allowed;opacity:.5}
:global(body.light) .send-btn:disabled{background:#ccc}
.send-btn ion-icon{font-size:18px;color:#fff}
</style>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import PostCard from '@/components/PostCard.vue'
import CommentItem from '@/components/CommentItem.vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonAvatar, IonSpinner, IonIcon } from '@ionic/vue'
import { chatbubbleOutline, send } from 'ionicons/icons'

const route = useRoute()
const authStore = useAuthStore()
const post = ref(null)
const comments = ref([])
const newComment = ref('')
const loading = ref(true)
const submitting = ref(false)
const commentInput = ref(null)

onMounted(async () => {
  await Promise.all([loadPost(), loadComments()])
})

async function loadPost() {
  try {
    const { data, error } = await supabase.from('posts').select(`*, users (full_name, college_hospital, profile_photo_url)`).eq('id', route.params.id).single()
    if (!error) post.value = data
  } catch (err) {
    console.error('Error loading post:', err)
  }
}

async function loadComments() {
  loading.value = true
  try {
    const { data } = await supabase.from('comments').select(`*, users (full_name, profile_photo_url)`).eq('post_id', route.params.id).is('parent_comment_id', null).order('created_at', { ascending: false })
    comments.value = data || []
  } catch (err) {
    console.error('Error loading comments:', err)
  } finally {
    loading.value = false
  }
}

async function submitComment() {
  if (!newComment.value.trim()) return
  submitting.value = true
  const { data, error } = await supabase.from('comments').insert({ post_id: route.params.id, user_id: authStore.user.id, content: newComment.value.trim() }).select(`*, users (full_name, profile_photo_url)`).single()
  submitting.value = false
  if (!error) {
    comments.value.unshift(data)
    newComment.value = ''
    if (commentInput.value) commentInput.value.style.height = 'auto'
    if (post.value.user_id !== authStore.user.id) {
      await supabase.from('notifications').insert({ recipient_id: post.value.user_id, actor_id: authStore.user.id, type: 'post_comment', post_id: post.value.id, comment_id: data.id, is_read: false, status: 'active' })
    }
  }
}

function autoResize(e) {
  e.target.style.height = 'auto'
  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
}

function getInitials(text) {
  if (!text) return '?'
  return text.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
</script>