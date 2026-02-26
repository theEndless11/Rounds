<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <ion-icon :icon="arrowBack"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="settings-container">
        <!-- Notifications Section -->
        <div class="section-card">
          <div class="section-header">
            <ion-icon :icon="notificationsOutline" class="section-icon"></ion-icon>
            <h2>Notifications</h2>
          </div>

          <ion-list lines="none" class="settings-list">
            <ion-item>
              <ion-icon :icon="heartOutline" slot="start"></ion-icon>
              <ion-label>
                <h3>Likes</h3>
                <p>Notify when someone likes your post</p>
              </ion-label>
              <ion-toggle 
                :checked="notificationSettings.likes" 
                @ionChange="toggleNotification('likes', $event.detail.checked)"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-icon :icon="chatbubbleOutline" slot="start"></ion-icon>
              <ion-label>
                <h3>Comments</h3>
                <p>Notify when someone comments</p>
              </ion-label>
              <ion-toggle 
                :checked="notificationSettings.comments"
                @ionChange="toggleNotification('comments', $event.detail.checked)"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-icon :icon="personAddOutline" slot="start"></ion-icon>
              <ion-label>
                <h3>New Followers</h3>
                <p>Notify when someone follows you</p>
              </ion-label>
              <ion-toggle 
                :checked="notificationSettings.followers"
                @ionChange="toggleNotification('followers', $event.detail.checked)"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-icon :icon="mailOutline" slot="start"></ion-icon>
              <ion-label>
                <h3>Email Notifications</h3>
                <p>Receive updates via email</p>
              </ion-label>
              <ion-toggle 
                :checked="notificationSettings.email"
                @ionChange="toggleNotification('email', $event.detail.checked)"
              ></ion-toggle>
            </ion-item>
          </ion-list>
        </div>

        <!-- Privacy Section -->
        <div class="section-card">
          <div class="section-header">
            <ion-icon :icon="shieldCheckmarkOutline" class="section-icon"></ion-icon>
            <h2>Privacy</h2>
          </div>

          <ion-list lines="none" class="settings-list">
            <ion-item button @click="viewBlockedUsers">
              <ion-icon :icon="banOutline" slot="start"></ion-icon>
              <ion-label>
                <h3>Blocked Users</h3>
                <p>Manage blocked accounts</p>
              </ion-label>
              <ion-badge v-if="blockedCount > 0" color="danger" slot="end">{{ blockedCount }}</ion-badge>
              <ion-icon :icon="chevronForwardOutline" slot="end"></ion-icon>
            </ion-item>
          </ion-list>
        </div>

        <!-- Account Section -->
        <div class="section-card">
          <div class="section-header">
            <ion-icon :icon="personCircleOutline" class="section-icon"></ion-icon>
            <h2>Account</h2>
          </div>

          <ion-list lines="none" class="settings-list">
            <ion-item button @click="changePassword">
              <ion-icon :icon="keyOutline" slot="start"></ion-icon>
              <ion-label>
                <h3>Change Password</h3>
                <p>Update your account password</p>
              </ion-label>
              <ion-icon :icon="chevronForwardOutline" slot="end"></ion-icon>
            </ion-item>

            <ion-item button @click="clearCache">
              <ion-icon :icon="trashBinOutline" slot="start"></ion-icon>
              <ion-label>
                <h3>Clear Cache</h3>
                <p>Free up storage space</p>
              </ion-label>
              <ion-icon :icon="chevronForwardOutline" slot="end"></ion-icon>
            </ion-item>

            <ion-item button @click="downloadData">
              <ion-icon :icon="downloadOutline" slot="start"></ion-icon>
              <ion-label>
                <h3>Download Your Data</h3>
                <p>Request a copy of your data</p>
              </ion-label>
              <ion-icon :icon="chevronForwardOutline" slot="end"></ion-icon>
            </ion-item>
          </ion-list>
        </div>

        <!-- Danger Zone -->
        <div class="section-card danger-zone">
          <div class="section-header">
            <ion-icon :icon="warningOutline" class="section-icon"></ion-icon>
            <h2>Danger Zone</h2>
          </div>

          <ion-list lines="none" class="settings-list">
            <ion-item button @click="deleteAccount" class="danger-item">
              <ion-icon :icon="trashOutline" slot="start"></ion-icon>
              <ion-label>
                <h3>Delete Account</h3>
                <p>Permanently delete your account and data</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonBadge,
  alertController,
  toastController,
  modalController
} from '@ionic/vue'
import {
  arrowBack,
  mailOutline,
  notificationsOutline,
  heartOutline,
  chatbubbleOutline,
  personAddOutline,
  personCircleOutline,
  keyOutline,
  trashBinOutline,
  downloadOutline,
  warningOutline,
  trashOutline,
  chevronForwardOutline,
  shieldCheckmarkOutline,
  banOutline
} from 'ionicons/icons'

