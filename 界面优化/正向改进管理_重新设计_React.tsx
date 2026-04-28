import React, { useState, useEffect, useCallback } from 'react'
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
  Badge,
  Row,
  Col,
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
  SearchOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import apiClient from '@/api/axios'
import dayjs from 'dayjs'

const { TabPane } = Tabs
const { TextArea } = Input

// ============ Types ============
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

// ============ Constants ============
const COLORS = {
  primary: '#1890ff',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  purple: '#8b5cf6',
  bg: '#f5f7fa',
  white: '#ffffff',
  border: '#e8e8e8',
  text: '#1f1f1f',
  textSecondary: '#666666',
  textMuted: '#999999',
}

const needStatusMap: Record<string, { color: string; text: string }> = {
  OPEN: { color: 'warning', text: '待处理' },
  IN_PROGRESS: { color: 'processing', text: '进行中' },
  RESOLVED: { color: 'success', text: '已解决' },
  CLOSED: { color: 'default', text: '已关闭' },
}

const planStatusMap: Record<string, { color: string; text: string }> = {
  DRAFT: { color: 'default', text: '草稿' },
  PENDING_AUDIT: { color: 'warning', text: '待审批' },
  APPROVED: { color: 'processing', text: '已批准' },
  IN_PROGRESS: { color: 'processing', text: '进行中' },
  COMPLETED: { color: 'success', text: '已完成' },
  REJECTED: { color: 'error', text: '已拒绝' },
}

const sourceMap: Record<string, { color: string; text: string }> = {
  audit: { color: 'blue', text: '稽核' },
  assessment: { color: 'purple', text: '评估' },
  manual: { color: 'default', text: '手动' },
}

