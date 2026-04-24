import React, { useState, useEffect, useCallback } from 'react'
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
  Badge,
  Card,
  Row,
  Col,
  Statistic,
  Switch,
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

const { TabPane } = Tabs

// Types
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

// Permission tree data
const permissionTreeData: PermissionNode[] = [
  {
    title: '用户管理',
    key: 'user',
    children: [
      { title: '查看', key: 'user:read' },
      { title: '新增', key: 'user:create' },
      { title: '修改', key: 'user:update' },
      { title: '删除', key: 'user:delete' },
    ],
  },
  {
    title: '开发人员管理',
    key: 'developer',
    children: [
      { title: '查看', key: 'developer:read' },
      { title: '新增', key: 'developer:create' },
      { title: '修改', key: 'developer:update' },
      { title: '删除', key: 'developer:delete' },
      { title: '审批', key: 'developer:approve' },
    ],
  },
  {
    title: '任务管理',
    key: 'task',
    children: [
      { title: '查看', key: 'task:read' },
      { title: '新增', key: 'task:create' },
      { title: '修改', key: 'task:update' },
      { title: '删除', key: 'task:delete' },
      { title: '审批', key: 'task:approve' },
    ],
  },
  {
    title: '厂商评估',
    key: 'assessment',
    children: [
      { title: '查看', key: 'assessment:read' },
      { title: '执行评估', key: 'assessment:execute' },
      { title: '审批', key: 'assessment:approve' },
    ],
  },
  {
    title: '正向改进',
    key: 'improvement',
    children: [
      { title: '查看', key: 'improvement:read' },
      { title: '发起', key: 'improvement:create' },
      { title: '审批', key: 'improvement:approve' },
    ],
  },
  {
    title: '风险库',
    key: 'risk',
    children: [
      { title: '查看', key: 'risk:read' },
      { title: '录入', key: 'risk:create' },
      { title: '修改', key: 'risk:update' },
      { title: '删除', key: 'risk:delete' },
    ],
  },
]

// Role options for select
const roleOptions = [
  { value: 'system_admin', label: '系统管理员' },
  { value: 'business_admin', label: '业务管理员' },
  { value: 'audit_user', label: '稽核人员' },
  { value: 'partner_admin', label: '合作伙伴管理员' },
  { value: 'developer', label: '开发人员' },
  { value: 'readonly', label: '只读用户' },
]

