import { createClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  throw new Error('Missing Supabase environment variables')
}

// Use Capacitor Preferences on native, localStorage on web
const isNative = Capacitor.isNativePlatform()

const capacitorStorage = {
  async getItem(key) {
    try {
      if (isNative) {
        const { value } = await Preferences.get({ key })
        return value
      } else {
        return localStorage.getItem(key)
      }
    } catch (error) {
      console.error('Storage getItem error:', error)
      return null
    }
  },
  async setItem(key, value) {
    try {
      if (isNative) {
        await Preferences.set({ key, value })
      } else {
        localStorage.setItem(key, value)
      }
    } catch (error) {
      console.error('Storage setItem error:', error)
    }
  },
  async removeItem(key) {
    try {
      if (isNative) {
        await Preferences.remove({ key })
      } else {
        localStorage.removeItem(key)
      }
    } catch (error) {
      console.error('Storage removeItem error:', error)
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: capacitorStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token'
  }
})

console.log(`✅ Supabase initialized (${isNative ? 'Native' : 'Web'} mode)`)

















