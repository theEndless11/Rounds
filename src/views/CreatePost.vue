<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="handleClose">
            <ion-icon :icon="arrowBack" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Create Post</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleCreatePost" :disabled="loading || !content || uploading || selectedTags.length === 0" class="post-button" fill="solid" color="primary">
            {{ uploading ? 'Uploading...' : loading ? 'Posting...' : 'Post' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" @click="handleContentClick">
      <div class="create-post-container">
        <!-- User Info -->
        
        
        <!-- Tags Section -->
        <div class="tags-section" ref="tagsSectionRef">
          <button @click.stop="toggleTags" class="tags-btn" type="button">
            <span class="tags-btn-inner">
              <ion-icon :icon="'pricetag-outline'"></ion-icon>
              <span class="tags-btn-text">Choose tags<span class="required-star">*</span></span>
              <span v-if="selectedTags.length > 0" class="tag-badge">{{ selectedTags.length }}</span>
            </span>
          </button>
          
          <div v-if="showTags" class="tags-dropdown" @click.stop>
            <div class="tags-dropdown-header">
              <span class="tags-title">Choose up to 3 tags</span>
              <span class="tag-count">{{ selectedTags.length }}/3</span>
            </div>
            
            <div v-if="selectedTags.length > 0" class="selected-tags">
              <ion-chip v-for="tag in selectedTags" :key="tag" @click="removeSelectedTag(tag)" class="selected-tag-chip">
                <ion-label>{{ tag }}</ion-label>
                <ion-icon :icon="closeCircle" style="color: var(--border-radius);"></ion-icon>
              </ion-chip>
            </div>
            
            <div class="tags-grid">
              <button v-for="tag in availableTags" :key="tag" @click="selectTag(tag)" type="button"
                :class="['tag-chip', { 'selected': selectedTags.includes(tag), 'disabled': selectedTags.length >= 3 && !selectedTags.includes(tag) }]"
                :disabled="selectedTags.length >= 3 && !selectedTags.includes(tag)">
                {{ tag }}
              </button>
            </div>
            
            <div class="custom-tag-section">
              <div class="custom-tag-header">Or create your own tag</div>
              <div class="custom-tag-input-wrapper">
                <input v-model="customTagInput" @keyup.enter="addCustomTag" placeholder="Type here" 
                  class="custom-tag-input" maxlength="30" :disabled="selectedTags.length >= 3"/>
                <button @click="addCustomTag" :disabled="!customTagInput.trim() || selectedTags.length >= 3" 
                  class="add-custom-tag-btn" type="button">
                  Select
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Text Input -->
        <div class="input-section">
          <textarea v-model="content" @input="handleInput" placeholder="What's on your mind?" ref="textareaRef" class="post-textarea" :maxlength="500"></textarea>
          
          <!-- Mention Dropdown -->
          <div v-if="showMentions && mentionResults.length > 0" class="mention-dropdown">
            <div v-for="user in mentionResults" :key="user.id" @click="selectMention(user)" class="mention-item">
              <ion-avatar class="mention-avatar">
                <img v-if="user.profile_photo_url" :src="user.profile_photo_url" :alt="user.full_name"/>
                <div v-else class="avatar-placeholder">{{ getInitials(user.full_name) }}</div>
              </ion-avatar>
              <div class="mention-info">
                <span class="mention-name">{{ user.full_name }}</span>
                <span class="mention-detail">{{ user.college_hospital }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Media Preview Grid -->
        <div v-if="mediaFiles.length > 0" class="media-preview-grid">
          <div v-for="(media, index) in mediaFiles" :key="index" class="media-preview-item">
            <img v-if="media.type === 'image'" :src="media.preview" alt="Preview" />
            <video v-else :src="media.preview" class="video-preview"></video>
            <button class="remove-media-btn" @click="removeMedia(index)" :disabled="uploading" type="button">
              <ion-icon :icon="closeCircle"></ion-icon>
            </button>
            <div v-if="media.uploading" class="upload-progress">
              <ion-spinner name="crescent"></ion-spinner>
              <p>{{ media.progress }}%</p>
            </div>
          </div>
        </div>

        <!-- Tagged Users -->
        <div v-if="taggedUsers.length > 0" class="tagged-users-section">
          <div class="tagged-chips">
            <ion-chip v-for="user in taggedUsers" :key="user.id" @click="removeTag(user.id)" class="user-tag-chip">
              <ion-avatar>
                <img v-if="user.profile_photo_url" :src="user.profile_photo_url" :alt="user.full_name"/>
                <div v-else class="avatar-placeholder">{{ getInitials(user.full_name) }}</div>
              </ion-avatar>
              <ion-label>{{ user.full_name }}</ion-label>
              <ion-icon :icon="closeCircle"></ion-icon>
            </ion-chip>
          </div>
        </div>

        <!-- Messages -->
        <div v-if="error" class="error-message">
          <ion-icon :icon="alertCircle"></ion-icon>
          {{ error }}
        </div>
        <div v-if="success" class="success-message">
          <ion-icon :icon="checkmarkCircle"></ion-icon>
          Post created successfully!
        </div>
      </div>
    </ion-content>

    <!-- Bottom Toolbar -->
    <ion-footer>
      <ion-toolbar class="bottom-toolbar">
        <div class="toolbar-content">
          <div class="toolbar-actions">
            <button @click="triggerImageInput" :disabled="mediaFiles.length >= 6 || uploading" class="toolbar-btn" type="button" title="Add images">
              <ion-icon :icon="imagesOutline"></ion-icon>
            </button>
            <button @click="triggerVideoInput" :disabled="mediaFiles.length >= 6 || uploading" class="toolbar-btn" type="button" title="Add video">
              <ion-icon :icon="playCircleOutline"></ion-icon>
            </button>
          </div>
          <div class="char-count">{{ content.length }}/500</div>
        </div>
      </ion-toolbar>
    </ion-footer>

    <input ref="imageInputRef" type="file" accept="image/*" multiple style="display: none" @change="handleFileSelect"/>
    <input ref="videoInputRef" type="file" accept="video/*" style="display: none" @change="handleFileSelect"/>
  </ion-page>
</template>

<style scoped>
.create-post-container{padding:16px;min-height:100%}
.required-star{color:#ef4444;margin-left:2px;font-weight:700}
.user-section{display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:16px}
.user-avatar{width:48px;height:48px;flex-shrink:0}
.avatar-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;font-weight:600;font-size:16px}
.user-info{flex:1}
.user-name{font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:2px}
.user-specialty{font-size:14px;color:var(--text-secondary)}
.tags-section{position:relative;margin-bottom:0;padding-bottom:16px;border-bottom:1px solid var(--border-color)}
.tags-btn{all:unset;box-sizing:border-box;display:block;width:fit-content;background:var(--input-background);border:1.5px solid #3b82f6;border-radius:9999px;padding:6px 20px 6px 0px;min-height:36px;cursor:pointer;transition:all .2s ease;position:relative;overflow:hidden;font-size:14px;font-weight:600;color:var(--text-primary);font-family:inherit}
.tags-btn-inner{display:flex;align-items:center;gap:8px}
.tags-btn-text{white-space:nowrap}
.tags-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(59,130,246,.1),rgba(139,92,246,.1));opacity:0;transition:opacity .2s ease;pointer-events:none}
.tags-btn:hover::before{opacity:1}
.tags-btn:hover{border-color:#2563eb;transform:translateY(-1px);box-shadow:0 4px 12px rgba(59,130,246,.2)}
.tags-btn:active{transform:translateY(0);box-shadow:0 2px 6px rgba(59,130,246,.15)}
.tags-btn ion-icon{font-size:18px;color:#3b82f6;flex-shrink:0;transition:transform .2s ease}
.tags-btn:hover ion-icon{transform:rotate(10deg) scale(1.1)}
.tag-badge{display:flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;font-size:11px;font-weight:700;background:#3b82f6;color:#fff;border-radius:9999px;flex-shrink:0}
.tags-dropdown{position:absolute;top:calc(100% + 8px);left:0;right:0;background:var(--card-background);border:1px solid var(--border-color);border-radius:16px;padding:16px;z-index:100;box-shadow:0 8px 24px rgba(0,0,0,.15);backdrop-filter:blur(10px);animation:slideDown .2s ease-out}
@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
.tags-dropdown-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.tags-title{font-size:14px;font-weight:600;color:var(--text-primary)}
.tag-count{font-size:13px;color:var(--text-secondary)}
.selected-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.selected-tag-chip{--background:var(--input-background);--color:var(--text-primary);cursor:pointer;height:28px;font-size:12px}
.tags-grid{display:flex;flex-wrap:wrap;gap:8px}
.tag-chip{all:unset;box-sizing:border-box;background:var(--input-background);border:1.5px solid var(--border-color);color:var(--text-primary);border-radius:20px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s ease;position:relative;overflow:hidden}
.tag-chip::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(59,130,246,.05),rgba(139,92,246,.05));opacity:0;transition:opacity .2s ease}
.tag-chip:hover:not(.disabled)::before{opacity:1}
.tag-chip:hover:not(.disabled){border-color:#3b82f6;transform:translateY(-2px);box-shadow:0 4px 8px rgba(59,130,246,.15)}
.tag-chip.selected{background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(59,130,246,.3)}
.tag-chip.selected:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(59,130,246,.4)}
.tag-chip.disabled{opacity:.35;cursor:not-allowed;filter:grayscale(1)}
.custom-tag-section{margin-top:16px;padding-top:16px;border-top:1px solid var(--border-color)}
.custom-tag-header{font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px}
.custom-tag-input-wrapper{display:flex;gap:8px}
.custom-tag-input{flex:1;background:var(--input-background);border:1.5px solid var(--border-color);border-radius:12px;padding:10px 14px;font-size:14px;color:var(--text-primary);outline:none;transition:all .2s ease;font-family:inherit}
.custom-tag-input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
.custom-tag-input:disabled{opacity:.5;cursor:not-allowed}
.add-custom-tag-btn{all:unset;box-sizing:border-box;background:#3b82f6;color:#fff;border-radius:999px;padding:4px 11px;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s ease;white-space:nowrap}
.add-custom-tag-btn:hover:not(:disabled){background:#2563eb;transform:translateY(-1px);box-shadow:0 4px 12px rgba(59,130,246,.3)}
.add-custom-tag-btn:disabled{opacity:.5;cursor:not-allowed}
.input-section{position:relative;margin-bottom:0}
.post-textarea{width:100%;min-height:55vh;background:transparent;border:none;padding:16px;color:var(--text-primary);font-size:16px;line-height:1.5;resize:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;outline:none}
.post-textarea::placeholder{color:var(--text-secondary);opacity:.6}
.mention-dropdown{position:absolute;bottom:100%;left:0;right:0;background:var(--card-background);border:1px solid var(--border-color);border-radius:12px;margin-bottom:8px;max-height:240px;overflow-y:auto;z-index:100;box-shadow:0 4px 16px rgba(0,0,0,.15)}
.mention-item{display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;transition:background .2s}
.mention-item:hover{background:var(--card-hover)}
.mention-avatar{width:36px;height:36px}
.mention-info{flex:1}
.mention-name{display:block;font-size:14px;font-weight:600;color:var(--text-primary)}
.mention-detail{display:block;font-size:12px;color:var(--text-secondary);margin-top:2px}
.media-preview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;margin-bottom:16px}
.media-preview-item{position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;background:var(--media-background)}
.media-preview-item img,.video-preview{width:100%;height:100%;object-fit:cover}
.remove-media-btn{all:unset;box-sizing:border-box;position:absolute;top:8px;right:8px;background:rgba(0,0,0,.75);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:20px;transition:all .2s}
.remove-media-btn:hover{background:rgba(220,38,38,.9);transform:scale(1.1)}
.upload-progress{position:absolute;inset:0;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff}
.upload-progress p{margin:8px 0 0;font-size:13px;font-weight:600}
.tagged-users-section{margin-bottom:16px}
.tagged-chips{display:flex;flex-wrap:wrap;gap:8px}
.user-tag-chip{--background:var(--input-background);--color:var(--text-primary);cursor:pointer;height:32px;font-size:13px}
.user-tag-chip ion-avatar{width:24px;height:24px}
.error-message,.success-message{position: fixed;top: 80%; display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:12px;font-size:14px;margin-bottom:25px}
.error-message{background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.3);}
.success-message{background:rgba(34,197,94,.1);color:#22c55e;border:1px solid rgba(34,197,94,.3)}
.bottom-toolbar{--background:var(--background-secondary);--border-color:var(--border-color);border-top:1px solid var(--border-color)}
.toolbar-content{display:flex;align-items:center;justify-content:space-between;padding:8px 16px}
.toolbar-actions{display:flex;gap:16px}
.toolbar-btn{all:unset;box-sizing:border-box;padding:8px;cursor:pointer;color:#3b82f6;font-size:24px;display:flex;align-items:center;justify-content:center;transition:all .2s}
.toolbar-btn:hover:not(:disabled){color:#2563eb;transform:scale(1.1)}
.toolbar-btn:disabled{opacity:.4;cursor:not-allowed}
.char-count{font-size:14px;color:var(--text-secondary);font-weight:500}
ion-button.post-button{--background:#3bbef6b8;--background-hover:#2563eb;--color:#fff;--border-radius:17px;--padding-start:17px;--padding-end:17px;font-weight:100;font-size:13px;height:30px;margin-right:20px}
ion-button.post-button::part(native){border-radius:20px}
</style>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import { Preferences } from '@capacitor/preferences'
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonButtons, IonButton, IonAvatar, IonIcon, IonSpinner, IonChip, IonLabel
} from '@ionic/vue'
import { 
  close, imagesOutline, closeCircle, checkmarkCircle, 
  alertCircle, playCircleOutline, arrowBack, trashOutline, saveOutline
} from 'ionicons/icons'

const authStore = useAuthStore()

const userProfile = ref(null)
const content = ref('')
const loading = ref(false)
const uploading = ref(false)
const error = ref('')
const success = ref(false)
const mediaFiles = ref([])
const imageInputRef = ref(null)
const videoInputRef = ref(null)
const textareaRef = ref(null)
const tagsSectionRef = ref(null)

const showMentions = ref(false)
const mentionResults = ref([])
const taggedUsers = ref([])
const mentionQuery = ref('')
const mentionStartPos = ref(0)

const showTags = ref(false)
const selectedTags = ref([])
const customTagInput = ref('')
const availableTags = ref([
  'Research', 'Cardiology', 'Neurology', 'Pediatrics', 
  'Surgery', 'Radiology', 'Oncology', 'General Medicine', 
  'Psychiatry', 'Emergency Medicine'
])

const BACKEND_API_URL = 'https://octopus-push-api-production-e5b8.up.railway.app/api'

//https://cred-3wm2.onrender.com
const DRAFT_KEY = 'post_draft'
const DRAFT_MEDIA_KEY = 'post_draft_media'

onMounted(async () => {
  if (authStore.user) {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, profile_photo_url, college_hospital')
      .eq('id', authStore.user.id)
      .single()
    
    if (data) {
      userProfile.value = data
    }
  }
  
  await loadDraft()
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})

watch([content, selectedTags, taggedUsers, mediaFiles], () => {
  saveDraftAuto()
}, { deep: true })

async function saveDraftAuto() {
  const draft = {
    content: content.value,
    selectedTags: selectedTags.value,
    taggedUsers: taggedUsers.value,
    timestamp: Date.now()
  }
  
  await Preferences.set({
    key: DRAFT_KEY,
    value: JSON.stringify(draft)
  })
  
  if (mediaFiles.value.length > 0) {
    const mediaData = mediaFiles.value.map(m => ({
      preview: m.preview,
      type: m.type
    }))
    await Preferences.set({
      key: DRAFT_MEDIA_KEY,
      value: JSON.stringify(mediaData)
    })
  } else {
    await Preferences.remove({ key: DRAFT_MEDIA_KEY })
  }
}

async function loadDraft() {
  const { value: saved } = await Preferences.get({ key: DRAFT_KEY })
  if (saved) {
    try {
      const draft = JSON.parse(saved)
      content.value = draft.content || ''
      selectedTags.value = draft.selectedTags || []
      taggedUsers.value = draft.taggedUsers || []
    } catch (e) {
      console.error('Failed to load draft:', e)
    }
  }
  
  const { value: savedMedia } = await Preferences.get({ key: DRAFT_MEDIA_KEY })
  if (savedMedia) {
    try {
      const mediaData = JSON.parse(savedMedia)
      mediaFiles.value = mediaData.map(m => ({
        preview: m.preview,
        type: m.type,
        uploading: false,
        progress: 0,
        url: null,
        key: null,
        file: null
      }))
    } catch (e) {
      console.error('Failed to load media draft:', e)
    }
  }
}

function handleOutsideClick(event) {
  if (showTags.value && tagsSectionRef.value && !tagsSectionRef.value.contains(event.target)) {
    showTags.value = false
  }
}

function handleContentClick(event) {
  if (showTags.value && tagsSectionRef.value && !tagsSectionRef.value.contains(event.target)) {
    showTags.value = false
  }
}

function toggleTags() {
  showTags.value = !showTags.value
}

function handleClose() {
  window.history.back()
}

function selectTag(tag) {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter(t => t !== tag)
  } else if (selectedTags.value.length < 3) {
    selectedTags.value.push(tag)
  }
}

function removeSelectedTag(tag) {
  selectedTags.value = selectedTags.value.filter(t => t !== tag)
}

function addCustomTag() {
  const tag = customTagInput.value.trim()
  if (tag && selectedTags.value.length < 3 && !selectedTags.value.includes(tag)) {
    selectedTags.value.push(tag)
    customTagInput.value = ''
  }
}

async function handleInput(e) {
  const text = e.target.value
  const cursorPos = e.target.selectionStart
  const textBeforeCursor = text.slice(0, cursorPos)
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')
  
  if (lastAtIndex !== -1 && lastAtIndex === cursorPos - 1) {
    showMentions.value = true
    mentionStartPos.value = lastAtIndex
    mentionQuery.value = ''
    await searchMentions('')
  } else if (lastAtIndex !== -1 && showMentions.value) {
    const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
    if (/^[a-zA-Z0-9_\s]*$/.test(textAfterAt) && !textAfterAt.includes(' ')) {
      mentionQuery.value = textAfterAt
      await searchMentions(textAfterAt)
    } else {
      showMentions.value = false
    }
  } else {
    showMentions.value = false
  }
}

async function searchMentions(query) {
  if (!query) {
    const { data } = await supabase
      .from('follows')
      .select('following:users!follows_following_id_fkey(id, full_name, college_hospital, profile_photo_url)')
      .eq('follower_id', authStore.user.id)
      .limit(10)
    
    mentionResults.value = data?.map(d => d.following).filter(Boolean) || []
  } else {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, college_hospital, profile_photo_url')
      .ilike('full_name', `%${query}%`)
      .neq('id', authStore.user.id)
      .limit(10)
    
    mentionResults.value = data || []
  }
}

function selectMention(user) {
  const textarea = textareaRef.value
  const text = content.value
  const beforeMention = text.slice(0, mentionStartPos.value)
  const afterCursor = text.slice(textarea.selectionStart)
  
  content.value = `${beforeMention}@${user.full_name}${afterCursor}`
  
  if (!taggedUsers.value.find(u => u.id === user.id)) {
    taggedUsers.value.push(user)
  }
  
  showMentions.value = false
  
  setTimeout(() => {
    const newPos = beforeMention.length + user.full_name.length + 1
    textarea.setSelectionRange(newPos, newPos)
    textarea.focus()
  }, 0)
}

function removeTag(userId) {
  const user = taggedUsers.value.find(u => u.id === userId)
  if (user) {
    content.value = content.value.replace(`@${user.full_name}`, '')
    taggedUsers.value = taggedUsers.value.filter(u => u.id !== userId)
  }
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function triggerImageInput() {
  imageInputRef.value?.click()
}

function triggerVideoInput() {
  videoInputRef.value?.click()
}

async function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  const remaining = 6 - mediaFiles.value.length
  const filesToAdd = files.slice(0, remaining)

  for (const file of filesToAdd) {
    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')

    if (!isVideo && !isImage) continue

    const maxImageSize = 10 * 1024 * 1024
    const maxVideoSize = 100 * 1024 * 1024
    
    if (isImage && file.size > maxImageSize) {
      error.value = `${file.name} is too large. Images must be under 10MB.`
      continue
    }
    
    if (isVideo && file.size > maxVideoSize) {
      error.value = `${file.name} is too large. Videos must be under 100MB.`
      continue
    }

    const preview = URL.createObjectURL(file)

    mediaFiles.value.push({
      file, preview,
      type: isVideo ? 'video' : 'image',
      uploading: false, progress: 0,
      url: null, key: null
    })
  }

  event.target.value = ''
}

function removeMedia(index) {
  URL.revokeObjectURL(mediaFiles.value[index].preview)
  mediaFiles.value.splice(index, 1)
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
        
        const maxSize = 1080
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
            }, 'image/jpeg', 0.80)
          }
        }, 'image/webp', 0.85)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

async function uploadToR2(media) {
  try {
    let fileToUpload = media.file
    
    if (media.type === 'image') {
      fileToUpload = await compressImage(media.file)
    }

    const apiUrl = `${BACKEND_API_URL}/generate-upload-url?filename=${encodeURIComponent(fileToUpload.name)}&contentType=${encodeURIComponent(fileToUpload.type)}`
    
    const response = await fetch(apiUrl, { method: 'GET', mode: 'cors' })

    if (!response.ok) throw new Error('Failed to get upload URL')

    const { url: presignedUrl, key, publicUrl } = await response.json()
    
    const xhr = new XMLHttpRequest()
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          media.progress = Math.round((e.loaded / e.total) * 100)
        }
      })
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve({ url: publicUrl, key: key, type: media.type })
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`))
        }
      })
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'))
      })
      
      xhr.open('PUT', presignedUrl)
      xhr.setRequestHeader('Content-Type', fileToUpload.type)
      xhr.send(fileToUpload)
    })
  } catch (err) {
    throw new Error(`Upload failed: ${err.message}`)
  }
}

async function handleCreatePost() {
  if (!content.value.trim()) {
    error.value = 'Please enter some content'
    return
  }
  if (selectedTags.value.length === 0) {
    error.value = 'Please select at least one tag'
    return
  }

  // Check if user is verified
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('verified')
    .eq('id', authStore.user.id)
    .single()

  if (userError) {
    error.value = 'Failed to verify account status'
    return
  }

  if (!userData.verified) {
    error.value = 'Your account must be verified to create posts.'
    return
  }

  loading.value = true
  uploading.value = true
  error.value = ''
  success.value = false
  
  try {
    const uploadedMedia = []
    
    for (let i = 0; i < mediaFiles.value.length; i++) {
      const media = mediaFiles.value[i]
      media.uploading = true
      media.progress = 0
      
      const result = await uploadToR2(media)
      
      media.progress = 100
      uploadedMedia.push(result)
      media.url = result.url
      media.key = result.key
      media.uploading = false
    }
    
    const mediaUrls = uploadedMedia.map(m => m.url)
    const mediaTypes = uploadedMedia.map(m => m.type)
    
    const { data: newPost, error: insertError } = await supabase
      .from('posts')
      .insert({
        user_id: authStore.user.id,
        content: content.value,
        media_urls: mediaUrls,
        media_type: mediaTypes,
        tag: selectedTags.value.length > 0 ? selectedTags.value : null
      })
      .select()
      .single()
      
    if (insertError) throw insertError
    
    if (taggedUsers.value.length > 0) {
      const tags = taggedUsers.value.map(user => ({
        post_id: newPost.id,
        tagged_user_id: user.id,
        tagged_by_user_id: authStore.user.id
      }))
      await supabase.from('post_tags').insert(tags)
    }
    
    success.value = true
    await Preferences.remove({ key: DRAFT_KEY })
    await Preferences.remove({ key: DRAFT_MEDIA_KEY })
    
    // Reset all form fields
    content.value = ''
    selectedTags.value = []
    taggedUsers.value = []
    mediaFiles.value.forEach(m => URL.revokeObjectURL(m.preview))
    mediaFiles.value = []
    
    setTimeout(() => {
      handleClose()
    }, 1500)
    
  } catch (err) {
    error.value = err.message || 'Failed to create post'
  } finally {
    loading.value = false
    uploading.value = false
  }
}
</script>