<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="jobs-app">
        <!-- Header -->
        <header class="header" style="margin-top: 30px;">
          <h1 style="margin-left: 40%;">Jobs</h1>
          <button class="search-btn" @click="showSearchModal = true">
            <ion-icon :icon="search"></ion-icon>
          </button>
        </header>

        <!-- Category Pills -->
        <div class="categories">
          <button
            v-for="cat in categories"
            :key="cat.label"
            :class="['category-pill', { active: activeCategoryName === cat.label }]"
            @click="changeCategory(cat.label, cat.query)"
          >
            {{ cat.label }}
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading">
          <ion-spinner></ion-spinner>
          <p>Loading jobs...</p>
        </div>

        <!-- Error State -->
        <div v-if="error" class="error">{{ error }}</div>

        <!-- Job Cards -->
        <div v-else class="jobs-list">
          <div v-for="(job, index) in displayedJobs" :key="job.id" class="job-card" @click="viewJobDetails(job)">
            <div class="job-header">
              <div class="job-image">
                <img v-if="job.logo" 
                     :src="job.logo" 
                     :alt="job.company"
                     @error="handleImageError($event)" />
                <ion-icon v-else :icon="business" class="fallback-icon"></ion-icon>
              </div>
              <div class="job-info">
                <div class="title-row">
                  <h3>{{ job.title }}</h3>
                  <a v-if="job.url" :href="job.url" target="_blank" rel="noopener" class="btn-apply-card" @click.stop>
                    Apply Now
                  </a>
                </div>
                <div v-if="job.company" class="company">
                  <ion-icon :icon="businessOutline" class="company-icon"></ion-icon>
                  {{ job.company }}
                </div>
              </div>
            </div>

            <div class="job-meta">
              <span v-if="job.work_type" class="job-type">
                {{ job.work_type }}
              </span>
              <span v-if="job.country_code" class="job-location">
                <ion-icon :icon="locationOutline"></ion-icon>
                {{ job.country_code.toUpperCase() }}
              </span>
              <span v-if="job.date_posted" class="job-time">
                <ion-icon :icon="timeOutline"></ion-icon>
                {{ formatTimeAgo(job.date_posted) }}
              </span>
            </div>
          </div>

          <div v-if="displayedJobs.length === 0 && !loading" class="no-results">
            <p>No jobs found for the current filters.</p>
            <p style="font-size: 14px; color: #666; margin-top: 10px;">Try clicking "Sync New Jobs" to fetch latest postings.</p>
          </div>

          <!-- Load More Button -->
          <div v-if="hasMore && !loading" class="load-more-container">
            <button @click="loadMore" class="btn-load-more">
              Load More Jobs
            </button>
          </div>
        </div>

        <!-- Job Details Modal -->
        <ion-modal :is-open="Boolean(selectedJob)" @did-dismiss="closeModal" style="--height: calc(100% - 40px)">
          <ion-header>
            <ion-toolbar>
              <ion-title>{{ selectedJob?.title }}</ion-title>
              <ion-buttons slot="end">
                <ion-button @click="closeModal">Close</ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          
          <ion-content v-if="selectedJob" class="ion-padding modal-content">
            <div class="modal-body">
              <p v-if="selectedJob.company" class="modal-company">{{ selectedJob.company }}</p>

              <div class="modal-section">
                <h4>Details</h4>
                <div class="detail-list">
                  <div v-if="selectedJob.industry"><strong>Industry:</strong> {{ selectedJob.industry }}</div>
                  <div v-if="selectedJob.country_code"><strong>Country:</strong> {{ selectedJob.country_code.toUpperCase() }}</div>
                  <div v-if="selectedJob.work_place"><strong>Workplace:</strong> {{ selectedJob.work_place }}</div>
                  <div v-if="selectedJob.work_type"><strong>Type:</strong> {{ selectedJob.work_type }}</div>
                  <div v-if="selectedJob.city"><strong>City:</strong> {{ selectedJob.city }}</div>
                  <div v-if="selectedJob.date_posted"><strong>Posted:</strong> {{ formatDate(selectedJob.date_posted) }}</div>
                </div>
              </div>

              <div v-if="selectedJob.description" class="modal-section">
                <h4>Description</h4>
                <div class="description" v-html="formatDescription(selectedJob.description)"></div>
              </div>

              <div v-if="selectedJob.url" class="modal-section">
                <a :href="selectedJob.url" target="_blank" rel="noopener" class="btn-apply">
                  Apply Now
                </a>
              </div>
            </div>
          </ion-content>
        </ion-modal>

        <!-- Search Modal -->
        <ion-modal :is-open="showSearchModal" @didDismiss="showSearchModal = false">
          <ion-header>
            <ion-toolbar>
              <ion-title>Search Jobs</ion-title>
              <ion-buttons slot="end">
                <ion-button @click="showSearchModal = false">Close</ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          
          <ion-content class="modal-content">
            <div class="search-form">
              <input 
                v-model="searchFilters.occupation" 
                type="text" 
                placeholder="Occupation (e.g., Doctor, Nurse)"
                class="search-input"
                @keyup.enter="performSearch"
              />
              
              <input 
                v-model="searchFilters.city" 
                type="text" 
                placeholder="City"
                class="search-input"
              />
              
              <select v-model="searchFilters.work_place" class="search-select">
                <option value="">All Workplace</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">On-site</option>
              </select>

              <select v-model="searchFilters.work_type" class="search-select">
                <option value="">All Work Types</option>
                <option value="FullTime">Full Time</option>
                <option value="PartTime">Part Time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>

              <button @click="performSearch" class="btn-search">Search</button>
            </div>
          </ion-content>
        </ion-modal>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>

