<template>
  <ion-page>
    <ion-content class="profile-content">
      <div class="profile-container">
        <!-- Header Section -->
        <div class="header-section">
          <div class="progress-indicator">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
            </div>
            <span class="progress-text">{{ progressPercentage }}% Complete</span>
          </div>
          
          <h1 class="page-title">Complete Your Profile</h1>
          <p class="page-subtitle">Help us verify your medical credentials</p>
        </div>

        <!-- Form Section -->
        <div class="form-section">
          <div class="input-group">
            <label class="input-label">
              Full Name
              <span class="required">*</span>
            </label>
            <input 
              v-model="profile.fullName"
              type="text"
              placeholder="Dr. John Doe"
              class="custom-input"
            />
          </div>

          <div class="input-group">
            <label class="input-label">
              NMC Registration Number
              <span class="required">*</span>
            </label>
            <input 
              v-model="profile.nmcNumber"
              type="text"
              placeholder="NMC123456"
              class="custom-input"
            />
            <span class="input-hint">Your National Medical Commission number</span>
          </div>

          <div class="input-group">
            <label class="input-label">
              College / Hospital
              <span class="required">*</span>
            </label>
            <input 
              v-model="profile.hospital"
              type="text"
              placeholder="AIIMS Delhi"
              class="custom-input"
            />
          </div>

          <div class="input-group">
            <label class="input-label">Bio</label>
            <textarea 
              v-model="profile.bio"
              placeholder="Tell us about yourself, your specialization, and interests..."
              class="custom-textarea"
              rows="4"
            ></textarea>
            <span class="input-hint">Optional - This will appear on your profile</span>
          </div>

          <button 
            @click="handleContinue"
            :disabled="!isFormValid || isSubmitting"
            class="submit-btn"
            :class="{ 'submitting': isSubmitting }"
          >
            <span v-if="!isSubmitting">Continue Signup</span>
            <span v-else class="loading-text">
              <span class="spinner"></span>
              Finishing Up...
            </span>
          </button>

          <div v-if="error" class="error-message">
            <svg class="error-icon" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 8v4m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            {{ error }}
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'
import { Device } from '@capacitor/device'
import {
  IonPage,
  IonContent
} from '@ionic/vue'

const router = useRouter()
const authStore = useAuthStore()

const profile = ref({
  fullName: '',
  nmcNumber: '',
  hospital: '',
  bio: ''
})

const error = ref('')
const isSubmitting = ref(false)
let avatarUploadTimer = null
let currentUserId = null

// Preloaded data - ready to use when button is clicked
const preloadedData = ref({
  avatarUrl: null,
  uploadedAvatarUrl: null,
  deviceInfo: null,
  locationInfo: null
})

const progressPercentage = computed(() => {
  let filled = 0
  if (profile.value.fullName?.trim()) filled += 25
  if (profile.value.nmcNumber?.trim()) filled += 25
  if (profile.value.hospital?.trim()) filled += 25
  if (profile.value.bio?.trim()) filled += 25
  return filled
})

const isFormValid = computed(() => {
  return profile.value.fullName?.trim() && 
         profile.value.nmcNumber?.trim() && 
         profile.value.hospital?.trim()
})

function generateDefaultAvatar(fullName) {
  const colors = ['667eea', '764ba2', 'f093fb', '4facfe', '43e97b', 'fa709a']
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=${randomColor}&fontSize=40`
}

async function uploadAvatarToR2(avatarUrl, userId) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)
  
  try {
    const response = await fetch(avatarUrl, { signal: controller.signal })
    if (!response.ok) throw new Error('Failed to fetch avatar')
    
    const svgBlob = await response.blob()
    const file = new File([svgBlob], `avatar-${userId}.svg`, { type: 'image/svg+xml' })
    
    const uploadResponse = await fetch(
      `https://octopus-push-api-production-e5b8.up.railway.app/api/generate-upload-url?filename=${file.name}&contentType=image/svg+xml`,
      { signal: controller.signal }
    )
    if (!uploadResponse.ok) throw new Error('Failed to get upload URL')
    
    const { url: presignedUrl, publicUrl } = await uploadResponse.json()
    
    const r2Response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': 'image/svg+xml' },
      signal: controller.signal
    })
    
    if (!r2Response.ok) throw new Error('Failed to upload to R2')
    
    clearTimeout(timeoutId)
    return publicUrl
  } catch (error) {
    clearTimeout(timeoutId)
    console.error('Avatar upload error:', error)
    return avatarUrl // Fallback to Dicebear URL
  }
}

