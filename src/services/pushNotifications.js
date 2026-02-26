import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'

const PUSH_API_URL = 'https://octopus-push-api-production-ef87.up.railway.app'

class PushNotificationService {
  constructor() {
    this.isInitialized = false
    this.currentUserId = null
    this.debugLogs = []
  }

  log(message, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data
    }
    this.debugLogs.push(logEntry)
    console.log(`[PUSH] ${message}`, data || '')
  }

  getDebugLogs() {
    return this.debugLogs
  }

  async initialize(userId) {
    this.log('🔍 START: Initialize called', { userId })

    // Check if native platform
    const isNative = Capacitor.isNativePlatform()
    this.log(`Platform check: isNative=${isNative}, platform=${Capacitor.getPlatform()}`)

    if (!isNative) {
      this.log('❌ STOP: Not a native platform')
      return { success: false, error: 'Not a native platform' }
    }

    if (!userId) {
      this.log('❌ STOP: No user ID provided')
      return { success: false, error: 'No user ID' }
    }

    if (this.isInitialized && this.currentUserId === userId) {
      this.log('✅ Already initialized for this user')
      return { success: true, message: 'Already initialized' }
    }

    try {
      this.currentUserId = userId
      this.log('Step 1: Checking permissions...')

      // 1. Check permissions
      let permStatus = await PushNotifications.checkPermissions()
      this.log('Permission status:', permStatus)

      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        this.log('Step 2: Requesting permissions...')
        permStatus = await PushNotifications.requestPermissions()
        this.log('Permission result:', permStatus)
      }

      if (permStatus.receive !== 'granted') {
        this.log('❌ Permission denied', permStatus)
        return { success: false, error: 'Permission denied', permStatus }
      }

      this.log('✅ Permission granted')

      // 2. Remove old listeners
      this.log('Step 3: Removing old listeners...')
      await PushNotifications.removeAllListeners()
      this.log('✅ Old listeners removed')

      // 3. Setup listeners BEFORE registering
      this.log('Step 4: Setting up listeners...')
      await this.setupListeners(userId)
      this.log('✅ Listeners setup complete')

      // 4. Register with FCM/APNs
      this.log('Step 5: Registering with FCM/APNs...')
      await PushNotifications.register()
      this.log('✅ Registration call made (waiting for token...)')

      this.isInitialized = true
      return { success: true, message: 'Initialization complete, waiting for token' }

    } catch (error) {
      this.log('❌ ERROR during initialization:', error)
      return { success: false, error: error.message, stack: error.stack }
    }
  }

  async setupListeners(userId) {
    this.log('Setting up registration listener...')
    
    // Listen for registration success
    await PushNotifications.addListener('registration', async (token) => {
      this.log('🎉 TOKEN RECEIVED!', { token: token.value })
      await this.registerTokenWithBackend(userId, token.value)
    })

    // Listen for registration errors
    await PushNotifications.addListener('registrationError', (error) => {
      this.log('❌ Registration error:', error)
    })

    // Handle notification received (foreground)
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      this.log('🔔 Notification received (foreground):', notification)
    })

    // Handle notification tapped (background/killed)
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      this.log('👆 Notification tapped:', notification)
      this.handleNotificationTap(notification.notification.data)
    })

    this.log('✅ All listeners registered')
  }

  async registerTokenWithBackend(userId, token) {
    try {
      this.log('📤 Registering token with backend...', { userId, token: token.substring(0, 20) + '...' })

      const response = await fetch(`${PUSH_API_URL}/api/push/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          token: token,
          platform: Capacitor.getPlatform()
        })
      })

      this.log('Backend response status:', response.status)

      const result = await response.json()
      this.log('Backend response:', result)

      if (result.success) {
        this.log('✅ Token registered with backend successfully')
      } else {
        this.log('❌ Backend registration failed:', result)
      }

      return result
    } catch (error) {
      this.log('❌ Error registering token with backend:', error)
      return { success: false, error: error.message }
    }
  }

  handleNotificationTap(data) {
    this.log('Handling notification tap:', data)
    
    // Store the notification data for the app to handle
    window.lastNotificationTap = data
    
    // Emit custom event
    window.dispatchEvent(new CustomEvent('notificationTap', { detail: data }))
  }

  async cleanup() {
    this.log('🧹 Cleaning up push notifications...')
    
    try {
      await PushNotifications.removeAllListeners()
      this.isInitialized = false
      this.currentUserId = null
      this.log('✅ Cleanup complete')
      return { success: true }
    } catch (error) {
      this.log('❌ Cleanup error:', error)
      return { success: false, error: error.message }
    }
  }

  // Get current registration status
  async getStatus() {
    try {
      const permStatus = await PushNotifications.checkPermissions()
      const deliveredNotifications = await PushNotifications.getDeliveredNotifications()
      
      const status = {
        isNative: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
        permissions: permStatus,
        isInitialized: this.isInitialized,
        currentUserId: this.currentUserId,
        deliveredCount: deliveredNotifications.notifications.length,
        debugLogs: this.debugLogs
      }
      
      this.log('Current status:', status)
      return status
    } catch (error) {
      this.log('Error getting status:', error)
      return { error: error.message }
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService()