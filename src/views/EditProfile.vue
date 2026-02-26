<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <ion-icon :icon="arrowBack"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Edit Profile</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="saveProfile" :disabled="saving">
            <span v-if="saving">Saving...</span>
            <span v-else>Save</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="edit-profile-container">
        <div class="photo-section">
          <div class="photo-wrapper">
            <ion-avatar class="profile-avatar">
              <img 
                v-if="formData.profile_photo_url" 
                :src="getOptimizedImageUrl(formData.profile_photo_url)"
                alt="Profile"
              />
              <div v-else class="avatar-placeholder">
                {{ getInitials(formData.full_name) }}
              </div>

              <div v-if="uploadingPhoto" class="upload-overlay">
                <ion-spinner name="crescent"></ion-spinner>
                <p>{{ uploadProgress }}%</p>
              </div>
            </ion-avatar>

            <button class="change-photo-btn" @click="changePhoto" :disabled="uploadingPhoto">
              <ion-icon :icon="camera"></ion-icon>
              Change Photo
            </button>
          </div>
        </div>

        <div class="form-section">
          <ion-item>
            <ion-label position="stacked">Full Name *</ion-label>
            <ion-input 
              v-model="formData.full_name"
              placeholder="Enter your full name"
              :maxlength="100"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Bio</ion-label>
            <ion-textarea 
              v-model="formData.bio"
              placeholder="Tell us about yourself..."
              :maxlength="500"
              :rows="4"
              :counter="true"
            ></ion-textarea>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">College/Hospital *</ion-label>
            <ion-input 
              v-model="formData.college_hospital"
              placeholder="Your institution"
              :maxlength="200"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Location</ion-label>
            <ion-input 
              v-model="formData.location"
              placeholder="City, Country"
              :maxlength="100"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Specialization</ion-label>
            <ion-input 
              v-model="formData.specialization"
              placeholder="e.g., Cardiology, Surgery"
              :maxlength="100"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Year</ion-label>
            <ion-select 
              v-model="formData.year"
              placeholder="Select year"
            >
              <ion-select-option value="1st Year">1st Year</ion-select-option>
              <ion-select-option value="2nd Year">2nd Year</ion-select-option>
              <ion-select-option value="3rd Year">3rd Year</ion-select-option>
              <ion-select-option value="4th Year">4th Year</ion-select-option>
              <ion-select-option value="5th Year">5th Year</ion-select-option>
              <ion-select-option value="Intern">Intern</ion-select-option>
              <ion-select-option value="Resident">Resident</ion-select-option>
              <ion-select-option value="Fellow">Fellow</ion-select-option>
              <ion-select-option value="Attending">Attending</ion-select-option>
              <ion-select-option value="Consultant">Consultant</ion-select-option>
            </ion-select>
          </ion-item>
        </div>

        <div class="section-card">
          <h3 class="section-title">Privacy Settings</h3>
          
          <ion-item lines="none">
            <ion-label>
              <h3>Private Account</h3>
              <p>Only approved followers can see your posts</p>
            </ion-label>
            <ion-toggle v-model="formData.is_private"></ion-toggle>
          </ion-item>

          <ion-item lines="none">
            <ion-label>
              <h3>Show Online Status</h3>
              <p>Let others see when you're active</p>
            </ion-label>
            <ion-toggle v-model="formData.show_online_status"></ion-toggle>
          </ion-item>
        </div>

        <div class="section-card danger-zone">
          <h3 class="section-title">Danger Zone</h3>
          
          <button class="delete-btn" @click="confirmDeleteAccount">
            <ion-icon :icon="trash"></ion-icon>
            Delete Account
          </button>
        </div>
      </div>

      <input 
        ref="fileInputRef"
        type="file" 
        accept="image/*"
        style="display: none"
        @change="handlePhotoSelect"
      />
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
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonAvatar,
  IonSpinner,
  toastController,
  alertController
} from '@ionic/vue'
import {
  arrowBack,
  camera,
  trash
} from 'ionicons/icons'

