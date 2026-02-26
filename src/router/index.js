import { createRouter, createWebHistory } from '@ionic/vue-router'
import Tabs from '@/views/Tabs.vue'

const routes = [
  {
    path: '/',
    redirect: '/tabs/home'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/signup',
    name: 'Signup',
    component: () => import('@/views/Signup.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/ResetPassword.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/blocked-users',
    name: 'BlockedUsers',
    component: () => import('@/views/BlockedUsers.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: () => import('@/views/AuthCallback.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/complete-profile',
    name: 'CompleteProfile',
    component: () => import('@/views/CompleteProfile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/edit-profile',
    name: 'EditProfile',
    component: () => import('@/views/EditProfile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user/:id',
    name: 'UserProfile',
    component: () => import('@/views/UserProfile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/post/:id',
    name: 'PostDetail',
    component: () => import('@/views/PostDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/chat/:userId',
    name: 'ChatBox',
    component: () => import('@/views/ChatBox.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tabs/',
    component: Tabs,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/tabs/home' },
      { path: 'home', name: 'Home', component: () => import('@/views/Home.vue') },
      { path: 'jobs', name: 'Jobs', component: () => import('@/views/Jobs.vue') },
      { path: 'chat', name: 'Chat', component: () => import('@/views/Chat.vue') },
      { path: 'search', name: 'Search', component: () => import('@/views/Search.vue') },
      { path: 'create', name: 'CreatePost', component: () => import('@/views/CreatePost.vue') },
      { path: 'notifications', name: 'Notifications', component: () => import('@/views/Notifications.vue') },
      { path: 'profile', name: 'Profile', component: () => import('@/views/Profile.vue') },
      {
        path: 'select-specialties',
        name: 'SelectSpecialties',
        component: () => import('@/views/SelectSpecialities.vue')
      }
    ]
  },
  { path: '/history', component: () => import('@/views/History.vue') },
  { path: '/terms-and-conditions', component: () => import('@/views/TermsAndConditions.vue') },
  { path: '/privacy-policy', component: () => import('@/views/Privacy Policy.vue') },
  { path: '/privacy-settings', component: () => import('@/views/PrivacyAndSettings.vue') },
  { path: '/verify-account', component: () => import('@/views/VerifyAccount.vue') },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/tabs/home'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from, next) => {
  const { useAuthStore } = await import('@/stores/auth')
  const authStore = useAuthStore()

  if (authStore.loading) {
    await authStore.initAuth()
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isAuthenticated = !!authStore.user

  if (to.path === '/') {
    next(isAuthenticated ? '/tabs/home' : '/login')
    return
  }

  if (requiresAuth && !isAuthenticated) {
    next('/login')
    return
  }

  if (to.path === '/login' && isAuthenticated) {
    next('/tabs/home')
    return
  }

  next()
})

export default router
