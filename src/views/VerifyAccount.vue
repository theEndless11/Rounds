<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/profile"></ion-back-button>
        </ion-buttons>
        <ion-title>Get Verified</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="verification-container">
        <!-- Status Banner -->
        <div v-if="existingRequest" class="status-banner" :class="statusClass">
          <div class="status-icon">
            <ion-icon :icon="statusIcon"></ion-icon>
          </div>
          <div class="status-content">
            <h3>{{ statusTitle }}</h3>
            <p>{{ statusMessage }}</p>
          </div>
        </div>

        <!-- Verification Badge Info -->
        

        <!-- Verification Form -->
        <div v-if="!existingRequest || existingRequest.status === 'rejected'" class="form-section">
          <h3 class="section-title">Submit Your Credentials</h3>

          <!-- NMC Number -->
          <ion-item>
            <ion-label position="stacked">
              NMC Registration Number *
              <span class="label-hint">Your National Medical Commission number</span>
            </ion-label>

            <ion-input 
  v-model="formData.nmcNumber"
  placeholder="NMC123456"
></ion-input>
          </ion-item>

          <!-- Additional Info -->
          <ion-item>
            <ion-label position="stacked">
              Additional Information
              <span class="label-hint">Degree, specialization, years of practice, etc.</span>
            </ion-label>
            <ion-textarea 
              v-model="formData.additionalInfo"
              placeholder="MBBS, MD (Medicine), 5 years experience..."
              :rows="3"
              :maxlength="500"
              :counter="true"
            ></ion-textarea>
          </ion-item>

          <!-- Document Upload Section -->
          <div class="upload-section">
            <h4>Upload Supporting Documents *</h4>
            <p class="upload-hint">
              Upload your medical license, degree certificate, or ID card (PDF, JPG, PNG)
            </p>

            <input 
              ref="fileInput"
              type="file" 
              accept="image/*,application/pdf"
              multiple
              style="display: none"
              @change="handleFileSelect"
            />

            <ion-button 
              expand="block" 
              fill="outline"
              @click="triggerFileInput"
              :disabled="uploadedFiles.length >= 5"
            >
              <ion-icon :icon="cloudUpload" slot="start"></ion-icon>
              Upload Documents ({{ uploadedFiles.length }}/5)
            </ion-button>

            <!-- Uploaded Files List -->
            <div v-if="uploadedFiles.length > 0" class="files-list">
              <div 
                v-for="(file, index) in uploadedFiles" 
                :key="index"
                class="file-item"
              >
                <div class="file-info">
                  <ion-icon 
                    :icon="file.type === 'pdf' ? document : image" 
                    class="file-icon"
                  ></ion-icon>
                  <div class="file-details">
                    <p class="file-name">{{ file.name }}</p>
                    <p class="file-size">{{ formatFileSize(file.size) }}</p>
                  </div>
                </div>

                <ion-button 
                  fill="clear" 
                  color="danger"
                  @click="removeFile(index)"
                  :disabled="uploading"
                >
                  <ion-icon :icon="trash"></ion-icon>
                </ion-button>

                <!-- Upload Progress -->
                <div v-if="file.uploading" class="upload-progress">
                  <ion-progress-bar :value="file.progress / 100"></ion-progress-bar>
                  <span>{{ file.progress }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <ion-button 
            expand="block"
            @click="submitVerification"
            :disabled="!canSubmit || uploading"
            class="submit-button"
          >
            <ion-icon :icon="send" slot="start"></ion-icon>
            {{ uploading ? 'Uploading...' : 'Submit for Verification' }}
          </ion-button>

          <p class="submit-note">
            <ion-icon :icon="informationCircle"></ion-icon>
            Our team will review your submission within 24-48 hours
          </p>

          <ion-text v-if="error" color="danger" class="error-message">
            <p>{{ error }}</p>
          </ion-text>
        </div>

        <!-- Resubmit for Rejected -->
        <div v-if="existingRequest?.status === 'rejected'" class="rejection-info">
          <ion-card>
            <ion-card-header>
              <ion-card-title>Rejection Reason</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>{{ existingRequest.rejection_reason || 'No reason provided' }}</p>
              <p class="resubmit-note">Please address the issues and submit again.</p>
            </ion-card-content>
          </ion-card>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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
  IonBackButton,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonProgressBar,
  toastController
} from '@ionic/vue'
import {
  checkmarkCircle,
  checkmark,
  cloudUpload,
  document,
  image,
  trash,
  send,
  informationCircle,
  closeCircle,
  time,
  checkmarkDone
} from 'ionicons/icons'

const router = useRouter()
const authStore = useAuthStore()

const userProfile = ref(null)
const existingRequest = ref(null)
const formData = ref({
  nmcNumber: '',
  additionalInfo: ''
})
const uploadedFiles = ref([])
const fileInput = ref(null)
const uploading = ref(false)
const error = ref('')

