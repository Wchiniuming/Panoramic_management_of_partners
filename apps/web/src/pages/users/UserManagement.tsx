import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Tabs,
  Table,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  message,
  Drawer,
  Descriptions,
  Tag,
  Tree,
  Popconfirm,
  Row,
  Col,
  Card,
  Divider,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
  SafetyOutlined,
  KeyOutlined,
} from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import apiClient from '@/api/axios'
import dayjs from 'dayjs'
import { useDebounceSearch } from '@/hooks/useDebounceSearch'

const { TabPane } = Tabs

const colorPalette = {
  primary: '#1890ff',
  primaryHover: '#40a9ff',
  primaryLight: 'rgba(24, 144, 255, 0.08)',
  success: '#22c55e',
  successLight: 'rgba(34, 197, 94, 0.1)',
  warning: '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.1)',
  error: '#ef4444',
  errorLight: 'rgba(239, 68, 68, 0.1)',
  purple: '#8b5cf6',
  purpleLight: 'rgba(139, 92, 246, 0.1)',
  bg: '#f8fafc',
  card: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
}

interface User {
  id: number
  username: string
  email: string
  phone?: string
  isActive: boolean
  roles: string[]
  createdAt: string
  lastLogin?: string
}

interface Role {
  id: number
  name: string
  description: string
  permissions: string[]
  createdAt: string
  userCount?: number
}

interface LoginLog {
  id: number
  login_time: string
  ip_address: string
  device: string
  status: 'success' | 'failed'
}

interface PermissionNode {
  title: string
  key: string
  children?: PermissionNode[]
}

const permissionTreeData: PermissionNode[] = [
  { title: '用户管理', key: 'user', children: [
    { title: '查看', key: 'user:read' },
    { title: '新增', key: 'user:create' },
    { title: '修改', key: 'user:update' },
    { title: '删除', key: 'user:delete' },
  ]},
  { title: '开发人员管理', key: 'developer', children: [
    { title: '查看', key: 'developer:read' },
    { title: '新增', key: 'developer:create' },
    { title: '修改', key: 'developer:update' },
    { title: '删除', key: 'developer:delete' },
    { title: '审批', key: 'developer:approve' },
  ]},
  { title: '任务管理', key: 'task', children: [
    { title: '查看', key: 'task:read' },
    { title: '新增', key: 'task:create' },
    { title: '修改', key: 'task:update' },
    { title: '删除', key: 'task:delete' },
    { title: '审批', key: 'task:approve' },
  ]},
  { title: '厂商评估', key: 'assessment', children: [
    { title: '查看', key: 'assessment:read' },
    { title: '执行评估', key: 'assessment:execute' },
    { title: '审批', key: 'assessment:approve' },
  ]},
  { title: '正向改进', key: 'improvement', children: [
    { title: '查看', key: 'improvement:read' },
    { title: '发起', key: 'improvement:create' },
    { title: '审批', key: 'improvement:approve' },
  ]},
  { title: '风险库', key: 'risk', children: [
    { title: '查看', key: 'risk:read' },
    { title: '录入', key: 'risk:create' },
    { title: '修改', key: 'risk:update' },
    { title: '删除', key: 'risk:delete' },
  ]},
]

