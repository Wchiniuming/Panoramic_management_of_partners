import { create } from 'zustand'
import apiClient from '@/api/axios'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  setToken: (token: string) => void
  fetchUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),

  login: async (username: string, password: string) => {
    const response = await apiClient.post('/auth/login', { username, password })
    const { access_token, refresh_token, user } = response.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    set({ user, token: access_token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  setToken: (token: string) => {
    localStorage.setItem('access_token', token)
    set({ token, isAuthenticated: true })
  },

  fetchUser: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    try {
      const res = await apiClient.get('/auth/me')
      set({ user: res.data, isAuthenticated: true })
    } catch {
      localStorage.removeItem('access_token')
      set({ user: null, token: null, isAuthenticated: false })
    }
  },
}))
