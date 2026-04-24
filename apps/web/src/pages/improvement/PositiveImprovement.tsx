import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
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
  Statistic,
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
      // Fallback mock data
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
      // Fallback mock data
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
      // Fallback mock data
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
      // Fallback mock data
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

      // Refresh data
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
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 110,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
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
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => handleViewDetail(record, 'need')} title="查看详情" />
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditNeed(record)} title="编辑" />
          {record.status === 'OPEN' && (
            <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => handleCreatePlan(record)} title="创建计划">
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
              <Button type="link" size="small" icon={<CheckCircleOutlined />} title="标记解决" />
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
              <Button type="link" size="small" icon={<CloseCircleOutlined />} title="关闭需求" />
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
    },
    {
      title: '所属需求',
      dataIndex: 'need_title',
      key: 'need_title',
      width: 150,
      ellipsis: true,
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
      render: (name: string) => name || '-',
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number) => <Progress percent={progress} size="small" />,
    },
    {
      title: '截止日期',
      dataIndex: 'end_date',
      key: 'end_date',
      width: 110,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
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
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleViewDetail(record, 'plan')} title="查看详情">
            查看
          </Button>
          {record.status === 'APPROVED' && (
            <Button type="link" size="small" onClick={() => handleStatusChange(record, 'IN_PROGRESS')} title="开始执行">
              开始执行
            </Button>
          )}
          {record.status === 'IN_PROGRESS' && (
            <>
              <Button type="link" size="small" onClick={() => {
                setSelectedItem(record)
                setProgressModalVisible(true)
              }} title="更新进度">
                更新进度
              </Button>
              <Button type="link" size="small" onClick={() => {
                setSelectedItem(record)
                setAdjustModalVisible(true)
              }} title="调整计划">
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
              <Button type="link" size="small" icon={<CheckCircleOutlined />} title="完成" />
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
    avgProgress: plans.length > 0 ? Math.round(plans.reduce((sum, p) => sum + p.progress, 0) / plans.length) : 0,
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

  // ============ Render ============
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 24, fontWeight: 600 }}>正向改进管理</h1>

      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
        {/* 改进需求 Tab */}
        <TabPane tab={<span><FileTextOutlined /> 改进需求</span>} key="needs">
          {/* Statistics */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic title="需求总数" value={stats.needTotal} valueStyle={{ color: '#1890ff' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="待处理" value={stats.needOpen} valueStyle={{ color: '#faad14' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="进行中计划" value={stats.planActive} valueStyle={{ color: '#1890ff' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="已完成计划" value={stats.planCompleted} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
          </Row>

          {/* Filter Bar */}
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              placeholder="选择状态"
              style={{ width: 120 }}
              allowClear
              value={filters.status}
              onChange={v => setFilters({ ...filters, status: v || undefined })}
            >
              <Select.Option value="OPEN">待处理</Select.Option>
              <Select.Option value="IN_PROGRESS">进行中</Select.Option>
              <Select.Option value="RESOLVED">已解决</Select.Option>
              <Select.Option value="CLOSED">已关闭</Select.Option>
            </Select>
            <Select
              placeholder="选择来源"
              style={{ width: 120 }}
              allowClear
              value={filters.source}
              onChange={v => setFilters({ ...filters, source: v || undefined })}
            >
              <Select.Option value="audit">稽核</Select.Option>
              <Select.Option value="assessment">评估</Select.Option>
              <Select.Option value="manual">手动</Select.Option>
            </Select>
            <Select
              placeholder="选择合作伙伴"
              style={{ width: 180 }}
              allowClear
              value={filters.partner_id}
              onChange={v => setFilters({ ...filters, partner_id: v || undefined })}
            >
              {partners.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
            <Button type="primary" icon={<ExclamationCircleOutlined />} onClick={handleSearch}>
              搜索
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNeed}>
              新建需求
            </Button>
            <Button icon={<LinkOutlined />} onClick={() => setTriggerModalVisible(true)}>
              从稽核/评估触发
            </Button>
          </Space>

          {/* Table */}
          <Table
            columns={needColumns}
            dataSource={needs}
            rowKey="id"
            loading={loading}
            pagination={pagination}
            onChange={handleTableChange}
            scroll={{ x: 1300 }}
            size="middle"
          />
        </TabPane>

        {/* 改进计划 Tab */}
        <TabPane tab={<span><TeamOutlined /> 改进计划</span>} key="plans">
          <Table
            columns={planColumns}
            dataSource={plans}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
            size="middle"
          />
        </TabPane>

        {/* 改进历史 Tab */}
        <TabPane tab={<span><HistoryOutlined /> 改进历史</span>} key="history">
          <Card>
            {timelineEvents.length > 0 ? (
              <Timeline
                mode="left"
                items={timelineEvents.map(event => ({
                  color: timelineColorMap[event.event_type] || 'blue',
                  label: dayjs(event.created_at).format('YYYY-MM-DD HH:mm'),
                  children: (
                    <div>
                      <p style={{ margin: 0, fontSize: 14 }}>{event.description}</p>
                      {event.operator_name && (
                        <span style={{ color: '#888', fontSize: 12 }}>
                          操作人: {event.operator_name}
                        </span>
                      )}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty description="暂无改进历史记录" />
            )}
          </Card>
        </TabPane>
      </Tabs>

      {/* Create/Edit Need Modal */}
      <Modal
        title={editingNeed ? '编辑改进需求' : '新建改进需求'}
        open={needModalVisible}
        onOk={handleNeedSubmit}
        onCancel={() => setNeedModalVisible(false)}
        width={600}
        okText={editingNeed ? '保存' : '创建'}
        cancelText="取消"
      >
        <Form form={needForm} layout="vertical" requiredMark="optional">
          <Form.Item
            label="需求标题"
            name="title"
            rules={[{ required: true, message: '请输入需求标题' }]}
          >
            <Input placeholder="请输入需求标题" maxLength={100} />
          </Form.Item>

          <Form.Item
            label="合作伙伴"
            name="partner_id"
            rules={[{ required: true, message: '请选择合作伙伴' }]}
          >
            <Select placeholder="选择合作伙伴" allowClear>
              {partners.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="改进目标"
            name="target"
            rules={[{ required: true, message: '请输入改进目标' }]}
          >
            <TextArea rows={2} placeholder="请输入具体、可衡量的改进目标" />
          </Form.Item>

          <Form.Item label="需求描述" name="description">
            <TextArea rows={3} placeholder="请输入详细描述" />
          </Form.Item>

          <Form.Item label="截止日期" name="deadline">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Divider />

          <Form.Item label="来源信息（可选）" style={{ marginBottom: 0 }}>
            <span style={{ color: '#999', fontSize: 12 }}>
              如果是从稽核或评估触发的需求，系统将自动关联来源信息
            </span>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Plan Modal */}
      <Modal
        title="创建改进计划"
        open={planModalVisible}
        onOk={handlePlanSubmit}
        onCancel={() => setPlanModalVisible(false)}
        width={640}
        okText="创建"
        cancelText="取消"
      >
        {selectedItem && 'partner_name' in selectedItem && (
          <Alert
            message="正在为需求创建改进计划"
            description={`需求: ${selectedItem.title}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Form form={planForm} layout="vertical" requiredMark="optional">
          <Form.Item
            label="计划标题"
            name="title"
            rules={[{ required: true, message: '请输入计划标题' }]}
          >
            <Input placeholder="请输入计划标题" maxLength={100} />
          </Form.Item>

          <Form.Item
            label="改进措施"
            name="measures"
            rules={[{ required: true, message: '请详细描述改进措施' }]}
          >
            <TextArea rows={5} placeholder="请详细描述具体的改进措施和步骤" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="开始日期" name="start_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="截止日期" name="end_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="责任人" name="developer_id">
            <Select placeholder="选择责任人" allowClear>
              {developers.map(d => (
                <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Progress Update Modal */}
      <Modal
        title="更新进度"
        open={progressModalVisible}
        onOk={handleProgressUpdate}
        onCancel={() => {
          setProgressModalVisible(false)
          progressForm.resetFields()
        }}
        width={500}
        okText="提交"
        cancelText="取消"
      >
        <Form form={progressForm} layout="vertical" requiredMark="optional">
          <Form.Item
            label="当前进度"
            name="progress"
            rules={[{ required: true, message: '请输入进度' }]}
          >
            <Input type="number" min={0} max={100} placeholder="0-100" addonAfter="%" />
          </Form.Item>

          <Form.Item
            label="进度说明"
            name="content"
            rules={[{ required: true, message: '请输入进度说明' }]}
          >
            <TextArea rows={4} placeholder="请描述本次进度更新完成的工作内容" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Adjustment Modal */}
      <Modal
        title="计划调整申请"
        open={adjustModalVisible}
        onOk={handleAdjustment}
        onCancel={() => {
          setAdjustModalVisible(false)
          adjustForm.resetFields()
        }}
        width={600}
        okText="提交申请"
        cancelText="取消"
      >
        <Alert
          message="计划调整需要审批"
          description="调整后的计划将进入待审批状态，审批通过后生效"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={adjustForm} layout="vertical" requiredMark="optional">
          <Form.Item
            label="调整后的改进措施"
            name="measures"
            rules={[{ required: true, message: '请输入调整后的措施' }]}
          >
            <TextArea rows={4} placeholder="请详细描述调整后的改进措施" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="新的截止日期" name="end_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="调整原因"
            name="reason"
            rules={[{ required: true, message: '请输入调整原因' }]}
          >
            <TextArea rows={2} placeholder="请说明计划调整的原因" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Trigger from Audit/Assessment Modal */}
      <Modal
        title="从稽核/评估触发"
        open={triggerModalVisible}
        onCancel={() => setTriggerModalVisible(false)}
        footer={null}
        width={700}
      >
        <Tabs defaultActiveKey="assessment">
          <TabPane tab="从评估触发" key="assessment">
            <List
              dataSource={assessments}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleTriggerFromSource('assessment', item)}
                    >
                      创建需求
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={item.title}
                    description={`合作伙伴: ${item.partner_name} | 评分: ${item.score}分`}
                  />
                </List.Item>
              )}
            />
          </TabPane>
          <TabPane tab="从稽核触发" key="audit">
            <List
              dataSource={audits}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleTriggerFromSource('audit', item)}
                    >
                      创建需求
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={item.title}
                    description={`合作伙伴: ${item.partner_name} | 稽核发现: ${item.finding}`}
                  />
                </List.Item>
              )}
            />
          </TabPane>
        </Tabs>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title={detailType === 'need' ? '需求详情' : '计划详情'}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={720}
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
                >
                  创建计划
                </Button>
              )}
              {detailType === 'plan' && (selectedItem as ImprovementPlan).status === 'APPROVED' && (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleStatusChange(selectedItem as ImprovementPlan, 'IN_PROGRESS')}
                >
                  开始执行
                </Button>
              )}
            </Space>
          )
        }
      >
        {selectedItem && (
          <Tabs activeKey={detailTab} onChange={setDetailTab}>
            {/* 基本信息 Tab */}
            <TabPane tab="基本信息" key="info">
              {detailType === 'need' ? (
                <>
                  <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="需求标题" span={2}>
                      <strong>{(selectedItem as ImprovementNeed).title}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="合作伙伴">
                      {(selectedItem as ImprovementNeed).partner_name}
                    </Descriptions.Item>
                    <Descriptions.Item label="来源">
                      <Tag color={sourceMap[(selectedItem as ImprovementNeed).source]?.color}>
                        {sourceMap[(selectedItem as ImprovementNeed).source]?.text}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="改进目标" span={2}>
                      {(selectedItem as ImprovementNeed).target}
                    </Descriptions.Item>
                    <Descriptions.Item label="需求描述" span={2}>
                      {(selectedItem as ImprovementNeed).description || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="截止日期">
                      {(selectedItem as ImprovementNeed).deadline
                        ? dayjs((selectedItem as ImprovementNeed).deadline).format('YYYY-MM-DD')
                        : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Badge
                        status={needStatusMap[(selectedItem as ImprovementNeed).status].color as 'success' | 'processing' | 'error' | 'default' | 'warning'}
                        text={needStatusMap[(selectedItem as ImprovementNeed).status].text}
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                      {dayjs((selectedItem as ImprovementNeed).created_at).format('YYYY-MM-DD HH:mm')}
                    </Descriptions.Item>
                    {(selectedItem as ImprovementNeed).source_name && (
                      <Descriptions.Item label="来源详情" span={2}>
                        {(selectedItem as ImprovementNeed).source_name}
                      </Descriptions.Item>
                    )}
                  </Descriptions>

                  {/* Source Link */}
                  {(selectedItem as ImprovementNeed).source !== 'manual' && (
                    <Card size="small" title="关联来源" style={{ marginBottom: 16 }}>
                      <Button type="link" icon={<LinkOutlined />}>
                        查看{(selectedItem as ImprovementNeed).source === 'audit' ? '稽核' : '评估'}详情
                      </Button>
                    </Card>
                  )}
                </>
              ) : (
                <>
                  <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="计划标题" span={2}>
                      <strong>{(selectedItem as ImprovementPlan).title}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="所属需求">
                      {(selectedItem as ImprovementPlan).need_title || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="合作伙伴">
                      {(selectedItem as ImprovementPlan).partner_name}
                    </Descriptions.Item>
                    <Descriptions.Item label="责任人">
                      {(selectedItem as ImprovementPlan).developer_name || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Badge
                        status={planStatusMap[(selectedItem as ImprovementPlan).status].color as 'success' | 'processing' | 'error' | 'default' | 'warning'}
                        text={planStatusMap[(selectedItem as ImprovementPlan).status].text}
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="进度" span={2}>
                      <Progress percent={(selectedItem as ImprovementPlan).progress} />
                    </Descriptions.Item>
                    <Descriptions.Item label="开始日期">
                      {(selectedItem as ImprovementPlan).start_date
                        ? dayjs((selectedItem as ImprovementPlan).start_date).format('YYYY-MM-DD')
                        : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="截止日期">
                      {(selectedItem as ImprovementPlan).end_date
                        ? dayjs((selectedItem as ImprovementPlan).end_date).format('YYYY-MM-DD')
                        : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="改进措施" span={2}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                        {(selectedItem as ImprovementPlan).measures}
                      </pre>
                    </Descriptions.Item>
                    {(selectedItem as ImprovementPlan).approval_comment && (
                      <Descriptions.Item label="审批意见" span={2}>
                        {(selectedItem as ImprovementPlan).approval_comment}
                      </Descriptions.Item>
                    )}
                  </Descriptions>

                  {/* Quick Actions */}
                  {(selectedItem as ImprovementPlan).status === 'IN_PROGRESS' && (
                    <Card size="small" title="快捷操作">
                      <Space>
                        <Button
                          type="primary"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setProgressModalVisible(true)
                          }}
                        >
                          更新进度
                        </Button>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={() => {
                            setAdjustModalVisible(true)
                          }}
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
                            <Button icon={<CheckCircleOutlined />}>
                              标记完成
                            </Button>
                          </Popconfirm>
                        )}
                      </Space>
                    </Card>
                  )}
                </>
              )}
            </TabPane>

            {/* 进度记录 Tab */}
            {detailType === 'plan' && (
              <TabPane tab="进度记录" key="progress">
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <Steps
                    current={Math.floor(((selectedItem as ImprovementPlan).progress || 0) / 25)}
                    items={[
                      { title: '计划创建' },
                      { title: '审批通过' },
                      { title: '执行中' },
                      { title: '完成' },
                    ]}
                  />
                  <Timeline
                    mode="left"
                    items={progressRecords.map(record => ({
                      color: 'blue',
                      label: dayjs(record.created_at).format('YYYY-MM-DD HH:mm'),
                      children: (
                        <div>
                          <p style={{ margin: 0 }}>{record.content}</p>
                          <Space>
                            <Tag color="green">{record.progress}%</Tag>
                            {record.operator_name && (
                              <span style={{ color: '#888', fontSize: 12 }}>
                                {record.operator_name}
                              </span>
                            )}
                          </Space>
                        </div>
                      ),
                    }))}
                  />
                  {progressRecords.length === 0 && (
                    <Empty description="暂无进度记录" />
                  )}
                </Space>
              </TabPane>
            )}

            {/* 交付物 Tab */}
            {detailType === 'plan' && (
              <TabPane tab="交付物" key="deliverables">
                <Empty description="暂无交付物记录" />
              </TabPane>
            )}
          </Tabs>
        )}
      </Drawer>
    </div>
  )
}

export default PositiveImprovement