const roleOptions = [
  { value: 'system_admin', label: '系统管理员' },
  { value: 'business_admin', label: '业务管理员' },
  { value: 'audit_user', label: '稽核人员' },
  { value: 'partner_admin', label: '合作伙伴管理员' },
  { value: 'developer', label: '开发人员' },
  { value: 'readonly', label: '只读用户' },
]

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [userModalVisible, setUserModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([])
  const [loginLogsLoading, setLoginLogsLoading] = useState(false)
  const [form] = Form.useForm()
  const [filters, setFilters] = useState({ username: '', role: undefined as string | undefined, status: undefined as string | undefined })
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const [pagination, setPagination] = useState<TablePaginationConfig>({ current: 1, pageSize: 10, total: 0 })
  const [roles, setRoles] = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [roleModalVisible, setRoleModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [roleForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('users')

  const fetchUsers = useCallback(async (filterParams?: typeof filters) => {
    setLoading(true)
    try {
      const currentFilters = filterParams || filtersRef.current
      const page = pagination.current || 1
      const pageSize = pagination.pageSize || 10
      const params: Record<string, string | number> = { page, page_size: pageSize }
      if (currentFilters.username) params.username = currentFilters.username
      if (currentFilters.role) params.role = currentFilters.role
      if (currentFilters.status) params.status = currentFilters.status

      const response = await apiClient.get('/users', { params })
      const data = response.data

      if (data.items) {
        setUsers(data.items)
        setPagination(prev => ({ ...prev, total: data.total }))
      } else if (Array.isArray(data)) {
        setUsers(data)
        setPagination(prev => ({ ...prev, total: data.length }))
      }
    } catch {
      setUsers([
        { id: 1, username: 'admin', email: 'admin@example.com', phone: '138****0001', isActive: true, roles: ['system_admin'], createdAt: dayjs().subtract(100, 'day').format('YYYY-MM-DD HH:mm'), lastLogin: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm') },
        { id: 2, username: 'zhangsan', email: 'zhangsan@example.com', phone: '138****0002', isActive: true, roles: ['business_admin', 'developer'], createdAt: dayjs().subtract(60, 'day').format('YYYY-MM-DD HH:mm'), lastLogin: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm') },
        { id: 3, username: 'lisi', email: 'lisi@example.com', phone: '138****0003', isActive: false, roles: ['readonly'], createdAt: dayjs().subtract(30, 'day').format('YYYY-MM-DD HH:mm') },
      ])
      setPagination(prev => ({ ...prev, total: 3 }))
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize])

  const { debouncedSearch: debouncedSearchUsers, immediateSearch: immediateSearchUsers } = useDebounceSearch(fetchUsers, 300)

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true)
    try {
      const response = await apiClient.get('/roles')
      const data = response.data
      if (data.items) {
        setRoles(data.items)
      } else if (Array.isArray(data)) {
        setRoles(data)
      }
    } catch {
      setRoles([
        { id: 1, name: '系统管理员', description: '系统全部权限', permissions: ['user:*', 'developer:*', 'task:*'], createdAt: dayjs().subtract(100, 'day').format('YYYY-MM-DD HH:mm'), userCount: 2 },
        { id: 2, name: '业务管理员', description: '业务数据管理权限', permissions: ['task:*', 'assessment:*'], createdAt: dayjs().subtract(80, 'day').format('YYYY-MM-DD HH:mm'), userCount: 5 },
        { id: 3, name: '稽核人员', description: '稽核检查权限', permissions: ['risk:*', 'improvement:read'], createdAt: dayjs().subtract(60, 'day').format('YYYY-MM-DD HH:mm'), userCount: 3 },
      ])
    } finally {
      setRolesLoading(false)
    }
  }, [])

  const fetchLoginLogs = useCallback(async (userId: number) => {
    setLoginLogsLoading(true)
    try {
      const response = await apiClient.get(`/users/${userId}/login-logs`)
      const data = response.data
      if (Array.isArray(data)) {
        setLoginLogs(data)
      } else if (data.items) {
        setLoginLogs(data.items)
      } else {
        setLoginLogs([
          { id: 1, login_time: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'), ip_address: '192.168.1.100', device: 'Chrome/Windows', status: 'success' },
          { id: 2, login_time: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), ip_address: '192.168.1.101', device: 'Safari/MacOS', status: 'success' },
          { id: 3, login_time: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'), ip_address: '192.168.1.102', device: 'Firefox/Windows', status: 'failed' },
        ])
      }
    } catch {
      setLoginLogs([])
    } finally {
      setLoginLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers()
    } else {
      fetchRoles()
    }
  }, [activeTab, fetchUsers, fetchRoles])

  const handleSearch = (newFilters?: typeof filters) => {
    setPagination(prev => ({ ...prev, current: 1 }))
    const currentFilters = newFilters || filtersRef.current
    immediateSearchUsers(currentFilters)
  }

  const handleCreateUser = () => {
    setEditingUser(null)
    form.resetFields()
    setUserModalVisible(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
      isActive: user.isActive,
    })
    setUserModalVisible(true)
  }

  const handleDeleteUser = async (user: User) => {
    try {
      await apiClient.delete(`/users/${user.id}`)
      message.success('删除成功')
      fetchUsers()
    } catch {
      message.error('删除失败')
    }
  }

  const handleUserSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingUser) {
        await apiClient.put(`/users/${editingUser.id}`, values)
        message.success('更新成功')
      } else {
        await apiClient.post('/users', values)
        message.success('创建成功')
      }
      setUserModalVisible(false)
      fetchUsers()
    } catch {
      message.error('操作失败，请检查输入')
    }
  }

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    fetchLoginLogs(user.id)
    setDetailDrawerVisible(true)
  }

  const handleTableChange = (pag: TablePaginationConfig) => {
    setPagination(pag)
  }

  const handleCreateRole = () => {
    setEditingRole(null)
    setSelectedPermissions([])
    roleForm.resetFields()
    setRoleModalVisible(true)
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    roleForm.setFieldsValue({
      name: role.name,
      description: role.description,
    })
    setSelectedPermissions(role.permissions || [])
    setRoleModalVisible(true)
  }

  const handleDeleteRole = async (role: Role) => {
    try {
      await apiClient.delete(`/roles/${role.id}`)
      message.success('删除成功')
      fetchRoles()
    } catch {
      message.error('删除失败')
    }
  }

  const handleRoleSubmit = async () => {
    try {
      const values = await roleForm.validateFields()
      const payload = { ...values, permissions: selectedPermissions }
      if (editingRole) {
        await apiClient.put(`/roles/${editingRole.id}`, payload)
        message.success('更新成功')
      } else {
        await apiClient.post('/roles', payload)
        message.success('创建成功')
      }
      setRoleModalVisible(false)
      fetchRoles()
    } catch {
      message.error('操作失败，请检查输入')
    }
  }

  const handlePermissionChange = (checkedKeys: React.Key[]) => {
    setSelectedPermissions(checkedKeys as string[])
  }

  const userColumns: ColumnsType<User> = [
    { title: '用户名', dataIndex: 'username', key: 'username', fixed: 'left', width: 120, render: (text: string) => <span style={{ fontWeight: 500, color: colorPalette.textPrimary }}>{text}</span> },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
    { title: '手机', dataIndex: 'phone', key: 'phone', width: 130 },
    { title: '角色', dataIndex: 'roles', key: 'roles', width: 200, render: (roles: string[]) => (
      <Space wrap>
        {(roles || []).map(role => <Tag key={role} color="blue">{roleOptions.find(r => r.value === role)?.label || role}</Tag>)}
      </Space>
    )},
    { title: '状态', dataIndex: 'isActive', key: 'isActive', width: 90, render: (isActive: boolean) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: isActive ? colorPalette.successLight : colorPalette.errorLight, color: isActive ? colorPalette.success : colorPalette.error }}>
        {isActive ? '正常' : '禁用'}
      </span>
    )},
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: (date: string) => <span style={{ color: colorPalette.textMuted }}>{date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'}</span> },
    { title: '最后登录', dataIndex: 'lastLogin', key: 'lastLogin', width: 170, render: (date: string) => <span style={{ color: colorPalette.textMuted }}>{date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '从未登录'}</span> },
    { title: '操作', key: 'action', fixed: 'right', width: 160, render: (_, record) => (
      <Space size="small">
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewUser(record)} title="查看详情" style={{ padding: '2px 6px' }} />
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditUser(record)} title="编辑" style={{ padding: '2px 6px' }} />
        <Popconfirm title="确认删除" description={`确定删除用户 ${record.username} 吗？`} onConfirm={() => handleDeleteUser(record)} okText="确认" cancelText="取消">
          <Button type="link" size="small" danger icon={<DeleteOutlined />} title="删除" style={{ padding: '2px 6px' }} />
        </Popconfirm>
      </Space>
    )},
  ]

  const roleColumns: ColumnsType<Role> = [
    { title: '角色名称', dataIndex: 'name', key: 'name', width: 150, render: (text: string) => <span style={{ fontWeight: 500, color: colorPalette.textPrimary }}>{text}</span> },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '权限数量', dataIndex: 'permissions', key: 'permissions', width: 100, render: (perms: string[]) => <span style={{ fontWeight: 600, color: colorPalette.purple }}>{perms?.length || 0}</span> },
    { title: '用户数', dataIndex: 'userCount', key: 'userCount', width: 80, render: (count: number) => <span style={{ fontWeight: 500, color: colorPalette.textPrimary }}>{count || 0}</span> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: (date: string) => <span style={{ color: colorPalette.textMuted }}>{date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'}</span> },
    { title: '操作', key: 'action', width: 120, render: (_, record) => (
      <Space size="small">
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditRole(record)} title="编辑" style={{ padding: '2px 6px' }} />
        <Popconfirm title="确认删除" description={`确定删除角色 ${record.name} 吗？`} onConfirm={() => handleDeleteRole(record)} okText="确认" cancelText="取消">
          <Button type="link" size="small" danger icon={<DeleteOutlined />} title="删除" style={{ padding: '2px 6px' }} />
        </Popconfirm>
      </Space>
    )},
  ]

  const loginLogColumns: ColumnsType<LoginLog> = [
    { title: '登录时间', dataIndex: 'login_time', key: 'login_time', width: 170, render: (time: string) => <span style={{ color: colorPalette.textSecondary }}>{time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'}</span> },
    { title: 'IP地址', dataIndex: 'ip_address', key: 'ip_address', width: 140 },
    { title: '设备', dataIndex: 'device', key: 'device', width: 150 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (status: 'success' | 'failed') => (
      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: status === 'success' ? colorPalette.successLight : colorPalette.errorLight, color: status === 'success' ? colorPalette.success : colorPalette.error }}>
        {status === 'success' ? '成功' : '失败'}
      </span>
    )},
  ]

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    totalRoles: roles.length,
    totalPermissions: permissionTreeData.reduce((acc, p) => acc + (p.children?.length || 0), 0),
  }

  return (
    <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: colorPalette.textPrimary, letterSpacing: '-0.02em', marginBottom: 4 }}>用户与权限管理</h1>
        <p style={{ fontSize: 14, color: colorPalette.textSecondary }}>管理系统用户账户、角色与访问权限</p>
      </div>

      <Row gutter={20} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderTop: `3px solid ${colorPalette.primary}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 22 } }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: colorPalette.primaryLight, marginBottom: 16 }}>
              <UserOutlined style={{ fontSize: 22, color: colorPalette.primary }} />
            </div>
            <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>总用户数</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginTop: 4 }}>{stats.totalUsers}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderTop: `3px solid ${colorPalette.success}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 22 } }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: colorPalette.successLight, marginBottom: 16 }}>
              <UserOutlined style={{ fontSize: 22, color: colorPalette.success }} />
            </div>
            <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>活跃用户</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginTop: 4 }}>{stats.activeUsers}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderTop: `3px solid ${colorPalette.purple}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 22 } }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: colorPalette.purpleLight, marginBottom: 16 }}>
              <SafetyOutlined style={{ fontSize: 22, color: colorPalette.purple }} />
            </div>
            <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>角色数量</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginTop: 4 }}>{stats.totalRoles}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderTop: `3px solid ${colorPalette.warning}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 22 } }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: colorPalette.warningLight, marginBottom: 16 }}>
              <KeyOutlined style={{ fontSize: 22, color: colorPalette.warning }} />
            </div>
            <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>权限项</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginTop: 4 }}>{stats.totalPermissions}</div>
          </Card>
        </Col>
      </Row>

      <div style={{ background: colorPalette.card, borderRadius: 14, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
        <div style={{ borderBottom: `1px solid ${colorPalette.borderLight}`, padding: '0 24px', background: colorPalette.card }}>
          <Tabs activeKey={activeTab} onChange={setActiveTab} size="large" tabBarStyle={{ marginBottom: 0, borderBottom: 'none' }}>
            <TabPane tab={<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}><UserOutlined /> 用户管理</span>} key="users" />
            <TabPane tab={<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}><SafetyOutlined /> 角色管理</span>} key="roles" />
          </Tabs>
        </div>

        <div style={{ padding: 24 }}>
          {activeTab === 'users' && (
            <>
              <div style={{ background: colorPalette.bg, borderRadius: 10, padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Input placeholder="搜索用户名" prefix={<SearchOutlined style={{ color: colorPalette.textMuted }} />} value={filters.username} onChange={e => { const newFilters = { ...filters, username: e.target.value }; setFilters(newFilters); debouncedSearchUsers(newFilters); }} onPressEnter={() => handleSearch()} style={{ width: 200, borderRadius: 8 }} allowClear />
                <Select placeholder="选择角色" style={{ width: 160 }} allowClear value={filters.role} onChange={v => { const newFilters = { ...filters, role: v }; setFilters(newFilters); handleSearch(newFilters); }} size="middle">
                  {roleOptions.map(opt => <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>)}
                </Select>
                <Select placeholder="选择状态" style={{ width: 120 }} allowClear value={filters.status} onChange={v => { const newFilters = { ...filters, status: v }; setFilters(newFilters); handleSearch(newFilters); }} size="middle">
                  <Select.Option value="active">正常</Select.Option>
                  <Select.Option value="disabled">禁用</Select.Option>
                </Select>
                <div style={{ flex: 1 }} />
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateUser} size="middle" style={{ borderRadius: 8 }}>新建用户</Button>
              </div>
              <Table columns={userColumns} dataSource={users} rowKey="id" loading={loading} pagination={pagination} onChange={handleTableChange} scroll={{ x: 1300 }} size="middle" style={{ borderRadius: 8, overflow: 'hidden' }} />
            </>
          )}

          {activeTab === 'roles' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateRole} size="middle" style={{ borderRadius: 8 }}>新建角色</Button>
              </div>
              <Table columns={roleColumns} dataSource={roles} rowKey="id" loading={rolesLoading} pagination={{ pageSize: 10 }} size="middle" style={{ borderRadius: 8, overflow: 'hidden' }} />
            </>
          )}
        </div>
      </div>

      <Modal title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: colorPalette.textPrimary, borderBottom: `2px solid ${colorPalette.primary}`, paddingBottom: 12, marginBottom: -16 }}>
          <div style={{ width: 4, height: 18, background: colorPalette.primary, borderRadius: 2 }} />
          {editingUser ? '编辑用户' : '新建用户'}
        </div>
      } open={userModalVisible} onOk={handleUserSubmit} onCancel={() => setUserModalVisible(false)} width={520} okText={editingUser ? '保存' : '创建'} cancelText="取消" style={{ top: 120 }} styles={{ body: { paddingTop: 20 } }}>
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item label={<span style={{ fontWeight: 500 }}>用户名</span>} name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入用户名" maxLength={50} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 500 }}>邮箱</span>} name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效邮箱地址' }]}>
            <Input placeholder="请输入邮箱" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 500 }}>手机号</span>} name="phone" rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效手机号' }]}>
            <Input placeholder="请输入手机号" maxLength={11} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 500 }}>密码</span>} name="password" rules={[{ required: !editingUser, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]} extra={editingUser ? '不修改请留空' : ''}>
            <Input.Password placeholder={editingUser ? '留空则不修改' : '请输入密码'} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 500 }}>角色</span>} name="roles" rules={[{ required: true, message: '请选择至少一个角色' }]}>
            <Select mode="multiple" placeholder="选择角色" allowClear style={{ borderRadius: 8 }}>
              {roleOptions.map(opt => <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: colorPalette.textPrimary, borderBottom: `2px solid ${colorPalette.purple}`, paddingBottom: 12, marginBottom: -16 }}>
          <div style={{ width: 4, height: 18, background: colorPalette.purple, borderRadius: 2 }} />
          {editingRole ? '编辑角色' : '新建角色'}
        </div>
      } open={roleModalVisible} onOk={handleRoleSubmit} onCancel={() => setRoleModalVisible(false)} width={680} okText={editingRole ? '保存' : '创建'} cancelText="取消" style={{ top: 120 }} styles={{ body: { paddingTop: 20 } }}>
        <Form form={roleForm} layout="vertical" requiredMark="optional">
          <Form.Item label={<span style={{ fontWeight: 500 }}>角色名称</span>} name="name" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="请输入角色名称" maxLength={50} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 500 }}>描述</span>} name="description">
            <Input.TextArea placeholder="请输入角色描述" rows={3} maxLength={200} showCount style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 500 }}>权限配置</span>} extra={<span style={{ color: colorPalette.textMuted }}>已选择 {selectedPermissions.length} 项权限</span>}>
            <div style={{ border: `1px solid ${colorPalette.border}`, borderRadius: 8, padding: 16, maxHeight: 400, overflow: 'auto', background: colorPalette.bg }}>
              <Tree checkable defaultExpandAll treeData={permissionTreeData} checkedKeys={selectedPermissions} onCheck={(checked) => handlePermissionChange(checked as React.Key[])} selectable={false} />
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 18, background: colorPalette.primary, borderRadius: 2 }} />
          <span style={{ fontWeight: 600, color: colorPalette.textPrimary }}>用户详情</span>
        </div>
      } open={detailDrawerVisible} onClose={() => setDetailDrawerVisible(false)} width={640}
        extra={selectedUser && (
          <Button type="primary" icon={<EditOutlined />} onClick={() => { setDetailDrawerVisible(false); handleEditUser(selectedUser) }} style={{ borderRadius: 8 }}>编辑</Button>
        )}>
        {selectedUser && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label={<span style={{ fontWeight: 500 }}>用户名</span>} span={1}><strong>{selectedUser.username}</strong></Descriptions.Item>
              <Descriptions.Item label={<span style={{ fontWeight: 500 }}>状态</span>} span={1}><span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: selectedUser.isActive ? colorPalette.successLight : colorPalette.errorLight, color: selectedUser.isActive ? colorPalette.success : colorPalette.error }}>{selectedUser.isActive ? '正常' : '禁用'}</span></Descriptions.Item>
              <Descriptions.Item label={<span style={{ fontWeight: 500 }}>邮箱</span>} span={2}>{selectedUser.email}</Descriptions.Item>
              <Descriptions.Item label={<span style={{ fontWeight: 500 }}>手机号</span>} span={1}>{selectedUser.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label={<span style={{ fontWeight: 500 }}>创建时间</span>} span={1}>{selectedUser.createdAt ? dayjs(selectedUser.createdAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
              <Descriptions.Item label={<span style={{ fontWeight: 500 }}>最后登录</span>} span={1}>{selectedUser.lastLogin ? dayjs(selectedUser.lastLogin).format('YYYY-MM-DD HH:mm') : '从未登录'}</Descriptions.Item>
              <Descriptions.Item label={<span style={{ fontWeight: 500 }}>角色</span>} span={2}>
                <Space wrap>
                  {selectedUser.roles.map(role => <Tag key={role} color="blue">{roleOptions.find(r => r.value === role)?.label || role}</Tag>)}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '16px 0' }}>
              <span style={{ fontWeight: 600, color: colorPalette.textPrimary, fontSize: 14 }}>登录日志</span>
            </Divider>
            <Table columns={loginLogColumns} dataSource={loginLogs} rowKey="id" loading={loginLogsLoading} pagination={{ pageSize: 5 }} size="small" locale={{ emptyText: '暂无登录记录' }} />
          </>
        )}
      </Drawer>
    </div>
  )
}

export default UserManagement