const router = useRouter()
const authStore = useAuthStore()

const saving = ref(false)
const uploadingPhoto = ref(false)
const uploadProgress = ref(0)
const fileInputRef = ref(null)

const formData = ref({
  full_name: '',
  bio: '',
  college_hospital: '',
  location: '',
  specialization: '',
  year: '',
  website: '',
  profile_photo_url: '',
  is_private: false,
  show_online_status: true
})

const BACKEND_API_URL = 'https://octopus-push-api-production-e5b8.up.railway.app/api'
//cred3
onMounted(async () => {
  await loadProfile()
})

async function loadProfile() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authStore.user.id)
      .single()

    if (error) throw error

    // Populate form with existing data
    formData.value = {
      full_name: data.full_name || '',
      bio: data.bio || '',
      college_hospital: data.college_hospital || '',
      location: data.location || '',
      specialization: data.specialization || '',
      year: data.year || '',
      website: data.website || '',
      profile_photo_url: data.profile_photo_url || '',
      is_private: data.is_private || false,
      show_online_status: data.show_online_status ?? true
    }
  } catch (error) {
    console.error('Error loading profile:', error)
    const toast = await toastController.create({
      message: 'Failed to load profile',
      duration: 2000,
      color: 'danger'
    })
    await toast.present()
  }
}