const BACKEND_API_URL = 'https://octopus-push-api-production-e5b8.up.railway.app/api'
//cred
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const canSubmit = computed(() => {
  return formData.value.nmcNumber.trim() && 
         uploadedFiles.value.length > 0 &&
         !uploading.value
})

const statusClass = computed(() => {
  if (!existingRequest.value) return ''
  
  const statusMap = {
    pending: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected'
  }
  return statusMap[existingRequest.value.status] || ''
})

const statusIcon = computed(() => {
  if (!existingRequest.value) return informationCircle
  
  const iconMap = {
    pending: time,
    approved: checkmarkDone,
    rejected: closeCircle
  }
  return iconMap[existingRequest.value.status] || informationCircle
})

const statusTitle = computed(() => {
  if (!existingRequest.value) return ''
  
  const titleMap = {
    pending: 'Verification Pending',
    approved: 'Verified ✓',
    rejected: 'Verification Rejected'
  }
  return titleMap[existingRequest.value.status] || ''
})

const statusMessage = computed(() => {
  if (!existingRequest.value) return ''
  
  const messageMap = {
    pending: 'Your verification request is under review. We\'ll notify you once it\'s processed.',
    approved: 'Congratulations! Your account has been verified.',
    rejected: 'Your verification request was rejected. Please review the reason and resubmit.'
  }
  return messageMap[existingRequest.value.status] || ''
})

onMounted(async () => {
  await loadUserProfile()
  await checkExistingRequest()
})

async function loadUserProfile() {
  const { data, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authStore.user.id)
    .single()

  if (!profileError && data) {
    userProfile.value = data
    formData.value.nmcNumber = data.nmc_registration || ''
  }
}

async function checkExistingRequest() {
  const { data, error: requestError } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('user_id', authStore.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!requestError && data) {
    existingRequest.value = data
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  
  for (const file of files) {
    if (uploadedFiles.value.length >= 5) {
      error.value = 'Maximum 5 files allowed'
      break
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      error.value = `${file.name} is too large. Maximum size is 10MB.`
      continue
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      error.value = `${file.name} is not a valid file type. Only JPG, PNG, and PDF are allowed.`
      continue
    }

    const fileType = file.type === 'application/pdf' ? 'pdf' : 'image'
    
    uploadedFiles.value.push({
      file,
      name: file.name,
      size: file.size,
      type: fileType,
      uploading: false,
      progress: 0,
      url: null
    })
  }

  // Reset input
  event.target.value = ''
}

function removeFile(index) {
  uploadedFiles.value.splice(index, 1)
}

async function uploadFileToR2(fileObj) {
  try {
    fileObj.uploading = true
    fileObj.progress = 0

    // Get presigned URL
    const response = await fetch(
      `${BACKEND_API_URL}/generate-upload-url?filename=${encodeURIComponent(fileObj.file.name)}&contentType=${encodeURIComponent(fileObj.file.type)}`
    )

    if (!response.ok) {
      throw new Error('Failed to get upload URL')
    }

    const { url: presignedUrl, publicUrl } = await response.json()

    // Upload with progress
    const xhr = new XMLHttpRequest()

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          fileObj.progress = Math.round((e.loaded / e.total) * 100)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          fileObj.url = publicUrl
          fileObj.uploading = false
          resolve(publicUrl)
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'))
      })

      xhr.open('PUT', presignedUrl)
      xhr.setRequestHeader('Content-Type', fileObj.file.type)
      xhr.send(fileObj.file)
    })
  } catch (err) {
    fileObj.uploading = false
    throw err
  }
}

async function submitVerification() {
  error.value = ''
  uploading.value = true

  try {
    // Upload all files
    const documentUrls = []
    
    for (const fileObj of uploadedFiles.value) {
      const url = await uploadFileToR2(fileObj)
      documentUrls.push(url)
    }

    // Submit verification request
    const { error: insertError } = await supabase
      .from('verification_requests')
      .insert({
        user_id: authStore.user.id,
        nmc_number: formData.value.nmcNumber.trim(),
        additional_info: formData.value.additionalInfo.trim() || null,
        document_urls: documentUrls,
        status: 'pending',
        submitted_at: new Date().toISOString()
      })

    if (insertError) throw insertError

    // Show success message
    const toast = await toastController.create({
      message: 'Verification request submitted successfully!',
      duration: 3000,
      color: 'success',
      position: 'top'
    })
    await toast.present()

    // Reload to show status
    await checkExistingRequest()

    // Clear form
    formData.value.additionalInfo = ''
    uploadedFiles.value = []

  } catch (err) {
    console.error('Error submitting verification:', err)
    error.value = err.message || 'Failed to submit verification request'
  } finally {
    uploading.value = false
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>


<style scoped>
.verification-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

/* Status Banner */
.status-banner {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.status-banner.pending {
  background: rgba(14, 165, 233, 0.1);
  border-color: rgba(14, 165, 233, 0.3);
}

.status-banner.approved {
  background: rgba(6, 182, 212, 0.1);
  border-color: rgba(6, 182, 212, 0.3);
}

.status-banner.rejected {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.3);
}

.status-icon {
  font-size: 2rem;
  display: flex;
  align-items: center;
  color: #0ea5e9;
}

.status-content h3 {
  margin: 0 0 0.25rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #e9d5ff;
}

.status-content p {
  margin: 0;
  font-size: 0.875rem;
  color: #c4b5fd;
}

/* Info Card */
.info-card {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(6, 182, 212, 0.15));
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: 16px;
  padding: 2rem 1.5rem;
  text-align: center;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(14, 165, 233, 0.15);
}

.badge-preview {
  margin-bottom: 1rem;
}

.verified-badge {
  font-size: 4rem;
  color: #0ea5e9;
  filter: drop-shadow(0 4px 16px rgba(14, 165, 233, 0.5));
}

.info-card h2 {
  margin: 0 0 0.75rem;
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.info-text {
  margin: 0 0 1.5rem;
  color: #e9d5ff;
  line-height: 1.6;
  font-size: 0.9375rem;
}

.benefits-list {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid rgba(14, 165, 233, 0.2);
}

.benefits-list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0;
  font-size: 0.9375rem;
  color: #f3e8ff;
}

.benefits-list ion-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  color: #06b6d4;
}

