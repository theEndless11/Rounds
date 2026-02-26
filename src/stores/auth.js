import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const session = ref(null)
  const loading = ref(true)
  const isVerified = ref(true) // Default to true to prevent banner flash
  
  let isCheckingVerification = false

  async function checkVerificationStatus(userId) {
    if (isCheckingVerification) return
    
    isCheckingVerification = true
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('verified')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) {
        isVerified.value = false
      } else {
        isVerified.value = data?.verified || false
      }
    } catch (error) {
      isVerified.value = false
    } finally {
      isCheckingVerification = false
    }
  }

  async function initAuth() {
    loading.value = true
    
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession()
      
      if (error) {
        session.value = null
        user.value = null
        isVerified.value = true
      } else if (currentSession) {
        session.value = currentSession
        user.value = currentSession.user
        checkVerificationStatus(currentSession.user.id).catch(() => {})
      } else {
        session.value = null
        user.value = null
        isVerified.value = true
      }
    } catch (error) {
      session.value = null
      user.value = null
      isVerified.value = true
    } finally {
      loading.value = false
    }
  }

  supabase.auth.onAuthStateChange(async (event, currentSession) => {
    try {
      if (event === 'SIGNED_IN' && currentSession) {
        session.value = currentSession
        user.value = currentSession.user
        checkVerificationStatus(currentSession.user.id).catch(() => {})
      } else if (event === 'SIGNED_OUT') {
        session.value = null
        user.value = null
        isVerified.value = true
      } else if (event === 'TOKEN_REFRESHED' && currentSession) {
        session.value = currentSession
        user.value = currentSession.user
      } else if (event === 'INITIAL_SESSION' && currentSession) {
        session.value = currentSession
        user.value = currentSession.user
        checkVerificationStatus(currentSession.user.id).catch(() => {})
      } else if (!currentSession) {
        session.value = null
        user.value = null
        isVerified.value = true
      }
    } catch (error) {
      console.error('Error in auth state change handler:', error)
    }
  })

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error
      
      user.value = null
      session.value = null
      isVerified.value = true
    } catch (error) {
      user.value = null
      session.value = null
      isVerified.value = true
      throw error
    }
  }

  return {
    user,
    session,
    loading,
    isVerified,
    initAuth,
    signOut,
    checkVerificationStatus
  }
})