async function getDeviceInfo() {
  try {
    const info = await Device.getInfo()
    const model = info.model || 'Unknown Model'
    const manufacturer = info.manufacturer || 'Unknown'
    const capitalizedManufacturer = manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1).toLowerCase()
    const deviceName = `${capitalizedManufacturer} ${model}`.trim()
    
    return {
      model: info.model || 'Unknown',
      manufacturer: info.manufacturer || 'Unknown',
      platform: info.platform || 'Unknown',
      osVersion: info.osVersion || 'Unknown',
      deviceName: deviceName,
      isVirtual: info.isVirtual || false
    }
  } catch (error) {
    console.error('Error getting device info:', error)
    return {
      model: 'Unknown',
      manufacturer: 'Unknown',
      platform: 'Unknown',
      osVersion: 'Unknown',
      deviceName: 'Unknown Device',
      isVirtual: false
    }
  }
}

async function getUserLocation() {
  try {
    const response = await fetch('https://ipwho.is/')
    const data = await response.json()
    
    if (data.success !== false) {
      return {
        country: data.country || 'Unknown',
        region: data.region || 'Unknown',
        city: data.city || 'Unknown'
      }
    } else {
      throw new Error('Failed to get location data')
    }
  } catch (error) {
    console.error('Location error:', error)
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown'
    }
  }
}

async function startAvatarPreload(userId) {
  const fullName = profile.value.fullName?.trim()
  if (!fullName) return
  
  console.log('🎨 Generating fresh avatar for:', fullName)
  
  // Generate NEW avatar with current name
  const avatarUrl = generateDefaultAvatar(fullName)
  preloadedData.value.avatarUrl = avatarUrl
  
  // Upload it in background
  console.log('⏳ Uploading avatar...')
  const uploadedUrl = await uploadAvatarToR2(avatarUrl, userId)
  preloadedData.value.uploadedAvatarUrl = uploadedUrl
  console.log('✅ Avatar uploaded!', uploadedUrl)
}

// Watch for name changes and regenerate avatar
watch(() => profile.value.fullName, (newName) => {
  if (!newName?.trim() || !currentUserId) return
  
  // Debounce - only upload after user stops typing for 800ms
  clearTimeout(avatarUploadTimer)
  avatarUploadTimer = setTimeout(() => {
    startAvatarPreload(currentUserId)
  }, 800)
})

onMounted(async () => {
  // Get session first
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    error.value = 'Authentication error. Please login again.'
    setTimeout(() => router.push('/login'), 2000)
    return
  }
  
  currentUserId = session.user.id
  
  if (!authStore.user) {
    authStore.user = session.user
    authStore.session = session
  }
  
  if (session.user.user_metadata?.full_name) {
    profile.value.fullName = session.user.user_metadata.full_name
  }
  
  // PRELOAD device info and location immediately
  console.log('⏳ Preloading device info and location...')
  Promise.all([
    getDeviceInfo(),
    getUserLocation()
  ]).then(([device, location]) => {
    preloadedData.value.deviceInfo = device
    preloadedData.value.locationInfo = location
    console.log('✅ Device and location preloaded!')
  }).catch((err) => {
    console.error('Preload error:', err)
  })
  
  // Generate and upload avatar if name is already present
  if (profile.value.fullName?.trim()) {
    startAvatarPreload(session.user.id)
  }
})

