import { useAuthStore } from '@/stores/authStore'

/**
 * Check if user has specific role
 */
export const hasRole = (role: string): boolean => {
  const user = useAuthStore.getState().user
  return user?.roles.includes(role) ?? false
}

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (roles: string[]): boolean => {
  const user = useAuthStore.getState().user
  return roles.some((role) => user?.roles.includes(role)) ?? false
}

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return useAuthStore.getState().isAuthenticated
}

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return useAuthStore.getState().user
}