const router = useRouter()
const authStore = useAuthStore()

const notificationSettings = ref({
  likes: true,
  comments: true,
  followers: true,
  email: false
})

const blockedCount = ref(0)

onMounted(async () => {
  await loadNotificationSettings()
  await loadBlockedUsersCount()
})

async function loadNotificationSettings() {
  try {
    // Try to load from Supabase user metadata first
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user?.user_metadata?.notification_settings) {
      notificationSettings.value = user.user_metadata.notification_settings
    } else {
      // Fallback to localStorage
      const saved = localStorage.getItem('notification_settings')
      if (saved) {
        notificationSettings.value = JSON.parse(saved)
      }
    }
  } catch (error) {
    console.error('Error loading notification settings:', error)
  }
}

async function toggleNotification(type, value) {
  notificationSettings.value[type] = value
  
  try {
    // Save to Supabase user metadata
    await supabase.auth.updateUser({
      data: {
        notification_settings: notificationSettings.value
      }
    })
    
    // Also save to localStorage as backup
    localStorage.setItem('notification_settings', JSON.stringify(notificationSettings.value))
    
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} notifications ${value ? 'enabled' : 'disabled'}`)
  } catch (error) {
    console.error('Error saving notification settings:', error)
    showToast('Failed to save settings', 'danger')
  }
}

async function loadBlockedUsersCount() {
  try {
    const { count, error } = await supabase
      .from('blocked_users')
      .select('*', { count: 'exact', head: true })
      .eq('blocker_id', authStore.user.id)
    
    if (error) throw error
    blockedCount.value = count || 0
  } catch (error) {
    console.error('Error loading blocked users count:', error)
  }
}

async function viewBlockedUsers() {
  router.push('/blocked-users')
}

async function changePassword() {
  const alert = await alertController.create({
    header: 'Change Password',
    message: 'We will send a password reset link to your email. You can set a new password from there.',
    inputs: [
      {
        name: 'email',
        type: 'email',
        value: authStore.user.email,
        disabled: true,
        placeholder: 'Your email'
      }
    ],
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Send Reset Link',
        handler: async () => {
          try {
            const resetUrl = window.location.origin + '/reset-password'
            
            const { error } = await supabase.auth.resetPasswordForEmail(authStore.user.email, {
              redirectTo: resetUrl
            })
            
            if (error) throw error

            const toast = await toastController.create({
              message: 'Password reset link sent! Check your email.',
              duration: 3000,
              color: 'success'
            })
            await toast.present()

            return true

          } catch (error) {
            console.error('Password reset error:', error)
            const toast = await toastController.create({
              message: error.message || 'Failed to send reset link',
              duration: 3000,
              color: 'danger'
            })
            await toast.present()
            return false
          }
        }
      }
    ]
  })

  await alert.present()
}

async function clearCache() {
  const alert = await alertController.create({
    header: 'Clear Cache',
    message: 'This will clear saved bookmarks, history, and temporary data. Continue?',
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Clear',
        handler: async () => {
          // Clear specific items from localStorage
          localStorage.removeItem('savedPosts')
          localStorage.removeItem('viewHistory')
          
          const toast = await toastController.create({
            message: 'Cache cleared successfully',
            duration: 2000,
            color: 'success'
          })
          await toast.present()
        }
      }
    ]
  })

  await alert.present()
}

async function downloadData() {
  const alert = await alertController.create({
    header: 'Download Your Data',
    message: 'We will prepare your data and send it to your email. This may take up to 48 hours.',
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Contact Support',
        handler: async () => {
          const subject = encodeURIComponent('Data Export Request')
          const body = encodeURIComponent(
            `Hi Support Team,

I would like to request a copy of my data.

User ID: ${authStore.user.id}
Email: ${authStore.user.email}

Please send my data export to this email address.

Thank you!`
          )
          
          const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=support@rounds.app&su=${subject}&body=${body}`
          window.open(gmailUrl, '_blank')
          
          const toast = await toastController.create({
            message: 'Opening Gmail...',
            duration: 2000,
            color: 'medium'
          })
          await toast.present()
        }
      }
    ]
  })

  await alert.present()
}

