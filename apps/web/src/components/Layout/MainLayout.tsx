import { useState } from 'react'
import { Layout } from 'antd'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import SideMenu from './SideMenu'
import Header from './Header'

const { Sider, Content } = Layout

const MainLayout: React.FC = () => {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const [collapsed, setCollapsed] = useState(false)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth={80}
        onBreakpoint={(broken) => {
          if (broken) {
            setCollapsed(true)
          }
        }}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 16 : 16,
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {collapsed ? 'PP' : '合作伙伴支撑平台'}
        </div>
        <SideMenu collapsed={collapsed} />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header collapsed={collapsed} toggle={setCollapsed} onLogout={handleLogout} />
        <Content
          style={{
            margin: 24,
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
