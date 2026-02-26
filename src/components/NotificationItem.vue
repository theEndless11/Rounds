<template>
  <div 
    class="notification-item" 
    :class="{ unread: !notification.is_read, 'verification-notif': notification.type === 'verification' }"
    :style="{ animationDelay: `${index * 0.05}s` }"
    @click="$emit('click')"
  >
    <ion-avatar class="notif-avatar" @click.stop="viewProfile">
      <img 
        v-if="notification.actor?.profile_photo_url" 
        :src="getOptimizedImageUrl(notification.actor.profile_photo_url)"
        :alt="notification.actor.full_name"
        loading="lazy"
      />
      <div v-else class="avatar-placeholder">
        {{ getInitials(notification.actor?.full_name) }}
      </div>

      <div class="icon-badge" :class="getIconClass(notification.type)">
        <ion-icon :icon="getNotificationIcon(notification.type)"></ion-icon>
      </div>
    </ion-avatar>

    <div class="notification-content">
      <div class="notification-text">
        <span v-if="notification.type === 'verification'" class="system-badge">System</span>
        <span v-else class="actor-name" @click.stop="viewProfile">{{ notification.actor?.full_name }}</span>
        <span class="notification-message">{{ getNotificationText(notification.type) }}</span>
        <span v-if="notification.post?.content" class="post-preview">
          "{{ truncateText(notification.post.content, 40) }}"
        </span>
      </div>

      <div class="notification-time">
        {{ formatTime(notification.created_at) }}
      </div>

      <div v-if="notification.type === 'friend_request'" class="action-buttons">
        <button 
          class="accept-btn"
          @click.stop="$emit('accept', notification.id, notification.actor_id)"
        >
          Accept
        </button>
        <button 
          class="decline-btn"
          @click.stop="$emit('reject', notification.id, notification.actor_id)"
        >
          Decline
        </button>
      </div>
    </div>

    <div 
      v-if="notification.post?.media_urls?.length > 0" 
      class="post-thumbnail"
      @click.stop="viewPost"
    >
      <img 
        :src="getOptimizedImageUrl(notification.post.media_urls[0])"
        alt="Post"
        loading="lazy"
      />
    </div>

    <button class="delete-btn" @click.stop="$emit('delete', notification.id)">
      <ion-icon :icon="close"></ion-icon>
    </button>

    <div v-if="!notification.is_read" class="unread-dot"></div>
  </div>
</template>


<script setup>
import { useRouter } from 'vue-router'
import { IonAvatar, IonIcon } from '@ionic/vue'
import {
  heart, checkmarkCircleOutline , chatbubble, personAdd, checkmarkCircle, at, pricetag, close
} from 'ionicons/icons'

const props = defineProps({
  notification: Object,
  index: { type: Number, default: 0 }
})

defineEmits(['accept', 'reject', 'delete', 'click'])

const router = useRouter()

function getNotificationText(type) {
  const texts = {
    like: 'liked your post',
    post_comment: 'commented on your post',
    comment_reply: 'replied to your comment',
    comment_like: 'liked your comment',
    like_milestone: 'Your post reached a milestone! 🎉',
    mention: 'mentioned you in a comment',
    tag: 'tagged you in a post',
    follow: 'started following you',
    friend_request: 'sent you a friend request',
    friend_accept: 'accepted your friend request',
    verification: '✓ Your verification request has been reviewed' // NEW
  }
  return texts[type] || 'interacted with you'
}

function getNotificationIcon(type) {
  const icons = {
    like: heart,
    post_comment: chatbubble,
    comment_reply: chatbubble,
    comment_like: heart,
    like_milestone: heart,
    mention: at,
    tag: pricetag,
    follow: personAdd,
    friend_request: personAdd,
    friend_accept: checkmarkCircle,
    verification: checkmarkCircleOutline // NEW
  }
  return icons[type] || chatbubble
}

function getIconClass(type) {
  const classes = {
    like: 'icon-like',
    post_comment: 'icon-comment',
    comment_reply: 'icon-comment',
    comment_like: 'icon-like',
    like_milestone: 'icon-milestone',
    mention: 'icon-mention',
    tag: 'icon-tag',
    follow: 'icon-follow',
    friend_request: 'icon-friend-request',
    friend_accept: 'icon-friend-accept',
    verification: 'icon-verification' // NEW
  }
  return classes[type] || ''
}

function viewProfile() {
  router.push(`/user/${props.notification.actor_id}`)
}

function viewPost() {
  ionRouter.push(`/post/${props.post.id}`)  // Use ionRouter instead of router
}

function getOptimizedImageUrl(url) {
  if (!url) return ''
  return `${url}?width=100&quality=85&format=auto`
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function truncateText(text, maxLength) {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

function formatTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<style scoped>
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  background: var(--background);
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  opacity: 0;
  animation: fadeInSlide 0.4s ease-out forwards;
}

@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.notification-item:hover {
  background: var(--background-secondary);
}

.notification-item.unread {
  background: rgba(102, 126, 234, 0.05);
}

body.light .notification-item.unread {
  background: rgba(102, 126, 234, 0.08);
}

.notification-item.unread:hover {
  background: rgba(102, 126, 234, 0.08);
}

body.light .notification-item.unread:hover {
  background: rgba(102, 126, 234, 0.12);
}

.notif-avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  position: relative;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-weight: 700;
  font-size: 18px;
}

.icon-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--background);
}

.icon-badge ion-icon {
  font-size: 12px;
  color: #fff;
}

.icon-like {
  background: #ef4444;
}

.icon-comment {
  background: #3b82f6;
}

.icon-mention {
  background: #8b5cf6;
}

.icon-tag {
  background: #ec4899;
}

.icon-follow {
  background: #10b981;
}

.icon-friend-request {
  background: #f59e0b;
}

.icon-friend-accept {
  background: #10b981;
}

.icon-milestone {
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-text {
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.4;
  margin-bottom: 4px;
}

.actor-name {
  color: var(--text-primary);
  font-weight: 600;
  cursor: pointer;
}

.actor-name:hover {
  text-decoration: underline;
}

.notification-message {
  color: var(--text-primary);
  margin-left: 4px;
}

.post-preview {
  display: block;
  color: var(--text-secondary);
  font-size: 14px;
  margin-top: 4px;
  font-style: italic;
}

.notification-time {
  color: var(--text-secondary);
  font-size: 12px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.accept-btn,
.decline-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.accept-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.accept-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.decline-btn {
  background: var(--background-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.decline-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.post-thumbnail {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: opacity 0.2s;
}

.post-thumbnail:hover {
  opacity: 0.8;
}

.post-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.delete-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--background-secondary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.notification-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #ef4444;
  border-color: #ef4444;
}

.delete-btn ion-icon {
  font-size: 14px;
  color: var(--text-secondary);
}

.delete-btn:hover ion-icon {
  color: #fff;
}

.unread-dot {
  position: absolute;
  top: 20px;
  left: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #667eea;
}
</style>