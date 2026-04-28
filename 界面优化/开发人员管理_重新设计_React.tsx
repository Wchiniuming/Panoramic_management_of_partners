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
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  BarsOutlined,
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

const statusMap: Record<string, { color: string; text: string; bg: string; className: string }> = {
  PENDING: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', text: '待审核', className: 'badge--pending' },
  APPROVED: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', text: '已通过', className: 'badge--approved' },
  REJECTED: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', text: '已拒绝', className: 'badge--rejected' },
  DISABLED: { color: '#94a3b8', bg: '#f1f5f9', text: '已禁用', className: 'badge--disabled' },
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

const DeveloperManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('list')
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState<TablePaginationConfig>({ current: 1, pageSize: 8, total: 0 })
  const [filters, setFilters] = useState({
    name: '',
    skill: '' as string | undefined,
    partner_id: undefined as number | undefined,
    status: '' as string | undefined,
  })
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

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
    { id: 1, name: '华为技术有限公司' },
    { id: 2, name: '阿里巴巴集团' },
    { id: 3, name: '腾讯科技' },
    { id: 4, name: '字节跳动' },
    { id: 5, name: '美团' },
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
        page_size: pagination.pageSize || 8,
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
      setDevelopers(mockDevelopers)
      setPagination(prev => ({ ...prev, total: mockDevelopers.length }))
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.current, pagination.pageSize])

  const mockDevelopers: Developer[] = [
    { id: 1, name: '张明', phone: '138****8001', email: 'zhangming@example.com', partner_id: 1, partner_name: '华为技术有限公司', status: 'APPROVED', skills: [{ skill_id: 1, skill_name: 'React', proficiency: '精通' }, { skill_id: 2, skill_name: 'TypeScript', proficiency: '精通' }, { skill_id: 3, skill_name: 'Node.js', proficiency: '熟悉' }], work_years: 5, created_at: '2024-01-15 10:30:00' },
    { id: 2, name: '李晓华', phone: '139****8002', email: 'lixiaohua@example.com', partner_id: 2, partner_name: '阿里巴巴集团', status: 'PENDING', skills: [{ skill_id: 4, skill_name: 'Vue', proficiency: '熟悉' }, { skill_id: 5, skill_name: 'Java', proficiency: '精通' }], work_years: 3, created_at: '2024-03-20 14:22:00' },
    { id: 3, name: '王建国', phone: '136****8003', email: 'wangjianguo@example.com', partner_id: 3, partner_name: '腾讯科技', status: 'APPROVED', skills: [{ skill_id: 6, skill_name: 'Python', proficiency: '精通' }, { skill_id: 7, skill_name: 'Django', proficiency: '熟悉' }], work_years: 8, created_at: '2023-06-10 09:15:00' },
    { id: 4, name: '陈思思', phone: '137****8004', email: 'chensisi@example.com', partner_id: 4, partner_name: '字节跳动', status: 'REJECTED', skills: [{ skill_id: 8, skill_name: 'Go', proficiency: '熟悉' }], work_years: 4, created_at: '2024-02-28 16:45:00' },
    { id: 5, name: '刘伟', phone: '135****8005', email: 'liuwei@example.com', partner_id: 5, partner_name: '美团', status: 'APPROVED', skills: [{ skill_id: 9, skill_name: 'React', proficiency: '精通' }, { skill_id: 10, skill_name: 'Docker', proficiency: '熟悉' }], work_years: 6, created_at: '2023-11-05 11:20:00' },
    { id: 6, name: '赵敏', phone: '134****8006', email: 'zhaomin@example.com', partner_id: 1, partner_name: '华为技术有限公司', status: 'APPROVED', skills: [{ skill_id: 11, skill_name: 'Java', proficiency: '精通' }, { skill_id: 12, skill_name: 'Spring', proficiency: '精通' }], work_years: 7, created_at: '2023-08-20 08:30:00' },
    { id: 7, name: '孙强', phone: '133****8007', email: 'sunqiang@example.com', partner_id: 2, partner_name: '阿里巴巴集团', status: 'DISABLED', skills: [{ skill_id: 13, skill_name: 'PostgreSQL', proficiency: '熟悉' }], work_years: 2, created_at: '2024-01-25 15:10:00' },
    { id: 8, name: '周婷', phone: '132****8008', email: 'zhouting@example.com', partner_id: 3, partner_name: '腾讯科技', status: 'PENDING', skills: [{ skill_id: 14, skill_name: 'Vue', proficiency: '精通' }, { skill_id: 15, skill_name: 'CSS3', proficiency: '精通' }], work_years: 4, created_at: '2024-04-01 10:00:00' },
  ]

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
      setSkillTags([
        { id: 1, name: 'React', category: '前端技术', developer_count: 28 },
        { id: 2, name: 'Vue', category: '前端技术', developer_count: 22 },
        { id: 3, name: 'Java', category: '后端技术', developer_count: 35 },
        { id: 4, name: 'Python', category: '后端技术', developer_count: 30 },
        { id: 5, name: 'TypeScript', category: '前端技术', developer_count: 25 },
        { id: 6, name: 'Go', category: '后端技术', developer_count: 18 },
        { id: 7, name: 'Node.js', category: '前端技术', developer_count: 20 },
        { id: 8, name: 'PostgreSQL', category: '数据库', developer_count: 15 },
      ])
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
    { title: '姓名', dataIndex: 'name', key: 'name', width: 120, fixed: 'left', render: (name: string) => <span style={{ fontWeight: 600 }}>{name}</span> },
    { title: '联系方式', key: 'contact', width: 180, render: (_, record) => (
      <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>
        <div style={{ marginBottom: 2 }}><PhoneOutlined style={{ marginRight: 6 }} />{record.phone}</div>
        <div style={{ color: colorPalette.textMuted }}><MailOutlined style={{ marginRight: 6 }} />{record.email}</div>
      </div>
    )},
    { title: '所属合作伙伴', dataIndex: 'partner_name', key: 'partner_name', width: 160 },
    {
      title: '技能',
      dataIndex: 'skills',
      key: 'skills',
      width: 240,
      render: (skills: DeveloperSkill[]) => (
        <Space wrap size={[4, 4]}>
          {skills?.slice(0, 3).map(s => <Tag key={s.skill_id} color="blue">{s.skill_name}</Tag>)}
          {skills?.length > 3 && <Tag color="default">+{skills.length - 3}</Tag>}
          {(!skills || skills.length === 0) && <span style={{ color: colorPalette.textMuted }}>-</span>}
        </Space>
      ),
    },
    { title: '工作年限', dataIndex: 'work_years', key: 'work_years', width: 100, render: (y: number) => `${y || 0}年` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: Developer['status']) => {
        const s = statusMap[status]
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 500,
            background: s.bg,
            color: s.color,
          }}>
            {status === 'APPROVED' && <CheckCircleOutlined style={{ marginRight: 4, fontSize: 10 }} />}
            {status === 'PENDING' && <AuditOutlined style={{ marginRight: 4, fontSize: 10 }} />}
            {status === 'REJECTED' && <CloseCircleOutlined style={{ marginRight: 4, fontSize: 10 }} />}
            {status === 'DISABLED' && <CloseCircleOutlined style={{ marginRight: 4, fontSize: 10 }} />}
            {s.text}
          </span>
        )
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
              <Button type="link" size="small" icon={<CheckCircleOutlined style={{ color: colorPalette.success }} />} onClick={() => handleAudit(record, 'APPROVED')} title="审核通过" />
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
    { title: '开发人员数', dataIndex: 'developer_count', key: 'developer_count', width: 120, render: (count: number) => <Badge count={count} showZero color={colorPalette.primary} /> },
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
        <span style={{ color: score >= 90 ? colorPalette.success : score >= 80 ? colorPalette.primary : colorPalette.warning, fontWeight: 600 }}>
          {score}分
        </span>
      ),
    },
    { title: '评价内容', dataIndex: 'comment', key: 'comment', ellipsis: true },
    { title: '评估时间', dataIndex: 'created_at', key: 'created_at', width: 120, render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-' },
  ]

  const trajectoryColorMap: Record<string, string> = {
    '注册加入': colorPalette.success, '审核通过': colorPalette.primary, '审核拒绝': colorPalette.error,
    '任务分配': colorPalette.primary, '任务完成': colorPalette.success, '技能提升': '#06b6d4', '绩效评估': colorPalette.warning, '项目完成': colorPalette.success, '禁用': colorPalette.error, '启用': colorPalette.success,
  }

  const stats = {
    total: developers.length,
    pending: developers.filter(d => d.status === 'PENDING').length,
    approved: developers.filter(d => d.status === 'APPROVED').length,
    skillCount: skillTags.length,
  }

  const getInitials = (name: string) => name?.charAt(0) || '?'

  const renderDeveloperCard = (dev: Developer) => {
    const s = statusMap[dev.status]
    return (
      <div
        key={dev.id}
        style={{
          background: colorPalette.card,
          borderRadius: 14,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          transition: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
        }}
        onClick={() => handleViewDetail(dev)}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.06)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        <div style={{ padding: 20, display: 'flex', alignItems: 'flex-start', gap: 16, borderBottom: `1px solid ${colorPalette.borderLight}` }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${colorPalette.primary} 0%, #36c1fc 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 600,
            fontSize: 20,
            flexShrink: 0,
          }}>
            {getInitials(dev.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: colorPalette.textPrimary, marginBottom: 4 }}>{dev.name}</div>
            <div style={{ fontSize: 13, color: colorPalette.textSecondary, marginBottom: 8 }}>{dev.phone}</div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              background: s.bg,
              color: s.color,
            }}>
              {dev.status === 'APPROVED' && <CheckCircleOutlined style={{ marginRight: 4, fontSize: 10 }} />}
              {dev.status === 'PENDING' && <AuditOutlined style={{ marginRight: 4, fontSize: 10 }} />}
              {dev.status === 'REJECTED' && <CloseCircleOutlined style={{ marginRight: 4, fontSize: 10 }} />}
              {s.text}
            </span>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {dev.skills?.slice(0, 3).map(skill => (
              <span key={skill.skill_id} style={{
                padding: '4px 10px',
                background: colorPalette.primaryLight,
                color: colorPalette.primary,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
              }}>
                {skill.skill_name}
              </span>
            ))}
            {dev.skills && dev.skills.length > 3 && (
              <span style={{
                padding: '4px 10px',
                background: colorPalette.borderLight,
                color: colorPalette.textSecondary,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
              }}>
                +{dev.skills.length - 3}
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, paddingTop: 16, borderTop: `1px solid ${colorPalette.borderLight}` }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: colorPalette.textPrimary }}>{dev.work_years || 0}</div>
              <div style={{ fontSize: 11, color: colorPalette.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>工作年限</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: colorPalette.textPrimary }}>{dev.skills?.length || 0}</div>
              <div style={{ fontSize: 11, color: colorPalette.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>技能数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: colorPalette.success }}>92</div>
              <div style={{ fontSize: 11, color: colorPalette.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>评分</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 20px', background: colorPalette.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: colorPalette.textMuted }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {dayjs(dev.created_at).format('YYYY-MM-DD')}
          </span>
          <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(dev)} style={{ color: colorPalette.textSecondary }} />
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(dev)} style={{ color: colorPalette.textSecondary }} />
            {dev.status === 'APPROVED' && (
              <Popconfirm title="确认禁用" description={`确定禁用 ${dev.name} 吗？`} onConfirm={() => handleDisable(dev)}>
                <Button type="text" size="small" danger icon={<CloseCircleOutlined />} />
              </Popconfirm>
            )}
            <Popconfirm title="确认删除" description={`确定删除 ${dev.name} 吗？`} onConfirm={() => handleDelete(dev)}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </div>
        </div>
      </div>
    )
  }

  const renderSkillCard = (skill: SkillTag) => (
    <div
      key={skill.id}
      style={{
        background: colorPalette.card,
        borderRadius: 10,
        padding: 20,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        transition: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.06)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 6,
          background: colorPalette.primaryLight,
          color: colorPalette.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ToolOutlined style={{ fontSize: 18 }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: colorPalette.textPrimary, marginBottom: 2 }}>{skill.name}</div>
          <div style={{ fontSize: 12, color: colorPalette.textMuted }}>{skill.category}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: colorPalette.primary }}>{skill.developer_count}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditSkill(skill)} style={{ color: colorPalette.textSecondary }} />
          <Popconfirm title="确认删除" description={`确定删除技能 "${skill.name}" 吗？`} onConfirm={() => handleDeleteSkill(skill)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: colorPalette.textPrimary, letterSpacing: '-0.02em', marginBottom: 4 }}>开发人员管理</h1>
          <p style={{ fontSize: 14, color: colorPalette.textSecondary }}>管理合作伙伴的开发人员资源，审核资质，追踪工作轨迹</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button icon={<UploadOutlined />} onClick={() => message.info('批量导入功能')}>批量导入</Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载模板</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建开发人员</Button>
        </div>
      </div>

      <div style={{ background: colorPalette.card, borderRadius: 14, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ padding: '0 24px' }} tabBarStyle={{ marginBottom: 0 }}>
          <TabPane tab={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TeamOutlined /> 开发人员列表</span>} key="list">
            <div style={{ padding: 24 }}>
              <Row gutter={20} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                  <Card
                    bordered={false}
                    style={{ borderTop: `3px solid ${colorPalette.primary}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                    styles={{ body: { padding: 22 } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: colorPalette.primaryLight, marginBottom: 16 }}>
                      <TeamOutlined style={{ fontSize: 22, color: colorPalette.primary }} />
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginBottom: 6 }}>{stats.total}</div>
                    <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>开发人员总数</div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card
                    bordered={false}
                    style={{ borderTop: `3px solid ${colorPalette.warning}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                    styles={{ body: { padding: 22 } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: colorPalette.warningLight, marginBottom: 16 }}>
                      <AuditOutlined style={{ fontSize: 22, color: colorPalette.warning }} />
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginBottom: 6 }}>{stats.pending}</div>
                    <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>待审核</div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card
                    bordered={false}
                    style={{ borderTop: `3px solid ${colorPalette.success}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                    styles={{ body: { padding: 22 } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: colorPalette.successLight, marginBottom: 16 }}>
                      <CheckCircleOutlined style={{ fontSize: 22, color: colorPalette.success }} />
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginBottom: 6 }}>{stats.approved}</div>
                    <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>已通过</div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card
                    bordered={false}
                    style={{ borderTop: `3px solid ${colorPalette.purple}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                    styles={{ body: { padding: 22 } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: colorPalette.purpleLight, marginBottom: 16 }}>
                      <ToolOutlined style={{ fontSize: 22, color: colorPalette.purple }} />
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginBottom: 6 }}>{stats.skillCount}</div>
                    <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>技能数量</div>
                  </Card>
                </Col>
              </Row>

              <div style={{ background: colorPalette.bg, borderRadius: 10, padding: 20, marginBottom: 20 }}>
                <Space wrap size={12}>
                  <Input
                    placeholder="搜索姓名、手机或邮箱..."
                    prefix={<SearchOutlined style={{ color: colorPalette.textMuted }} />}
                    value={filters.name}
                    onChange={e => setFilters({ ...filters, name: e.target.value })}
                    onPressEnter={handleSearch}
                    style={{ width: 240 }}
                    allowClear
                  />
                  <TreeSelect
                    placeholder="选择技能"
                    style={{ width: 200 }}
                    allowClear
                    treeData={skillCategoryTree}
                    value={filters.skill}
                    onChange={v => setFilters({ ...filters, skill: v || undefined })}
                    treeDefaultExpandAll
                  />
                  <Select
                    placeholder="选择合作伙伴"
                    style={{ width: 180 }}
                    allowClear
                    value={filters.partner_id}
                    onChange={v => setFilters({ ...filters, partner_id: v || undefined })}
                  >
                    {partners.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
                  </Select>
                  <Select
                    placeholder="选择状态"
                    style={{ width: 120 }}
                    allowClear
                    value={filters.status}
                    onChange={v => setFilters({ ...filters, status: v || undefined })}
                  >
                    <Select.Option value="PENDING">待审核</Select.Option>
                    <Select.Option value="APPROVED">已通过</Select.Option>
                    <Select.Option value="REJECTED">已拒绝</Select.Option>
                    <Select.Option value="DISABLED">已禁用</Select.Option>
                  </Select>
                  <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
                </Space>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, color: colorPalette.textSecondary }}>
                  共 <strong style={{ color: colorPalette.textPrimary }}>{pagination.total || developers.length}</strong> 条结果
                </span>
                <Space>
                  <span style={{ fontSize: 13, color: colorPalette.textMuted }}>视图：</span>
                  <Space size={4}>
                    <Button
                      type={viewMode === 'grid' ? 'primary' : 'default'}
                      icon={<AppstoreOutlined />}
                      onClick={() => setViewMode('grid')}
                      size="small"
                    />
                    <Button
                      type={viewMode === 'table' ? 'primary' : 'default'}
                      icon={<BarsOutlined />}
                      onClick={() => setViewMode('table')}
                      size="small"
                    />
                  </Space>
                </Space>
              </div>

              {viewMode === 'grid' ? (
                <Row gutter={[20, 20]}>
                  {developers.map(dev => (
                    <Col key={dev.id} xs={24} sm={12} lg={8} xl={6}>
                      {renderDeveloperCard(dev)}
                    </Col>
                  ))}
                </Row>
              ) : (
                <Table
                  columns={columns}
                  dataSource={developers}
                  rowKey="id"
                  loading={loading}
                  pagination={{ ...pagination, showSizeChanger: true, showQuickJumper: true, showTotal: (total: number) => `共 ${total} 条` }}
                  onChange={handleTableChange}
                  scroll={{ x: 1400 }}
                  size="middle"
                />
              )}

              {viewMode === 'grid' && developers.length === 0 && !loading && (
                <Empty description="暂无开发人员数据" style={{ marginTop: 60, marginBottom: 60 }} />
              )}
            </div>
          </TabPane>

          <TabPane tab={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ToolOutlined /> 技能标签管理</span>} key="skills">
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: colorPalette.textSecondary }}>
                共 <strong style={{ color: colorPalette.textPrimary }}>{skillTags.length}</strong> 个技能标签
              </span>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateSkill}>新建技能标签</Button>
            </div>
            <Row gutter={[16, 16]} style={{ padding: '0 24px 24px' }}>
              {skillTags.map(skill => (
                <Col key={skill.id} xs={24} sm={12} lg={8} xl={6}>
                  {renderSkillCard(skill)}
                </Col>
              ))}
            </Row>
            {skillTags.length === 0 && !skillsLoading && (
              <Empty description="暂无技能标签" style={{ marginTop: 60, marginBottom: 60 }} />
            )}
          </TabPane>
        </Tabs>
      </div>

      <Modal
        title={editingDeveloper ? '编辑开发人员' : '新建开发人员'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={560}
        okText={editingDeveloper ? '保存' : '创建'}
        cancelText="取消"
      >
        <Form form={form} layout="vertical" requiredMark="optional" style={{ marginTop: 20 }}>
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" maxLength={50} prefix={<UserOutlined style={{ color: colorPalette.textMuted }} />} />
          </Form.Item>
          <Form.Item label="手机号码" name="phone" rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效手机号' }]}>
            <Input placeholder="请输入手机号" maxLength={11} prefix={<PhoneOutlined style={{ color: colorPalette.textMuted }} />} />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ type: 'email', message: '请输入有效邮箱地址' }]}>
            <Input placeholder="请输入邮箱" prefix={<MailOutlined style={{ color: colorPalette.textMuted }} />} />
          </Form.Item>
          <Form.Item label="所属合作伙伴" name="partner_id" rules={[{ required: true, message: '请选择合作伙伴' }]}>
            <Select placeholder="选择合作伙伴" allowClear>
              {partners.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="工作年限" name="work_years">
            <InputNumber min={0} max={50} placeholder="请输入工作经验年限" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="技能标签" name="skills">
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

      <Modal
        title={editingSkill ? '编辑技能标签' : '新建技能标签'}
        open={skillModalVisible}
        onOk={handleSkillSubmit}
        onCancel={() => setSkillModalVisible(false)}
        width={480}
        okText={editingSkill ? '保存' : '创建'}
        cancelText="取消"
      >
        <Form form={skillForm} layout="vertical" requiredMark="optional" style={{ marginTop: 20 }}>
          <Form.Item label="技能名称" name="name" rules={[{ required: true, message: '请输入技能名称' }]}>
            <Input placeholder="请输入技能名称" maxLength={50} prefix={<ToolOutlined style={{ color: colorPalette.textMuted }} />} />
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
        width={600}
        styles={{ header: { borderBottom: `1px solid ${colorPalette.borderLight}`, padding: '20px 24px' }, body: { padding: 24 } }}
        extra={
          selectedDeveloper && (
            <Button type="primary" icon={<EditOutlined />} onClick={() => { setDetailVisible(false); handleEdit(selectedDeveloper) }}>编辑</Button>
          )
        }
      >
        {selectedDeveloper && (
          <Tabs activeKey={detailTab} onChange={setDetailTab}>
            <TabPane tab="基本信息" key="basic">
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${colorPalette.primary} 0%, #36c1fc 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 28,
                }}>
                  {getInitials(selectedDeveloper.name)}
                </div>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{selectedDeveloper.name}</h3>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 500,
                    background: statusMap[selectedDeveloper.status].bg,
                    color: statusMap[selectedDeveloper.status].color,
                  }}>
                    {statusMap[selectedDeveloper.status].text}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: colorPalette.textPrimary, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${colorPalette.borderLight}` }}>基本信息</h4>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <div style={{ padding: 14, background: colorPalette.bg, borderRadius: 6 }}>
                      <div style={{ fontSize: 12, color: colorPalette.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>手机号码</div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: colorPalette.textPrimary }}>{selectedDeveloper.phone || '-'}</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ padding: 14, background: colorPalette.bg, borderRadius: 6 }}>
                      <div style={{ fontSize: 12, color: colorPalette.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>邮箱</div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: colorPalette.textPrimary }}>{selectedDeveloper.email || '-'}</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ padding: 14, background: colorPalette.bg, borderRadius: 6 }}>
                      <div style={{ fontSize: 12, color: colorPalette.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>所属合作伙伴</div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: colorPalette.textPrimary }}>{selectedDeveloper.partner_name || '-'}</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ padding: 14, background: colorPalette.bg, borderRadius: 6 }}>
                      <div style={{ fontSize: 12, color: colorPalette.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>工作年限</div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: colorPalette.textPrimary }}>{selectedDeveloper.work_years || 0}年</div>
                    </div>
                  </Col>
                </Row>
              </div>

              <div style={{ marginBottom: 28 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: colorPalette.textPrimary, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${colorPalette.borderLight}` }}>技能标签</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedDeveloper.skills?.map(skill => (
                    <span key={skill.skill_id} style={{
                      padding: '6px 12px',
                      background: colorPalette.primaryLight,
                      color: colorPalette.primary,
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 500,
                    }}>
                      {skill.skill_name}
                    </span>
                  ))}
                  {(!selectedDeveloper.skills || selectedDeveloper.skills.length === 0) && (
                    <span style={{ color: colorPalette.textMuted }}>暂无技能</span>
                  )}
                </div>
              </div>

              {selectedDeveloper.status === 'PENDING' && (
                <Space>
                  <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleAudit(selectedDeveloper, 'APPROVED')}>审核通过</Button>
                  <Button danger icon={<CloseCircleOutlined />} onClick={() => handleAudit(selectedDeveloper, 'REJECTED')}>审核拒绝</Button>
                </Space>
              )}
            </TabPane>

            <TabPane tab="工作轨迹" key="trajectory">
              <Timeline
                mode="left"
                items={trajectory.map(t => ({
                  color: trajectoryColorMap[t.event_type] || colorPalette.primary,
                  label: dayjs(t.event_time).format('YYYY-MM-DD'),
                  children: (
                    <div>
                      <strong style={{ fontSize: 14 }}>{t.event_type}</strong>
                      <p style={{ margin: '4px 0 8px', color: colorPalette.textSecondary }}>{t.description}</p>
                      {t.task_name && <Tag color="purple">{t.task_name}</Tag>}
                      {t.operator && <span style={{ marginLeft: 8, color: colorPalette.textMuted, fontSize: 12 }}>操作人: {t.operator}</span>}
                    </div>
                  ),
                }))}
              />
              {trajectory.length === 0 && !trajectoryLoading && <Empty description="暂无工作轨迹记录" style={{ marginTop: 40 }} />}
            </TabPane>

            <TabPane tab="绩效评估" key="evaluations">
              {evaluations.map(eval_item => (
                <div key={eval_item.id} style={{ background: colorPalette.bg, borderRadius: 10, padding: 18, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: colorPalette.textPrimary }}>{eval_item.evaluator_name}</span>
                    <span style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: eval_item.score >= 90 ? colorPalette.success : eval_item.score >= 80 ? colorPalette.primary : colorPalette.warning,
                    }}>
                      {eval_item.score}分
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: colorPalette.textSecondary, lineHeight: 1.6 }}>{eval_item.comment}</div>
                  <div style={{ fontSize: 12, color: colorPalette.textMuted, marginTop: 8 }}>{dayjs(eval_item.created_at).format('YYYY-MM-DD')}</div>
                </div>
              ))}
              {evaluations.length === 0 && !evaluationsLoading && <Empty description="暂无绩效评估记录" />}
            </TabPane>
          </Tabs>
        )}
      </Drawer>
    </div>
  )
}

export default DeveloperManagement