async function deleteAccount() {
  const confirmAlert = await alertController.create({
    header: 'Delete Account',
    message: 'Are you absolutely sure? This action cannot be undone.',
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Continue',
        role: 'destructive',
        handler: async () => {
          await showDeleteConfirmation()
        }
      }
    ]
  })

  await confirmAlert.present()
}

async function showDeleteConfirmation() {
  const alert = await alertController.create({
    header: 'Final Confirmation',
    message: 'All your posts, comments, likes, followers, and data will be permanently deleted. Type DELETE to confirm.',
    inputs: [
      {
        name: 'confirmation',
        type: 'text',
        placeholder: 'Type DELETE'
      }
    ],
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Delete Forever',
        role: 'destructive',
        handler: async (data) => {
          if (data.confirmation === 'DELETE') {
            try {
              const userId = authStore.user.id
              console.log('🗑️ Attempting to delete user:', userId)

              // Call the database function with correct parameter name
              const { data: result, error: rpcError } = await supabase
                .rpc('delete_user_account', { p_user_id: userId })

              console.log('📊 Delete result:', result)
              console.log('❌ RPC error:', rpcError)

              if (rpcError) {
                console.error('RPC Error details:', rpcError)
                throw new Error(`RPC Error: ${rpcError.message}`)
              }

              if (result && !result.success) {
                console.error('Function returned error:', result)
                throw new Error(result.message || 'Delete function failed')
              }

              console.log('✅ Account deleted successfully from database')

              // Sign out
              await supabase.auth.signOut()
              
              // Clear auth store
              authStore.user = null
              authStore.session = null
              
              // Clear all local data
              localStorage.clear()
              
              // Navigate to login
              router.replace('/login')

              const toast = await toastController.create({
                message: 'Account permanently deleted',
                duration: 2000,
                color: 'success'
              })
              await toast.present()

              return true

            } catch (error) {
              console.error('❌ Delete error:', error)
              
              const toast = await toastController.create({
                message: `Failed to delete account: ${error.message}. Please contact support@rounds.app`,
                duration: 5000,
                color: 'danger'
              })
              await toast.present()
              
              return false
            }
          } else {
            const toast = await toastController.create({
              message: 'Please type DELETE to confirm',
              duration: 2000,
              color: 'warning'
            })
            await toast.present()
            return false
          }
        }
      }
    ]
  })

  await alert.present()
}

async function showToast(message, color = 'medium') {
  const toast = await toastController.create({
    message,
    duration: 1500,
    color
  })
  await toast.present()
}

function goBack() {
  router.back()
}
</script>

<style scoped>
ion-content {
  --background: #000;
}

ion-toolbar {
  --background: #000;
  --color: #fff;
  --border-color: #222;
}

ion-title {
  color: #fff;
  font-weight: 600;
}

.settings-container {
  padding: 20px 16px;
  max-width: 800px;
  margin: 0 auto;
}

.section-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid #1a1a1a;
  border-radius: 16px;
  margin-bottom: 24px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: rgba(102, 126, 234, 0.05);
  border-bottom: 1px solid #1a1a1a;
}

.section-icon {
  font-size: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.settings-list {
  background: transparent;
  padding: 0;
}

ion-item {
  --background: transparent;
  --border-color: #1a1a1a;
  --color: #fff;
  --padding-start: 20px;
  --padding-end: 20px;
  --inner-padding-end: 0;
  --min-height: 70px;
  transition: background 0.2s;
}

ion-item:hover {
  --background: rgba(255, 255, 255, 0.03);
}

ion-item ion-icon[slot="start"] {
  color: #888;
  font-size: 22px;
  margin-right: 16px;
}

ion-item ion-icon[slot="end"] {
  color: #666;
  font-size: 20px;
}

ion-label h3 {
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  margin: 0 0 4px 0;
}

ion-label p {
  color: #888;
  font-size: 13px;
  margin: 0;
}

ion-toggle {
  --background: #1a1a1a;
  --background-checked: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --handle-background: #fff;
  --handle-background-checked: #fff;
}

/* Danger Zone Styling */
.danger-zone {
  border-color: rgba(255, 59, 48, 0.3);
}

.danger-zone .section-header {
  background: rgba(255, 59, 48, 0.05);
}

.danger-zone .section-icon {
  background: #ff3b30;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.danger-item {
  --color: #ff3b30;
}

.danger-item ion-icon {
  color: #ff3b30 !important;
}

.danger-item ion-label h3 {
  color: #ff3b30;
}

.danger-item:hover {
  --background: rgba(255, 59, 48, 0.05);
}
</style>