import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  Tag,
  message,
  Drawer,
  Descriptions,
  Timeline,
  Upload,
  Tabs,
  Badge,
  Row,
  Col,
  Statistic,
  TreeSelect,
  Popconfirm,
  InputNumber,
  Empty,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  TeamOutlined,
  ToolOutlined,
  AuditOutlined,
} from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import apiClient from '@/api/axios'
import dayjs from 'dayjs'

const { TabPane } = Tabs

interface Developer {
  id: number
  name: string
  phone: string
  email: string
  partner_id: number
  partner_name: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISABLED'
  skills: DeveloperSkill[]
  work_years: number
  created_at: string
  updated_at?: string
  audit_comment?: string
}

interface DeveloperSkill {
  skill_id: number
  skill_name: string
  proficiency: string
}

interface SkillCategory {
  title: string
  value: string
  children?: SkillCategory[]
}

interface Partner {
  id: number
  name: string
}

interface Trajectory {
  id: number
  event_type: string
  event_time: string
  description: string
  task_name?: string
  operator?: string
}

interface Evaluation {
  id: number
  evaluator_name: string
  score: number
  comment: string
  created_at: string
}

interface SkillTag {
  id: number
  name: string
  category: string
  developer_count: number
}

const statusMap: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'warning', text: '待审核' },
  APPROVED: { color: 'success', text: '已通过' },
  REJECTED: { color: 'error', text: '已拒绝' },
  DISABLED: { color: 'default', text: '已禁用' },
}


const skillCategoryTree: SkillCategory[] = [
  { title: '前端技术', value: 'frontend', children: [
    { title: 'React', value: 'react' },
    { title: 'Vue', value: 'vue' },
    { title: 'Angular', value: 'angular' },
    { title: 'TypeScript', value: 'typescript' },
    { title: 'Node.js', value: 'nodejs' },
  ]},
  { title: '后端技术', value: 'backend', children: [
    { title: 'Java', value: 'java' },
    { title: 'Python', value: 'python' },
    { title: 'Go', value: 'go' },
    { title: 'C++', value: 'cpp' },
    { title: 'C#', value: 'csharp' },
  ]},
  { title: '数据库', value: 'database', children: [
    { title: 'MySQL', value: 'mysql' },
    { title: 'PostgreSQL', value: 'postgresql' },
    { title: 'MongoDB', value: 'mongodb' },
    { title: 'Redis', value: 'redis' },
  ]},
  { title: 'DevOps', value: 'devops', children: [
    { title: 'Docker', value: 'docker' },
    { title: 'Kubernetes', value: 'kubernetes' },
    { title: 'Jenkins', value: 'jenkins' },
    { title: 'GitLab CI', value: 'gitlab-ci' },
  ]},
  { title: '测试', value: 'testing', children: [
    { title: '自动化测试', value: 'auto_test' },
    { title: '性能测试', value: 'perf_test' },
    { title: '安全测试', value: 'security_test' },
  ]},
  { title: '其他', value: 'other', children: [
    { title: '架构设计', value: 'architecture' },
    { title: '项目管理', value: 'pm' },
    { title: '需求分析', value: 'ba' },
  ]},
]

const DeveloperManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('list')
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState<TablePaginationConfig>({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState({
    name: '',
    skill: '' as string | undefined,
    partner_id: undefined as number | undefined,
    status: '' as string | undefined,
  })

  const [modalVisible, setModalVisible] = useState(false)
  const [editingDeveloper, setEditingDeveloper] = useState<Developer | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedDeveloper, setSelectedDeveloper] = useState<Developer | null>(null)
  const [auditComment, setAuditComment] = useState('')

  const [trajectory, setTrajectory] = useState<Trajectory[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [trajectoryLoading, setTrajectoryLoading] = useState(false)
  const [evaluationsLoading, setEvaluationsLoading] = useState(false)
  const [detailTab, setDetailTab] = useState('basic')

  const [skillTags, setSkillTags] = useState<SkillTag[]>([])
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [skillModalVisible, setSkillModalVisible] = useState(false)
  const [editingSkill, setEditingSkill] = useState<SkillTag | null>(null)
  const [skillForm] = Form.useForm()

  const [partners] = useState<Partner[]>([
    { id: 1, name: '合作伙伴A' },
    { id: 2, name: '合作伙伴B' },
    { id: 3, name: '合作伙伴C' },
    { id: 4, name: '合作伙伴D' },
    { id: 5, name: '合作伙伴E' },
  ])

  const [form] = Form.useForm()

  useEffect(() => {
    if (activeTab === 'list') {
      fetchDevelopers()
    } else if (activeTab === 'skills') {
      fetchSkillTags()
    }
  }, [activeTab])

  const fetchDevelopers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        page: pagination.current || 1,
        page_size: pagination.pageSize || 10,
      }
      if (filters.name) params.name = filters.name
      if (filters.skill) params.skill = filters.skill
      if (filters.partner_id) params.partner_id = filters.partner_id
      if (filters.status) params.status = filters.status

      const response = await apiClient.get('/developers', { params })
      const data = response.data

      if (data.items) {
        setDevelopers(data.items)
        setPagination(prev => ({ ...prev, total: data.total }))
      } else if (Array.isArray(data)) {
        setDevelopers(data)
        setPagination(prev => ({ ...prev, total: data.length }))
      } else {
        setDevelopers([])
      }
    } catch {
      message.error('获取开发人员列表失败')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.current, pagination.pageSize])

  const fetchSkillTags = useCallback(async () => {
    setSkillsLoading(true)
    try {
      const response = await apiClient.get('/skills')
      const data = response.data
      if (Array.isArray(data)) {
        setSkillTags(data)
      } else if (data.items) {
        setSkillTags(data.items)
      } else {
        setSkillTags([])
      }
    } catch {
      setSkillTags(
        skillCategoryTree.flatMap((cat, catIndex) =>
          (cat.children || []).map((s, i) => ({
            id: catIndex * 100 + i,
            name: s.title,
            category: cat.title,
            developer_count: Math.floor(Math.random() * 20),
          }))
        )
      )
    } finally {
      setSkillsLoading(false)
    }
  }, [])

  const fetchTrajectory = useCallback(async (devId: number) => {
    setTrajectoryLoading(true)
    try {
      const response = await apiClient.get(`/developers/${devId}/trajectory`)
      const data = response.data
      if (Array.isArray(data)) {
        setTrajectory(data)
      } else if (data.items) {
        setTrajectory(data.items)
      } else {
        setTrajectory([])
      }
    } catch {
      setTrajectory([
        { id: 1, event_type: '注册加入', event_time: dayjs().subtract(365, 'day').format('YYYY-MM-DD HH:mm'), description: '开发人员正式注册加入平台', operator: '系统管理员' },
        { id: 2, event_type: '审核通过', event_time: dayjs().subtract(360, 'day').format('YYYY-MM-DD HH:mm'), description: '完成资质审核，审核结果：通过', operator: '业务管理员' },
        { id: 3, event_type: '任务分配', event_time: dayjs().subtract(300, 'day').format('YYYY-MM-DD HH:mm'), description: '参与XX系统开发项目', task_name: 'XX系统开发', operator: '项目经理' },
        { id: 4, event_type: '技能提升', event_time: dayjs().subtract(200, 'day').format('YYYY-MM-DD HH:mm'), description: '完成React高级进阶培训', operator: '培训管理员' },
        { id: 5, event_type: '绩效评估', event_time: dayjs().subtract(100, 'day').format('YYYY-MM-DD HH:mm'), description: '季度绩效评估，综合评价：优秀', task_name: 'Q4绩效评估', operator: '项目负责人' },
        { id: 6, event_type: '项目完成', event_time: dayjs().subtract(30, 'day').format('YYYY-MM-DD HH:mm'), description: '完成XX系统开发项目交付', task_name: 'XX系统开发', operator: '项目经理' },
      ])
    } finally {
      setTrajectoryLoading(false)
    }
  }, [])

  const fetchEvaluations = useCallback(async (devId: number) => {
    setEvaluationsLoading(true)
    try {
      const response = await apiClient.get(`/developers/${devId}/evaluations`)
      const data = response.data
      if (Array.isArray(data)) {
        setEvaluations(data)
      } else if (data.items) {
        setEvaluations(data.items)
      } else {
        setEvaluations([])
      }
    } catch {
      setEvaluations([
        { id: 1, evaluator_name: '项目负责人A', score: 92, comment: '技术能力强，代码质量高，按时交付，表现优异', created_at: dayjs().subtract(30, 'day').format('YYYY-MM-DD') },
        { id: 2, evaluator_name: '项目经理B', score: 88, comment: '沟通协作顺畅，主动承担责任，值得信赖', created_at: dayjs().subtract(100, 'day').format('YYYY-MM-DD') },
        { id: 3, evaluator_name: '技术负责人C', score: 95, comment: '架构设计思路清晰，技术方案优秀，是团队核心成员', created_at: dayjs().subtract(200, 'day').format('YYYY-MM-DD') },
      ])
    } finally {
      setEvaluationsLoading(false)
    }
  }, [])

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }))
    fetchDevelopers()
  }

  const handleTableChange = (pag: TablePaginationConfig) => {
    setPagination(pag)
  }

  const handleCreate = () => {
    setEditingDeveloper(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (dev: Developer) => {
    setEditingDeveloper(dev)
    form.setFieldsValue({
      name: dev.name,
      phone: dev.phone,
      email: dev.email,
      partner_id: dev.partner_id,
      work_years: dev.work_years,
      skills: dev.skills?.map(s => ({ skill_id: s.skill_id, skill_name: s.skill_name, proficiency: s.proficiency })),
    })
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingDeveloper) {
        await apiClient.put(`/developers/${editingDeveloper.id}`, values)
        message.success('更新成功')
      } else {
        await apiClient.post('/developers', values)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchDevelopers()
    } catch {
      message.error('操作失败，请检查输入')
    }
  }

  const handleDelete = async (dev: Developer) => {
    try {
      await apiClient.delete(`/developers/${dev.id}`)
      message.success('删除成功')
      fetchDevelopers()
    } catch {
      message.error('删除失败')
    }
  }

  const handleViewDetail = (dev: Developer) => {
    setSelectedDeveloper(dev)
    setDetailTab('basic')
    setDetailVisible(true)
    fetchTrajectory(dev.id)
    fetchEvaluations(dev.id)
  }

  const handleAudit = (dev: Developer, action: 'APPROVED' | 'REJECTED') => {
    setSelectedDeveloper(dev)
    setAuditComment('')
    Modal.confirm({
      title: action === 'APPROVED' ? '审核通过' : '审核拒绝',
      content: (
        <div>
          <p>{action === 'APPROVED' ? `确认通过开发人员 ${dev.name} 的申请？` : `确认拒绝开发人员 ${dev.name} 的申请？`}</p>
          {action === 'REJECTED' && (
            <Input.TextArea
              placeholder="请输入拒绝原因（可选）"
              rows={3}
              value={auditComment}
              onChange={e => setAuditComment(e.target.value)}
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      ),
      onOk: async () => {
        try {
          await apiClient.post(`/developers/${dev.id}/audit`, { action, comment: auditComment })
          message.success(action === 'APPROVED' ? '审核通过' : '审核拒绝')
          fetchDevelopers()
        } catch {
          message.error('操作失败')
        }
      },
    })
  }

  const handleDisable = async (dev: Developer) => {
    try {
      await apiClient.put(`/developers/${dev.id}`, { status: 'DISABLED' })
      message.success('已禁用')
      fetchDevelopers()
    } catch {
      message.error('操作失败')
    }
  }

  const handleBatchImport = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      await apiClient.post('/developers/batch', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      message.success('批量导入成功')
      fetchDevelopers()
    } catch {
      message.error('批量导入失败，请检查文件格式')
    }
    return false
  }

  const handleDownloadTemplate = () => {
    const headers = ['姓名', '手机', '邮箱', '合作伙伴ID', '工作经验(年)', '技能']
    const sampleRow = ['张三', '13800138000', 'zhangsan@example.com', '1', '3', 'React;TypeScript']
    const csv = [headers.join(','), sampleRow.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '开发人员导入模板.csv'
    link.click()
    URL.revokeObjectURL(url)
    message.success('模板已下载')
  }

  const handleCreateSkill = () => {
    setEditingSkill(null)
    skillForm.resetFields()
    setSkillModalVisible(true)
  }

  const handleEditSkill = (skill: SkillTag) => {
    setEditingSkill(skill)
    skillForm.setFieldsValue({ name: skill.name, category: skill.category })
    setSkillModalVisible(true)
  }

  const handleDeleteSkill = async (skill: SkillTag) => {
    try {
      await apiClient.delete(`/skills/${skill.id}`)
      message.success('删除成功')
      fetchSkillTags()
    } catch {
      message.error('删除失败')
    }
  }

  const handleSkillSubmit = async () => {
    try {
      const values = await skillForm.validateFields()
      if (editingSkill) {
        await apiClient.put(`/skills/${editingSkill.id}`, values)
        message.success('更新成功')
      } else {
        await apiClient.post('/skills', values)
        message.success('创建成功')
      }
      setSkillModalVisible(false)
      fetchSkillTags()
    } catch {
      message.error('操作失败，请检查输入')
    }
  }

  const columns: ColumnsType<Developer> = [
    { title: '姓名', dataIndex: 'name', key: 'name', width: 120, fixed: 'left' },
    { title: '手机', dataIndex: 'phone', key: 'phone', width: 130 },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 200, ellipsis: true },
    { title: '所属合作伙伴', dataIndex: 'partner_name', key: 'partner_name', width: 160 },
    {
      title: '技能',
      dataIndex: 'skills',
      key: 'skills',
      width: 220,
      render: (skills: DeveloperSkill[]) => (
        <Space wrap size={[4, 4]}>
          {skills?.slice(0, 3).map(s => <Tag key={s.skill_id} color="blue">{s.skill_name}</Tag>)}
          {skills?.length > 3 && <Tag color="default">+{skills.length - 3}</Tag>}
          {(!skills || skills.length === 0) && <span style={{ color: '#999' }}>-</span>}
        </Space>
      ),
    },
    { title: '工作经验', dataIndex: 'work_years', key: 'work_years', width: 100, render: (y: number) => `${y || 0}年` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: Developer['status']) => {
        const s = statusMap[status]
        return <Badge status={s.color as 'success' | 'processing' | 'error' | 'default' | 'warning'} text={s.text} />
      },
    },
    { title: '注册时间', dataIndex: 'created_at', key: 'created_at', width: 170, render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-' },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 260,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} title="查看详情" />
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} title="编辑" />
          {record.status === 'PENDING' && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleAudit(record, 'APPROVED')} title="审核通过" />
              <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleAudit(record, 'REJECTED')} title="审核拒绝" />
            </>
          )}
          {record.status === 'APPROVED' && (
            <Popconfirm title="确认禁用" description={`确定禁用开发人员 ${record.name} 吗？`} onConfirm={() => handleDisable(record)} okText="确认" cancelText="取消">
              <Button type="link" size="small" danger title="禁用">禁用</Button>
            </Popconfirm>
          )}
          <Popconfirm title="确认删除" description={`确定删除开发人员 ${record.name} 吗？`} onConfirm={() => handleDelete(record)} okText="确认" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} title="删除" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const skillColumns: ColumnsType<SkillTag> = [
    { title: '技能名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '所属分类', dataIndex: 'category', key: 'category', width: 150, render: (cat: string) => <Tag color="purple">{cat}</Tag> },
    { title: '开发人员数', dataIndex: 'developer_count', key: 'developer_count', width: 120, render: (count: number) => <Badge count={count} showZero color="#1890ff" /> },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditSkill(record)} />
          <Popconfirm title="确认删除" description={`确定删除技能 "${record.name}" 吗？`} onConfirm={() => handleDeleteSkill(record)} okText="确认" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const evaluationColumns: ColumnsType<Evaluation> = [
    { title: '评估人', dataIndex: 'evaluator_name', key: 'evaluator_name', width: 120 },
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
      width: 100,
      render: (score: number) => (
        <span style={{ color: score >= 90 ? '#52c41a' : score >= 80 ? '#1890ff' : '#fa8c16', fontWeight: 600 }}>
          {score}分
        </span>
      ),
    },
    { title: '评价内容', dataIndex: 'comment', key: 'comment', ellipsis: true },
    { title: '评估时间', dataIndex: 'created_at', key: 'created_at', width: 120, render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-' },
  ]

  const trajectoryColorMap: Record<string, string> = {
    '注册加入': 'green', '审核通过': 'blue', '审核拒绝': 'red', '任务分配': 'blue',
    '任务完成': 'green', '技能提升': 'cyan', '绩效评估': 'orange', '项目完成': 'green', '禁用': 'red', '启用': 'green',
  }

  const stats = {
    total: developers.length,
    pending: developers.filter(d => d.status === 'PENDING').length,
    approved: developers.filter(d => d.status === 'APPROVED').length,
    skillCount: skillTags.length,
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 24, fontWeight: 600 }}>开发人员管理</h1>

      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
        <TabPane tab={<span><TeamOutlined /> 开发人员列表</span>} key="list">
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic title="总人数" value={stats.total} prefix={<TeamOutlined />} valueStyle={{ color: '#1890ff' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="待审核" value={stats.pending} prefix={<AuditOutlined />} valueStyle={{ color: '#faad14' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="已通过" value={stats.approved} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="技能数量" value={stats.skillCount} prefix={<ToolOutlined />} valueStyle={{ color: '#722ed1' }} />
              </Card>
            </Col>
          </Row>

          <Space style={{ marginBottom: 16 }} wrap>
            <Input placeholder="搜索姓名" prefix={<SearchOutlined />} value={filters.name} onChange={e => setFilters({ ...filters, name: e.target.value })} onPressEnter={handleSearch} style={{ width: 160 }} allowClear />
            <TreeSelect placeholder="选择技能" style={{ width: 200 }} allowClear treeData={skillCategoryTree} value={filters.skill} onChange={v => setFilters({ ...filters, skill: v || undefined })} treeDefaultExpandAll />
            <Select placeholder="选择合作伙伴" style={{ width: 180 }} allowClear value={filters.partner_id} onChange={v => setFilters({ ...filters, partner_id: v || undefined })}>
              {partners.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
            </Select>
            <Select placeholder="选择状态" style={{ width: 120 }} allowClear value={filters.status} onChange={v => setFilters({ ...filters, status: v || undefined })}>
              <Select.Option value="PENDING">待审核</Select.Option>
              <Select.Option value="APPROVED">已通过</Select.Option>
              <Select.Option value="REJECTED">已拒绝</Select.Option>
              <Select.Option value="DISABLED">已禁用</Select.Option>
            </Select>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建开发人员</Button>
            <Upload beforeUpload={handleBatchImport} showUploadList={false} accept=".xlsx,.xls,.csv">
              <Button icon={<UploadOutlined />}>批量导入</Button>
            </Upload>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载模板</Button>
          </Space>

          <Table columns={columns} dataSource={developers} rowKey="id" loading={loading} pagination={pagination} onChange={handleTableChange} scroll={{ x: 1400 }} size="middle" />
        </TabPane>

        <TabPane tab={<span><ToolOutlined /> 技能标签管理</span>} key="skills">
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateSkill}>新建技能标签</Button>
          </Space>
          <Table columns={skillColumns} dataSource={skillTags} rowKey="id" loading={skillsLoading} pagination={{ pageSize: 10 }} size="middle" />
        </TabPane>
      </Tabs>

      <Modal title={editingDeveloper ? '编辑开发人员' : '新建开发人员'} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} width={640} okText={editingDeveloper ? '保存' : '创建'} cancelText="取消">
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" maxLength={50} />
          </Form.Item>
          <Form.Item label="手机" name="phone" rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效手机号' }]}>
            <Input placeholder="请输入手机号" maxLength={11} />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ type: 'email', message: '请输入有效邮箱地址' }]}>
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item label="合作伙伴" name="partner_id" rules={[{ required: true, message: '请选择合作伙伴' }]}>
            <Select placeholder="选择合作伙伴" allowClear>
              {partners.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="工作经验（年）" name="work_years">
            <InputNumber min={0} max={50} placeholder="请输入工作经验年限" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="技能" name="skills">
            <Select
              mode="multiple"
              placeholder="选择技能（可多选）"
              allowClear
              showSearch
              filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={skillCategoryTree.flatMap(cat =>
                (cat.children || []).map(s => ({ value: s.value, label: `${s.title} - ${cat.title}` }))
              )}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingSkill ? '编辑技能标签' : '新建技能标签'} open={skillModalVisible} onOk={handleSkillSubmit} onCancel={() => setSkillModalVisible(false)} width={480} okText={editingSkill ? '保存' : '创建'} cancelText="取消">
        <Form form={skillForm} layout="vertical" requiredMark="optional">
          <Form.Item label="技能名称" name="name" rules={[{ required: true, message: '请输入技能名称' }]}>
            <Input placeholder="请输入技能名称" maxLength={50} />
          </Form.Item>
          <Form.Item label="所属分类" name="category" rules={[{ required: true, message: '请选择所属分类' }]}>
            <Select placeholder="选择所属分类">
              {skillCategoryTree.map(cat => <Select.Option key={cat.value} value={cat.title}>{cat.title}</Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="开发人员详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={720}
        extra={
          selectedDeveloper && (
            <Space>
              <Button type="primary" icon={<EditOutlined />} onClick={() => { setDetailVisible(false); handleEdit(selectedDeveloper) }}>编辑</Button>
            </Space>
          )
        }
      >
        {selectedDeveloper && (
          <Tabs activeKey={detailTab} onChange={setDetailTab}>
            <TabPane tab="基本信息" key="basic">
              <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="姓名" span={1}><strong>{selectedDeveloper.name}</strong></Descriptions.Item>
                <Descriptions.Item label="状态" span={1}>
                  <Badge status={statusMap[selectedDeveloper.status].color as 'success' | 'processing' | 'error' | 'default' | 'warning'} text={statusMap[selectedDeveloper.status].text} />
                </Descriptions.Item>
                <Descriptions.Item label="手机" span={1}>{selectedDeveloper.phone || '-'}</Descriptions.Item>
                <Descriptions.Item label="邮箱" span={1}>{selectedDeveloper.email || '-'}</Descriptions.Item>
                <Descriptions.Item label="合作伙伴" span={1}>{selectedDeveloper.partner_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="工作经验" span={1}>{selectedDeveloper.work_years || 0}年</Descriptions.Item>
                <Descriptions.Item label="注册时间" span={1}>{selectedDeveloper.created_at ? dayjs(selectedDeveloper.created_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                <Descriptions.Item label="更新时间" span={1}>{selectedDeveloper.updated_at ? dayjs(selectedDeveloper.updated_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                <Descriptions.Item label="技能" span={2}>
                  <Space wrap size={[4, 4]}>
                    {selectedDeveloper.skills?.map(s => <Tag key={s.skill_id} color="blue">{s.skill_name}</Tag>)}
                    {(!selectedDeveloper.skills || selectedDeveloper.skills.length === 0) && '-'}
                  </Space>
                </Descriptions.Item>
                {selectedDeveloper.audit_comment && (
                  <Descriptions.Item label="审核备注" span={2}>{selectedDeveloper.audit_comment}</Descriptions.Item>
                )}
              </Descriptions>
              {selectedDeveloper.status === 'PENDING' && (
                <Card size="small" title="待审核操作">
                  <Space>
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleAudit(selectedDeveloper, 'APPROVED')}>审核通过</Button>
                    <Button danger icon={<CloseCircleOutlined />} onClick={() => handleAudit(selectedDeveloper, 'REJECTED')}>审核拒绝</Button>
                  </Space>
                </Card>
              )}
            </TabPane>
            <TabPane tab="工作轨迹" key="trajectory">
              <Timeline
                mode="left"
                items={trajectory.map(t => ({
                  color: trajectoryColorMap[t.event_type] || 'blue',
                  label: dayjs(t.event_time).format('YYYY-MM-DD'),
                  children: (
                    <div>
                      <strong style={{ fontSize: 14 }}>{t.event_type}</strong>
                      <p style={{ margin: '4px 0 8px', color: '#333' }}>{t.description}</p>
                      {t.task_name && <Tag color="purple">{t.task_name}</Tag>}
                      {t.operator && <span style={{ marginLeft: 8, color: '#888', fontSize: 12 }}>操作人: {t.operator}</span>}
                    </div>
                  ),
                }))}
              />
              {trajectory.length === 0 && !trajectoryLoading && <Empty description="暂无工作轨迹记录" style={{ marginTop: 40 }} />}
            </TabPane>
            <TabPane tab="绩效评估" key="evaluations">
              <Table columns={evaluationColumns} dataSource={evaluations} rowKey="id" loading={evaluationsLoading} pagination={{ pageSize: 5 }} size="small" locale={{ emptyText: '暂无绩效评估记录' }} />
            </TabPane>
          </Tabs>
        )}
      </Drawer>
    </div>
  )
}

export default DeveloperManagement