async function handleContinue() {
  // Prevent multiple submissions
  if (isSubmitting.value || !isFormValid.value) {
    return
  }

  error.value = ''
  isSubmitting.value = true

  try {
    // Quick validation
    if (profile.value.nmcNumber.length < 6) {
      error.value = 'Please enter a valid NMC registration number'
      return
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      error.value = 'Session expired. Please login again.'
      setTimeout(() => router.push('/login'), 2000)
      return
    }

    // Use preloaded data - should be ready by now!
    const avatarUrl = preloadedData.value.uploadedAvatarUrl || 
                      preloadedData.value.avatarUrl || 
                      generateDefaultAvatar(profile.value.fullName)
    
    const deviceInfo = preloadedData.value.deviceInfo || {
      model: 'Unknown',
      manufacturer: 'Unknown',
      platform: 'Unknown',
      osVersion: 'Unknown',
      deviceName: 'Unknown Device',
      isVirtual: false
    }
    
    const locationInfo = preloadedData.value.locationInfo || {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown'
    }
    
    console.log('🚀 Submitting with preloaded data...')
    console.log('Avatar URL:', avatarUrl)
    
    // Single database operation - FAST!
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({
        id: session.user.id,
        email: session.user.email,
        full_name: profile.value.fullName.trim(),
        nmc_registration: profile.value.nmcNumber.trim(),
        college_hospital: profile.value.hospital.trim(),
        bio: profile.value.bio?.trim() || null,
        profile_photo_url: avatarUrl,
        verified: false,
        device_info: JSON.stringify({
          name: deviceInfo.deviceName,
          model: deviceInfo.model,
          manufacturer: deviceInfo.manufacturer,
          platform: deviceInfo.platform,
          osVersion: deviceInfo.osVersion
        }),
        location: `${locationInfo.city}, ${locationInfo.region}, ${locationInfo.country}`,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
    
    if (upsertError) {
      error.value = upsertError.message
      return
    }
    
    console.log('✅ Profile created successfully!')
    
    // Navigate to next page
    await router.push('/tabs/select-specialties')
    
  } catch (err) {
    console.error('Signup error:', err)
    error.value = 'An unexpected error occurred. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.interests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.interest-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  position: relative;
}

.interest-chip:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.interest-chip.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.interest-chip ion-icon {
  font-size: 28px;
}

.interest-chip.selected ion-icon {
  color: white;
}

.profile-content {
  --background: linear-gradient(180deg, #000 0%, #0a0a0a 100%);
}

.profile-container {
  max-width: 540px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  min-height: 100%;
}

/* Header Section */
.header-section {
  margin-bottom: 2.5rem;
}

.progress-indicator {
  margin-bottom: 2rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #1a1a1a;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #a855f7 0%, #10b981 100%);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.progress-text {
  display: block;
  color: #6b7280;
  font-size: 0.8125rem;
  font-weight: 500;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.5rem;
  letter-spacing: -0.5px;
}

.page-subtitle {
  color: #9ca3af;
  font-size: 0.9375rem;
  margin: 0;
  line-height: 1.5;
}

/* Form Section */
.form-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid #1a1a1a;
  border-radius: 20px;
  padding: 2rem 1.5rem;
  backdrop-filter: blur(10px);
}

.input-group {
  margin-bottom: 1.5rem;
}

.input-group:last-of-type {
  margin-bottom: 2rem;
}

.input-label {
  display: block;
  color: #e5e7eb;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.625rem;
}

.required {
  color: #f87171;
  margin-left: 0.25rem;
}

.custom-input,
.custom-textarea {
  width: 100%;
  background: #000 !important;
  border: 1.5px solid #262626;
  border-radius: 16px;
  padding: 0.875rem 1.125rem;
  color: #e5e7eb !important;
  font-size: 0.9375rem;
  font-family: inherit;
  transition: all 0.3s ease;
  -webkit-text-fill-color: #e5e7eb !important;
  -webkit-box-shadow: 0 0 0 1000px #000 inset !important;
}

.custom-input {
  height: 42px;
}

.custom-textarea {
  resize: vertical;
  min-height: 100px;
  line-height: 1.6;
}

.custom-input::placeholder,
.custom-textarea::placeholder {
  color: #4b5563;
}

.custom-input:focus,
.custom-textarea:focus {
  background: #0a0a0a !important;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
  -webkit-box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1), 0 0 0 1000px #0a0a0a inset !important;
  outline: none;
}

.input-hint {
  display: block;
  color: #6b7280;
  font-size: 0.8125rem;
  margin-top: 0.5rem;
}

/* Submit Button */
.submit-btn {
  width: 100%;
  height: 42px;
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  border: none;
  border-radius: 21px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
}

.submit-btn:hover:not([disabled]) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
  background: linear-gradient(135deg, #9333ea 0%, #6d28d9 100%);
}

.submit-btn:active:not([disabled]) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.loading-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error Message */
.error-message {
  margin-top: 1.25rem;
  padding: 0.875rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #fca5a5;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  animation: slideIn 0.3s ease;
}

.error-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #f87171;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 576px) {
  .profile-container {
    padding: 1.5rem 1rem;
  }
  
  .form-section {
    padding: 1.5rem 1.25rem;
    border-radius: 16px;
  }
  
  .page-title {
    font-size: 1.75rem;
  }
  
  .header-section {
    margin-bottom: 2rem;
  }
}
</style>








[
  {
    "column_name": "is_verified",
    "data_type": "boolean"
  },
  {
    "column_name": "verified_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "email_change_sent_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "last_sign_in_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "raw_app_meta_data",
    "data_type": "jsonb"
  },
  {
    "column_name": "raw_user_meta_data",
    "data_type": "jsonb"
  },
  {
    "column_name": "is_super_admin",
    "data_type": "boolean"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "instance_id",
    "data_type": "uuid"
  },
  {
    "column_name": "phone_confirmed_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "column_name": "verified",
    "data_type": "boolean"
  },
  {
    "column_name": "phone_change_sent_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "confirmed_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "column_name": "email_change_confirm_status",
    "data_type": "smallint"
  },
  {
    "column_name": "banned_until",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "is_private",
    "data_type": "boolean"
  },
  {
    "column_name": "reauthentication_sent_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "is_sso_user",
    "data_type": "boolean"
  },
  {
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "is_anonymous",
    "data_type": "boolean"
  },
  {
    "column_name": "show_online_status",
    "data_type": "boolean"
  },
  {
    "column_name": "email_confirmed_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "invited_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "column_name": "confirmation_sent_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp without time zone"
  },
  {
    "column_name": "recovery_sent_at",
    "data_type": "timestamp with time zone"
  },
  {
    "column_name": "confirmation_token",
    "data_type": "character varying"
  },
  {
    "column_name": "email",
    "data_type": "text"
  },
  {
    "column_name": "full_name",
    "data_type": "text"
  },
  {
    "column_name": "nmc_registration",
    "data_type": "text"
  },
  {
    "column_name": "profile_photo_url",
    "data_type": "text"
  },
  {
    "column_name": "college_hospital",
    "data_type": "text"
  },
  {
    "column_name": "bio",
    "data_type": "text"
  },
  {
    "column_name": "location",
    "data_type": "text"
  },
  {
    "column_name": "specialization",
    "data_type": "text"
  },
  {
    "column_name": "year",
    "data_type": "text"
  },
  {
    "column_name": "website",
    "data_type": "text"
  },
  {
    "column_name": "aud",
    "data_type": "character varying"
  },
  {
    "column_name": "role",
    "data_type": "character varying"
  },
  {
    "column_name": "email",
    "data_type": "character varying"
  },
  {
    "column_name": "encrypted_password",
    "data_type": "character varying"
  },
  {
    "column_name": "recovery_token",
    "data_type": "character varying"
  },
  {
    "column_name": "email_change_token_new",
    "data_type": "character varying"
  },
  {
    "column_name": "email_change",
    "data_type": "character varying"
  },
  {
    "column_name": "phone",
    "data_type": "text"
  },
  {
    "column_name": "phone_change",
    "data_type": "text"
  },
  {
    "column_name": "phone_change_token",
    "data_type": "character varying"
  },
  {
    "column_name": "email_change_token_current",
    "data_type": "character varying"
  },
  {
    "column_name": "reauthentication_token",
    "data_type": "character varying"
  }
]