const UserManagement: React.FC = () => {
  // State - User Management
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
  const [pagination, setPagination] = useState<TablePaginationConfig>({ current: 1, pageSize: 10, total: 0 })

  // State - Role Management
  const [roles, setRoles] = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [roleModalVisible, setRoleModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [roleForm] = Form.useForm()

  // Tab state
  const [activeTab, setActiveTab] = useState('users')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const page = pagination.current || 1
      const pageSize = pagination.pageSize || 10
      const params: Record<string, string | number> = {
        page,
        page_size: pageSize,
      }
      if (filters.username) params.username = filters.username
      if (filters.role) params.role = filters.role
      if (filters.status) params.status = filters.status

      const response = await apiClient.get('/users', { params })
      const data = response.data

      if (data.items) {
        setUsers(data.items)
        setPagination(prev => ({ ...prev, total: data.total }))
      } else if (Array.isArray(data)) {
        setUsers(data)
        setPagination(prev => ({ ...prev, total: data.length }))
      }
    } catch (error) {
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  // Fetch Roles
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
    } catch (error) {
      message.error('获取角色列表失败')
    } finally {
      setRolesLoading(false)
    }
  }, [])

  // Fetch Login Logs for user detail
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
        setLoginLogs([])
      }
    } catch (error) {
      setLoginLogs([])
    } finally {
      setLoginLogsLoading(false)
    }
  }, [])

  // Effects
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers()
    } else {
      fetchRoles()
    }
  }, [activeTab, fetchUsers, fetchRoles])

  // Handlers - Users
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }))
    fetchUsers()
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
    } catch (error) {
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
    } catch (error) {
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

  const handleStatusChange = async (user: User) => {
    try {
await apiClient.put(`/users/${user.id}`, { isActive: !user.isActive })
    message.success(user.isActive ? '已禁用' : '已启用')
      fetchUsers()
    } catch (error) {
      message.error('状态更新失败')
    }
  }

  // Handlers - Roles
  const handleCreateRole = () => {
    setEditingRole(null)
    setSelectedPermissions([])
    roleForm.resetFields()
    setRoleModalVisible(true)
  }

  const handleEditRole = async (role: Role) => {
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
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleRoleSubmit = async () => {
    try {
      const values = await roleForm.validateFields()
      const payload = {
        ...values,
        permissions: selectedPermissions,
      }
      if (editingRole) {
        await apiClient.put(`/roles/${editingRole.id}`, payload)
        message.success('更新成功')
      } else {
        await apiClient.post('/roles', payload)
        message.success('创建成功')
      }
      setRoleModalVisible(false)
      fetchRoles()
    } catch (error) {
      message.error('操作失败，请检查输入')
    }
  }

  const handlePermissionChange = (checkedKeys: React.Key[]) => {
    setSelectedPermissions(checkedKeys as string[])
  }

  // Table Columns - Users
  const userColumns: ColumnsType<User> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      fixed: 'left',
      width: 120,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
    },
    {
      title: '手机',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      width: 200,
      render: (roles: string[]) => (
        <Space wrap>
          {(roles || []).map(role => (
            <Tag key={role} color="blue">{roleOptions.find(r => r.value === role)?.label || role}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (isActive: boolean, record) => (
        <Switch
          checked={isActive}
          checkedChildren="正常"
          unCheckedChildren="禁用"
          onChange={() => handleStatusChange(record)}
          size="small"
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '最后登录',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      width: 170,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '从未登录',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewUser(record)} />
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditUser(record)} />
          <Popconfirm
            title="确认删除"
            description={`确定删除用户 ${record.username} 吗？`}
            onConfirm={() => handleDeleteUser(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Table Columns - Roles
  const roleColumns: ColumnsType<Role> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '权限数量',
      dataIndex: 'permissions',
      key: 'permissions',
      width: 100,
      render: (perms: string[]) => <Badge count={perms?.length || 0} showZero color="#108ee9" />,
    },
    {
      title: '用户数',
      dataIndex: 'userCount',
      key: 'userCount',
      width: 80,
      render: (count: number) => count || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditRole(record)} />
          <Popconfirm
            title="确认删除"
            description={`确定删除角色 ${record.name} 吗？`}
            onConfirm={() => handleDeleteRole(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Login Logs Columns
  const loginLogColumns: ColumnsType<LoginLog> = [
    {
      title: '登录时间',
      dataIndex: 'login_time',
      key: 'login_time',
      width: 170,
      render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 140,
    },
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: 'success' | 'failed') => (
        <Tag color={status === 'success' ? 'green' : 'red'}>
          {status === 'success' ? '成功' : '失败'}
        </Tag>
      ),
    },
  ]

  // Statistics
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    totalRoles: roles.length,
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 24, fontWeight: 600 }}>用户与权限管理</h1>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="总用户数"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="活跃用户"
              value={stats.activeUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="角色数量"
              value={stats.totalRoles}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="权限项"
              value={permissionTreeData.reduce((acc, p) => acc + (p.children?.length || 0), 0)}
              prefix={<KeyOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
        {/* 用户管理 Tab */}
        <TabPane tab={<span><UserOutlined /> 用户管理</span>} key="users">
          {/* Filter Bar */}
          <Space style={{ marginBottom: 16 }} wrap>
            <Input
              placeholder="搜索用户名"
              prefix={<SearchOutlined />}
              value={filters.username}
              onChange={e => setFilters({ ...filters, username: e.target.value })}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              placeholder="选择角色"
              style={{ width: 160 }}
              allowClear
              value={filters.role}
              onChange={v => setFilters({ ...filters, role: v })}
            >
              {roleOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
              ))}
            </Select>
            <Select
              placeholder="选择状态"
              style={{ width: 120 }}
              allowClear
              value={filters.status}
              onChange={v => setFilters({ ...filters, status: v })}
            >
              <Select.Option value="active">正常</Select.Option>
              <Select.Option value="disabled">禁用</Select.Option>
            </Select>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              搜索
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateUser}>
              新建用户
            </Button>
          </Space>

          {/* User Table */}
          <Table
            columns={userColumns}
            dataSource={users}
            rowKey="id"
            loading={loading}
            pagination={pagination}
            onChange={handleTableChange}
            scroll={{ x: 1300 }}
            size="middle"
          />
        </TabPane>

        {/* 角色管理 Tab */}
        <TabPane tab={<span><SafetyOutlined /> 角色管理</span>} key="roles">
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateRole}>
              新建角色
            </Button>
          </Space>

          <Table
            columns={roleColumns}
            dataSource={roles}
            rowKey="id"
            loading={rolesLoading}
            pagination={{ pageSize: 10 }}
            size="middle"
          />
        </TabPane>
      </Tabs>

      {/* User Create/Edit Modal */}
      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={userModalVisible}
        onOk={handleUserSubmit}
        onCancel={() => setUserModalVisible(false)}
        width={520}
        okText={editingUser ? '保存' : '创建'}
        cancelText="取消"
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" maxLength={50} />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" maxLength={11} />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: !editingUser, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
            extra={editingUser ? '不修改请留空' : ''}
          >
            <Input.Password placeholder={editingUser ? '留空则不修改' : '请输入密码'} />
          </Form.Item>

          <Form.Item
            label="角色"
            name="roles"
            rules={[{ required: true, message: '请选择至少一个角色' }]}
          >
            <Select mode="multiple" placeholder="选择角色" allowClear>
              {roleOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          {editingUser && (
            <Form.Item
              label="状态"
              name="isActive"
              valuePropName="checked"
            >
              <Select placeholder="选择状态">
                <Select.Option value={true}>正常</Select.Option>
                <Select.Option value={false}>禁用</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Role Create/Edit Modal */}
      <Modal
        title={editingRole ? '编辑角色' : '新建角色'}
        open={roleModalVisible}
        onOk={handleRoleSubmit}
        onCancel={() => setRoleModalVisible(false)}
        width={680}
        okText={editingRole ? '保存' : '创建'}
        cancelText="取消"
      >
        <Form form={roleForm} layout="vertical" requiredMark="optional">
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称" maxLength={50} />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea placeholder="请输入角色描述" rows={3} maxLength={200} showCount />
          </Form.Item>

          <Form.Item
            label="权限配置"
            extra={
              <span style={{ color: '#999' }}>
                已选择 {selectedPermissions.length} 项权限
              </span>
            }
          >
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 16, maxHeight: 400, overflow: 'auto' }}>
              <Tree
                checkable
                defaultExpandAll
                treeData={permissionTreeData}
                checkedKeys={selectedPermissions}
                onCheck={(checked) => handlePermissionChange(checked as React.Key[])}
                selectable={false}
              />
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* User Detail Drawer */}
      <Drawer
        title="用户详情"
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        width={640}
        extra={
          selectedUser && (
            <Space>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  setDetailDrawerVisible(false)
                  handleEditUser(selectedUser)
                }}
              >
                编辑
              </Button>
            </Space>
          )
        }
      >
        {selectedUser && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="用户名" span={1}>
                <strong>{selectedUser.username}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="状态" span={1}>
                <Badge status={selectedUser.isActive ? 'success' : 'error'} text={selectedUser.isActive ? '正常' : '禁用'} />
              </Descriptions.Item>
              <Descriptions.Item label="邮箱" span={2}>
                {selectedUser.email}
              </Descriptions.Item>
              <Descriptions.Item label="手机号" span={1}>
                {selectedUser.phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={1}>
                {selectedUser.createdAt ? dayjs(selectedUser.createdAt).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="最后登录" span={1}>
                {selectedUser.lastLogin ? dayjs(selectedUser.lastLogin).format('YYYY-MM-DD HH:mm') : '从未登录'}
              </Descriptions.Item>
              <Descriptions.Item label="角色" span={2}>
                <Space wrap>
                  {selectedUser.roles.map(role => (
                    <Tag key={role} color="blue">{roleOptions.find(r => r.value === role)?.label || role}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">登录日志</Divider>
            <Table
              columns={loginLogColumns}
              dataSource={loginLogs}
              rowKey="id"
              loading={loginLogsLoading}
              pagination={{ pageSize: 5 }}
              size="small"
              locale={{ emptyText: '暂无登录记录' }}
            />
          </>
        )}
      </Drawer>
    </div>
  )
}

export default UserManagement
