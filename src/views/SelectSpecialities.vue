<template>
  <ion-page>
    <ion-content class="profile-content">
      <div class="profile-container">
        <!-- Header Section -->
        <div class="header-section">
          <h1 class="page-title">
            <span 
              v-for="(word, index) in titleWords" 
              :key="index"
              class="word"
              :style="{ animationDelay: `${index * 0.1}s` }"
            >
              {{ word }}
            </span>
          </h1>
          <p class="page-subtitle">
            <span 
              v-for="(word, index) in subtitleWords" 
              :key="index"
              class="word"
              :style="{ animationDelay: `${(titleWords.length + index) * 0.1}s` }"
            >
              {{ word }}
            </span>
          </p>
          
          <div class="selection-counter">
            <span class="counter-text">{{ selectedInterests.length }} / 3 selected</span>
          </div>
        </div>

        <!-- Specialties Grid -->
        <div class="specialties-section">
          <div v-if="loadingInterests" class="loading-state">
            <ion-spinner></ion-spinner>
          </div>

          <div v-else class="interests-grid">
            <div 
              v-for="interest in availableInterests" 
              :key="interest.id"
              @click="toggleInterest(interest.id)"
              :class="['interest-chip', { selected: selectedInterests.includes(interest.id) }]"
            >
              <ion-icon :icon="getIcon(interest.icon)"></ion-icon>
              <span>{{ interest.name }}</span>
              <ion-icon 
                v-if="selectedInterests.includes(interest.id)"
                :icon="checkmarkCircle"
                class="check-icon"
              ></ion-icon>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="actions-section">
          <button 
            @click="handleBack"
            class="back-btn"
          >
            Back
          </button>

          <button 
            @click="handleComplete"
            :disabled="loading || !isValid"
            class="submit-btn"
          >
            <span v-if="!loading">Complete Profile</span>
            <span v-else class="loading-content">
              <span class="spinner"></span>
              Saving...
            </span>
          </button>
        </div>

        <div v-if="error" class="error-message">
          <svg class="error-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8v4m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          {{ error }}
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
  IonContent,
  IonIcon,
  IonSpinner
} from '@ionic/vue'
import { 
  heart, scan, cut, fitness, happy, body, person, ribbon, 
  eye, ear, female, male, pulse, medical, medkit, flask, 
  flaskOutline, school, checkmarkCircle
} from 'ionicons/icons'

const router = useRouter()
const authStore = useAuthStore()

const titleWords = ['One', 'last', 'question...']
const subtitleWords = ['Choose', 'at', 'least', '3', 'specialties', "you're", 'interested', 'in','so','we','can','design','better','algorithm','as','per','your','interest.']

const availableInterests = ref([])
const selectedInterests = ref([])
const loading = ref(false)
const loadingInterests = ref(true)
const error = ref('')

const iconMap = {
  'heart': heart, 'scan': scan, 'cut': cut, 'fitness': fitness,
  'happy': happy, 'brain': body, 'body': body, 'head': person,
  'ribbon': ribbon, 'eye': eye, 'ear': ear, 'female': female,
  'male': male, 'pulse': pulse, 'medical': medical, 'medkit': medkit,
  'flask': flask, 'flask-outline': flaskOutline, 'school': school
}

function getIcon(iconName) {
  return iconMap[iconName] || medkit
}

const isValid = computed(() => selectedInterests.value.length >= 3)

function toggleInterest(interestId) {
  const index = selectedInterests.value.indexOf(interestId)
  if (index > -1) {
    selectedInterests.value.splice(index, 1)
  } else {
    selectedInterests.value.push(interestId)
  }
}

onMounted(async () => {
  await loadInterests()
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    error.value = 'Session expired. Please login again.'
    setTimeout(() => router.push('/login'), 2000)
  }
})

async function loadInterests() {
  loadingInterests.value = true
  const { data, error: interestsError } = await supabase
    .from('interests')
    .select('*')
    .order('name')
  
  if (!interestsError && data) {
    availableInterests.value = data
  }
  loadingInterests.value = false
}

function handleBack() {
  router.back()
}

async function handleComplete() {
  if (!isValid.value) {
    error.value = 'Please select at least 3 specialties'
    return
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    error.value = 'Session expired. Please login again.'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const interestInserts = selectedInterests.value.map(interestId => ({
      user_id: session.user.id,
      interest_id: interestId
    }))

    const { error: interestsError } = await supabase
      .from('user_interests')
      .upsert(interestInserts, { onConflict: 'user_id,interest_id' })

    if (interestsError) {
      error.value = 'Failed to save specialties. Please try again.'
      return
    }

    await router.replace('/tabs/home')
  } catch (err) {
    error.value = 'An unexpected error occurred. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
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

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #8710cc;
  margin: 0 0 0.5rem;
  letter-spacing: -0.5px;
  line-height: 1.3;
}

.page-title .word,
.page-subtitle .word {
  display: inline-block;
  opacity: 0;
  animation: fadeInUp 0.5s forwards;
  margin-right: 0.3em;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-subtitle {
  color: #9ca3af;
  font-size: 0.9375rem;
  margin: 0 0 1.5rem;
  line-height: 1.5;
}

.selection-counter {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  margin-bottom: 1rem;
}

.counter-text {
  color: #a855f7;
  font-size: 0.875rem;
  font-weight: 600;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 3rem 0;
  color: #6b7280;
}

/* Interests Grid */
.specialties-section {
  margin-bottom: 2rem;
}

.interests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.interest-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border: 2px solid #262626;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.02);
  position: relative;
}

.interest-chip:hover {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.05);
}

.interest-chip.selected {
  border-color: #a855f7;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%);
}

.interest-chip ion-icon {
  font-size: 28px;
  color: #9ca3af;
  transition: color 0.2s;
}

.interest-chip.selected ion-icon {
  color: #a855f7;
}

.interest-chip span {
  color: #e5e7eb;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
}

.check-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 20px !important;
  color: #10b981 !important;
}

/* Actions Section */
.actions-section {
  display: flex;
  gap: 12px;
  margin-top: 2rem;
}

.back-btn,
.submit-btn {
  height: 42px;
  border: none;
  border-radius: 21px;
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-btn {
  flex: 0 0 auto;
  padding: 0 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1.5px solid #262626;
  color: #e5e7eb;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #404040;
}

.back-btn:active {
  transform: scale(0.98);
}

.submit-btn {
  flex: 1;
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  color: #fff;
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
  
  .page-title {
    font-size: 1.75rem;
  }
  
  .interests-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}
</style>