// ============ Component ============
const PositiveImprovement: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('needs')

  // State - Lists
  const [needs, setNeeds] = useState<ImprovementNeed[]>([])
  const [plans, setPlans] = useState<ImprovementPlan[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState<TablePaginationConfig>({ current: 1, pageSize: 10, total: 0 })

  // State - Filters
  const [filters, setFilters] = useState({
    status: '' as string | undefined,
    source: '' as string | undefined,
    partner_id: undefined as number | undefined,
  })

  // State - Modals
  const [needModalVisible, setNeedModalVisible] = useState(false)
  const [planModalVisible, setPlanModalVisible] = useState(false)
  const [progressModalVisible, setProgressModalVisible] = useState(false)
  const [adjustModalVisible, setAdjustModalVisible] = useState(false)
  const [triggerModalVisible, setTriggerModalVisible] = useState(false)
  const [editingNeed, setEditingNeed] = useState<ImprovementNeed | null>(null)

  // State - Detail
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailType, setDetailType] = useState<'need' | 'plan'>('need')
  const [selectedItem, setSelectedItem] = useState<ImprovementNeed | ImprovementPlan | null>(null)
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([])
  const [detailTab, setDetailTab] = useState('info')

  // State - Forms
  const [needForm] = Form.useForm()
  const [planForm] = Form.useForm()
  const [progressForm] = Form.useForm()
  const [adjustForm] = Form.useForm()

  // State - Partners (mock data)
  const [partners] = useState<Partner[]>([
    { id: 1, name: '合作伙伴A' },
    { id: 2, name: '合作伙伴B' },
    { id: 3, name: '合作伙伴C' },
    { id: 4, name: '合作伙伴D' },
    { id: 5, name: '合作伙伴E' },
  ])

  // Mock developers
  const [developers] = useState([
    { id: 1, name: '张三' },
    { id: 2, name: '李四' },
    { id: 3, name: '王五' },
  ])

  // Mock assessments for trigger
  const [assessments] = useState([
    { id: 1, title: '厂商能力评估 - 合作伙伴A', partner_name: '合作伙伴A', score: 65 },
    { id: 2, title: '厂商能力评估 - 合作伙伴B', partner_name: '合作伙伴B', score: 72 },
    { id: 3, title: '厂商能力评估 - 合作伙伴C', partner_name: '合作伙伴C', score: 58 },
  ])

  // Mock audits for trigger
  const [audits] = useState([
    { id: 1, title: '安全合规稽核 - 合作伙伴A', partner_name: '合作伙伴A', finding: '密码策略不完善' },
    { id: 2, title: '代码质量稽核 - 合作伙伴B', partner_name: '合作伙伴B', finding: '单元测试覆盖率不足' },
  ])

  // ============ Effects ============
  useEffect(() => {
    if (activeTab === 'needs') {
      fetchNeeds()
    } else if (activeTab === 'plans') {
      fetchPlans()
    } else if (activeTab === 'history') {
      fetchTimelineEvents()
    }
  }, [activeTab])

  // ============ Data Fetching ============
  const fetchNeeds = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        page: pagination.current || 1,
        page_size: pagination.pageSize || 10,
      }
      if (filters.status) params.status = filters.status
      if (filters.source) params.source = filters.source
      if (filters.partner_id) params.partner_id = filters.partner_id

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
    } catch (error) {
      setNeeds([
        {
          id: 1,
          partner_id: 1,
          partner_name: '合作伙伴A',
          source: 'assessment',
          source_id: 1,
          source_name: '厂商能力评估 - 合作伙伴A',
          title: '提升代码规范水平',
          description: '评估发现代码规范评分为65分，需要改进代码注释和命名规范',
          target: '代码规范评分达到85分以上',
          deadline: dayjs().add(30, 'day').format('YYYY-MM-DD'),
          status: 'OPEN',
          created_at: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm'),
        },
        {
          id: 2,
          partner_id: 2,
          partner_name: '合作伙伴B',
          source: 'audit',
          source_id: 1,
          source_name: '安全合规稽核 - 合作伙伴B',
          title: '加强安全测试',
          description: '稽核发现安全测试覆盖不足',
          target: '安全测试覆盖率达到90%',
          deadline: dayjs().add(60, 'day').format('YYYY-MM-DD'),
          status: 'IN_PROGRESS',
          created_at: dayjs().subtract(10, 'day').format('YYYY-MM-DD HH:mm'),
        },
        {
          id: 3,
          partner_id: 3,
          partner_name: '合作伙伴C',
          source: 'manual',
          source_id: null,
          title: '优化响应速度',
          description: '响应时间超出SLA要求',
          target: '平均响应时间控制在2小时内',
          deadline: dayjs().add(15, 'day').format('YYYY-MM-DD'),
          status: 'RESOLVED',
          created_at: dayjs().subtract(20, 'day').format('YYYY-MM-DD HH:mm'),
        },
      ])
      setPagination(prev => ({ ...prev, total: 3 }))
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.current, pagination.pageSize])

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
    } catch (error) {
      setPlans([
        {
          id: 1,
          need_id: 1,
          need_title: '提升代码规范水平',
          partner_id: 1,
          partner_name: '合作伙伴A',
          developer_id: 1,
          developer_name: '张三',
          title: '代码规范整改计划',
          measures: '1. 引入ESLint代码检测工具\n2. 制定代码注释规范\n3. 组织代码规范培训\n4. 每周代码评审',
          start_date: dayjs().format('YYYY-MM-DD'),
          end_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
          status: 'IN_PROGRESS',
          progress: 45,
          created_at: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm'),
        },
        {
          id: 2,
          need_id: 2,
          need_title: '加强安全测试',
          partner_id: 2,
          partner_name: '合作伙伴B',
          developer_id: 2,
          developer_name: '李四',
          title: '安全测试提升计划',
          measures: '1. 部署自动化安全扫描\n2. 建立安全测试用例库\n3. 每周安全测试报告',
          start_date: dayjs().format('YYYY-MM-DD'),
          end_date: dayjs().add(60, 'day').format('YYYY-MM-DD'),
          status: 'APPROVED',
          progress: 0,
          created_at: dayjs().subtract(10, 'day').format('YYYY-MM-DD HH:mm'),
        },
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
    } catch (error) {
      setTimelineEvents([
        {
          id: 1,
          event_type: 'need_resolved',
          description: '合作伙伴C - 优化响应速度需求已解决',
          operator_name: '系统管理员',
          created_at: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm'),
        },
        {
          id: 2,
          event_type: 'plan_completed',
          description: '合作伙伴C - 响应速度优化改进计划完成',
          operator_name: '李四',
          created_at: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm'),
        },
        {
          id: 3,
          event_type: 'progress_updated',
          description: '合作伙伴A - 代码规范整改计划进度更新至45%',
          operator_name: '张三',
          created_at: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm'),
        },
        {
          id: 4,
          event_type: 'plan_approved',
          description: '合作伙伴B - 安全测试提升计划审批通过',
          operator_name: '管理员',
          created_at: dayjs().subtract(8, 'day').format('YYYY-MM-DD HH:mm'),
        },
        {
          id: 5,
          event_type: 'plan_created',
          description: '合作伙伴A - 发起代码规范整改计划',
          operator_name: '张三',
          created_at: dayjs().subtract(10, 'day').format('YYYY-MM-DD HH:mm'),
        },
        {
          id: 6,
          event_type: 'need_created',
          description: '合作伙伴A - 创建改进需求「提升代码规范水平」',
          operator_name: '系统',
          created_at: dayjs().subtract(15, 'day').format('YYYY-MM-DD HH:mm'),
        },
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
    } catch (error) {
      setProgressRecords([
        {
          id: 1,
          plan_id: planId,
          content: '引入ESLint并配置规则集，团队培训已完成',
          progress: 25,
          created_at: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm'),
          operator_name: '张三',
        },
        {
          id: 2,
          plan_id: planId,
          content: '代码注释规范制定完成，开始第一轮代码评审',
          progress: 45,
          created_at: dayjs().format('YYYY-MM-DD HH:mm'),
          operator_name: '张三',
        },
      ])
    }
  }, [])

  // ============ Handlers ============
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }))
    fetchNeeds()
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleCloseNeed = async (need: ImprovementNeed) => {
    try {
      await apiClient.put(`/improvements/needs/${need.id}`, { status: 'CLOSED' })
      message.success('需求已关闭')
      fetchNeeds()
    } catch (error) {
      message.error('操作失败')
    }
  }

  // ============ Columns ============
  const needColumns: ColumnsType<ImprovementNeed> = [
    {
      title: '需求标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <span style={{ color: COLORS.text, fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: '合作伙伴',
      dataIndex: 'partner_name',
      key: 'partner_name',
      width: 120,
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 90,
      render: (source: string) => {
        const s = sourceMap[source]
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '改进目标',
      dataIndex: 'target',
      key: 'target',
      width: 180,
      ellipsis: true,
      render: (text: string) => (
        <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>{text}</span>
      ),
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 110,
      render: (date: string) => (
        <span style={{ color: date && dayjs(date).isBefore(dayjs()) ? COLORS.error : COLORS.textSecondary, fontSize: 13 }}>
          {date ? dayjs(date).format('YYYY-MM-DD') : '-'}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => {
        const s = needStatusMap[status]
        return <Badge status={s.color as 'success' | 'processing' | 'error' | 'default' | 'warning'} text={s.text} />
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => (
        <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleViewDetail(record, 'need')}
            title="查看详情"
            style={{ color: COLORS.primary }}
          >
            详情
          </Button>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditNeed(record)}
            title="编辑"
            style={{ color: COLORS.textSecondary }}
          >
            编辑
          </Button>
          {record.status === 'OPEN' && (
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleCreatePlan(record)}
              title="创建计划"
              style={{ color: COLORS.purple }}
            >
              创建计划
            </Button>
          )}
          {record.status === 'IN_PROGRESS' && (
            <Popconfirm
              title="确认解决"
              description="确定将此需求标记为已解决？"
              onConfirm={() => handleResolveNeed(record)}
              okText="确认"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                title="标记解决"
                style={{ color: COLORS.success }}
              />
            </Popconfirm>
          )}
          {record.status === 'RESOLVED' && (
            <Popconfirm
              title="确认关闭"
              description="确定关闭此需求？"
              onConfirm={() => handleCloseNeed(record)}
              okText="确认"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                icon={<CloseCircleOutlined />}
                title="关闭需求"
                style={{ color: COLORS.textMuted }}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const planColumns: ColumnsType<ImprovementPlan> = [
    {
      title: '计划标题',
      dataIndex: 'title',
      key: 'title',
      width: 180,
      ellipsis: true,
      render: (text: string) => (
        <span style={{ color: COLORS.text, fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: '所属需求',
      dataIndex: 'need_title',
      key: 'need_title',
      width: 150,
      ellipsis: true,
      render: (text: string) => (
        <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>{text || '-'}</span>
      ),
    },
    {
      title: '合作伙伴',
      dataIndex: 'partner_name',
      key: 'partner_name',
      width: 120,
    },
    {
      title: '责任人',
      dataIndex: 'developer_name',
      key: 'developer_name',
      width: 80,
      render: (name: string) => (
        <span style={{ color: name ? COLORS.text : COLORS.textMuted, fontSize: 13 }}>{name || '-'}</span>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 130,
      render: (progress: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={progress}
            size="small"
            strokeColor={progress === 100 ? COLORS.success : COLORS.primary}
            style={{ marginBottom: 0, flex: 1 }}
          />
          <span style={{ color: COLORS.textSecondary, fontSize: 12, minWidth: 32 }}>{progress}%</span>
        </div>
      ),
    },
    {
      title: '截止日期',
      dataIndex: 'end_date',
      key: 'end_date',
      width: 110,
      render: (date: string) => (
        <span style={{ color: date && dayjs(date).isBefore(dayjs()) ? COLORS.error : COLORS.textSecondary, fontSize: 13 }}>
          {date ? dayjs(date).format('YYYY-MM-DD') : '-'}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => {
        const s = planStatusMap[status]
        return <Badge status={s.color as 'success' | 'processing' | 'error' | 'default' | 'warning'} text={s.text} />
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            onClick={() => handleViewDetail(record, 'plan')}
            title="查看详情"
            style={{ color: COLORS.primary }}
          >
            详情
          </Button>
          {record.status === 'APPROVED' && (
            <Button
              type="text"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStatusChange(record, 'IN_PROGRESS')}
              title="开始执行"
              style={{ color: COLORS.success }}
            >
              开始执行
            </Button>
          )}
          {record.status === 'IN_PROGRESS' && (
            <>
              <Button
                type="text"
                size="small"
                onClick={() => {
                  setSelectedItem(record)
                  setProgressModalVisible(true)
                }}
                title="更新进度"
                style={{ color: COLORS.primary }}
              >
                更新进度
              </Button>
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => {
                  setSelectedItem(record)
                  setAdjustModalVisible(true)
                }}
                title="调整计划"
                style={{ color: COLORS.warning }}
              >
                调整
              </Button>
            </>
          )}
          {record.status === 'IN_PROGRESS' && record.progress >= 100 && (
            <Popconfirm
              title="确认完成"
              description="确定此计划已完成？"
              onConfirm={() => handleStatusChange(record, 'COMPLETED')}
              okText="确认"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                title="完成"
                style={{ color: COLORS.success }}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  // Statistics
  const stats = {
    needTotal: needs.length,
    needOpen: needs.filter(n => n.status === 'OPEN').length,
    planActive: plans.filter(p => p.status === 'IN_PROGRESS').length,
    planCompleted: plans.filter(p => p.status === 'COMPLETED').length,
  }

  // Timeline color mapping
  const timelineColorMap: Record<string, string> = {
    need_created: 'blue',
    plan_created: 'blue',
    plan_approved: 'green',
    plan_rejected: 'red',
    progress_updated: 'cyan',
    plan_completed: 'green',
    need_resolved: 'green',
  }

  // Table custom styles
  const tableStyle: React.CSSProperties = {
    borderRadius: 8,
    overflow: 'hidden',
    border: `1px solid ${COLORS.border}`,
  }

  const tableHeadStyle: React.CSSProperties = {
    backgroundColor: '#fafbfc',
    fontWeight: 600,
    fontSize: 13,
    color: COLORS.text,
  }

  const tableBodyCellStyle: React.CSSProperties = {
    fontSize: 13,
    color: COLORS.text,
  }

  // ============ Render ============
  return (
    <div style={{ backgroundColor: COLORS.bg, minHeight: '100vh', padding: '24px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 24, backgroundColor: COLORS.primary, borderRadius: 2 }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0, lineHeight: 1.3 }}>
            正向改进管理
          </h1>
        </div>
        <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '4px 0 0 14px' }}>
          改进需求发起、计划跟踪、验收闭环
        </p>
      </div>

      {/* Stats Row - Modern border-top style */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 20,
      }}>
        {/* Stat 1 - Need Total */}
        <div style={{
          backgroundColor: COLORS.white,
          borderRadius: 8,
          padding: '16px 20px',
          borderTop: `3px solid ${COLORS.primary}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                需求总数
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.primary, lineHeight: 1 }}>
                {stats.needTotal}
              </div>
            </div>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: `${COLORS.primary}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileTextOutlined style={{ fontSize: 18, color: COLORS.primary }} />
            </div>
          </div>
        </div>

        {/* Stat 2 - Need Open */}
        <div style={{
          backgroundColor: COLORS.white,
          borderRadius: 8,
          padding: '16px 20px',
          borderTop: `3px solid ${COLORS.warning}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                待处理需求
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.warning, lineHeight: 1 }}>
                {stats.needOpen}
              </div>
            </div>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: `${COLORS.warning}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ExclamationCircleOutlined style={{ fontSize: 18, color: COLORS.warning }} />
            </div>
          </div>
        </div>

        {/* Stat 3 - Plan Active */}
        <div style={{
          backgroundColor: COLORS.white,
          borderRadius: 8,
          padding: '16px 20px',
          borderTop: `3px solid ${COLORS.purple}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                进行中计划
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.purple, lineHeight: 1 }}>
                {stats.planActive}
              </div>
            </div>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: `${COLORS.purple}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <PlayCircleOutlined style={{ fontSize: 18, color: COLORS.purple }} />
            </div>
          </div>
        </div>

        {/* Stat 4 - Plan Completed */}
        <div style={{
          backgroundColor: COLORS.white,
          borderRadius: 8,
          padding: '16px 20px',
          borderTop: `3px solid ${COLORS.success}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                已完成计划
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.success, lineHeight: 1 }}>
                {stats.planCompleted}
              </div>
            </div>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: `${COLORS.success}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircleOutlined style={{ fontSize: 18, color: COLORS.success }} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Container */}
      <div style={{
        backgroundColor: COLORS.white,
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ padding: '0 20px' }}
          tabBarStyle={{
            marginBottom: 0,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
          renderTabBar={(props, DefaultTabBar) => (
            <DefaultTabBar {...props} style={{ padding: '0 4px' }} />
          )}
        >
          {/* 改进需求 Tab */}
          <TabPane
            tab={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                <FileTextOutlined />
                改进需求
                {stats.needOpen > 0 && (
                  <span style={{
                    backgroundColor: COLORS.warning,
                    color: COLORS.white,
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '1px 7px',
                    minWidth: 20,
                    textAlign: 'center',
                  }}>
                    {stats.needOpen}
                  </span>
                )}
              </span>
            }
            key="needs"
          >
            <div style={{ padding: 20 }}>
              {/* Filter Bar - Clean inline styling */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
                flexWrap: 'wrap',
                padding: '14px 16px',
                backgroundColor: COLORS.bg,
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: 500 }}>筛选:</span>
                </div>

                <Select
                  placeholder="选择状态"
                  style={{ width: 130, fontSize: 13 }}
                  allowClear
                  value={filters.status}
                  onChange={v => setFilters({ ...filters, status: v || undefined })}
                  size="middle"
                >
                  <Select.Option value="OPEN">待处理</Select.Option>
                  <Select.Option value="IN_PROGRESS">进行中</Select.Option>
                  <Select.Option value="RESOLVED">已解决</Select.Option>
                  <Select.Option value="CLOSED">已关闭</Select.Option>
                </Select>

                <Select
                  placeholder="选择来源"
                  style={{ width: 130, fontSize: 13 }}
                  allowClear
                  value={filters.source}
                  onChange={v => setFilters({ ...filters, source: v || undefined })}
                  size="middle"
                >
                  <Select.Option value="audit">稽核</Select.Option>
                  <Select.Option value="assessment">评估</Select.Option>
                  <Select.Option value="manual">手动</Select.Option>
                </Select>

                <Select
                  placeholder="选择合作伙伴"
                  style={{ width: 180, fontSize: 13 }}
                  allowClear
                  value={filters.partner_id}
                  onChange={v => setFilters({ ...filters, partner_id: v || undefined })}
                  size="middle"
                >
                  {partners.map(p => (
                    <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                  ))}
                </Select>

                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                  size="middle"
                  style={{ fontWeight: 500 }}
                >
                  搜索
                </Button>

                <div style={{ flex: 1 }} />

                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateNeed}
                  size="middle"
                  style={{ fontWeight: 500 }}
                >
                  新建需求
                </Button>

                <Button
                  icon={<LinkOutlined />}
                  onClick={() => setTriggerModalVisible(true)}
                  size="middle"
                  style={{ color: COLORS.purple, borderColor: COLORS.purple }}
                >
                  从稽核/评估触发
                </Button>
              </div>

              {/* Table - Clean table-based, no card wrapper */}
              <Table
                columns={needColumns}
                dataSource={needs}
                rowKey="id"
                loading={loading}
                pagination={pagination}
                onChange={handleTableChange}
                scroll={{ x: 1300 }}
                size="middle"
                style={tableStyle}
                rowClassName={() => 'table-row-hover'}
                components={{
                  header: {
                    cell: (props: any) => (
                      <th {...props} style={{ ...props.style, ...tableHeadStyle }} />
                    ),
                  },
                }}
              />
            </div>
          </TabPane>

          {/* 改进计划 Tab */}
          <TabPane
            tab={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                <TeamOutlined />
                改进计划
                {stats.planActive > 0 && (
                  <span style={{
                    backgroundColor: COLORS.purple,
                    color: COLORS.white,
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '1px 7px',
                    minWidth: 20,
                    textAlign: 'center',
                  }}>
                    {stats.planActive}
                  </span>
                )}
              </span>
            }
            key="plans"
          >
            <div style={{ padding: 20 }}>
              <Table
                columns={planColumns}
                dataSource={plans}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1200 }}
                size="middle"
                style={tableStyle}
                rowClassName={() => 'table-row-hover'}
                components={{
                  header: {
                    cell: (props: any) => (
                      <th {...props} style={{ ...props.style, ...tableHeadStyle }} />
                    ),
                  },
                }}
              />
            </div>
          </TabPane>

          {/* 改进历史 Tab */}
          <TabPane
            tab={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                <HistoryOutlined />
                改进历史
              </span>
            }
            key="history"
          >
            <div style={{ padding: 20 }}>
              {timelineEvents.length > 0 ? (
                <div style={{ maxWidth: 800 }}>
                  <Timeline
                    mode="left"
                    items={timelineEvents.map(event => ({
                      color: timelineColorMap[event.event_type] || 'blue',
                      label: (
                        <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: 'monospace' }}>
                          {dayjs(event.created_at).format('MM-DD HH:mm')}
                        </span>
                      ),
                      children: (
                        <div style={{
                          backgroundColor: '#fafbfc',
                          borderRadius: 6,
                          padding: '10px 14px',
                          border: `1px solid ${COLORS.border}`,
                        }}>
                          <p style={{ margin: 0, fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>
                            {event.description}
                          </p>
                          {event.operator_name && (
                            <span style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4, display: 'block' }}>
                              操作人: {event.operator_name}
                            </span>
                          )}
                        </div>
                      ),
                    }))}
                  />
                </div>
              ) : (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Empty description="暂无改进历史记录" />
                </div>
              )}
            </div>
          </TabPane>
        </Tabs>
      </div>

      {/* Create/Edit Need Modal */}
      <Modal
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.text,
          }}>
            <div style={{
              width: 4,
              height: 20,
              backgroundColor: COLORS.primary,
              borderRadius: 2,
            }} />
            {editingNeed ? '编辑改进需求' : '新建改进需求'}
          </div>
        }
        open={needModalVisible}
        onOk={handleNeedSubmit}
        onCancel={() => setNeedModalVisible(false)}
        width={600}
        okText={editingNeed ? '保存' : '创建'}
        cancelText="取消"
        okButtonProps={{ style: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, fontWeight: 500 } }}
        cancelButtonProps={{ style: { fontWeight: 500 } }}
        styles={{
          body: { paddingTop: 16 },
          header: { padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}`, marginRight: 0 },
          content: { padding: 0 },
          footer: { padding: '12px 24px', borderTop: `1px solid ${COLORS.border}` },
        }}
      >
        <Form form={needForm} layout="vertical" requiredMark="optional" style={{ padding: '0 4px' }}>
          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.text }}>需求标题</span>}
            name="title"
            rules={[{ required: true, message: '请输入需求标题' }]}
          >
            <Input placeholder="请输入需求标题" maxLength={100} size="middle" />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.text }}>合作伙伴</span>}
            name="partner_id"
            rules={[{ required: true, message: '请选择合作伙伴' }]}
          >
            <Select placeholder="选择合作伙伴" allowClear size="middle">
              {partners.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.text }}>改进目标</span>}
            name="target"
            rules={[{ required: true, message: '请输入改进目标' }]}
          >
            <TextArea rows={2} placeholder="请输入具体、可衡量的改进目标" />
          </Form.Item>

          <Form.Item label={<span style={{ fontWeight: 500, color: COLORS.text }}>需求描述</span>} name="description">
            <TextArea rows={3} placeholder="请输入详细描述" />
          </Form.Item>

          <Form.Item label={<span style={{ fontWeight: 500, color: COLORS.text }}>截止日期</span>} name="deadline">
            <DatePicker style={{ width: '100%' }} size="middle" />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }} />

          <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>
            如果是从稽核或评估触发的需求，系统将自动关联来源信息
          </div>
        </Form>
      </Modal>

      {/* Create Plan Modal */}
      <Modal
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.text,
          }}>
            <div style={{
              width: 4,
              height: 20,
              backgroundColor: COLORS.purple,
              borderRadius: 2,
            }} />
            创建改进计划
          </div>
        }
        open={planModalVisible}
        onOk={handlePlanSubmit}
        onCancel={() => setPlanModalVisible(false)}
        width={640}
        okText="创建"
        cancelText="取消"
        okButtonProps={{ style: { backgroundColor: COLORS.purple, borderColor: COLORS.purple, fontWeight: 500 } }}
        cancelButtonProps={{ style: { fontWeight: 500 } }}
        styles={{
          body: { paddingTop: 16 },
          header: { padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}`, marginRight: 0 },
          content: { padding: 0 },
          footer: { padding: '12px 24px', borderTop: `1px solid ${COLORS.border}` },
        }}
      >
        {selectedItem && 'partner_name' in selectedItem && (
          <Alert
            message="正在为需求创建改进计划"
            description={`需求: ${selectedItem.title}`}
            type="info"
            showIcon
            style={{ marginBottom: 16, borderRadius: 6 }}
          />
        )}
        <Form form={planForm} layout="vertical" requiredMark="optional" style={{ padding: '0 4px' }}>
          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.text }}>计划标题</span>}
            name="title"
            rules={[{ required: true, message: '请输入计划标题' }]}
          >
            <Input placeholder="请输入计划标题" maxLength={100} size="middle" />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.text }}>改进措施</span>}
            name="measures"
            rules={[{ required: true, message: '请详细描述改进措施' }]}
          >
            <TextArea rows={5} placeholder="请详细描述具体的改进措施和步骤" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={{ fontWeight: 500, color: COLORS.text }}>开始日期</span>} name="start_date">
                <DatePicker style={{ width: '100%' }} size="middle" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={{ fontWeight: 500, color: COLORS.text }}>截止日期</span>} name="end_date">
                <DatePicker style={{ width: '100%' }} size="middle" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={<span style={{ fontWeight: 500, color: COLORS.text }}>责任人</span>} name="developer_id">
            <Select placeholder="选择责任人" allowClear size="middle">
              {developers.map(d => (
                <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Progress Update Modal */}
      <Modal
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.text,
          }}>
            <div style={{
              width: 4,
              height: 20,
              backgroundColor: COLORS.primary,
              borderRadius: 2,
            }} />
            更新进度
          </div>
        }
        open={progressModalVisible}
        onOk={handleProgressUpdate}
        onCancel={() => {
          setProgressModalVisible(false)
          progressForm.resetFields()
        }}
        width={500}
        okText="提交"
        cancelText="取消"
        okButtonProps={{ style: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, fontWeight: 500 } }}
        cancelButtonProps={{ style: { fontWeight: 500 } }}
        styles={{
          body: { paddingTop: 16 },
          header: { padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}`, marginRight: 0 },
          content: { padding: 0 },
          footer: { padding: '12px 24px', borderTop: `1px solid ${COLORS.border}` },
        }}
      >
        <Form form={progressForm} layout="vertical" requiredMark="optional" style={{ padding: '0 4px' }}>
          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.text }}>当前进度</span>}
            name="progress"
            rules={[{ required: true, message: '请输入进度' }]}
          >
            <Input type="number" min={0} max={100} placeholder="0-100" size="middle" suffix={<span style={{ color: COLORS.textMuted }}>%</span>} />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.text }}>进度说明</span>}
            name="content"
            rules={[{ required: true, message: '请输入进度说明' }]}
          >
            <TextArea rows={4} placeholder="请描述本次进度更新完成的工作内容" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Adjustment Modal */}
      <Modal
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.text,
          }}>
            <div style={{
              width: 4,
              height: 20,
              backgroundColor: COLORS.warning,
              borderRadius: 2,
            }} />
            计划调整申请
          </div>
        }
        open={adjustModalVisible}
        onOk={handleAdjustment}
        onCancel={() => {
          setAdjustModalVisible(false)
          adjustForm.resetFields()
        }}
        width={600}
        okText="提交申请"
        cancelText="取消"
        okButtonProps={{ style: { backgroundColor: COLORS.warning, borderColor: COLORS.warning, fontWeight: 500 } }}
        cancelButtonProps={{ style: { fontWeight: 500 } }}
        styles={{
          body: { paddingTop: 16 },
          header: { padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}`, marginRight: 0 },
          content: { padding: 0 },
          footer: { padding: '12px 24px', borderTop: `1px solid ${COLORS.border}` },
        }}
      >
        <Alert
          message="计划调整需要审批"
          description="调整后的计划将进入待审批状态，审批通过后生效"
          type="warning"
          showIcon
          style={{ marginBottom: 16, borderRadius: 6 }}
        />
        <Form form={adjustForm} layout="vertical" requiredMark="optional" style={{ padding: '0 4px' }}>
          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.text }}>调整后的改进措施</span>}
            name="measures"
            rules={[{ required: true, message: '请输入调整后的措施' }]}
          >
            <TextArea rows={4} placeholder="请详细描述调整后的改进措施" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={{ fontWeight: 500, color: COLORS.text }}>新的截止日期</span>} name="end_date">
                <DatePicker style={{ width: '100%' }} size="middle" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.text }}>调整原因</span>}
            name="reason"
            rules={[{ required: true, message: '请输入调整原因' }]}
          >
            <TextArea rows={2} placeholder="请说明计划调整的原因" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Trigger from Audit/Assessment Modal */}
      <Modal
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.text,
          }}>
            <div style={{
              width: 4,
              height: 20,
              backgroundColor: COLORS.purple,
              borderRadius: 2,
            }} />
            从稽核/评估触发
          </div>
        }
        open={triggerModalVisible}
        onCancel={() => setTriggerModalVisible(false)}
        footer={null}
        width={700}
        styles={{
          body: { padding: '16px 4px 4px' },
          header: { padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}`, marginRight: 0 },
          content: { padding: 0 },
        }}
      >
        <Tabs
          defaultActiveKey="assessment"
          style={{ padding: '0 20px' }}
          tabBarStyle={{ marginBottom: 0 }}
        >
          <TabPane tab={<span style={{ fontWeight: 500 }}>从评估触发</span>} key="assessment">
            <List
              dataSource={assessments}
              renderItem={item => (
                <List.Item
                  style={{ padding: '12px 0' }}
                  actions={[
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusCircleOutlined />}
                      onClick={() => handleTriggerFromSource('assessment', item)}
                      style={{ backgroundColor: COLORS.primary, borderColor: COLORS.primary, fontWeight: 500 }}
                    >
                      创建需求
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={<span style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>{item.title}</span>}
                    description={
                      <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                        合作伙伴: <strong>{item.partner_name}</strong> | 评分: <strong style={{ color: item.score < 60 ? COLORS.error : COLORS.warning }}>{item.score}分</strong>
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </TabPane>
          <TabPane tab={<span style={{ fontWeight: 500 }}>从稽核触发</span>} key="audit">
            <List
              dataSource={audits}
              renderItem={item => (
                <List.Item
                  style={{ padding: '12px 0' }}
                  actions={[
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusCircleOutlined />}
                      onClick={() => handleTriggerFromSource('audit', item)}
                      style={{ backgroundColor: COLORS.primary, borderColor: COLORS.primary, fontWeight: 500 }}
                    >
                      创建需求
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={<span style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>{item.title}</span>}
                    description={
                      <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                        合作伙伴: <strong>{item.partner_name}</strong> | 稽核发现: <strong style={{ color: COLORS.error }}>{item.finding}</strong>
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </TabPane>
        </Tabs>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              width: 4,
              height: 20,
              backgroundColor: detailType === 'need' ? COLORS.primary : COLORS.purple,
              borderRadius: 2,
            }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.text }}>
              {detailType === 'need' ? '需求详情' : '计划详情'}
            </span>
          </div>
        }
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={720}
        styles={{
          header: { padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}` },
          body: { padding: 0 },
          footer: { padding: '12px 24px', borderTop: `1px solid ${COLORS.border}` },
        }}
        extra={
          selectedItem && (
            <Space>
              {detailType === 'need' && (selectedItem as ImprovementNeed).status === 'OPEN' && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setDetailVisible(false)
                    handleCreatePlan(selectedItem as ImprovementNeed)
                  }}
                  style={{ backgroundColor: COLORS.purple, borderColor: COLORS.purple, fontWeight: 500 }}
                >
                  创建计划
                </Button>
              )}
              {detailType === 'plan' && (selectedItem as ImprovementPlan).status === 'APPROVED' && (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleStatusChange(selectedItem as ImprovementPlan, 'IN_PROGRESS')}
                  style={{ backgroundColor: COLORS.success, borderColor: COLORS.success, fontWeight: 500 }}
                >
                  开始执行
                </Button>
              )}
            </Space>
          )
        }
      >
        {selectedItem && (
          <Tabs
            activeKey={detailTab}
            onChange={setDetailTab}
            style={{ padding: '0 20px' }}
            tabBarStyle={{ borderBottom: `1px solid ${COLORS.border}`, marginBottom: 0 }}
          >
            {/* 基本信息 Tab */}
            <TabPane tab={<span style={{ fontWeight: 500 }}>基本信息</span>} key="info">
              {detailType === 'need' ? (
                <>
                  <Descriptions column={2} bordered size="small" style={{ margin: 16 }}>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>需求标题</span>} span={2}>
                      <strong style={{ fontSize: 14, color: COLORS.text }}>{(selectedItem as ImprovementNeed).title}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>合作伙伴</span>}>
                      {(selectedItem as ImprovementNeed).partner_name}
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>来源</span>}>
                      <Tag color={sourceMap[(selectedItem as ImprovementNeed).source]?.color}>
                        {sourceMap[(selectedItem as ImprovementNeed).source]?.text}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>改进目标</span>} span={2}>
                      <span style={{ color: COLORS.text }}>{(selectedItem as ImprovementNeed).target}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>需求描述</span>} span={2}>
                      <span style={{ color: COLORS.textSecondary }}>{(selectedItem as ImprovementNeed).description || '-'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>截止日期</span>}>
                      <span style={{ color: (selectedItem as ImprovementNeed).deadline && dayjs((selectedItem as ImprovementNeed).deadline).isBefore(dayjs()) ? COLORS.error : COLORS.text }}>
                        {(selectedItem as ImprovementNeed).deadline
                          ? dayjs((selectedItem as ImprovementNeed).deadline).format('YYYY-MM-DD')
                          : '-'}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>状态</span>}>
                      <Badge
                        status={needStatusMap[(selectedItem as ImprovementNeed).status].color as 'success' | 'processing' | 'error' | 'default' | 'warning'}
                        text={needStatusMap[(selectedItem as ImprovementNeed).status].text}
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>创建时间</span>}>
                      <span style={{ color: COLORS.textMuted }}>{dayjs((selectedItem as ImprovementNeed).created_at).format('YYYY-MM-DD HH:mm')}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>更新时间</span>}>
                      <span style={{ color: COLORS.textMuted }}>
                        {(selectedItem as ImprovementNeed).updated_at
                          ? dayjs((selectedItem as ImprovementNeed).updated_at).format('YYYY-MM-DD HH:mm')
                          : '-'}
                      </span>
                    </Descriptions.Item>
                    {(selectedItem as ImprovementNeed).source_name && (
                      <Descriptions.Item label={<span style={{ fontWeight: 500 }}>来源详情</span>} span={2}>
                        <span style={{ color: COLORS.textSecondary }}>{(selectedItem as ImprovementNeed).source_name}</span>
                      </Descriptions.Item>
                    )}
                  </Descriptions>

                  {/* Source Link */}
                  {(selectedItem as ImprovementNeed).source !== 'manual' && (
                    <div style={{ padding: '0 16px 16px' }}>
                      <div style={{
                        backgroundColor: COLORS.bg,
                        borderRadius: 6,
                        padding: '12px 16px',
                        border: `1px solid ${COLORS.border}`,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.text, marginBottom: 8 }}>
                          关联来源
                        </div>
                        <Button type="link" icon={<LinkOutlined />} style={{ padding: 0, color: COLORS.primary }}>
                          查看{(selectedItem as ImprovementNeed).source === 'audit' ? '稽核' : '评估'}详情 →
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Descriptions column={2} bordered size="small" style={{ margin: 16 }}>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>计划标题</span>} span={2}>
                      <strong style={{ fontSize: 14, color: COLORS.text }}>{(selectedItem as ImprovementPlan).title}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>所属需求</span>}>
                      <span style={{ color: COLORS.textSecondary }}>{(selectedItem as ImprovementPlan).need_title || '-'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>合作伙伴</span>}>
                      {(selectedItem as ImprovementPlan).partner_name}
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>责任人</span>}>
                      <span style={{ color: (selectedItem as ImprovementPlan).developer_name ? COLORS.text : COLORS.textMuted }}>
                        {(selectedItem as ImprovementPlan).developer_name || '-'}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>状态</span>}>
                      <Badge
                        status={planStatusMap[(selectedItem as ImprovementPlan).status].color as 'success' | 'processing' | 'error' | 'default' | 'warning'}
                        text={planStatusMap[(selectedItem as ImprovementPlan).status].text}
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>进度</span>} span={2}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Progress
                          percent={(selectedItem as ImprovementPlan).progress}
                          strokeColor={(selectedItem as ImprovementPlan).progress === 100 ? COLORS.success : COLORS.primary}
                          style={{ marginBottom: 0, flex: 1 }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600, color: (selectedItem as ImprovementPlan).progress === 100 ? COLORS.success : COLORS.primary, minWidth: 40 }}>
                          {(selectedItem as ImprovementPlan).progress}%
                        </span>
                      </div>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>开始日期</span>}>
                      <span style={{ color: COLORS.textSecondary }}>
                        {(selectedItem as ImprovementPlan).start_date
                          ? dayjs((selectedItem as ImprovementPlan).start_date).format('YYYY-MM-DD')
                          : '-'}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>截止日期</span>}>
                      <span style={{ color: (selectedItem as ImprovementPlan).end_date && dayjs((selectedItem as ImprovementPlan).end_date).isBefore(dayjs()) ? COLORS.error : COLORS.textSecondary }}>
                        {(selectedItem as ImprovementPlan).end_date
                          ? dayjs((selectedItem as ImprovementPlan).end_date).format('YYYY-MM-DD')
                          : '-'}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ fontWeight: 500 }}>改进措施</span>} span={2}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, color: COLORS.text, lineHeight: 1.7 }}>
                        {(selectedItem as ImprovementPlan).measures}
                      </pre>
                    </Descriptions.Item>
                    {(selectedItem as ImprovementPlan).approval_comment && (
                      <Descriptions.Item label={<span style={{ fontWeight: 500 }}>审批意见</span>} span={2}>
                        <span style={{ color: COLORS.textSecondary }}>{(selectedItem as ImprovementPlan).approval_comment}</span>
                      </Descriptions.Item>
                    )}
                  </Descriptions>

                  {/* Quick Actions */}
                  {(selectedItem as ImprovementPlan).status === 'IN_PROGRESS' && (
                    <div style={{ padding: '0 16px 16px' }}>
                      <div style={{
                        backgroundColor: COLORS.bg,
                        borderRadius: 6,
                        padding: '12px 16px',
                        border: `1px solid ${COLORS.border}`,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.text, marginBottom: 10 }}>
                          快捷操作
                        </div>
                        <Space wrap>
                          <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={() => setProgressModalVisible(true)}
                            style={{ backgroundColor: COLORS.primary, borderColor: COLORS.primary, fontWeight: 500 }}
                          >
                            更新进度
                          </Button>
                          <Button
                            icon={<ReloadOutlined />}
                            onClick={() => setAdjustModalVisible(true)}
                            style={{ color: COLORS.warning, borderColor: COLORS.warning, fontWeight: 500 }}
                          >
                            调整计划
                          </Button>
                          {(selectedItem as ImprovementPlan).progress >= 80 && (
                            <Popconfirm
                              title="确认完成"
                              description="确定此计划已完成？"
                              onConfirm={() => handleStatusChange(selectedItem as ImprovementPlan, 'COMPLETED')}
                              okText="确认"
                              cancelText="取消"
                            >
                              <Button icon={<CheckCircleOutlined />} style={{ color: COLORS.success, borderColor: COLORS.success, fontWeight: 500 }}>
                                标记完成
                              </Button>
                            </Popconfirm>
                          )}
                        </Space>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabPane>

            {/* 进度记录 Tab */}
            {detailType === 'plan' && (
              <TabPane tab={<span style={{ fontWeight: 500 }}>进度记录</span>} key="progress">
                <div style={{ padding: 16 }}>
                  <Steps
                    current={Math.floor(((selectedItem as ImprovementPlan).progress || 0) / 25)}
                    size="small"
                    style={{ marginBottom: 24 }}
                    items={[
                      { title: <span style={{ fontSize: 12 }}>计划创建</span> },
                      { title: <span style={{ fontSize: 12 }}>审批通过</span> },
                      { title: <span style={{ fontSize: 12 }}>执行中</span> },
                      { title: <span style={{ fontSize: 12 }}>完成</span> },
                    ]}
                  />
                  {progressRecords.length > 0 ? (
                    <Timeline
                      mode="left"
                      items={progressRecords.map(record => ({
                        color: 'blue',
                        label: (
                          <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace' }}>
                            {dayjs(record.created_at).format('MM-DD HH:mm')}
                          </span>
                        ),
                        children: (
                          <div style={{
                            backgroundColor: '#fafbfc',
                            borderRadius: 6,
                            padding: '10px 14px',
                            border: `1px solid ${COLORS.border}`,
                          }}>
                            <p style={{ margin: 0, fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>
                              {record.content}
                            </p>
                            <Space size="small" style={{ marginTop: 6 }}>
                              <Tag color="green" style={{ margin: 0 }}>{record.progress}%</Tag>
                              {record.operator_name && (
                                <span style={{ color: COLORS.textMuted, fontSize: 12 }}>
                                  {record.operator_name}
                                </span>
                              )}
                            </Space>
                          </div>
                        ),
                      }))}
                    />
                  ) : (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                      <Empty description="暂无进度记录" />
                    </div>
                  )}
                </div>
              </TabPane>
            )}

            {/* 交付物 Tab */}
            {detailType === 'plan' && (
              <TabPane tab={<span style={{ fontWeight: 500 }}>交付物</span>} key="deliverables">
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Empty description="暂无交付物记录" />
                </div>
              </TabPane>
            )}
          </Tabs>
        )}
      </Drawer>

      {/* Global table hover style injection */}
      <style>{`
        .table-rowHover:hover > td {
          background-color: #e6f4ff !important;
        }
        .ant-tabs-nav::before {
          border-bottom: none !important;
        }
        .ant-tabs-tab {
          padding: 12px 0 !important;
          margin: 0 16px 0 0 !important;
        }
        .ant-tabs-tab:first-child {
          margin-left: 0 !important;
        }
      `}</style>
    </div>
  )
}

export default PositiveImprovement
