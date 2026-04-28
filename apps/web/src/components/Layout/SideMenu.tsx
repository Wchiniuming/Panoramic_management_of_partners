import React from 'react'
import { Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  UserOutlined,
  TeamOutlined,
  ScheduleOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'

interface SideMenuProps {
  collapsed: boolean
}

const SideMenu: React.FC<SideMenuProps> = ({ collapsed }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    { key: '/dashboard', icon: <HomeOutlined />, label: '首页' },
    { key: '/developers', icon: <TeamOutlined />, label: '开发人员' },
    { key: '/tasks', icon: <ScheduleOutlined />, label: '任务登记' },
    { key: '/assessment', icon: <AuditOutlined />, label: '厂商评估' },
    { key: '/improvement', icon: <CheckCircleOutlined />, label: '正向改进' },
    { key: '/risks', icon: <WarningOutlined />, label: '风险库' },
    { key: '/users', icon: <UserOutlined />, label: '用户管理' },
  ]

  // Normalize pathname to find matching menu item
  const getSelectedKey = () => {
    const path = location.pathname
    // Handle sub-routes
    for (const item of menuItems) {
      if (path === item.key || path.startsWith(item.key + '/')) {
        return item.key
      }
    }
    return '/dashboard'
  }

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[getSelectedKey()]}
      items={menuItems}
      onClick={({ key }) => navigate(key)}
      inlineCollapsed={collapsed}
    />
  )
}

export default SideMenu
