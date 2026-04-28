import { useRoutes } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useEffect } from 'react'
import { routes } from './routes'
import { useAuthStore } from '@/stores/authStore'

function App() {
  const { user, fetchUser } = useAuthStore()

  useEffect(() => {
    if (!user) {
      fetchUser()
    }
  }, [])

  return (
    <ConfigProvider locale={zhCN}>
      {useRoutes(routes)}
    </ConfigProvider>
  )
}

export default App