async function saveProfile() {
  // Validation
  if (!formData.value.full_name.trim()) {
    const toast = await toastController.create({
      message: 'Full name is required',
      duration: 2000,
      color: 'warning'
    })
    await toast.present()
    return
  }

  if (!formData.value.college_hospital.trim()) {
    const toast = await toastController.create({
      message: 'College/Hospital is required',
      duration: 2000,
      color: 'warning'
    })
    await toast.present()
    return
  }

  saving.value = true

  try {
    const { error } = await supabase
      .from('users')
      .update({
        full_name: formData.value.full_name.trim(),
        bio: formData.value.bio?.trim() || null,
        college_hospital: formData.value.college_hospital.trim(),
        location: formData.value.location?.trim() || null,
        specialization: formData.value.specialization?.trim() || null,
        year: formData.value.year || null,
        website: formData.value.website?.trim() || null,
        is_private: formData.value.is_private,
        show_online_status: formData.value.show_online_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', authStore.user.id)

    if (error) throw error

    const toast = await toastController.create({
      message: 'Profile updated successfully!',
      duration: 2000,
      color: 'success'
    })
    await toast.present()

    // Go back after short delay
    setTimeout(() => {
      router.back()
    }, 500)

  } catch (error) {
    console.error('Error saving profile:', error)
    const toast = await toastController.create({
      message: 'Failed to save profile. Please try again.',
      duration: 3000,
      color: 'danger'
    })
    await toast.present()
  } finally {
    saving.value = false
  }
}

function changePhoto() {
  fileInputRef.value?.click()
}

async function handlePhotoSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    const toast = await toastController.create({
      message: 'Please select an image file',
      duration: 2000,
      color: 'danger'
    })
    await toast.present()
    return
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    const toast = await toastController.create({
      message: 'Image must be less than 5MB',
      duration: 2000,
      color: 'danger'
    })
    await toast.present()
    return
  }

  try {
    uploadingPhoto.value = true
    uploadProgress.value = 0

    // Compress image
    const compressedFile = await compressImage(file)

    // Get presigned URL
    const response = await fetch(
      `${BACKEND_API_URL}/generate-upload-url?filename=${encodeURIComponent(compressedFile.name)}&contentType=${encodeURIComponent(compressedFile.type)}`
    )

    if (!response.ok) {
      throw new Error('Failed to get upload URL')
    }

    const { url: presignedUrl, publicUrl } = await response.json()

    // Upload to R2 with progress
    await uploadWithProgress(presignedUrl, compressedFile)

    // Update form data
    formData.value.profile_photo_url = publicUrl

    // Update database
    await supabase
      .from('users')
      .update({ profile_photo_url: publicUrl })
      .eq('id', authStore.user.id)

    const toast = await toastController.create({
      message: 'Profile photo updated!',
      duration: 2000,
      color: 'success'
    })
    await toast.present()

  } catch (error) {
    console.error('Photo upload error:', error)
    const toast = await toastController.create({
      message: 'Failed to upload photo. Please try again.',
      duration: 3000,
      color: 'danger'
    })
    await toast.present()
  } finally {
    uploadingPhoto.value = false
    uploadProgress.value = 0
    event.target.value = ''
  }
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
        
        const maxSize = 800
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
            }, 'image/jpeg', 0.85)
          }
        }, 'image/webp', 0.90)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function uploadWithProgress(presignedUrl, file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        uploadProgress.value = Math.round((e.loaded / e.total) * 100)
      }
    })
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve()
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`))
      }
    })
    
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })
    
    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

async function confirmDeleteAccount() {
  const alert = await alertController.create({
    header: 'Delete Account',
    message: 'Are you sure you want to permanently delete your account? This action cannot be undone.',
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Delete',
        role: 'destructive',
        handler: async () => {
          await deleteAccount()
        }
      }
    ]
  })

  await alert.present()
}

async function deleteAccount() {
  try {
    // Delete user account (this will cascade delete posts, likes, etc. if set up)
    const { error } = await supabase.auth.admin.deleteUser(authStore.user.id)

    if (error) throw error

    await authStore.signOut()
    router.replace('/login')

    const toast = await toastController.create({
      message: 'Account deleted successfully',
      duration: 2000,
      color: 'success'
    })
    await toast.present()

  } catch (error) {
    console.error('Delete account error:', error)
    const toast = await toastController.create({
      message: 'Failed to delete account. Please contact support.',
      duration: 3000,
      color: 'danger'
    })
    await toast.present()
  }
}

function goBack() {
  router.back()
}

function getOptimizedImageUrl(url) {
  if (!url) return ''
  return `${url}?width=400&quality=85&format=auto`
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
</script>


<style scoped>
ion-content {
  --background: #000;
}

ion-toolbar {
  --background: #000;
  --border-color: rgba(255, 255, 255, 0.1);
}

.edit-profile-container {
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: 24px;
}

.photo-section {
  padding: 32px 16px;
  text-align: center;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.photo-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.profile-avatar {
  width: 120px;
  height: 120px;
  position: relative;
  border: 3px solid rgba(255, 255, 255, 0.1);
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 48px;
  font-weight: 700;
}

.upload-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 50%;
}

.upload-overlay p {
  color: white;
  margin: 0;
  font-weight: 600;
  font-size: 14px;
}

.change-photo-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.change-photo-btn:active {
  transform: scale(0.98);
}

.change-photo-btn ion-icon {
  font-size: 18px;
}

.form-section {
  margin: 16px 0;
}

ion-item {
  --background: #000;
  --border-color: rgba(255, 255, 255, 0.1);
  --color: #fff;
  --padding-start: 16px;
  --inner-padding-end: 16px;
}

ion-label {
  --color: rgba(255, 255, 255, 0.7);
}

ion-label h3 {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

ion-label p {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  margin: 0;
}

ion-input, ion-textarea, ion-select {
  --color: #fff;
  --placeholder-color: rgba(255, 255, 255, 0.4);
}

ion-textarea {
  min-height: 100px;
}

.section-card {
  margin: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 12px;
  color: #fff;
}

.danger-zone {
  border-color: rgba(255, 59, 48, 0.3);
  background: rgba(255, 59, 48, 0.05);
}

.delete-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: transparent;
  border: 1.5px solid rgba(255, 59, 48, 0.5);
  border-radius: 10px;
  color: #ff3b30;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-btn:active {
  transform: scale(0.98);
}

.delete-btn ion-icon {
  font-size: 20px;
}
</style>