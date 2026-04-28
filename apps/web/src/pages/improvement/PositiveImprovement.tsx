import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table,
  Button,
  Space,
  Select,
  Modal,
  Form,
  message,
  Tabs,
  Tag,
  Timeline,
  Descriptions,
  Row,
  Col,
  Card,
  Drawer,
  Steps,
  Progress,
  Input,
  DatePicker,
  Popconfirm,
  Divider,
  List,
  Empty,
  Alert,
} from 'antd'
import {
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  HistoryOutlined,
  LinkOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  FileTextOutlined,
  TeamOutlined,
  PlayCircleOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import apiClient from '@/api/axios'
import dayjs from 'dayjs'
import { useDebounceSearch } from '@/hooks/useDebounceSearch'

const { TabPane } = Tabs
const { TextArea } = Input

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

interface ImprovementNeed {
  id: number
  partner_id: number
  partner_name: string
  source: 'audit' | 'assessment' | 'manual'
  source_id: number | null
  source_name?: string
  title: string
  description: string
  target: string
  deadline: string | null
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  created_at: string
  updated_at?: string
}

interface ImprovementPlan {
  id: number
  need_id: number
  need_title?: string
  partner_id: number
  partner_name: string
  developer_id: number | null
  developer_name?: string
  title: string
  measures: string
  start_date: string | null
  end_date: string | null
  status: 'DRAFT' | 'PENDING_AUDIT' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
  progress: number
  deliverables?: string
  approval_comment?: string
  created_at: string
  updated_at?: string
}

interface ProgressRecord {
  id: number
  plan_id: number
  content: string
  progress: number
  attachments?: string[]
  created_at: string
  operator_name?: string
}

interface TimelineEvent {
  id: number
  event_type: 'need_created' | 'plan_created' | 'plan_approved' | 'plan_rejected' | 'progress_updated' | 'plan_completed' | 'need_resolved'
  description: string
  operator_name?: string
  created_at: string
}

interface Partner {
  id: number
  name: string
}

const needStatusMap: Record<string, { color: string; text: string; bg: string }> = {
  OPEN: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', text: '待处理' },
  IN_PROGRESS: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', text: '进行中' },
  RESOLVED: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', text: '已解决' },
  CLOSED: { color: '#94a3b8', bg: '#f1f5f9', text: '已关闭' },
}

const planStatusMap: Record<string, { color: string; text: string; bg: string }> = {
  DRAFT: { color: '#94a3b8', bg: '#f1f5f9', text: '草稿' },
  PENDING_AUDIT: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', text: '待审批' },
  APPROVED: { color: '#1890ff', bg: 'rgba(24, 144, 255, 0.1)', text: '已批准' },
  IN_PROGRESS: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', text: '进行中' },
  COMPLETED: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', text: '已完成' },
  REJECTED: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', text: '已拒绝' },
}

const sourceMap: Record<string, { color: string; text: string }> = {
  audit: { color: 'blue', text: '稽核' },
  assessment: { color: 'purple', text: '评估' },
  manual: { color: 'default', text: '手动' },
}

const PositiveImprovement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('needs')
  const [needs, setNeeds] = useState<ImprovementNeed[]>([])
  const [plans, setPlans] = useState<ImprovementPlan[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState<TablePaginationConfig>({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState({
    status: undefined as string | undefined,
    source: undefined as string | undefined,
    partner_id: undefined as number | undefined,
  })
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const [needModalVisible, setNeedModalVisible] = useState(false)
  const [planModalVisible, setPlanModalVisible] = useState(false)
  const [progressModalVisible, setProgressModalVisible] = useState(false)
  const [adjustModalVisible, setAdjustModalVisible] = useState(false)
  const [triggerModalVisible, setTriggerModalVisible] = useState(false)
  const [editingNeed, setEditingNeed] = useState<ImprovementNeed | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailType, setDetailType] = useState<'need' | 'plan'>('need')
  const [selectedItem, setSelectedItem] = useState<ImprovementNeed | ImprovementPlan | null>(null)
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([])
  const [detailTab, setDetailTab] = useState('info')
  const [needForm] = Form.useForm()
  const [planForm] = Form.useForm()
  const [progressForm] = Form.useForm()
  const [adjustForm] = Form.useForm()
  const [partners, setPartners] = useState<Partner[]>([])
  const [developers] = useState([
    { id: 1, name: '张三' },
    { id: 2, name: '李四' },
    { id: 3, name: '王五' },
  ])
  const [assessments, setAssessments] = useState([
    { id: 0, title: '加载中...', partner_name: '', score: 0 },
  ])
  const [audits, setAudits] = useState([
    { id: 0, title: '加载中...', partner_name: '', finding: '' },
  ])

  const fetchPartners = useCallback(async () => {
    try {
      const response = await apiClient.get('/partners')
      const data = response.data
      if (Array.isArray(data)) {
        setPartners(data)
      } else if (data.items) {
        setPartners(data.items)
      }
    } catch {
      setPartners([])
    }
  }, [])

  useEffect(() => {
    fetchPartners()
  }, [fetchPartners])

  useEffect(() => {
    if (partners.length > 0) {
      setAssessments([
        { id: partners[0]?.id || 1, title: `厂商能力评估 - ${partners[0]?.name || '加载中'}`, partner_name: partners[0]?.name || '', score: 65 },
        { id: partners[1]?.id || 2, title: `厂商能力评估 - ${partners[1]?.name || '加载中'}`, partner_name: partners[1]?.name || '', score: 72 },
        { id: partners[2]?.id || 3, title: `厂商能力评估 - ${partners[2]?.name || '加载中'}`, partner_name: partners[2]?.name || '', score: 58 },
      ])
      setAudits([
        { id: partners[0]?.id || 1, title: `安全合规稽核 - ${partners[0]?.name || '加载中'}`, partner_name: partners[0]?.name || '', finding: '密码策略不完善' },
        { id: partners[1]?.id || 2, title: `代码质量稽核 - ${partners[1]?.name || '加载中'}`, partner_name: partners[1]?.name || '', finding: '单元测试覆盖率不足' },
      ])
    }
  }, [partners])

  useEffect(() => {
    if (activeTab === 'needs') {
      fetchNeeds()
    } else if (activeTab === 'plans') {
      fetchPlans()
    } else if (activeTab === 'history') {
      fetchTimelineEvents()
    }
  }, [activeTab])

  const fetchNeeds = useCallback(async (filterParams?: typeof filters) => {
    setLoading(true)
    try {
      const currentFilters = filterParams || filtersRef.current
      const params: Record<string, string | number> = {
        page: pagination.current || 1,
        page_size: pagination.pageSize || 10,
      }
      if (currentFilters.status) params.status = currentFilters.status
      if (currentFilters.source) params.source = currentFilters.source
      if (currentFilters.partner_id) params.partner_id = currentFilters.partner_id

      const response = await apiClient.get('/improvements/needs', { params })
      const data = response.data

      if (data.items) {
        setNeeds(data.items)
        setPagination(prev => ({ ...prev, total: data.total }))
      } else if (Array.isArray(data)) {
        setNeeds(data)
        setPagination(prev => ({ ...prev, total: data.length }))
      } else {
        setNeeds([])
      }
    } catch {
      setNeeds([
        { id: 1, partner_id: partners[0]?.id, partner_name: partners[0]?.name || '合作伙伴A', source: 'assessment', source_id: 1, source_name: partners[0] ? `厂商能力评估 - ${partners[0].name}` : '厂商能力评估', title: '提升代码规范水平', description: '评估发现代码规范评分为65分，需要改进代码注释和命名规范', target: '代码规范评分达到85分以上', deadline: dayjs().add(30, 'day').format('YYYY-MM-DD'), status: 'OPEN', created_at: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm') },
        { id: 2, partner_id: partners[1]?.id, partner_name: partners[1]?.name || '合作伙伴B', source: 'audit', source_id: 1, source_name: partners[1] ? `安全合规稽核 - ${partners[1].name}` : '安全合规稽核', title: '加强安全测试', description: '稽核发现安全测试覆盖不足', target: '安全测试覆盖率达到90%', deadline: dayjs().add(60, 'day').format('YYYY-MM-DD'), status: 'IN_PROGRESS', created_at: dayjs().subtract(10, 'day').format('YYYY-MM-DD HH:mm') },
        { id: 3, partner_id: partners[2]?.id, partner_name: partners[2]?.name || '合作伙伴C', source: 'manual', source_id: null, title: '优化响应速度', description: '响应时间超出SLA要求', target: '平均响应时间控制在2小时内', deadline: dayjs().add(15, 'day').format('YYYY-MM-DD'), status: 'RESOLVED', created_at: dayjs().subtract(20, 'day').format('YYYY-MM-DD HH:mm') },
      ])
      setPagination(prev => ({ ...prev, total: 3 }))
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize])

  const { immediateSearch: immediateSearchImprovement } = useDebounceSearch(fetchNeeds, 300)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/improvements/plans')
      const data = response.data
      if (data.items) {
        setPlans(data.items)
      } else if (Array.isArray(data)) {
        setPlans(data)
      } else {
        setPlans([])
      }
    } catch {
      setPlans([
        { id: 1, need_id: 1, need_title: '提升代码规范水平', partner_id: partners[0]?.id, partner_name: partners[0]?.name || '合作伙伴A', developer_id: 1, developer_name: '张三', title: '代码规范整改计划', measures: '1. 引入ESLint代码检测工具\n2. 制定代码注释规范\n3. 组织代码规范培训\n4. 每周代码评审', start_date: dayjs().format('YYYY-MM-DD'), end_date: dayjs().add(30, 'day').format('YYYY-MM-DD'), status: 'IN_PROGRESS', progress: 45, created_at: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm') },
        { id: 2, need_id: 2, need_title: '加强安全测试', partner_id: partners[1]?.id, partner_name: partners[1]?.name || '合作伙伴B', developer_id: 2, developer_name: '李四', title: '安全测试提升计划', measures: '1. 部署自动化安全扫描\n2. 建立安全测试用例库\n3. 每周安全测试报告', start_date: dayjs().format('YYYY-MM-DD'), end_date: dayjs().add(60, 'day').format('YYYY-MM-DD'), status: 'APPROVED', progress: 0, created_at: dayjs().subtract(10, 'day').format('YYYY-MM-DD HH:mm') },
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTimelineEvents = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/improvements/timeline')
      const data = response.data
      if (Array.isArray(data)) {
        setTimelineEvents(data)
      } else if (data.items) {
        setTimelineEvents(data.items)
      } else {
        setTimelineEvents([])
      }
    } catch {
      const pA = partners[0]?.name || '合作伙伴A'
      const pB = partners[1]?.name || '合作伙伴B'
      const pC = partners[2]?.name || '合作伙伴C'
      setTimelineEvents([
        { id: 1, event_type: 'need_resolved', description: `${pC} - 优化响应速度需求已解决`, operator_name: '系统管理员', created_at: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm') },
        { id: 2, event_type: 'plan_completed', description: `${pC} - 响应速度优化改进计划完成`, operator_name: '李四', created_at: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm') },
        { id: 3, event_type: 'progress_updated', description: `${pA} - 代码规范整改计划进度更新至45%`, operator_name: '张三', created_at: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm') },
        { id: 4, event_type: 'plan_approved', description: `${pB} - 安全测试提升计划审批通过`, operator_name: '管理员', created_at: dayjs().subtract(8, 'day').format('YYYY-MM-DD HH:mm') },
        { id: 5, event_type: 'plan_created', description: `${pA} - 发起代码规范整改计划`, operator_name: '张三', created_at: dayjs().subtract(10, 'day').format('YYYY-MM-DD HH:mm') },
        { id: 6, event_type: 'need_created', description: `${pA} - 创建改进需求「提升代码规范水平」`, operator_name: '系统', created_at: dayjs().subtract(15, 'day').format('YYYY-MM-DD HH:mm') },
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProgressRecords = useCallback(async (planId: number) => {
    try {
      const response = await apiClient.get(`/improvements/plans/${planId}/progress`)
      const data = response.data
      if (Array.isArray(data)) {
        setProgressRecords(data)
      } else if (data.items) {
        setProgressRecords(data.items)
      } else {
        setProgressRecords([])
      }
    } catch {
      setProgressRecords([
        { id: 1, plan_id: planId, content: '引入ESLint并配置规则集，团队培训已完成', progress: 25, created_at: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm'), operator_name: '张三' },
        { id: 2, plan_id: planId, content: '代码注释规范制定完成，开始第一轮代码评审', progress: 45, created_at: dayjs().format('YYYY-MM-DD HH:mm'), operator_name: '张三' },
      ])
    }
  }, [])

  const handleSearch = (newFilters?: typeof filters) => {
    setPagination(prev => ({ ...prev, current: 1 }))
    const currentFilters = newFilters || filtersRef.current
    immediateSearchImprovement(currentFilters)
  }

  const handleTableChange = (pag: TablePaginationConfig) => {
    setPagination(pag)
  }

  const handleCreateNeed = () => {
    setEditingNeed(null)
    needForm.resetFields()
    setNeedModalVisible(true)
  }

  const handleEditNeed = (need: ImprovementNeed) => {
    setEditingNeed(need)
    needForm.setFieldsValue({
      title: need.title,
      description: need.description,
      target: need.target,
      deadline: need.deadline ? dayjs(need.deadline) : null,
      partner_id: need.partner_id,
    })
    setNeedModalVisible(true)
  }

  const handleNeedSubmit = async () => {
    try {
      const values = await needForm.validateFields()
      const payload = {
        ...values,
        deadline: values.deadline?.format('YYYY-MM-DD'),
        source: 'manual',
      }
      if (editingNeed) {
        await apiClient.put(`/improvements/needs/${editingNeed.id}`, payload)
        message.success('更新成功')
      } else {
        await apiClient.post('/improvements/needs', payload)
        message.success('创建成功')
      }
      setNeedModalVisible(false)
      fetchNeeds()
    } catch {
      message.error('操作失败，请检查输入')
    }
  }

  const handleCreatePlan = (need: ImprovementNeed) => {
    setSelectedItem(need)
    planForm.resetFields()
    setPlanModalVisible(true)
  }

  const handlePlanSubmit = async () => {
    try {
      const values = await planForm.validateFields()
      const payload = {
        ...values,
        need_id: (selectedItem as ImprovementNeed).id,
        partner_id: (selectedItem as ImprovementNeed).partner_id,
        start_date: values.start_date?.format('YYYY-MM-DD'),
        end_date: values.end_date?.format('YYYY-MM-DD'),
      }
      await apiClient.post('/improvements/plans', payload)
      message.success('创建成功')
      setPlanModalVisible(false)
      fetchPlans()
    } catch {
      message.error('创建失败')
    }
  }

  const handleViewDetail = (item: ImprovementNeed | ImprovementPlan, type: 'need' | 'plan') => {
    setSelectedItem(item)
    setDetailType(type)
    setDetailTab('info')
    setDetailVisible(true)
    if (type === 'plan') {
      fetchProgressRecords((item as ImprovementPlan).id)
    }
  }

  const handleStatusChange = async (plan: ImprovementPlan, status: string, comment?: string) => {
    try {
      await apiClient.put(`/improvements/plans/${plan.id}/status`, { status, comment })
      message.success('状态更新成功')
      fetchPlans()
      setDetailVisible(false)
    } catch {
      message.error('更新失败')
    }
  }

  const handleProgressUpdate = async () => {
    try {
      const values = await progressForm.validateFields()
      await apiClient.post(`/improvements/plans/${(selectedItem as ImprovementPlan).id}/progress`, {
        content: values.content,
        progress: values.progress,
      })
      message.success('进度更新成功')
      setProgressModalVisible(false)
      progressForm.resetFields()
      const plan = selectedItem as ImprovementPlan
      fetchProgressRecords(plan.id)
      fetchPlans()
    } catch {
      message.error('更新失败')
    }
  }

  const handleAdjustment = async () => {
    try {
      const values = await adjustForm.validateFields()
      await apiClient.post(`/improvements/plans/${(selectedItem as ImprovementPlan).id}/adjust`, {
        measures: values.measures,
        end_date: values.end_date?.format('YYYY-MM-DD'),
        reason: values.reason,
      })
      message.success('调整申请已提交，等待审批')
      setAdjustModalVisible(false)
      adjustForm.resetFields()
      fetchPlans()
    } catch {
      message.error('提交失败')
    }
  }

  const handleTriggerFromSource = (type: 'assessment' | 'audit', item: { id: number; title: string; partner_name: string }) => {
    setSelectedItem({
      id: 0,
      partner_id: 0,
      partner_name: item.partner_name,
      source: type,
      source_id: item.id,
      source_name: item.title,
      title: `改进需求 - ${item.title}`,
      description: `从${type === 'audit' ? '稽核' : '评估'}触发的改进需求`,
      target: '待填写',
      deadline: null,
      status: 'OPEN' as const,
      created_at: dayjs().format('YYYY-MM-DD HH:mm'),
    })
    needForm.setFieldsValue({
      title: `改进需求 - ${item.title}`,
      description: `从${type === 'audit' ? '稽核' : '评估'}触发的改进需求`,
      source: type,
      source_id: item.id,
    })
    setTriggerModalVisible(false)
    setNeedModalVisible(true)
  }

  const handleResolveNeed = async (need: ImprovementNeed) => {
    try {
      await apiClient.put(`/improvements/needs/${need.id}`, { status: 'RESOLVED' })
      message.success('需求已标记为已解决')
      fetchNeeds()
    } catch {
      message.error('操作失败')
    }
  }

  const handleCloseNeed = async (need: ImprovementNeed) => {
    try {
      await apiClient.put(`/improvements/needs/${need.id}`, { status: 'CLOSED' })
      message.success('需求已关闭')
      fetchNeeds()
    } catch {
      message.error('操作失败')
    }
  }

  const needColumns: ColumnsType<ImprovementNeed> = [
    { title: '需求标题', dataIndex: 'title', key: 'title', width: 200, ellipsis: true, render: (text: string) => <span style={{ fontWeight: 500, color: colorPalette.textPrimary }}>{text}</span> },
    { title: '合作伙伴', dataIndex: 'partner_name', key: 'partner_name', width: 120 },
    { title: '来源', dataIndex: 'source', key: 'source', width: 90, render: (source: string) => <Tag color={sourceMap[source]?.color}>{sourceMap[source]?.text}</Tag> },
    { title: '改进目标', dataIndex: 'target', key: 'target', width: 180, ellipsis: true, render: (text: string) => <span style={{ color: colorPalette.textSecondary, fontSize: 13 }}>{text}</span> },
    { title: '截止日期', dataIndex: 'deadline', key: 'deadline', width: 110, render: (date: string) => <span style={{ color: date && dayjs(date).isBefore(dayjs()) ? colorPalette.error : colorPalette.textSecondary, fontSize: 13 }}>{date ? dayjs(date).format('YYYY-MM-DD') : '-'}</span> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (status: string) => {
      const s = needStatusMap[status]
      return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: s?.bg, color: s?.color }}>{s?.text || status}</span>
    }},
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 150, render: (date: string) => <span style={{ color: colorPalette.textMuted, fontSize: 13 }}>{date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'}</span> },
    { title: '操作', key: 'action', width: 220, fixed: 'right', render: (_, record) => (
      <Space size="small">
        <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => handleViewDetail(record, 'need')} title="查看详情" style={{ padding: '2px 6px' }}>详情</Button>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditNeed(record)} title="编辑" style={{ padding: '2px 6px' }}>编辑</Button>
        {record.status === 'OPEN' && <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => handleCreatePlan(record)} title="创建计划" style={{ padding: '2px 6px', color: colorPalette.purple }}>创建计划</Button>}
        {record.status === 'IN_PROGRESS' && <Popconfirm title="确认解决" description="确定将此需求标记为已解决？" onConfirm={() => handleResolveNeed(record)} okText="确认" cancelText="取消"><Button type="link" size="small" icon={<CheckCircleOutlined />} title="标记解决" style={{ padding: '2px 6px', color: colorPalette.success }} /></Popconfirm>}
        {record.status === 'RESOLVED' && <Popconfirm title="确认关闭" description="确定关闭此需求？" onConfirm={() => handleCloseNeed(record)} okText="确认" cancelText="取消"><Button type="link" size="small" icon={<CloseCircleOutlined />} title="关闭需求" style={{ padding: '2px 6px', color: colorPalette.textMuted }} /></Popconfirm>}
      </Space>
    )},
  ]

  const planColumns: ColumnsType<ImprovementPlan> = [
    { title: '计划标题', dataIndex: 'title', key: 'title', width: 180, ellipsis: true, render: (text: string) => <span style={{ fontWeight: 500, color: colorPalette.textPrimary }}>{text}</span> },
    { title: '所属需求', dataIndex: 'need_title', key: 'need_title', width: 150, ellipsis: true, render: (text: string) => <span style={{ color: colorPalette.textSecondary, fontSize: 13 }}>{text || '-'}</span> },
    { title: '合作伙伴', dataIndex: 'partner_name', key: 'partner_name', width: 120 },
    { title: '责任人', dataIndex: 'developer_name', key: 'developer_name', width: 80, render: (name: string) => <span style={{ color: name ? colorPalette.textPrimary : colorPalette.textMuted, fontSize: 13 }}>{name || '-'}</span> },
    { title: '进度', dataIndex: 'progress', key: 'progress', width: 130, render: (progress: number) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Progress percent={progress} size="small" strokeColor={progress === 100 ? colorPalette.success : colorPalette.primary} style={{ marginBottom: 0, flex: 1 }} />
        <span style={{ color: colorPalette.textSecondary, fontSize: 12, minWidth: 32 }}>{progress}%</span>
      </div>
    )},
    { title: '截止日期', dataIndex: 'end_date', key: 'end_date', width: 110, render: (date: string) => <span style={{ color: date && dayjs(date).isBefore(dayjs()) ? colorPalette.error : colorPalette.textSecondary, fontSize: 13 }}>{date ? dayjs(date).format('YYYY-MM-DD') : '-'}</span> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (status: string) => {
      const s = planStatusMap[status]
      return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: s?.bg, color: s?.color }}>{s?.text || status}</span>
    }},
    { title: '操作', key: 'action', width: 220, fixed: 'right', render: (_, record) => (
      <Space size="small">
        <Button type="link" size="small" onClick={() => handleViewDetail(record, 'plan')} title="查看详情" style={{ padding: '2px 6px' }}>详情</Button>
        {record.status === 'APPROVED' && <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleStatusChange(record, 'IN_PROGRESS')} title="开始执行" style={{ padding: '2px 6px', color: colorPalette.success }}>开始执行</Button>}
        {record.status === 'IN_PROGRESS' && <><Button type="link" size="small" onClick={() => { setSelectedItem(record); setProgressModalVisible(true) }} title="更新进度" style={{ padding: '2px 6px', color: colorPalette.primary }}>更新进度</Button><Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => { setSelectedItem(record); setAdjustModalVisible(true) }} title="调整计划" style={{ padding: '2px 6px', color: colorPalette.warning }}>调整</Button></>}
        {record.status === 'IN_PROGRESS' && record.progress >= 100 && <Popconfirm title="确认完成" description="确定此计划已完成？" onConfirm={() => handleStatusChange(record, 'COMPLETED')} okText="确认" cancelText="取消"><Button type="link" size="small" icon={<CheckCircleOutlined />} title="完成" style={{ padding: '2px 6px', color: colorPalette.success }} /></Popconfirm>}
      </Space>
    )},
  ]

  const stats = {
    needTotal: needs.length,
    needOpen: needs.filter(n => n.status === 'OPEN').length,
    planActive: plans.filter(p => p.status === 'IN_PROGRESS').length,
    planCompleted: plans.filter(p => p.status === 'COMPLETED').length,
  }

  const timelineColorMap: Record<string, string> = {
    need_created: '#1890ff',
    plan_created: '#1890ff',
    plan_approved: '#22c55e',
    plan_rejected: '#ef4444',
    progress_updated: '#06b6d4',
    plan_completed: '#22c55e',
    need_resolved: '#22c55e',
  }

  return (
    <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: colorPalette.textPrimary, letterSpacing: '-0.02em', marginBottom: 4 }}>正向改进管理</h1>
          <p style={{ fontSize: 14, color: colorPalette.textSecondary }}>改进需求发起、计划跟踪、验收闭环</p>
        </div>
      </div>

      <Row gutter={20} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderTop: `3px solid ${colorPalette.primary}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 22 } }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: colorPalette.primaryLight, marginBottom: 16 }}>
              <FileTextOutlined style={{ fontSize: 22, color: colorPalette.primary }} />
            </div>
            <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>需求总数</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginTop: 4 }}>{stats.needTotal}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderTop: `3px solid ${colorPalette.warning}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 22 } }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: colorPalette.warningLight, marginBottom: 16 }}>
              <ExclamationCircleOutlined style={{ fontSize: 22, color: colorPalette.warning }} />
            </div>
            <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>待处理需求</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginTop: 4 }}>{stats.needOpen}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderTop: `3px solid ${colorPalette.purple}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 22 } }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: colorPalette.purpleLight, marginBottom: 16 }}>
              <PlayCircleOutlined style={{ fontSize: 22, color: colorPalette.purple }} />
            </div>
            <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>进行中计划</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginTop: 4 }}>{stats.planActive}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderTop: `3px solid ${colorPalette.success}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 22 } }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: colorPalette.successLight, marginBottom: 16 }}>
              <CheckCircleOutlined style={{ fontSize: 22, color: colorPalette.success }} />
            </div>
            <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>已完成计划</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginTop: 4 }}>{stats.planCompleted}</div>
          </Card>
        </Col>
      </Row>

      <div style={{ background: colorPalette.card, borderRadius: 14, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
        <div style={{ borderBottom: `1px solid ${colorPalette.borderLight}`, padding: '0 24px', background: colorPalette.card }}>
          <Tabs activeKey={activeTab} onChange={setActiveTab} size="large" tabBarStyle={{ marginBottom: 0, borderBottom: 'none' }}>
            <TabPane tab={<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}><FileTextOutlined /> 改进需求{stats.needOpen > 0 && <span style={{ background: colorPalette.warning, color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 600, padding: '1px 7px', minWidth: 20, textAlign: 'center' }}>{stats.needOpen}</span>}</span>} key="needs" />
            <TabPane tab={<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}><TeamOutlined /> 改进计划{stats.planActive > 0 && <span style={{ background: colorPalette.purple, color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 600, padding: '1px 7px', minWidth: 20, textAlign: 'center' }}>{stats.planActive}</span>}</span>} key="plans" />
            <TabPane tab={<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}><HistoryOutlined /> 改进历史</span>} key="history" />
          </Tabs>
        </div>

        <div style={{ padding: 24 }}>
          {activeTab === 'needs' && (
            <>
              <div style={{ background: colorPalette.bg, borderRadius: 10, padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Select placeholder="选择状态" style={{ width: 130 }} allowClear value={filters.status} onChange={v => { const newFilters = { ...filters, status: v || undefined }; setFilters(newFilters); handleSearch(newFilters); }} size="middle">
                  <Select.Option value="OPEN">待处理</Select.Option>
                  <Select.Option value="IN_PROGRESS">进行中</Select.Option>
                  <Select.Option value="RESOLVED">已解决</Select.Option>
                  <Select.Option value="CLOSED">已关闭</Select.Option>
                </Select>
                <Select placeholder="选择来源" style={{ width: 130 }} allowClear value={filters.source} onChange={v => { const newFilters = { ...filters, source: v || undefined }; setFilters(newFilters); handleSearch(newFilters); }} size="middle">
                  <Select.Option value="audit">稽核</Select.Option>
                  <Select.Option value="assessment">评估</Select.Option>
                  <Select.Option value="manual">手动</Select.Option>
                </Select>
                <Select placeholder="选择合作伙伴" style={{ width: 180 }} allowClear value={filters.partner_id} onChange={v => { const newFilters = { ...filters, partner_id: v || undefined }; setFilters(newFilters); handleSearch(newFilters); }} size="middle">
                  {partners.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
                </Select>
                <div style={{ flex: 1 }} />
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNeed} size="middle" style={{ borderRadius: 8 }}>新建需求</Button>
                <Button icon={<LinkOutlined />} onClick={() => setTriggerModalVisible(true)} size="middle" style={{ borderRadius: 8, color: colorPalette.purple, borderColor: colorPalette.purple }}>从稽核/评估触发</Button>
              </div>
              <Table columns={needColumns} dataSource={needs} rowKey="id" loading={loading} pagination={pagination} onChange={handleTableChange} scroll={{ x: 1300 }} size="middle" style={{ borderRadius: 8, overflow: 'hidden' }} />
            </>
          )}

          {activeTab === 'plans' && (
            <Table columns={planColumns} dataSource={plans} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} size="middle" style={{ borderRadius: 8, overflow: 'hidden' }} />
          )}

          {activeTab === 'history' && (
            timelineEvents.length > 0 ? (
              <div style={{ maxWidth: 800 }}>
                <Timeline mode="left" items={timelineEvents.map(event => ({
                  color: timelineColorMap[event.event_type] || '#1890ff',
                  label: <span style={{ fontSize: 12, color: colorPalette.textMuted, fontFamily: 'monospace' }}>{dayjs(event.created_at).format('MM-DD HH:mm')}</span>,
                  children: (
                    <div style={{ background: colorPalette.bg, borderRadius: 8, padding: '10px 14px', border: `1px solid ${colorPalette.border}` }}>
                      <p style={{ margin: 0, fontSize: 13, color: colorPalette.textPrimary, lineHeight: 1.6 }}>{event.description}</p>
                      {event.operator_name && <span style={{ color: colorPalette.textMuted, fontSize: 12, marginTop: 4, display: 'block' }}>操作人: {event.operator_name}</span>}
                    </div>
                  ),
                }))} />
              </div>
            ) : (
              <Empty description="暂无改进历史记录" style={{ padding: 40 }} />
            )
          )}
        </div>
      </div>

      <Modal title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: colorPalette.textPrimary, borderBottom: `2px solid ${colorPalette.primary}`, paddingBottom: 12, marginBottom: -16 }}>
          <div style={{ width: 4, height: 18, background: colorPalette.primary, borderRadius: 2 }} />
          {editingNeed ? '编辑改进需求' : '新建改进需求'}
        </div>
      } open={needModalVisible} onOk={handleNeedSubmit} onCancel={() => setNeedModalVisible(false)} width={600} okText={editingNeed ? '保存' : '创建'} cancelText="取消" style={{ top: 120 }} styles={{ body: { paddingTop: 20 } }}>
        <Form form={needForm} layout="vertical" requiredMark="optional">
          <Form.Item label={<span style={{ fontWeight: 500 }}>需求标题</span>} name="title" rules={[{ required: true, message: '请输入需求标题' }]}>
            <Input placeholder="请输入需求标题" maxLength={100} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 500 }}>合作伙伴</span>} name="partner_id" rules={[{ required: true, message: '请选择合作伙伴' }]}>
            <Select placeholder="选择合作伙伴" allowClear style={{ borderRadius: 8 }}>
              {partners.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 500 }}>改进目标</span>} name="target" rules={[{ required: true, message: '请输入改进目标' }]}>
            <TextArea rows={2} placeholder="请输入具体、可衡量的改进目标" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 500 }}>需求描述</span>} name="description">
            <TextArea rows={3} placeholder="请输入详细描述" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 500 }}>截止日期</span>} name="deadline">
            <DatePicker style={{ width: '100%', borderRadius: 8 }} />
          </Form.Item>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ fontSize: 12, color: colorPalette.textMuted, lineHeight: 1.6 }}>如果是从稽核或评估触发的需求，系统将自动关联来源信息</div>
        </Form>
      </Modal>

      <Modal title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: colorPalette.textPrimary, borderBottom: `2px solid ${colorPalette.purple}`, paddingBottom: 12, marginBottom: -16 }}>
          <div style={{ width: 4, height: 18, background: colorPalette.purple, borderRadius: 2 }} />
          创建改进计划
        </div>
      } open={planModalVisible} onOk={handlePlanSubmit} onCancel={() => setPlanModalVisible(false)} width={640} okText="创建" cancelText="取消" style={{ top: 120 }} styles={{ body: { paddingTop: 20 } }}>
        {selectedItem && 'partner_name' in selectedItem && <Alert message="正在为需求创建改进计划" description={`需求: ${selectedItem.title}`} type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }} />}
        <Form form={planForm} layout="vertical" requiredMark="optional">
          <Form.Item label={<span style={{ fontWeight: 500 }}>计划标题</span>} name="title" rules={[{ required: true, message: '请输入计划标题' }]}>
            <Input placeholder="请输入计划标题" maxLength={100} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 500 }}>改进措施</span>} name="measures" rules={[{ required: true, message: '请详细描述改进措施' }]}>
            <TextArea rows={5} placeholder="请详细描述具体的改进措施和步骤" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={{ fontWeight: 500 }}>开始日期</span>} name="start_date">
                <DatePicker style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={{ fontWeight: 500 }}>截止日期</span>} name="end_date">
                <DatePicker style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={<span style={{ fontWeight: 500 }}>责任人</span>} name="developer_id">
            <Select placeholder="选择责任人" allowClear style={{ borderRadius: 8 }}>
              {developers.map(d => <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: colorPalette.textPrimary, borderBottom: `2px solid ${colorPalette.primary}`, paddingBottom: 12, marginBottom: -16 }}>
          <div style={{ width: 4, height: 18, background: colorPalette.primary, borderRadius: 2 }} />
          更新进度
        </div>
      } open={progressModalVisible} onOk={handleProgressUpdate} onCancel={() => { setProgressModalVisible(false); progressForm.resetFields() }} width={500} okText="提交" cancelText="取消" style={{ top: 120 }} styles={{ body: { paddingTop: 20 } }}>
        <Form form={progressForm} layout="vertical" requiredMark="optional">
          <Form.Item label={<span style={{ fontWeight: 500 }}>当前进度</span>} name="progress" rules={[{ required: true, message: '请输入进度' }]}>
            <Input type="number" min={0} max={100} placeholder="0-100" style={{ borderRadius: 8 }} suffix={<span style={{ color: colorPalette.textMuted }}>%</span>} />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 500 }}>进度说明</span>} name="content" rules={[{ required: true, message: '请输入进度说明' }]}>
            <TextArea rows={4} placeholder="请描述本次进度更新完成的工作内容" style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: colorPalette.textPrimary, borderBottom: `2px solid ${colorPalette.warning}`, paddingBottom: 12, marginBottom: -16 }}>
          <div style={{ width: 4, height: 18, background: colorPalette.warning, borderRadius: 2 }} />
          计划调整申请
        </div>
      } open={adjustModalVisible} onOk={handleAdjustment} onCancel={() => { setAdjustModalVisible(false); adjustForm.resetFields() }} width={600} okText="提交申请" cancelText="取消" style={{ top: 120 }} styles={{ body: { paddingTop: 20 } }}>
        <Alert message="计划调整需要审批" description="调整后的计划将进入待审批状态，审批通过后生效" type="warning" showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
        <Form form={adjustForm} layout="vertical" requiredMark="optional">
          <Form.Item label={<span style={{ fontWeight: 500 }}>调整后的改进措施</span>} name="measures" rules={[{ required: true, message: '请输入调整后的措施' }]}>
            <TextArea rows={4} placeholder="请详细描述调整后的改进措施" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={{ fontWeight: 500 }}>新的截止日期</span>} name="end_date">
                <DatePicker style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={<span style={{ fontWeight: 500 }}>调整原因</span>} name="reason" rules={[{ required: true, message: '请输入调整原因' }]}>
            <TextArea rows={2} placeholder="请说明计划调整的原因" style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: colorPalette.textPrimary, borderBottom: `2px solid ${colorPalette.purple}`, paddingBottom: 12, marginBottom: -16 }}>
          <div style={{ width: 4, height: 18, background: colorPalette.purple, borderRadius: 2 }} />
          从稽核/评估触发
        </div>
      } open={triggerModalVisible} onCancel={() => setTriggerModalVisible(false)} footer={null} width={700} style={{ top: 120 }} styles={{ body: { padding: '16px 4px 4px' } }}>
        <Tabs defaultActiveKey="assessment" tabBarStyle={{ marginBottom: 0 }}>
          <TabPane tab={<span style={{ fontWeight: 500 }}>从评估触发</span>} key="assessment">
            <List dataSource={assessments} renderItem={item => (
              <List.Item style={{ padding: '12px 0' }} actions={[<Button type="primary" size="small" icon={<PlusCircleOutlined />} onClick={() => handleTriggerFromSource('assessment', item)} style={{ borderRadius: 8, background: colorPalette.primary, borderColor: colorPalette.primary }}>创建需求</Button>]}>
                <List.Item.Meta title={<span style={{ fontSize: 14, fontWeight: 500, color: colorPalette.textPrimary }}>{item.title}</span>} description={<span style={{ fontSize: 13, color: colorPalette.textSecondary }}>合作伙伴: <strong>{item.partner_name}</strong> | 评分: <strong style={{ color: item.score < 60 ? colorPalette.error : colorPalette.warning }}>{item.score}分</strong></span>} />
              </List.Item>
            )} />
          </TabPane>
          <TabPane tab={<span style={{ fontWeight: 500 }}>从稽核触发</span>} key="audit">
            <List dataSource={audits} renderItem={item => (
              <List.Item style={{ padding: '12px 0' }} actions={[<Button type="primary" size="small" icon={<PlusCircleOutlined />} onClick={() => handleTriggerFromSource('audit', item)} style={{ borderRadius: 8, background: colorPalette.primary, borderColor: colorPalette.primary }}>创建需求</Button>]}>
                <List.Item.Meta title={<span style={{ fontSize: 14, fontWeight: 500, color: colorPalette.textPrimary }}>{item.title}</span>} description={<span style={{ fontSize: 13, color: colorPalette.textSecondary }}>合作伙伴: <strong>{item.partner_name}</strong> | 稽核发现: <strong style={{ color: colorPalette.error }}>{item.finding}</strong></span>} />
              </List.Item>
            )} />
          </TabPane>
        </Tabs>
      </Modal>

      <Drawer title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 18, background: detailType === 'need' ? colorPalette.primary : colorPalette.purple, borderRadius: 2 }} />
          <span style={{ fontWeight: 600, color: colorPalette.textPrimary }}>{detailType === 'need' ? '需求详情' : '计划详情'}</span>
        </div>
      } open={detailVisible} onClose={() => setDetailVisible(false)} width={720} styles={{ header: { borderBottom: `1px solid ${colorPalette.borderLight}`, padding: '20px 24px' }, body: { padding: 0 }, footer: { borderTop: `1px solid ${colorPalette.borderLight}`, padding: '12px 24px' } }}
        extra={
          <Space>
            {detailType === 'need' && (selectedItem as ImprovementNeed)?.status === 'OPEN' && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setDetailVisible(false); handleCreatePlan(selectedItem as ImprovementNeed) }} style={{ borderRadius: 8, background: colorPalette.purple, borderColor: colorPalette.purple }}>创建计划</Button>}
            {detailType === 'plan' && (selectedItem as ImprovementPlan)?.status === 'APPROVED' && <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStatusChange(selectedItem as ImprovementPlan, 'IN_PROGRESS')} style={{ borderRadius: 8, background: colorPalette.success, borderColor: colorPalette.success }}>开始执行</Button>}
          </Space>
        }
      >
        {selectedItem && (
          <Tabs activeKey={detailTab} onChange={setDetailTab} tabBarStyle={{ borderBottom: `1px solid ${colorPalette.borderLight}`, marginBottom: 0 }}>
            <TabPane tab={<span style={{ fontWeight: 500 }}>基本信息</span>} key="info">
              {detailType === 'need' ? (
                <>
                  <Descriptions column={2} bordered size="small" style={{ margin: 16 }}>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>需求标题</span>} span={2}><strong style={{ fontSize: 14, color: colorPalette.textPrimary }}>{(selectedItem as ImprovementNeed).title}</strong></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>合作伙伴</span>}>{(selectedItem as ImprovementNeed).partner_name}</Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>来源</span>}><Tag color={sourceMap[(selectedItem as ImprovementNeed).source]?.color}>{sourceMap[(selectedItem as ImprovementNeed).source]?.text}</Tag></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>改进目标</span>} span={2}><span style={{ color: colorPalette.textPrimary }}>{(selectedItem as ImprovementNeed).target}</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>需求描述</span>} span={2}><span style={{ color: colorPalette.textSecondary }}>{(selectedItem as ImprovementNeed).description || '-'}</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>截止日期</span>}><span style={{ color: (selectedItem as ImprovementNeed).deadline && dayjs((selectedItem as ImprovementNeed).deadline).isBefore(dayjs()) ? colorPalette.error : colorPalette.textPrimary }}>{(selectedItem as ImprovementNeed).deadline ? dayjs((selectedItem as ImprovementNeed).deadline).format('YYYY-MM-DD') : '-'}</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>状态</span>}><span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: needStatusMap[(selectedItem as ImprovementNeed).status]?.bg, color: needStatusMap[(selectedItem as ImprovementNeed).status]?.color }}>{needStatusMap[(selectedItem as ImprovementNeed).status]?.text}</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>创建时间</span>}><span style={{ color: colorPalette.textMuted }}>{dayjs((selectedItem as ImprovementNeed).created_at).format('YYYY-MM-DD HH:mm')}</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>更新时间</span>}><span style={{ color: colorPalette.textMuted }}>{(selectedItem as ImprovementNeed).updated_at ? dayjs((selectedItem as ImprovementNeed).updated_at).format('YYYY-MM-DD HH:mm') : '-'}</span></Descriptions.Item>
                    {(selectedItem as ImprovementNeed).source_name && <Descriptions.Item label={<span style={{ fontWeight: 500 }}>来源详情</span>} span={2}><span style={{ color: colorPalette.textSecondary }}>{(selectedItem as ImprovementNeed).source_name}</span></Descriptions.Item>}
                  </Descriptions>
                  {(selectedItem as ImprovementNeed).source !== 'manual' && (
                    <div style={{ padding: '0 16px 16px' }}>
                      <div style={{ background: colorPalette.bg, borderRadius: 8, padding: '12px 16px', border: `1px solid ${colorPalette.border}` }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: colorPalette.textPrimary, marginBottom: 8 }}>关联来源</div>
                        <Button type="link" icon={<LinkOutlined />} style={{ padding: 0, color: colorPalette.primary }}>查看{(selectedItem as ImprovementNeed).source === 'audit' ? '稽核' : '评估'}详情 →</Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Descriptions column={2} bordered size="small" style={{ margin: 16 }}>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>计划标题</span>} span={2}><strong style={{ fontSize: 14, color: colorPalette.textPrimary }}>{(selectedItem as ImprovementPlan).title}</strong></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>所属需求</span>}><span style={{ color: colorPalette.textSecondary }}>{(selectedItem as ImprovementPlan).need_title || '-'}</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>合作伙伴</span>}>{(selectedItem as ImprovementPlan).partner_name}</Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>责任人</span>}><span style={{ color: (selectedItem as ImprovementPlan).developer_name ? colorPalette.textPrimary : colorPalette.textMuted }}>{(selectedItem as ImprovementPlan).developer_name || '-'}</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>状态</span>}><span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: planStatusMap[(selectedItem as ImprovementPlan).status]?.bg, color: planStatusMap[(selectedItem as ImprovementPlan).status]?.color }}>{planStatusMap[(selectedItem as ImprovementPlan).status]?.text}</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>进度</span>} span={2}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Progress percent={(selectedItem as ImprovementPlan).progress} strokeColor={(selectedItem as ImprovementPlan).progress === 100 ? colorPalette.success : colorPalette.primary} style={{ marginBottom: 0, flex: 1 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: (selectedItem as ImprovementPlan).progress === 100 ? colorPalette.success : colorPalette.primary, minWidth: 40 }}>{(selectedItem as ImprovementPlan).progress}%</span>
                      </div>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>开始日期</span>}><span style={{ color: colorPalette.textSecondary }}>{(selectedItem as ImprovementPlan).start_date ? dayjs((selectedItem as ImprovementPlan).start_date).format('YYYY-MM-DD') : '-'}</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>截止日期</span>}><span style={{ color: (selectedItem as ImprovementPlan).end_date && dayjs((selectedItem as ImprovementPlan).end_date).isBefore(dayjs()) ? colorPalette.error : colorPalette.textSecondary }}>{(selectedItem as ImprovementPlan).end_date ? dayjs((selectedItem as ImprovementPlan).end_date).format('YYYY-MM-DD') : '-'}</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>改进措施</span>} span={2}><pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, color: colorPalette.textPrimary, lineHeight: 1.7 }}>{(selectedItem as ImprovementPlan).measures}</pre></Descriptions.Item>
                    {(selectedItem as ImprovementPlan).approval_comment && <Descriptions.Item label={<span style={{ fontWeight: 500 }}>审批意见</span>} span={2}><span style={{ color: colorPalette.textSecondary }}>{(selectedItem as ImprovementPlan).approval_comment}</span></Descriptions.Item>}
                  </Descriptions>
                  {(selectedItem as ImprovementPlan).status === 'IN_PROGRESS' && (
                    <div style={{ padding: '0 16px 16px' }}>
                      <div style={{ background: colorPalette.bg, borderRadius: 8, padding: '12px 16px', border: `1px solid ${colorPalette.border}` }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: colorPalette.textPrimary, marginBottom: 10 }}>快捷操作</div>
                        <Space wrap>
                          <Button type="primary" icon={<EditOutlined />} onClick={() => setProgressModalVisible(true)} style={{ borderRadius: 8, background: colorPalette.primary, borderColor: colorPalette.primary }}>更新进度</Button>
                          <Button icon={<ReloadOutlined />} onClick={() => setAdjustModalVisible(true)} style={{ borderRadius: 8, color: colorPalette.warning, borderColor: colorPalette.warning }}>调整计划</Button>
                          {(selectedItem as ImprovementPlan).progress >= 80 && <Popconfirm title="确认完成" description="确定此计划已完成？" onConfirm={() => handleStatusChange(selectedItem as ImprovementPlan, 'COMPLETED')} okText="确认" cancelText="取消"><Button icon={<CheckCircleOutlined />} style={{ borderRadius: 8, color: colorPalette.success, borderColor: colorPalette.success }}>标记完成</Button></Popconfirm>}
                        </Space>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabPane>
            {detailType === 'plan' && (
              <TabPane tab={<span style={{ fontWeight: 500 }}>进度记录</span>} key="progress">
                <div style={{ padding: 16 }}>
                  <Steps current={Math.floor(((selectedItem as ImprovementPlan).progress || 0) / 25)} size="small" style={{ marginBottom: 24 }} items={[{ title: <span style={{ fontSize: 12 }}>计划创建</span> }, { title: <span style={{ fontSize: 12 }}>审批通过</span> }, { title: <span style={{ fontSize: 12 }}>执行中</span> }, { title: <span style={{ fontSize: 12 }}>完成</span> }]} />
                  {progressRecords.length > 0 ? (
                    <Timeline mode="left" items={progressRecords.map(record => ({
                      color: '#1890ff',
                      label: <span style={{ fontSize: 11, color: colorPalette.textMuted, fontFamily: 'monospace' }}>{dayjs(record.created_at).format('MM-DD HH:mm')}</span>,
                      children: (
                        <div style={{ background: colorPalette.bg, borderRadius: 8, padding: '10px 14px', border: `1px solid ${colorPalette.border}` }}>
                          <p style={{ margin: 0, fontSize: 13, color: colorPalette.textPrimary, lineHeight: 1.6 }}>{record.content}</p>
                          <Space size="small" style={{ marginTop: 6 }}>
                            <Tag color="green" style={{ margin: 0 }}>{record.progress}%</Tag>
                            {record.operator_name && <span style={{ color: colorPalette.textMuted, fontSize: 12 }}>{record.operator_name}</span>}
                          </Space>
                        </div>
                      ),
                    }))} />
                  ) : (
                    <Empty description="暂无进度记录" style={{ padding: 40 }} />
                  )}
                </div>
              </TabPane>
            )}
            {detailType === 'plan' && (
              <TabPane tab={<span style={{ fontWeight: 500 }}>交付物</span>} key="deliverables">
                <Empty description="暂无交付物记录" style={{ padding: 40 }} />
              </TabPane>
            )}
          </Tabs>
        )}
      </Drawer>
    </div>
  )
}

export default PositiveImprovement