/* Form Section */
.form-section {
  background: rgba(14, 165, 233, 0.05);
  border: 1px solid rgba(14, 165, 233, 0.15);
  border-radius: 16px;
  padding: 1.5rem;
}

.section-title {
  margin: 0 0 1.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #e9d5ff;
}

ion-item {
  --background: transparent;
  --border-color: rgba(14, 165, 233, 0.2);
  --padding-start: 0;
  --inner-padding-end: 0;
  margin-bottom: 1rem;
}

ion-label {
  font-weight: 500 !important;
  margin-bottom: 0.5rem !important;
  color: #e9d5ff !important;
}

.label-hint {
  display: block;
  font-size: 0.8125rem;
  font-weight: 400;
  color: #c4b5fd;
  margin-top: 0.25rem;
}

ion-input, ion-textarea {
  --color: #f3e8ff !important;
  --placeholder-color: #a78bfa !important;
}

/* Upload Section */
.upload-section {
  margin: 2rem 0;
}

.upload-section h4 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #e9d5ff;
}

.upload-hint {
  font-size: 0.875rem;
  color: #c4b5fd;
  margin: 0 0 1rem;
}

.files-list {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem;
  background: rgba(14, 165, 233, 0.08);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 10px;
  transition: all 0.2s;
}

.file-item:hover {
  background: rgba(14, 165, 233, 0.12);
  border-color: rgba(6, 182, 212, 0.3);
  transform: translateY(-1px);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.file-icon {
  font-size: 1.5rem;
  color: #06b6d4;
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  margin: 0 0 0.25rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #f3e8ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  margin: 0;
  font-size: 0.8125rem;
  color: #c4b5fd;
}

.upload-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  color: #c4b5fd;
}

.upload-progress ion-progress-bar {
  flex: 1;
  height: 4px;
  --background: rgba(14, 165, 233, 0.2);
  --progress-background: linear-gradient(90deg, #0ea5e9, #06b6d4);
}

/* Buttons */
ion-button[fill="outline"] {
  --border-color: rgba(14, 165, 233, 0.4);
  --color: #c4b5fd;
}

ion-button[fill="outline"]:hover {
  --background: rgba(14, 165, 233, 0.1);
  --border-color: rgba(6, 182, 212, 0.5);
}

.submit-button {
  margin-top: 2rem;
  --background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  --background-hover: linear-gradient(135deg, #0284c7, #0891b2);
  height: 48px;
  font-weight: 600;
  letter-spacing: 0.025em;
  box-shadow: 0 4px 20px rgba(14, 165, 233, 0.3);
}

.submit-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 1rem 0 0;
  font-size: 0.8125rem;
  color: #c4b5fd;
  text-align: center;
}

.submit-note ion-icon {
  font-size: 1rem;
  color: #0ea5e9;
}

/* Error Message */
.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  text-align: center;
}

.error-message p {
  margin: 0;
  font-size: 0.875rem;
  color: #fca5a5;
}

/* Rejection Info */
.rejection-info {
  margin-top: 1.5rem;
}

.rejection-info ion-card {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
}

.rejection-info ion-card-title {
  color: #fca5a5;
  font-size: 1.125rem;
}

.rejection-info ion-card-content p {
  margin: 0 0 0.75rem;
  line-height: 1.6;
  color: #fecaca;
}

.resubmit-note {
  font-size: 0.875rem;
  color: #fca5a5;
  font-style: italic;
}

/* Responsive */
@media (max-width: 576px) {
  .verification-container {
    padding: 1rem 0.75rem;
  }
  
  .info-card {
    padding: 1.5rem 1rem;
  }
  
  .form-section {
    padding: 1rem;
  }
  
  .file-item {
    padding: 0.75rem;
  }
  
  .benefits-list {
    padding: 1rem;
  }
}
</style>