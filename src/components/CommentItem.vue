<template>
  <div class="comment-wrapper">
    <div class="comment-item">
      <ion-avatar class="comment-avatar" @click="viewProfile">
        <img v-if="comment.users?.profile_photo_url" :src="comment.users.profile_photo_url" :alt="comment.users.full_name" />
        <div v-else class="avatar-placeholder">{{ getInitials(comment.users?.full_name) }}</div>
      </ion-avatar>
      
      <div class="comment-content">
        <div class="comment-header">
          <span class="user-name" @click="viewProfile">{{ comment.users?.full_name }}</span>
          <span class="timestamp">{{ formatDate(comment.created_at) }}</span>
        </div>
        
        <div class="comment-text" v-html="formattedContent"></div>
        
        <div class="comment-actions">
          <ion-button fill="clear" size="small" @click="toggleLike" class="action-btn">
            <ion-icon :icon="isLiked ? heart : heartOutline" :class="{ liked: isLiked }"></ion-icon>
            <span v-if="likesCount > 0">{{ likesCount }}</span>
          </ion-button>
          
          <ion-button v-if="depth < 3" fill="clear" size="small" @click="toggleReply" class="action-btn">
            <span>Reply</span>
          </ion-button>
          
          <ion-button 
            v-if="replies.length > 0 && depth === 0" 
            fill="clear" 
            size="small" 
            @click="toggleReplies" 
            class="action-btn toggle-replies-btn"
          >
            <span>{{ showReplies ? 'Hide' : 'Show' }} Replies ({{ replies.length }})</span>
          </ion-button>
          
          <ion-button 
            v-if="authStore.user?.id === comment.user_id" 
            fill="clear" 
            size="small" 
            @click="openDeleteConfirm" 
            :disabled="deletingComment"
            class="action-btn delete-btn"
          >
            <span>{{ deletingComment ? 'Deleting...' : 'Delete' }}</span>
          </ion-button>
        </div>

        <!-- Delete Confirmation Modal -->
        <div v-if="showDeleteConfirm" class="delete-modal-overlay" @click="cancelDelete">
          <div class="delete-modal" @click.stop>
            <div class="delete-modal-header">
              <h3>Delete Comment</h3>
            </div>
            <div class="delete-modal-body">
              <p>Are you sure you want to delete this comment? This action cannot be undone.</p>
            </div>
            <div class="delete-modal-actions">
              <button @click="cancelDelete" class="modal-btn cancel-btn">Cancel</button>
              <button @click="confirmDelete" class="modal-btn confirm-btn" :disabled="deletingComment">
                {{ deletingComment ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="showReplyInput" class="reply-input-section">
          <ion-avatar class="reply-avatar">
            <img v-if="authStore.user?.profile_photo_url" :src="authStore.user.profile_photo_url" :alt="authStore.user.full_name" />
            <div v-else class="avatar-placeholder-small">{{ getInitials(authStore.user?.full_name || authStore.user?.email) }}</div>
          </ion-avatar>

          <textarea v-model="replyText" placeholder="Write a reply..." rows="1" class="reply-input" @input="autoResizeReply" ref="replyInput"></textarea>

          <button @click="submitReply" :disabled="!replyText.trim() || submittingReply" class="reply-send-btn">
            <ion-icon :icon="send"></ion-icon>
          </button>
        </div>

        <div v-if="replies.length > 0 && showReplies" class="replies-section">
          <div v-for="reply in replies" :key="reply.id" class="reply-wrapper">
            <div class="thread-line"></div>
            <comment-item :comment="reply" :depth="depth + 1" @reply="$emit('reply', $event)" @delete="$emit('delete', $event)" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comment-wrapper{background:var(--background);}
.comment-item{display:flex;gap:10px;padding:10px 12px;margin-left: 10px;}
.comment-avatar{width:34px;height:34px;flex-shrink:0;cursor:pointer}
.avatar-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;font-weight:700;font-size:14px;border-radius:50%;}
.comment-content{flex:1;min-width:0}
.comment-header{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.user-name{color:var(--text-primary);font-weight:600;font-size:14px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
.user-name:hover{text-decoration:underline}
.timestamp{color:var(--text-secondary);font-size:12px}
.comment-text{color:var(--text-primary);font-size:14px;line-height:1.45;margin-bottom:7px;word-wrap:break-word}
.comment-text strong{font-weight:700;color:var(--text-primary)}
.comment-text em{font-style:italic;color:var(--text-primary)}
.comment-text del{text-decoration:line-through;color:var(--text-secondary);opacity:.7}
.comment-text code{background:var(--code-background);border:1px solid var(--border-color);border-radius:3px;padding:2px 5px;font-family:'Courier New',monospace;font-size:.85em;color:#8b9aff}
body.light .comment-text code{color:#5b6fd8}
.comment-text h1,.comment-text h2,.comment-text h3{margin:8px 0 4px;font-weight:600;color:var(--text-primary)}
.comment-text h1{font-size:1.4em}
.comment-text h2{font-size:1.2em}
.comment-text h3{font-size:1.1em}
.comment-text blockquote{border-left:3px solid #667eea;background:rgba(102,126,234,.05);padding:6px 10px;margin:6px 0;color:var(--text-secondary);font-style:italic;border-radius:4px}
body.light .comment-text blockquote{background:rgba(102,126,234,.08)}
.comment-text ul,.comment-text ol{margin:6px 0;padding-left:20px}
.comment-text li{margin:3px 0;color:var(--text-primary)}
.comment-actions{display:flex;align-items:center;gap:4px;margin-top:2px}
.action-btn{--color:var(--text-secondary);font-size:13px;height:28px;--padding-start:4px;--padding-end:4px;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
.action-btn:hover{--color:#667eea}
.action-btn ion-icon{font-size:18px;margin-right:2px}
.action-btn .liked{color:var(--text-secondary)!important;animation:heartPop 0.3s ease}
@keyframes heartPop{0%{transform:scale(1)}50%{transform:scale(1.2)}100%{transform:scale(1)}}
.action-btn span{font-size:13px;font-weight:500;margin-left:2px}

/* Delete button styling */
.delete-btn{--color:#ef4444!important}
.delete-btn:hover{--color:#dc2626!important}
.delete-btn:disabled{--color:#666!important;opacity:0.5;cursor:not-allowed}

/* Replies Section */
.replies-section{margin-top:8px;position:relative;padding-left:20px}
.replies-section::before{content:'';position:absolute;left:-30px;top:-55px;bottom:-10px;width:2px;background:var(--border-color);pointer-events:none;}
.reply-wrapper{position:relative;margin-bottom:2px}
.reply-wrapper:last-child{margin-bottom:0}
.thread-line{position:absolute;left:-50px;top:29px;width:68px;height:25px;border-left:2px solid var(--border-color);border-bottom:2px solid var(--border-color);border-bottom-left-radius:30px;pointer-events:none;}
.replies-section .replies-section::before{left:-24px;top:-45px;}
.replies-section .replies-section .thread-line{left:-43px;width:60px;}
body.light .thread-line{border-color:#e5e7eb}
.replies-section .comment-item{padding:8px 0;border-bottom:none;margin-left:0}
.replies-section .comment-avatar{width:30px;height:30px}
.replies-section .avatar-placeholder{font-size:13px;border-radius:50%;}

/* Reply input section */
.reply-input-section{display:flex;align-items:flex-end;gap:8px;margin-top:10px;padding:10px;background:var(--background-secondary);border-radius:12px;border:1px solid var(--border-color)}
.reply-avatar{width:30px;height:30px;flex-shrink:0}
.avatar-placeholder-small{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;font-weight:700;font-size:12px;border-radius:50%;}
.reply-input{
  flex:1;
  background:var(--input-background);
  border:1px solid var(--border-color);
  border-radius:16px;
  padding:8px 12px;
  color:var(--text-primary);
  /* KEY FIX: 16px prevents iOS auto-zoom on focus */
  font-size:16px;
  resize:none;
  font-family:inherit;
  outline:none;
  max-height:100px;
  overflow-y:auto;
  transition:border-color .2s;
  /* iOS fixes */
  -webkit-tap-highlight-color:transparent;
  touch-action:manipulation;
  -webkit-appearance:none;
  appearance:none;
}
.reply-input:focus{border-color:#667eea}
.reply-input::placeholder{color:var(--text-secondary)}
.reply-send-btn{
  width:32px;
  height:32px;
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
.reply-send-btn:hover:not(:disabled){transform:scale(1.05);filter:brightness(1.1)}
.reply-send-btn:disabled{background:#333;cursor:not-allowed;opacity:.5}
body.light .reply-send-btn:disabled{background:#ccc}
.reply-send-btn ion-icon{font-size:16px;color:#fff}

/* Delete Confirmation Modal */
.delete-modal-overlay{
  position:fixed;top:0;left:0;right:0;bottom:0;
  background:rgba(0,0,0,0.6);
  display:flex;align-items:center;justify-content:center;
  z-index:9999;padding:20px;
  backdrop-filter:blur(4px);
  animation:fadeIn 0.2s ease;
}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.delete-modal{
  background:var(--background);border-radius:16px;max-width:400px;width:100%;
  box-shadow:0 20px 60px rgba(0,0,0,0.3);
  animation:slideUp 0.3s ease;
  border:1px solid var(--border-color);
}
@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
.delete-modal-header{padding:20px 20px 10px;border-bottom:1px solid var(--border-color);}
.delete-modal-header h3{margin:0;font-size:18px;font-weight:600;color:var(--text-primary);}
.delete-modal-body{padding:20px;}
.delete-modal-body p{margin:0;color:var(--text-secondary);font-size:14px;line-height:1.5;}
.delete-modal-actions{padding:10px 20px 20px;display:flex;gap:10px;justify-content:flex-end;}
.modal-btn{
  padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;
  cursor:pointer;transition:all 0.2s;border:none;font-family:inherit;
  /* iOS fixes */
  -webkit-tap-highlight-color:transparent;
  touch-action:manipulation;
  -webkit-appearance:none;
  appearance:none;
}
.cancel-btn{background:var(--background-secondary);color:var(--text-primary);border:1px solid var(--border-color);}
.cancel-btn:hover{background:var(--border-color);}
.confirm-btn{background:#ef4444;color:#fff;}
.confirm-btn:hover:not(:disabled){background:#dc2626;transform:translateY(-1px);box-shadow:0 4px 12px rgba(239,68,68,0.3);}
.confirm-btn:disabled{background:#666;cursor:not-allowed;opacity:0.6;}
body.light .confirm-btn:disabled{background:#ccc;}
</style>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import { IonAvatar, IonButton, IonIcon } from '@ionic/vue'
import { heartOutline, heart, send } from 'ionicons/icons'

const props = defineProps({
  comment: Object,
  depth: { type: Number, default: 0 }
})

defineEmits(['reply', 'delete'])

const router = useRouter()
const authStore = useAuthStore()

const isLiked = ref(false)
const likesCount = ref(0)
const replies = ref([])
const showReplyInput = ref(false)
const replyText = ref('')
const submittingReply = ref(false)
const replyInput = ref(null)
const previousLikeMilestone = ref(0)
const showReplies = ref(true)
const deletingComment = ref(false)
const showDeleteConfirm = ref(false)

const formattedContent = computed(() => {
  if (!props.comment.content) return ''
  
  let html = escapeHtml(props.comment.content)
  
  html = html.replace(/@([a-zA-Z][a-zA-Z0-9\s]*)/g, (match, username) => {
    return `<span class="mention" style="color: #ef4444; font-weight: 600; cursor: pointer;" onclick="window.viewUserByMention('${username.trim()}')">@${username}</span>`
  })
  
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>')
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
  html = processLists(html)
  html = html.replace(/\n/g, '<br>')
  
  return html
})

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, m => map[m])
}

function processLists(html) {
  const lines = html.split('<br>')
  let result = []
  let inOrderedList = false
  let inUnorderedList = false
  
  for (let line of lines) {
    if (/^\d+\.\s+(.+)/.test(line)) {
      const match = line.match(/^\d+\.\s+(.+)/)
      if (!inOrderedList) {
        result.push('<ol>')
        inOrderedList = true
      }
      if (inUnorderedList) {
        result.push('</ul>')
        inUnorderedList = false
      }
      result.push(`<li>${match[1]}</li>`)
    } else if (/^[-*]\s+(.+)/.test(line)) {
      const match = line.match(/^[-*]\s+(.+)/)
      if (!inUnorderedList) {
        result.push('<ul>')
        inUnorderedList = true
      }
      if (inOrderedList) {
        result.push('</ol>')
        inOrderedList = false
      }
      result.push(`<li>${match[1]}</li>`)
    } else {
      if (inOrderedList) {
        result.push('</ol>')
        inOrderedList = false
      }
      if (inUnorderedList) {
        result.push('</ul>')
        inUnorderedList = false
      }
      result.push(line)
    }
  }
  
  if (inOrderedList) result.push('</ol>')
  if (inUnorderedList) result.push('</ul>')
  
  return result.join('<br>')
}

onMounted(async () => {
  await loadLikes()
  if (props.depth < 3) {
    await loadReplies()
  }
  
  window.viewUserByMention = async (username) => {
    const { data: user } = await supabase.from('users').select('id').ilike('full_name', username).single()
    if (user) router.push(`/user/${user.id}`)
  }
})

async function loadLikes() {
  const likesTable = props.depth === 0 ? 'comment_likes' : 'comment_reply_likes'

  try {
    const { count, error: countError } = await supabase
      .from(likesTable)
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', props.comment.id)
    
    if (!countError) {
      previousLikeMilestone.value = getLikeMilestone(count || 0)
      likesCount.value = count || 0
    }

    if (authStore.user) {
      const { data } = await supabase
        .from(likesTable)
        .select('id')
        .eq('comment_id', props.comment.id)
        .eq('user_id', authStore.user.id)
        .single()
      
      isLiked.value = !!data
    }
  } catch (err) {
    console.error('Error loading likes:', err)
  }
}

function getLikeMilestone(count) {
  const milestones = [5, 100, 500, 5000]
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (count >= milestones[i]) return milestones[i]
  }
  return 0
}

async function loadReplies() {
  try {
    const { data } = await supabase
      .from('comments')
      .select(`*, users (full_name, profile_photo_url)`)
      .eq('parent_comment_id', props.comment.id)
      .order('created_at', { ascending: true })
    
    replies.value = data || []
  } catch (err) {
    console.error('Error loading replies:', err)
  }
}

async function toggleLike() {
  if (!authStore.user) {
    router.push('/login')
    return
  }

  const likesTable = props.depth === 0 ? 'comment_likes' : 'comment_reply_likes'

  try {
    if (isLiked.value) {
      const { error } = await supabase
        .from(likesTable)
        .delete()
        .eq('comment_id', props.comment.id)
        .eq('user_id', authStore.user.id)
      
      if (error) throw error
      
      isLiked.value = false
      likesCount.value--
      
    } else {
      const { error } = await supabase
        .from(likesTable)
        .insert({ 
          comment_id: props.comment.id, 
          user_id: authStore.user.id 
        })
      
      if (error) throw error
      
      isLiked.value = true
      likesCount.value++
      
      const newMilestone = getLikeMilestone(likesCount.value)
      if (newMilestone > previousLikeMilestone.value) {
        await sendLikeMilestoneNotification(newMilestone)
        previousLikeMilestone.value = newMilestone
      }
      
      if (props.comment.user_id !== authStore.user.id) {
        const notificationType = props.depth === 0 ? 'comment_like' : 'reply_like'
        
        await supabase
          .from('notifications')
          .insert({ 
            recipient_id: props.comment.user_id, 
            actor_id: authStore.user.id, 
            type: notificationType, 
            comment_id: props.comment.id, 
            is_read: false, 
            status: 'active' 
          })
      }
    }
  } catch (err) {
    console.error('Error toggling like:', err)
  }
}

async function sendLikeMilestoneNotification(milestone) {
  if (props.comment.user_id !== authStore.user.id) {
    try {
      await supabase
        .from('notifications')
        .insert({ 
          recipient_id: props.comment.user_id, 
          actor_id: authStore.user.id, 
          type: 'like_milestone', 
          comment_id: props.comment.id, 
          is_read: false, 
          status: 'active' 
        })
    } catch (err) {
      console.error('Error sending milestone notification:', err)
    }
  }
}

function toggleReply() {
  showReplyInput.value = !showReplyInput.value
  if (showReplyInput.value) {
    nextTick(() => { replyInput.value?.focus() })
  }
}

function autoResizeReply(e) {
  e.target.style.height = 'auto'
  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
}

async function submitReply() {
  if (!replyText.value.trim() || submittingReply.value) return

  if (!authStore.user) {
    router.push('/login')
    return
  }

  submittingReply.value = true

  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({ 
        post_id: props.comment.post_id, 
        user_id: authStore.user.id, 
        parent_comment_id: props.comment.id, 
        content: replyText.value.trim() 
      })
      .select(`*, users (full_name, profile_photo_url)`)
      .single()

    if (error) throw error

    if (data) {
      replies.value.push(data)
      replyText.value = ''
      showReplyInput.value = false
      
      if (props.comment.user_id !== authStore.user.id) {
        await supabase
          .from('notifications')
          .insert({ 
            recipient_id: props.comment.user_id, 
            actor_id: authStore.user.id, 
            type: 'comment_reply', 
            comment_id: data.id, 
            is_read: false, 
            status: 'active' 
          })
      }
    }
  } catch (err) {
    console.error('Error submitting reply:', err)
  } finally {
    submittingReply.value = false
  }
}

function toggleReplies() {
  showReplies.value = !showReplies.value
}

function openDeleteConfirm() {
  showDeleteConfirm.value = true
}

function cancelDelete() {
  showDeleteConfirm.value = false
}

async function confirmDelete() {
  showDeleteConfirm.value = false
  await deleteComment()
}

async function deleteComment() {
  if (deletingComment.value) return
  
  deletingComment.value = true
  
  try {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', props.comment.id)
    
    if (error) throw error
    
    window.location.reload()
    
  } catch (err) {
    console.error('Error deleting comment:', err)
  } finally {
    deletingComment.value = false
  }
}

function viewProfile() {
  if (props.comment.user_id) {
    router.push(`/user/${props.comment.user_id}`)
  }
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>