.load-more-container {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}

.btn-load-more {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 100;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-load-more:hover {
  background: #0056b3;
}

.end-message {
  text-align: center;
  padding: 24px;
  color: #666;
  font-size: 14px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.title-row h3 {
  margin: 0;
  flex: 1;
}

.btn-apply-card {
  display: inline-block;
  padding: 8px 12px;
  background: #007AFF;
  color: white;
  text-decoration: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-apply-card:hover {
  background: #0051D5;
}
.jobs-app {
  min-height: 70vh;
  background: var(--background);
  padding-bottom: 20px;
}

.header {
  background: var(--background);
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  position: relative;
  top: 0;
  z-index: 10;
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.search-btn {
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
}

.search-btn ion-icon {
  font-size: 22px;
}

.categories {
  background: var(--background);
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-color);
  scrollbar-width: none;
}

.categories::-webkit-scrollbar {
  display: none;
}

.category-pill {
  padding: 6px 16px;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  background: var(--background);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.category-pill.active {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.loading {
  text-align: center;
  padding: 32px;
  color: var(--text-secondary);
}

.loading p {
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

.error {
  background: #7f1d1d;
  color: #fca5a5;
  padding: 12px 16px;
  margin: 12px 16px;
  border-radius: 6px;
  border: 1px solid #991b1b;
  font-size: 13px;
}

body.light .error {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fca5a5;
}

.jobs-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.job-card {
  background: var(--background); 
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: background 0.2s;
  border: 1px solid var(--border-color);
}

.job-card:hover {
  background: var(--card-hover);
}

body.light .job-card {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.job-header {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.job-image {
  width: 44px;
  height: 44px;
  background: var(--input-background);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
}

.job-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fallback-icon {
  font-size: 24px;
  color: var(--text-secondary);
}

.job-info {
  flex: 1;
  min-width: 0;
}

.job-info h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 3px 0;
  line-height: 1.3;
}

.company {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.company-icon {
  font-size: 14px;
}

.job-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  font-size: 11px;
}

.job-type {
  padding: 3px 10px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 10px;
  font-weight: 500;
  font-size: 11px;
}

body:not(.light) .job-type {
  background: rgba(46, 125, 50, 0.2);
  color: #81c784;
}

.job-type.fellowship {
  background: #e3f2fd;
  color: #1565c0;
}

body:not(.light) .job-type.fellowship {
  background: rgba(21, 101, 192, 0.2);
  color: #64b5f6;
}

.job-location,
.job-time {
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
}

.job-location ion-icon,
.job-time ion-icon {
  font-size: 13px;
}

.job-description {
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.4;
  margin: 0;
  opacity: 0.9;
}

.no-results {
  text-align: center;
  padding: 32px;
  color: var(--text-secondary);
  font-size: 13px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  padding: 14px;
  margin-top: 16px;
}

.pagination span {
  color: var(--text-secondary);
  font-size: 13px;
}

.btn-page {
  padding: 7px 14px;
  background: var(--input-background);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.2s;
  font-size: 13px;
}

.btn-page:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.btn-page:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Modal Styles */
ion-modal {
  --background: var(--modal-background);
  --backdrop-opacity: 0.6;
}

ion-modal::part(backdrop) {
  background: rgba(0, 0, 0, 0.8);
}

body.light ion-modal::part(backdrop) {
  background: rgba(0, 0, 0, 0.4);
}

ion-modal::part(content) {
  background: var(--modal-background);
}

ion-modal ion-header {
  position: relative;
  z-index: 10;
  background: var(--modal-background) !important;
}

body:not(.light) ion-modal ion-header {
  background: #000 !important;
}

body.light ion-modal ion-header {
  background: #fff !important;
}

ion-modal ion-toolbar {
  --background: var(--modal-background) !important;
  --color: var(--modal-text);
  --border-color: var(--border-color);
}

body:not(.light) ion-modal ion-toolbar {
  --background: #000 !important;
}

body.light ion-modal ion-toolbar {
  --background: #fff !important;
}

ion-modal ion-content {
  --background: var(--modal-background);
  --color: var(--modal-text);
}

body:not(.light) ion-modal ion-content {
  --background: #000;
}

body.light ion-modal ion-content {
  --background: #fff;
}

.modal-content {
  background: var(--modal-background) !important;
}

.modal-body {
  padding: 16px;
  min-height: 100vh;
  background: var(--modal-background);
  color: var(--modal-text);
}

body:not(.light) .modal-body {
  background: #000;
  color: #fff;
}

body.light .modal-body {
  background: #fff;
  color: #000;
}

.modal-company {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 14px;
}

.modal-section {
  margin-bottom: 20px;
}

.modal-section h4 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--modal-text);
}

.detail-list div {
  padding: 7px 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
  color: var(--modal-text);
}

.detail-list div:last-child {
  border-bottom: none;
}

.detail-list strong {
  color: var(--text-secondary);
  margin-right: 6px;
  font-size: 12px;
}

.description {
  line-height: 1.5;
  color: var(--modal-text);
  font-size: 13px;
}

.btn-apply {
  display: inline-block;
  padding: 10px 20px;
  background: #2563eb;
  color: white;
  text-decoration: none;
  border-radius: 16px;
  font-weight: 600;
  transition: background 0.2s;
  font-size: 14px;
}

.btn-apply:hover {
  background: #1d4ed8;
}

/* Search Modal */
.search-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.search-input,
.search-select {
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 13px;
  background: var(--input-background);
  color: var(--text-primary);
}

.search-select option {
  background: var(--input-background);
  color: var(--text-primary);
}

.search-input::placeholder {
  color: var(--placeholder-color);
}

.search-input:focus,
.search-select:focus {
  outline: none;
  border-color: #2563eb;
}

.btn-search {
  padding: 10px 20px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
}

.btn-search:hover {
  background: #1d4ed8;
}
</style>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { 
  IonPage, 
  IonContent,
  IonIcon,
  IonSpinner,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton
} from '@ionic/vue'
import { 
  search, 
  business,
  businessOutline,
  locationOutline,
  timeOutline
} from 'ionicons/icons'

const activeCategoryName = ref('All')
const loading = ref(false)
const error = ref('')
const displayedJobs = ref([])
const selectedJob = ref(null)
const showSearchModal = ref(false)
const hasMore = ref(false)
const currentOffset = ref(0)
const pageSize = 30

const searchFilters = ref({
  occupation: '',
  city: '',
  work_place: '',
  work_type: ''
})

const categories = [
  { label: 'All', query: '' },
  { label: 'Doctor', query: 'Doctor' },
  { label: 'Physician', query: 'Physician' },
  { label: 'Specialist', query: 'Specialist' },
  { label: 'Consultant', query: 'Consultant' },
  { label: 'Nursing', query: 'Nurse' },
  { label: 'Surgeon', query: 'Surgeon' },
  { label: 'Medical Officer', query: 'Medical Officer' },
  { label: 'Healthcare', query: 'Healthcare' },
  { label: 'Clinical', query: 'Clinical' }
]

// Fetch jobs from Supabase
const fetchJobsFromDB = async (append = false) => {
  loading.value = true
  error.value = ''
  
  if (!append) {
    currentOffset.value = 0
    displayedJobs.value = []
  }
  
  try {
    let query = supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('date_posted', { ascending: false })
      .range(currentOffset.value, currentOffset.value + pageSize - 1)

    // Apply filters
    if (searchFilters.value.occupation) {
      query = query.ilike('occupation', `%${searchFilters.value.occupation}%`)
    }
    if (searchFilters.value.city) {
      query = query.ilike('city', `%${searchFilters.value.city}%`)
    }
    if (searchFilters.value.work_place) {
      query = query.eq('work_place', searchFilters.value.work_place)
    }
    if (searchFilters.value.work_type) {
      query = query.eq('work_type', searchFilters.value.work_type)
    }

    const { data, error: fetchError, count } = await query

    if (fetchError) throw fetchError

    if (append) {
      displayedJobs.value = [...displayedJobs.value, ...data]
    } else {
      displayedJobs.value = data
    }

    currentOffset.value += pageSize
    hasMore.value = displayedJobs.value.length < count

  } catch (err) {
    error.value = `Failed to load jobs: ${err.message}`
    console.error('Fetch error:', err)
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  fetchJobsFromDB(true)
}

const changeCategory = (label, query) => {
  activeCategoryName.value = label
  searchFilters.value.occupation = query
  fetchJobsFromDB()
}

const performSearch = () => {
  showSearchModal.value = false
  activeCategoryName.value = 'Custom'
  fetchJobsFromDB()
}

const viewJobDetails = (job) => {
  selectedJob.value = job
}

const closeModal = () => {
  selectedJob.value = null
}

const formatTimeAgo = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1d ago'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

const formatDescription = (text) => {
  if (!text) return ''
  return text.replace(/\n/g, '<br>').replace(/  +/g, ' ').trim()
}

const handleImageError = (event) => {
  event.target.style.display = 'none'
}

onMounted(() => {
  fetchJobsFromDB()
})
</script>
