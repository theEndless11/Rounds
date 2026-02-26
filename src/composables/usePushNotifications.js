// src/composables/usePushNotifications.js
import { ref } from 'vue'
import { PushNotifications } from '@capacitor/push-notifications'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/supabase'

const isNative = Capacitor.isNativePlatform()
const pushToken = ref(null)
const notificationPermission = ref('default')

// ✅ FIXED: Chat API URL from environment variable
const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || 'https://octopus-push-api-production-ef87.up.railway.app'

export function usePushNotifications() {
  
  // Initialize push notifications
  const init = async (userId) => {
    if (!isNative) {
      console.log('Push notifications only work on native platforms')
      return
    }

    try {
      // Check current permissions first
      let permStatus = await PushNotifications.checkPermissions()
      
      console.log('Current push notification permission:', permStatus.receive)
      
      // Request if not determined yet
      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        console.log('Requesting push notification permissions...')
        permStatus = await PushNotifications.requestPermissions()
      }
      
      // Update state
      notificationPermission.value = permStatus.receive
      
      if (permStatus.receive !== 'granted') {
        console.warn('Push notification permission denied or not granted:', permStatus.receive)
        return // EXIT HERE - don't add listeners or register
      }

      // Only proceed if we have permission
      console.log('Push notification permission granted, setting up...')

      // Add listeners BEFORE registering
      await PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token:', token.value)
        pushToken.value = token.value
        await savePushToken(userId, token.value)
      })

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error)
      })

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification)
        showLocalNotification({
          title: notification.title || 'New notification',
          body: notification.body || '',
          data: notification.data
        })
      })

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action:', notification)
        handleNotificationAction(notification.notification.data)
      })

      // Register AFTER adding listeners
      console.log('Registering for push notifications...')
      await PushNotifications.register()

    } catch (error) {
      console.error('Error initializing push notifications:', error)
      // Don't throw - gracefully handle the error
    }
  }

  const savePushToken = async (userId, token) => {
    try {
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token: token,
          platform: Capacitor.getPlatform(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,platform'
        })

      if (error) throw error
      console.log('Push token saved successfully')
    } catch (error) {
      console.error('Error saving push token:', error)
    }
  }

  const showLocalNotification = async (options) => {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(),
            title: options.title,
            body: options.body,
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'default',
            smallIcon: 'ic_stat_icon_config_sample',
            extra: options.data || {}
          }
        ]
      })
    } catch (error) {
      console.error('Error showing local notification:', error)
    }
  }

  const handleNotificationAction = (data) => {
    if (!data) return

    const { type, id, userId } = data

    import('@/router').then(({ default: router }) => {
      switch (type) {
        case 'message':
          router.push(`/chat/${userId}`)
          break
        case 'like':
        case 'comment':
        case 'mention':
        case 'tag':
          router.push(`/post/${id}`)
          break
        case 'follow':
        case 'friend_request':
        case 'friend_accept':
          router.push(`/user/${userId}`)
          break
        case 'verification':
          router.push('/verify-account')
          break
        default:
          router.push('/tabs/notifications')
      }
    })
  }

  const requestWebPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return false
    }

    const permission = await Notification.requestPermission()
    notificationPermission.value = permission
    return permission === 'granted'
  }

  const showWebNotification = (title, options = {}) => {
    if (!('Notification' in window)) return

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icon.png',
        badge: '/badge.png',
        vibrate: [200, 100, 200],
        ...options
      })

      notification.onclick = () => {
        window.focus()
        if (options.data) {
          handleNotificationAction(options.data)
        }
        notification.close()
      }
    }
  }

  const getNotificationCount = async (userId) => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error getting notification count:', error)
      return 0
    }
  }

  /**
   * Get unread message count
   * ✅ FIXED: Now uses CHAT_API_URL environment variable
   */
  const getUnreadMessageCount = async (userId) => {
    try {
      const response = await fetch(`${CHAT_API_URL}/api/messages/unread-count?user_id=${userId}`)
      const data = await response.json()
      return data.count || 0
    } catch (error) {
      console.error('Error getting unread message count:', error)
      return 0
    }
  }

  const updateBadgeCount = async (count) => {
    if (!isNative) return

    try {
      if (Capacitor.getPlatform() === 'ios') {
        // Note: Requires @capacitor/badge plugin
        // import { Badge } from '@capacitor/badge'
        // await Badge.set({ count })
      }
    } catch (error) {
      console.error('Error updating badge count:', error)
    }
  }

  const clearNotifications = async () => {
    if (!isNative) return

    try {
      await LocalNotifications.cancel({ notifications: [] })
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }

  const cleanup = async () => {
    if (!isNative) return

    try {
      await PushNotifications.removeAllListeners()
      await LocalNotifications.removeAllListeners()
    } catch (error) {
      console.error('Error cleaning up notifications:', error)
    }
  }

  return {
    pushToken,
    notificationPermission,
    isNative,
    init,
    savePushToken,
    showLocalNotification,
    handleNotificationAction,
    requestWebPermission,
    showWebNotification,
    getNotificationCount,
    getUnreadMessageCount,
    updateBadgeCount,
    clearNotifications,
    cleanup
  }
}
