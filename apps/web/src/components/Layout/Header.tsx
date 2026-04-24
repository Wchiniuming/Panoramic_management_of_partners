import React from 'react'
import { Layout, Avatar, Dropdown, Badge, Space } from 'antd'
import { BellOutlined, UserOutlined, LogoutOutlined, SettingOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useAuthStore } from '@/stores/authStore'

interface HeaderProps {
  collapsed: boolean
  toggle: (collapsed: boolean) => void
  onLogout: () => void
}

const Header: React.FC<HeaderProps> = ({ collapsed, toggle, onLogout }) => {
  const user = useAuthStore((state) => state.user)

  const menuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
    { key: 'settings', icon: <SettingOutlined />, label: '设置' },
    { type: 'divider' },
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
        <Badge count={5} size="small">
          <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
        </Badge>
        <Dropdown
          menu={{ items: menuItems, onClick: handleMenuClick }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
            <span>{user?.username || '用户'}</span>
          </Space>
        </Dropdown>
      </Space>
    </Layout.Header>
  )
}

export default Header
