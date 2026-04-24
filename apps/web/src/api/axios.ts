import axios from 'axios'
import { message } from 'antd'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    const detail = error.response?.data?.detail
    if (Array.isArray(detail)) {
      message.error(detail.map((e: any) => e.msg).join(', '))
    } else {
      message.error(detail || '请求失败')
    }
    return Promise.reject(error)
  }
)

export default apiClient
