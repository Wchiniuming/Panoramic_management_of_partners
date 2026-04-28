import React from 'react'
import { Layout, Avatar, Dropdown, Space } from 'antd'
import { UserOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useAuthStore } from '@/stores/authStore'
import dayjs from 'dayjs'

interface HeaderProps {
  collapsed: boolean
  toggle: (collapsed: boolean) => void
  onLogout: () => void
}

const Header: React.FC<HeaderProps> = ({ collapsed, toggle, onLogout }) => {
  const user = useAuthStore((state) => state.user)

  const menuItems: MenuProps['items'] = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
  ]

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      onLogout()
    }
  }

  return (
    <Layout.Header
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 4px rgba(0,21,41,.08)',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        width: '100%',
      }}
    >
      <span
        onClick={() => toggle(!collapsed)}
        style={{ cursor: 'pointer', fontSize: 18 }}
      >
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </span>
      <Space size="large">
        <span style={{ fontSize: 14, color: '#64748b' }}>
          欢迎 <span style={{ color: '#0f172a', fontWeight: 500 }}>{user?.username || '用户'}</span> · {dayjs().format('YYYY年MM月DD日')}
        </span>
        <Dropdown
          menu={{ items: menuItems, onClick: handleMenuClick }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
          </Space>
        </Dropdown>
      </Space>
    </Layout.Header>
  )
}

export default Header
