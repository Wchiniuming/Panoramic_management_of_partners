import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card, Table, Button, Space, Input, Select, Modal, Form,
  message, Drawer, Descriptions, Tabs, Tag, Timeline, Upload,
  DatePicker, Statistic, Row, Col, Steps, Badge, Popconfirm,
  Progress, Tooltip, ConfigProvider,
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EyeOutlined, UploadOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  FileTextOutlined, DeleteOutlined, DownloadOutlined,
  ExclamationCircleOutlined, WarningOutlined, SendOutlined,
  CheckOutlined, AppstoreOutlined, UnorderedListOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'
import zhCN from 'antd/locale/zh_CN'

const { TabPane } = Tabs
const { RangePicker } = DatePicker
const { TextArea } = Input

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type TaskStatus =
  | 'DRAFT' | 'PENDING_AUDIT' | 'ASSIGNED' | 'IN_PROGRESS'
  | 'DELIVERED' | 'COMPLETED' | 'REJECTED' | 'ARCHIVED'

interface Task {
  id: number; name: string; partner_id: number; partner_name: string
  type: string; description?: string; priority: Priority; status: TaskStatus
  start_date: string; end_date: string; budget: number; progress: number
  created_at: string; delivery_standard?: string
  developer_id?: number; developer_name?: string
}

interface ProgressRecord {
  id: number; task_id: number; content: string; progress: number
  created_at: string; creator_name: string
}

interface Deliverable {
  id: number; task_id: number; name: string; file_url: string
  file_size: number; uploaded_at: string; uploaded_by: string
}

interface Assignment {
  id: number; task_id: number; developer_id: number
  developer_name: string; role: string; assigned_at: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
}

const COLOR = {
  primary: '#1890ff', primaryHover: '#40a9ff', primaryLight: 'rgba(24,144,255,0.08)',
  success: '#22c55e', successLight: 'rgba(34,197,94,0.1)',
  warning: '#f59e0b', warningLight: 'rgba(245,158,11,0.1)',
  error: '#ef4444', errorLight: 'rgba(239,68,68,0.1)',
  purple: '#8b5cf6', purpleLight: 'rgba(139,92,246,0.1)',
  bg: '#f8fafc', card: '#ffffff', textPrimary: '#0f172a',
  textSecondary: '#64748b', textMuted: '#94a3b8',
  border: '#e2e8f0', borderLight: '#f1f5f9',
}

const AVATAR_COLORS = ['#1890ff', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6']

const PRIORITY_MAP: Record<Priority, { color: string; text: string; className: string }> = {
  LOW: { color: 'default', text: '低', className: 'low' },
  MEDIUM: { color: 'processing', text: '中', className: 'medium' },
  HIGH: { color: 'warning', text: '高', className: 'high' },
  URGENT: { color: 'error', text: '紧急', className: 'urgent' },
}

const STATUS_MAP: Record<TaskStatus, { color: string; text: string; className: string }> = {
  DRAFT: { color: 'default', text: '草稿', className: 'draft' },
  PENDING_AUDIT: { color: 'warning', text: '待审批', className: 'pending' },
  ASSIGNED: { color: 'processing', text: '已分配', className: 'assigned' },
  IN_PROGRESS: { color: 'processing', text: '进行中', className: 'in_progress' },
  DELIVERED: { color: 'blue', text: '已提交', className: 'delivered' },
  COMPLETED: { color: 'success', text: '已完成', className: 'completed' },
  REJECTED: { color: 'error', text: '已拒绝', className: 'rejected' },
  ARCHIVED: { color: 'default', text: '已归档', className: 'archived' },
}

const TASK_TYPES = [
  { value: 'development', label: '开发' },
  { value: 'testing', label: '测试' },
  { value: 'design', label: '设计' },
  { value: 'maintenance', label: '运维' },
]

const mockPartners = [
  { id: 1, name: '华为技术有限公司' },
  { id: 2, name: '中兴通讯股份有限公司' },
  { id: 3, name: '烽火通信科技股份有限公司' },
  { id: 4, name: '中国信科集团' },
]

const mockDevelopers = [
  { id: 1, name: '张伟', skill: 'Java' },
  { id: 2, name: '李娜', skill: 'Python' },
  { id: 3, name: '王强', skill: '前端' },
  { id: 4, name: '刘洋', skill: 'Go' },
]

const mockTasks: Task[] = [
  { id: 1, name: 'BOSS系统接口优化', partner_id: 1, partner_name: '华为技术有限公司', type: 'development', description: '对BOSS系统接口进行性能优化，提升响应速度', priority: 'HIGH', status: 'IN_PROGRESS', start_date: '2024-01-15', end_date: '2024-03-15', budget: 50000, progress: 65, created_at: '2024-01-10', developer_id: 1, developer_name: '张伟' },
  { id: 2, name: 'CRM客户管理模块开发', partner_id: 2, partner_name: '中兴通讯股份有限公司', type: 'development', description: '开发CRM系统的客户管理模块', priority: 'MEDIUM', status: 'ASSIGNED', start_date: '2024-02-01', end_date: '2024-04-30', budget: 80000, progress: 20, created_at: '2024-01-28', developer_id: 3, developer_name: '王强' },
  { id: 3, name: '数据中台架构设计', partner_id: 1, partner_name: '华为技术有限公司', type: 'design', description: '设计企业级数据中台架构方案', priority: 'URGENT', status: 'PENDING_AUDIT', start_date: '2024-02-10', end_date: '2024-03-10', budget: 30000, progress: 0, created_at: '2024-02-05' },
  { id: 4, name: '运维自动化平台测试', partner_id: 3, partner_name: '烽火通信科技股份有限公司', type: 'testing', description: '对运维自动化平台进行功能测试和性能测试', priority: 'LOW', status: 'COMPLETED', start_date: '2023-12-01', end_date: '2024-01-31', budget: 20000, progress: 100, created_at: '2023-11-25', developer_id: 2, developer_name: '李娜' },
  { id: 5, name: '移动端APP接口开发', partner_id: 4, partner_name: '中国信科集团', type: 'development', description: '开发移动端APP所需的后端接口服务', priority: 'HIGH', status: 'DELIVERED', start_date: '2024-01-05', end_date: '2024-02-28', budget: 60000, progress: 100, created_at: '2024-01-02', developer_id: 4, developer_name: '刘洋' },
  { id: 6, name: 'BI报表系统升级', partner_id: 2, partner_name: '中兴通讯股份有限公司', type: 'development', description: '升级BI报表系统至最新版本', priority: 'MEDIUM', status: 'IN_PROGRESS', start_date: '2024-02-15', end_date: '2024-04-15', budget: 45000, progress: 35, created_at: '2024-02-10', developer_id: 1, developer_name: '张伟' },
  { id: 7, name: '安全审计模块开发', partner_id: 1, partner_name: '华为技术有限公司', type: 'development', priority: 'HIGH', status: 'DRAFT', start_date: '2024-03-01', end_date: '2024-05-31', budget: 70000, progress: 0, created_at: '2024-02-20' },
  { id: 8, name: 'API网关性能测试', partner_id: 3, partner_name: '烽火通信科技股份有限公司', type: 'testing', priority: 'LOW', status: 'ARCHIVED', start_date: '2023-10-01', end_date: '2023-11-30', budget: 15000, progress: 100, created_at: '2023-09-25' },
]

const mockProgress: Record<number, ProgressRecord[]> = {
  1: [
    { id: 1, task_id: 1, content: '完成接口梳理与优化方案制定', progress: 20, created_at: '2024-01-20 10:00', creator_name: '张伟' },
    { id: 2, task_id: 1, content: '完成核心接口优化开发', progress: 45, created_at: '2024-02-10 15:30', creator_name: '张伟' },
    { id: 3, task_id: 1, content: '接口联调与性能测试', progress: 65, created_at: '2024-02-25 09:00', creator_name: '张伟' },
  ],
  2: [{ id: 4, task_id: 2, content: '完成需求分析与设计', progress: 20, created_at: '2024-02-05 14:00', creator_name: '王强' }],
}

const mockDeliverables: Record<number, Deliverable[]> = {
  1: [
    { id: 1, task_id: 1, name: '接口优化方案.docx', file_url: '/files/doc1.docx', file_size: 2048000, uploaded_at: '2024-01-18 10:00', uploaded_by: '张伟' },
    { id: 2, task_id: 1, name: '优化代码包.zip', file_url: '/files/code1.zip', file_size: 5242880, uploaded_at: '2024-02-08 16:00', uploaded_by: '张伟' },
  ],
  5: [{ id: 3, task_id: 5, name: '移动端接口文档.pdf', file_url: '/files/api.pdf', file_size: 3145728, uploaded_at: '2024-02-25 11:00', uploaded_by: '刘洋' }],
}

const mockAssignments: Record<number, Assignment[]> = {
  1: [{ id: 1, task_id: 1, developer_id: 1, developer_name: '张伟', role: '主开发', assigned_at: '2024-01-15 09:00', status: 'ACCEPTED' }],
  2: [{ id: 2, task_id: 2, developer_id: 3, developer_name: '王强', role: '主开发', assigned_at: '2024-02-01 10:00', status: 'ACCEPTED' }],
  3: [{ id: 3, task_id: 3, developer_id: 0, developer_name: '待分配', role: '主开发', assigned_at: '', status: 'PENDING' }],
}

const TaskRegistration: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [filters, setFilters] = useState({
    name: '', status: '' as TaskStatus | '', priority: '' as Priority | '',
    partner_id: undefined as number | undefined,
    dateRange: undefined as [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  })
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [delayModalVisible, setDelayModalVisible] = useState(false)
  const [assignModalVisible, setAssignModalVisible] = useState(false)
  const [progressModalVisible, setProgressModalVisible] = useState(false)
  const [deliverableModalVisible, setDeliverableModalVisible] = useState(false)
  const [acceptModalVisible, setAcceptModalVisible] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [activeTab, setActiveTab] = useState('info')
  const [progressList, setProgressList] = useState<ProgressRecord[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [form] = Form.useForm()
  const [delayForm] = Form.useForm()
  const [assignForm] = Form.useForm()
  const [progressForm] = Form.useForm()
  const [acceptForm] = Form.useForm()
  const [uploadFileList, setUploadFileList] = useState<UploadFile[]>([])
  const [deliverableFileList, setDeliverableFileList] = useState<UploadFile[]>([])
  const [selectedDevId, setSelectedDevId] = useState<number | null>(null)

  const totalTasks = tasks.length
  const inProgressTasks = tasks.filter((t) => ['ASSIGNED', 'IN_PROGRESS', 'DELIVERED'].includes(t.status)).length
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const delayedTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'ARCHIVED' && dayjs(t.end_date).isBefore(dayjs())).length
  const delayRate = totalTasks > 0 ? Math.round((delayedTasks / totalTasks) * 100) : 0

  const partnerStats = mockPartners.map((p) => {
    const pt = tasks.filter((t) => t.partner_id === p.id)
    const completed = pt.filter((t) => t.status === 'COMPLETED').length
    return { name: p.name, total: pt.length, completed, rate: pt.length > 0 ? Math.round((completed / pt.length) * 100) : 0 }
  })

  const filteredTasks = tasks.filter((t) => {
    if (filters.name && !t.name.includes(filters.name)) return false
    if (filters.status && t.status !== filters.status) return false
    if (filters.priority && t.priority !== filters.priority) return false
    if (filters.partner_id && t.partner_id !== filters.partner_id) return false
    if (filters.dateRange) {
      const start = dayjs(t.start_date)
      if (start.isBefore(filters.dateRange[0]) || start.isAfter(filters.dateRange[1])) return false
    }
    return true
  })

  const handleViewDetail = (task: Task) => {
    setSelectedTask(task)
    setProgressList(mockProgress[task.id] || [])
    setDeliverables(mockDeliverables[task.id] || [])
    setAssignments(mockAssignments[task.id] || [])
    setActiveTab('info')
    setDetailVisible(true)
  }
  const handleDelay = (task: Task) => { setSelectedTask(task); delayForm.resetFields(); setDelayModalVisible(true) }
  const handleDelaySubmit = async () => {
    try {
      const values = await delayForm.validateFields()
      setTasks((prev) => prev.map((t) => t.id === selectedTask?.id ? { ...t, end_date: values.new_end_date.format('YYYY-MM-DD') } : t))
      message.success('延期申请已提交，等待审批')
      setDelayModalVisible(false)
    } catch {}
  }
  const handleAssign = (task: Task) => { setSelectedTask(task); assignForm.resetFields(); setSelectedDevId(null); setAssignModalVisible(true) }
  const handleAssignSubmit = async () => {
    try {
      const values = await assignForm.validateFields()
      if (!selectedDevId) { message.error('请选择开发者'); return }
      const dev = mockDevelopers.find((d) => d.id === selectedDevId)
      setAssignments((prev) => [...prev, { id: Date.now(), task_id: selectedTask!.id, developer_id: selectedDevId, developer_name: dev?.name || '', role: values.role, assigned_at: dayjs().format('YYYY-MM-DD HH:mm'), status: 'ACCEPTED' }])
      setTasks((prev) => prev.map((t) => t.id === selectedTask?.id ? { ...t, status: 'ASSIGNED', developer_id: selectedDevId, developer_name: dev?.name } : t))
      message.success('开发者分配成功')
      setAssignModalVisible(false)
    } catch {}
  }
  const handleSubmitForAudit = (task: Task) => {
    Modal.confirm({ title: '提交审批', icon: <ExclamationCircleOutlined />, content: '确认提交任务至审批？提交后任务将进入待审批状态。', okText: '确认提交', cancelText: '取消', onOk: () => { setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'PENDING_AUDIT' } : t)); message.success('任务已提交审批') } })
  }
  const handleAuditPass = (task: Task) => {
    Modal.confirm({ title: '审批通过', icon: <CheckCircleOutlined style={{ color: '#22c55e' }} />, content: '确认审批通过？通过后任务将进入已分配状态。', okText: '通过', cancelText: '取消', onOk: () => { setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'ASSIGNED' } : t)); if (selectedTask?.id === task.id) setSelectedTask((prev) => prev ? { ...prev, status: 'ASSIGNED' } : null); message.success('审批已通过') } })
  }
  const handleAuditReject = (task: Task) => {
    Modal.confirm({ title: '审批拒绝', icon: <CloseCircleOutlined style={{ color: '#ef4444' }} />, content: '确认拒绝该任务？', okText: '拒绝', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => { setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'REJECTED' } : t)); if (selectedTask?.id === task.id) setSelectedTask((prev) => prev ? { ...prev, status: 'REJECTED' } : null); message.error('任务已被拒绝') } })
  }
  const handleUpdateProgress = (task: Task) => { setSelectedTask(task); progressForm.resetFields(); progressForm.setFieldsValue({ progress: task.progress }); setProgressModalVisible(true) }
  const handleProgressSubmit = async () => {
    try {
      const values = await progressForm.validateFields()
      setProgressList((prev) => [...prev, { id: Date.now(), task_id: selectedTask!.id, content: values.content, progress: values.progress, created_at: dayjs().format('YYYY-MM-DD HH:mm'), creator_name: '当前用户' }])
      setTasks((prev) => prev.map((t) => t.id === selectedTask?.id ? { ...t, progress: values.progress } : t))
      message.success('进度已更新')
      setProgressModalVisible(false)
    } catch {}
  }
  const handleUploadDeliverable = (task: Task) => { setSelectedTask(task); setDeliverableFileList([]); setDeliverableModalVisible(true) }
  const handleDeliverableSubmit = async () => {
    setDeliverables((prev) => [...prev, { id: Date.now(), task_id: selectedTask!.id, name: deliverableFileList[0]?.name || '交付物文件', file_url: '/files/deliverable', file_size: deliverableFileList[0]?.size || 0, uploaded_at: dayjs().format('YYYY-MM-DD HH:mm'), uploaded_by: '当前用户' }])
    setTasks((prev) => prev.map((t) => t.id === selectedTask?.id ? { ...t, status: 'DELIVERED' } : t))
    message.success('交付物已上传')
    setDeliverableModalVisible(false)
  }
  const handleAccept = (task: Task) => { setSelectedTask(task); acceptForm.resetFields(); setAcceptModalVisible(true) }
  const handleAcceptSubmit = async () => {
    try {
      await acceptForm.validateFields()
      setTasks((prev) => prev.map((t) => t.id === selectedTask?.id ? { ...t, status: 'COMPLETED' } : t))
      message.success('任务已完成验收')
      setAcceptModalVisible(false)
      setDetailVisible(false)
    } catch {}
  }
  const handleRejectAccept = (task: Task) => {
    Modal.confirm({ title: '拒绝验收', icon: <CloseCircleOutlined style={{ color: '#ef4444' }} />, content: '确认拒绝本次交付物？', okText: '拒绝', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => { setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'IN_PROGRESS' } : t)); message.warning('已拒绝验收，任务退回进行中状态') } })
  }
  const handleArchive = (task: Task) => {
    Modal.confirm({ title: '归档任务', icon: <FileTextOutlined />, content: '确认归档该任务？归档后可随时从归档区查看。', okText: '归档', cancelText: '取消', onOk: () => { setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'ARCHIVED' } : t)); message.success('任务已归档') } })
  }
  const handleDelete = (task: Task) => {
    Modal.confirm({ title: '删除任务', icon: <ExclamationCircleOutlined />, content: `确认删除任务"${task.name}"？此操作不可恢复。`, okText: '删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => { setTasks((prev) => prev.filter((t) => t.id !== task.id)); message.success('任务已删除') } })
  }
  const handleCreate = () => { form.resetFields(); setUploadFileList([]); setCreateModalVisible(true) }
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const newTask: Task = {
        id: Math.max(...mockTasks.map((t) => t.id), ...tasks.map((t) => t.id)) + 1,
        name: values.name, partner_id: values.partner_id,
        partner_name: mockPartners.find((p) => p.id === values.partner_id)?.name || '',
        type: values.type, description: values.description, priority: values.priority,
        status: 'DRAFT',
        start_date: values.date_range?.[0]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
        end_date: values.date_range?.[1]?.format('YYYY-MM-DD') || dayjs().add(30, 'day').format('YYYY-MM-DD'),
        budget: values.budget, progress: 0, created_at: dayjs().format('YYYY-MM-DD HH:mm'),
        delivery_standard: values.delivery_standard,
      }
      setTasks((prev) => [newTask, ...prev])
      message.success('任务创建成功')
      setCreateModalVisible(false)
    } catch {}
  }
  const resetFilters = () => setFilters({ name: '', status: '', priority: '', partner_id: undefined, dateRange: undefined })

  const getStepIndex = (status: TaskStatus) => {
    const steps: TaskStatus[] = ['DRAFT', 'PENDING_AUDIT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']
    const idx = steps.indexOf(status)
    if (idx >= 0) return idx
    if (status === 'DELIVERED') return 3
    if (status === 'REJECTED') return 1
    if (status === 'ARCHIVED') return 4
    return 0
  }

  const getAvatarColor = (id?: number) => AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length]
  const getProgressClass = (task: Task) => task.progress === 100 ? 'success' : task.status === 'REJECTED' ? 'error' : 'active'
  const getProgressStroke = (task: Task) => task.progress === 100 ? COLOR.success : task.status === 'REJECTED' ? COLOR.error : COLOR.primary

  const statCardStyle = (type: string) => ({
    borderRadius: 14, overflow: 'hidden', border: '1px solid', borderColor: COLOR.border,
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
  })
  const statCardTopBar = (type: string) => ({
    height: 3, borderRadius: '14px 14px 0 0',
    background: type === 'primary' ? `linear-gradient(90deg, ${COLOR.primary}, ${COLOR.primaryHover})`
      : type === 'warning' ? `linear-gradient(90deg, ${COLOR.warning}, #fbbf24)`
      : type === 'success' ? `linear-gradient(90deg, ${COLOR.success}, #4ade80)`
      : `linear-gradient(90deg, ${COLOR.error}, #f87171)`,
  })
  const statIconWrap = (type: string) => ({
    width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, marginBottom: 14,
    background: type === 'primary' ? COLOR.primaryLight : type === 'warning' ? COLOR.warningLight : type === 'success' ? COLOR.successLight : COLOR.errorLight,
    color: type === 'primary' ? COLOR.primary : type === 'warning' ? COLOR.warning : type === 'success' ? COLOR.success : COLOR.error,
  })
  const statLabelStyle = { fontSize: 12, color: COLOR.textMuted, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 }
  const statValueStyle = (type: string) => ({
    fontSize: 30, fontWeight: 800, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as const,
    color: type === 'primary' ? COLOR.primary : type === 'warning' ? COLOR.warning : type === 'success' ? COLOR.success : COLOR.error,
  })

  const cardStyle = { borderRadius: 14, border: `1px solid ${COLOR.border}`, boxShadow: '0 1px 2px rgba(15,23,42,0.04)', overflow: 'hidden' as const }
  const cardBodyStyle = { padding: '20px 24px' as const }
  const filterContainerStyle = { background: COLOR.card, border: `1px solid ${COLOR.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }
  const filterGridStyle = { display: 'grid', gridTemplateColumns: '2fr 1.3fr 1fr 1.6fr 1.8fr auto', gap: 12, alignItems: 'center' }
  const filterInputStyle = { height: 38, borderRadius: 6, border: `1px solid ${COLOR.border}`, padding: '0 12px 0 36px', fontSize: 13, color: COLOR.textPrimary, background: COLOR.card, outline: 'none', transition: 'all 0.2s', width: '100%' }
  const filterSelectStyle = { height: 38, borderRadius: 6, border: `1px solid ${COLOR.border}`, padding: '0 32px 0 12px', fontSize: 13, color: COLOR.textPrimary, background: COLOR.card, cursor: 'pointer', outline: 'none', transition: 'all 0.2s', width: '100%', appearance: 'none' as const, WebkitAppearance: 'none' as const }
  const dateRangeStyle = { height: 38, borderRadius: 6, border: `1px solid ${COLOR.border}`, padding: '0 12px', fontSize: 13, color: COLOR.textPrimary, background: COLOR.card, cursor: 'pointer', outline: 'none', transition: 'all 0.2s', width: '100%', display: 'flex', alignItems: 'center', gap: 8 }
  const btnGhostStyle = { height: 38, padding: '0 18px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${COLOR.border}`, background: 'transparent', color: COLOR.textSecondary }
  const btnPrimaryStyle = { height: 38, padding: '0 18px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: COLOR.primary, color: '#fff', boxShadow: '0 4px 12px rgba(24,144,255,0.3)' }
  const btnCreateStyle = { height: 38, padding: '0 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: COLOR.primary, color: '#fff' }

  const contentCardStyle = { background: COLOR.card, border: `1px solid ${COLOR.border}`, borderRadius: 14, overflow: 'hidden' as const, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }
  const contentHeaderStyle = { padding: '16px 24px', borderBottom: `1px solid ${COLOR.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
  const contentTitleStyle = { fontSize: 15, fontWeight: 600, color: COLOR.textPrimary }
  const viewToggleStyle = { display: 'flex', gap: 4, background: COLOR.borderLight, padding: 3, borderRadius: 6 }
  const viewBtnBaseStyle = { width: 32, height: 28, border: 'none', borderRadius: 4, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR.textMuted, transition: 'all 0.2s', fontSize: 15 }
  const viewBtnActiveStyle = { ...viewBtnBaseStyle, background: COLOR.card, color: COLOR.primary, boxShadow: '0 1px 2px rgba(15,23,42,0.06)' }

  const taskGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, padding: '20px 24px' }
  const taskCardStyle = { background: COLOR.card, border: `1px solid ${COLOR.border}`, borderRadius: 10, padding: 18, transition: 'all 0.2s', cursor: 'pointer', position: 'relative' as const }
  const priorityBadgeStyle = (p: string) => ({
    display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, flexShrink: 0,
    background: p === 'URGENT' ? COLOR.errorLight : p === 'HIGH' ? COLOR.warningLight : p === 'MEDIUM' ? COLOR.primaryLight : COLOR.borderLight,
    color: p === 'URGENT' ? COLOR.error : p === 'HIGH' ? COLOR.warning : p === 'MEDIUM' ? COLOR.primary : COLOR.textMuted,
  })
  const statusBadgeStyle = (s: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      DRAFT: { bg: COLOR.borderLight, color: COLOR.textMuted },
      PENDING_AUDIT: { bg: COLOR.warningLight, color: COLOR.warning },
      ASSIGNED: { bg: COLOR.primaryLight, color: COLOR.primary },
      IN_PROGRESS: { bg: COLOR.primaryLight, color: COLOR.primary },
      DELIVERED: { bg: COLOR.purpleLight, color: COLOR.purple },
      COMPLETED: { bg: COLOR.successLight, color: COLOR.success },
      REJECTED: { bg: COLOR.errorLight, color: COLOR.error },
      ARCHIVED: { bg: COLOR.borderLight, color: COLOR.textMuted },
    }
    const m = map[s] || map.DRAFT
    return { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: m.bg, color: m.color }
  }
  const progressTrackStyle = { height: 6, background: COLOR.borderLight, borderRadius: 99, overflow: 'hidden', width: '100%' }
  const progressFillStyle = (task: Task) => ({
    height: '100%', borderRadius: 99, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)', width: `${task.progress}%`,
    background: task.progress === 100 ? `linear-gradient(90deg, ${COLOR.success}, #4ade80)`
      : task.status === 'REJECTED' ? `linear-gradient(90deg, ${COLOR.error}, #f87171)`
      : `linear-gradient(90deg, ${COLOR.primary}, ${COLOR.primaryHover})`,
  })
  const taskCardFooterStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${COLOR.borderLight}` }
  const devAvatarStyle = (id?: number) => ({
    width: 24, height: 24, borderRadius: '50%', background: `${getAvatarColor(id)}20`, color: getAvatarColor(id),
    fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
  })
  const cardActionsStyle = { display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.2s' }
  const cardActionBtnStyle = { width: 28, height: 28, border: 'none', borderRadius: 6, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR.textMuted, transition: 'all 0.2s', fontSize: 14 }

  const tableActionBtnStyle = { padding: '4px 10px', border: 'none', borderRadius: 6, background: 'transparent', color: COLOR.textSecondary, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' as const, display: 'inline-flex', alignItems: 'center', gap: 4 }
  const paginationWrapStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: `1px solid ${COLOR.borderLight}` }
  const paginationInfoStyle = { fontSize: 13, color: COLOR.textMuted }

  const partnerProgressCardStyle = { background: COLOR.card, border: `1px solid ${COLOR.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }
  const partnerStatItemStyle = { display: 'flex', flexDirection: 'column' as const, gap: 8 }
  const partnerLabelStyle = { fontSize: 12, color: COLOR.textMuted, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }
  const partnerBarStyle = { display: 'flex', alignItems: 'center', gap: 10 }
  const partnerTrackStyle = { flex: 1, height: 6, background: COLOR.borderLight, borderRadius: 99, overflow: 'hidden' }
  const partnerNumStyle = { fontSize: 12, color: COLOR.textMuted, minWidth: 42, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' as const }

  const stepItemStyle = { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', flex: 1, position: 'relative' as const }
  const stepCircleStyle = (state: string) => {
    const colors: Record<string, { bg: string; border: string; color: string }> = {
      done: { bg: COLOR.success, border: COLOR.success, color: '#fff' },
      active: { bg: COLOR.primary, border: COLOR.primary, color: '#fff' },
      error: { bg: COLOR.error, border: COLOR.error, color: '#fff' },
      idle: { bg: COLOR.borderLight, border: COLOR.border, color: COLOR.textMuted },
    }
    const c = colors[state] || colors.idle
    return { width: 32, height: 32, borderRadius: '50%', background: c.bg, border: `2px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: c.color, fontWeight: 600, zIndex: 1, transition: 'all 0.2s' }
  }

  const infoGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: `1px solid ${COLOR.border}`, borderRadius: 10, overflow: 'hidden' as const }
  const infoRowStyle = (odd: boolean) => ({ display: 'flex', padding: '10px 14px', borderBottom: `1px solid ${COLOR.borderLight}`, background: odd ? COLOR.borderLight : 'transparent' })
  const infoLabelStyle = { fontSize: 12, color: COLOR.textMuted, minWidth: 80, flexShrink: 0 }
  const infoValueStyle = { fontSize: 13, color: COLOR.textPrimary, fontWeight: 500 }

  const renderPriorityBadge = (p: Priority) => (
    <span style={priorityBadgeStyle(p)}>{PRIORITY_MAP[p].text}</span>
  )

  const renderStatusBadge = (s: TaskStatus) => {
    const sm = STATUS_MAP[s]
    return (
      <span style={{ ...statusBadgeStyle(s), display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
        {sm.text}
      </span>
    )
  }

  const renderProgressBar = (task: Task) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 100, height: 5, background: COLOR.borderLight, borderRadius: 99, overflow: 'hidden' }}>
        <div style={progressFillStyle(task)} />
      </div>
      <span style={{ fontSize: 12, color: COLOR.textMuted, minWidth: 28 }}>{task.progress}%</span>
    </div>
  )

  const renderCardActions = (task: Task) => {
    const btns: React.ReactNode[] = []
    btns.push(
      <button key="view" style={cardActionBtnStyle} onClick={(e) => { e.stopPropagation(); handleViewDetail(task) }} title="查看">
        <EyeOutlined />
      </button>
    )
    if (task.status === 'DRAFT') {
      btns.push(<button key="assign" style={cardActionBtnStyle} onClick={(e) => { e.stopPropagation(); handleAssign(task) }} title="分配"><SendOutlined /></button>)
      btns.push(<button key="audit" style={cardActionBtnStyle} onClick={(e) => { e.stopPropagation(); handleSubmitForAudit(task) }} title="提交"><SendOutlined /></button>)
    }
    if (task.status === 'PENDING_AUDIT') {
      btns.push(<button key="pass" style={{ ...cardActionBtnStyle, color: COLOR.success }} onClick={(e) => { e.stopPropagation(); handleAuditPass(task) }} title="通过"><CheckOutlined /></button>)
      btns.push(<button key="reject" style={{ ...cardActionBtnStyle, color: COLOR.error }} onClick={(e) => { e.stopPropagation(); handleAuditReject(task) }} title="拒绝"><CloseCircleOutlined /></button>)
    }
    if (['ASSIGNED', 'IN_PROGRESS'].includes(task.status)) {
      btns.push(<button key="progress" style={cardActionBtnStyle} onClick={(e) => { e.stopPropagation(); handleUpdateProgress(task) }} title="进度"><UploadOutlined /></button>)
      if (task.status === 'IN_PROGRESS') btns.push(<button key="deliver" style={cardActionBtnStyle} onClick={(e) => { e.stopPropagation(); handleUploadDeliverable(task) }} title="交付"><UploadOutlined /></button>)
      btns.push(<button key="delay" style={cardActionBtnStyle} onClick={(e) => { e.stopPropagation(); handleDelay(task) }} title="延期"><ClockCircleOutlined /></button>)
    }
    if (task.status === 'DELIVERED') {
      btns.push(<button key="accept" style={{ ...cardActionBtnStyle, color: COLOR.success }} onClick={(e) => { e.stopPropagation(); handleAccept(task) }} title="验收"><CheckCircleOutlined /></button>)
      btns.push(<button key="reject-del" style={{ ...cardActionBtnStyle, color: COLOR.error }} onClick={(e) => { e.stopPropagation(); handleRejectAccept(task) }} title="拒绝"><CloseCircleOutlined /></button>)
      btns.push(<button key="delay" style={cardActionBtnStyle} onClick={(e) => { e.stopPropagation(); handleDelay(task) }} title="延期"><ClockCircleOutlined /></button>)
    }
    if (['COMPLETED', 'REJECTED', 'ARCHIVED'].includes(task.status)) {
      if (task.status !== 'ARCHIVED') btns.push(<button key="archive" style={cardActionBtnStyle} onClick={(e) => { e.stopPropagation(); handleArchive(task) }} title="归档"><FileTextOutlined /></button>)
      btns.push(<button key="delete" style={{ ...cardActionBtnStyle, color: COLOR.error }} onClick={(e) => { e.stopPropagation(); handleDelete(task) }} title="删除"><DeleteOutlined /></button>)
    }
    return btns
  }

  const renderTableActions = (record: Task) => {
    const btns: React.ReactNode[] = []
    btns.push(<button key="view" style={tableActionBtnStyle} onClick={() => handleViewDetail(record)}>{<EyeOutlined />} 查看</button>)
    if (record.status === 'DRAFT') {
      btns.push(<button key="assign" style={tableActionBtnStyle} onClick={() => handleAssign(record)}>{<SendOutlined />} 分配</button>)
      btns.push(<button key="audit" style={tableActionBtnStyle} onClick={() => handleSubmitForAudit(record)}>{<SendOutlined />} 提交</button>)
    }
    if (record.status === 'PENDING_AUDIT') {
      btns.push(<button key="pass" style={{ ...tableActionBtnStyle, color: COLOR.success }} onClick={() => handleAuditPass(record)}>{<CheckOutlined />} 通过</button>)
      btns.push(<button key="reject" style={{ ...tableActionBtnStyle, color: COLOR.error }} onClick={() => handleAuditReject(record)}>{<CloseCircleOutlined />} 拒绝</button>)
    }
    if (['ASSIGNED', 'IN_PROGRESS'].includes(record.status)) {
      btns.push(<button key="progress" style={tableActionBtnStyle} onClick={() => handleUpdateProgress(record)}>{<UploadOutlined />} 进度</button>)
      if (record.status === 'IN_PROGRESS') btns.push(<button key="deliver" style={tableActionBtnStyle} onClick={() => handleUploadDeliverable(record)}>{<UploadOutlined />} 交付</button>)
      btns.push(<button key="delay" style={tableActionBtnStyle} onClick={() => handleDelay(record)}>{<ClockCircleOutlined />} 延期</button>)
    }
    if (record.status === 'DELIVERED') {
      btns.push(<button key="accept" style={{ ...tableActionBtnStyle, color: COLOR.success }} onClick={() => handleAccept(record)}>{<CheckCircleOutlined />} 验收</button>)
      btns.push(<button key="reject-del" style={{ ...tableActionBtnStyle, color: COLOR.error }} onClick={() => handleRejectAccept(record)}>{<CloseCircleOutlined />} 拒绝</button>)
      btns.push(<button key="delay" style={tableActionBtnStyle} onClick={() => handleDelay(record)}>{<ClockCircleOutlined />} 延期</button>)
    }
    if (['COMPLETED', 'REJECTED', 'ARCHIVED'].includes(record.status)) {
      if (record.status !== 'ARCHIVED') btns.push(<button key="archive" style={tableActionBtnStyle} onClick={() => handleArchive(record)}>{<FileTextOutlined />} 归档</button>)
      btns.push(<button key="delete" style={{ ...tableActionBtnStyle, color: COLOR.error }} onClick={() => handleDelete(record)}>{<DeleteOutlined />} 删除</button>)
    }
    return <Space size={4}>{btns}</Space>
  }

  const columns: ColumnsType<Task> = [
    { title: '任务名称', dataIndex: 'name', key: 'name', ellipsis: true, render: (name: string, record) => <a onClick={() => handleViewDetail(record)} style={{ fontWeight: 500, color: COLOR.primary }}>{name}</a> },
    { title: '合作伙伴', dataIndex: 'partner_name', key: 'partner_name', ellipsis: true },
    { title: '类型', dataIndex: 'type', key: 'type', render: (t: string) => TASK_TYPES.find((x) => x.value === t)?.label || t },
    { title: '优先级', dataIndex: 'priority', key: 'priority', render: (p: Priority) => renderPriorityBadge(p) },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: TaskStatus) => renderStatusBadge(s) },
    { title: '进度', dataIndex: 'progress', key: 'progress', width: 150, render: (_: number, record) => (
      <Space size={8}>
        <Progress percent={record.progress} size="small" status={record.status === 'REJECTED' ? 'exception' : record.progress === 100 ? 'success' : 'active'}
          strokeColor={getProgressStroke(record)} style={{ width: 100 }} />
        <span style={{ fontSize: 12, color: COLOR.textMuted }}>{record.progress}%</span>
      </Space>
    )},
    { title: '开始日期', dataIndex: 'start_date', key: 'start_date', width: 110 },
    { title: '结束日期', dataIndex: 'end_date', key: 'end_date', width: 110 },
    { title: '开发者', dataIndex: 'developer_name', key: 'developer_name', ellipsis: true, render: (v) => v || <span style={{ color: COLOR.textMuted }}>—</span> },
    { title: '操作', key: 'action', width: 280, fixed: 'right' as const, render: (_, record) => renderTableActions(record) },
  ]

  const getPartnerFillClass = (rate: number) => rate >= 80 ? COLOR.success : rate >= 50 ? COLOR.warning : COLOR.error
  const getPartnerFillWidth = (rate: number) => ({ width: `${rate}%`, height: '100%', borderRadius: 99, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)', background: `linear-gradient(90deg, ${getPartnerFillClass(rate)}, ${getPartnerFillClass(rate)}aa)` })

  const drawerTabsBase = { padding: '0 24px', borderBottom: `1px solid ${COLOR.borderLight}`, display: 'flex', gap: 0, flexShrink: 0 as const, overflowX: 'auto' as const }
  const drawerTabBase = (active: boolean) => ({
    padding: '14px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', borderBottom: `2px solid ${active ? COLOR.primary : 'transparent'}`,
    marginBottom: -1, transition: 'all 0.2s', color: active ? COLOR.primary : COLOR.textMuted,
    background: 'transparent', border: 'none', borderBottom: `2px solid ${active ? COLOR.primary : 'transparent'}`, display: 'flex', alignItems: 'center', gap: 6,
    whiteSpace: 'nowrap' as const,
  })

  const stepsData = [
    { title: '创建', sub: '草稿' }, { title: '审批', sub: '待审核' },
    { title: '分配', sub: '已分配' }, { title: '执行', sub: '进行中' }, { title: '完成', sub: '已完成' },
  ]

  const stepConnector = (done: boolean) => ({
    position: 'absolute' as const, top: 16, left: 'calc(50% + 20px)', right: 'calc(-50% + 20px)', height: 2, background: done ? COLOR.success : COLOR.border, transition: 'background 0.2s',
  })

  const timelineDot = (state: string) => ({
    position: 'absolute' as const, left: -22, top: 4, width: 12, height: 12, borderRadius: '50%',
    border: `2px solid ${state === 'done' ? COLOR.success : state === 'active' ? COLOR.primary : COLOR.border}`,
    background: state === 'done' ? COLOR.success : state === 'active' ? COLOR.primary : COLOR.card,
  })

  const assignDevCardStyle = (selected: boolean) => ({
    border: `1px solid ${selected ? COLOR.primary : COLOR.border}`, borderRadius: 10, padding: 12, cursor: 'pointer',
    transition: 'all 0.2s', background: selected ? COLOR.primaryLight : 'transparent',
  })
  const assignDevAvatarStyle = (idx: number) => ({
    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6, background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
  })

  const modalHeaderStyle = { padding: '20px 24px', borderBottom: `1px solid ${COLOR.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
  const modalTitleStyle = { fontSize: 16, fontWeight: 700, color: COLOR.textPrimary, display: 'flex', alignItems: 'center', gap: 10 }
  const modalTitleIconStyle = (bg: string, color: string) => ({ width: 32, height: 32, borderRadius: 6, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 })
  const modalCloseStyle = { width: 32, height: 32, border: 'none', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: COLOR.textMuted, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }

  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ padding: '0 28px 40px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.textPrimary, letterSpacing: -0.3, marginBottom: 4 }}>任务登记管理</h1>
          <p style={{ fontSize: 13, color: COLOR.textMuted }}>创建、分配、跟踪、交付、验收全流程管理</p>
        </div>

        <Row gutter={16} style={{ marginBottom: 20 }}>
          {[
            { type: 'primary', label: '任务总数', value: totalTasks, icon: <FileTextOutlined /> },
            { type: 'warning', label: '进行中', value: inProgressTasks, icon: <ClockCircleOutlined /> },
            { type: 'success', label: '完成率', value: completionRate, suffix: '%', icon: <CheckCircleOutlined /> },
            { type: 'error', label: '延期率', value: delayRate, suffix: '%', icon: <WarningOutlined /> },
          ].map((s) => (
            <Col key={s.type} xs={24} sm={12} lg={6}>
              <div style={cardStyle}>
                <div style={statCardTopBar(s.type)} />
                <div style={cardBodyStyle}>
                  <div style={statIconWrap(s.type)}>{s.icon}</div>
                  <div style={statLabelStyle}>{s.label}</div>
                  <div style={statValueStyle(s.type)}>
                    {s.value}{s.suffix && <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 2 }}>{s.suffix}</span>}
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>

        <div style={partnerProgressCardStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: COLOR.textPrimary, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: COLOR.primary, fontSize: 16 }}><FileTextOutlined /></span>
            合作伙伴任务完成情况
          </h3>
          <Row gutter={[20, 12]}>
            {partnerStats.map((p) => (
              <Col key={p.name} xs={24} sm={12} lg={6}>
                <div style={partnerStatItemStyle}>
                  <div style={partnerLabelStyle} title={p.name}>{p.name}</div>
                  <div style={partnerBarStyle}>
                    <div style={partnerTrackStyle}>
                      <div style={getPartnerFillWidth(p.rate)} />
                    </div>
                    <span style={partnerNumStyle}>{p.completed}/{p.total}</span>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>

        <div style={filterContainerStyle}>
          <div style={filterGridStyle}>
            <div style={{ position: 'relative' }}>
              <SearchOutlined style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLOR.textMuted, fontSize: 14, pointerEvents: 'none', zIndex: 1 }} />
              <input
                style={filterInputStyle}
                placeholder="搜索任务名称..."
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && setFilters({ ...filters })}
              />
            </div>
            <select
              style={filterSelectStyle}
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as TaskStatus | '' })}
            >
              <option value="">选择状态</option>
              {Object.entries(STATUS_MAP).map(([value, { text }]) => <option key={value} value={value}>{text}</option>)}
            </select>
            <select
              style={filterSelectStyle}
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value as Priority | '' })}
            >
              <option value="">优先级</option>
              {Object.entries(PRIORITY_MAP).map(([value, { text }]) => <option key={value} value={value}>{text}</option>)}
            </select>
            <select
              style={filterSelectStyle}
              value={filters.partner_id || ''}
              onChange={(e) => setFilters({ ...filters, partner_id: e.target.value ? parseInt(e.target.value) : undefined })}
            >
              <option value="">选择合作伙伴</option>
              {mockPartners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <RangePicker
              style={{ width: '100%', borderRadius: 6 }}
              value={filters.dateRange}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates as any })}
              placeholder={['开始日期', '结束日期']}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button style={btnGhostStyle} onClick={resetFilters}>重置</button>
              <button style={btnPrimaryStyle} onClick={() => setFilters({ ...filters })}>
                <SearchOutlined /> 搜索
              </button>
              <button style={btnCreateStyle} onClick={handleCreate}>
                <PlusOutlined /> 新建任务
              </button>
            </div>
          </div>
        </div>

        <div style={contentCardStyle}>
          <div style={contentHeaderStyle}>
            <span style={contentTitleStyle}>
              任务列表 <span style={{ color: COLOR.textMuted, fontWeight: 400 }}>({filteredTasks.length})</span>
            </span>
            <div style={viewToggleStyle}>
              <button
                style={viewMode === 'grid' ? viewBtnActiveStyle : viewBtnBaseStyle}
                onClick={() => setViewMode('grid')}
                title="网格视图"
              >
                <AppstoreOutlined />
              </button>
              <button
                style={viewMode === 'table' ? viewBtnActiveStyle : viewBtnBaseStyle}
                onClick={() => setViewMode('table')}
                title="列表视图"
              >
                <UnorderedListOutlined />
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div style={taskGridStyle}>
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  style={taskCardStyle}
                  onClick={() => handleViewDetail(task)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = COLOR.primary
                    ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(24,144,255,0.12)'
                    ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                    const actions = (e.currentTarget as HTMLDivElement).querySelector('.card-actions') as HTMLElement
                    if (actions) actions.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = COLOR.border
                    ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                    ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                    const actions = (e.currentTarget as HTMLDivElement).querySelector('.card-actions') as HTMLElement
                    if (actions) actions.style.opacity = '0'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.textPrimary, lineHeight: 1.4, flex: 1, marginRight: 10 }}>{task.name}</div>
                    {renderPriorityBadge(task.priority)}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
                    {renderStatusBadge(task.status)}
                    <span style={{ fontSize: 12, color: COLOR.textMuted }}>{TASK_TYPES.find((t) => t.value === task.type)?.label}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: COLOR.textSecondary }}>
                      <span style={{ color: COLOR.textMuted }}><FileTextOutlined /></span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.partner_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: COLOR.textSecondary }}>
                      <span style={{ color: COLOR.textMuted }}><ClockCircleOutlined /></span>
                      <span>{task.start_date} 至 {task.end_date}</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLOR.textMuted, marginBottom: 6 }}>
                      <span>进度</span><span>{task.progress}%</span>
                    </div>
                    <div style={progressTrackStyle}>
                      <div style={progressFillStyle(task)} />
                    </div>
                  </div>
                  <div style={taskCardFooterStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: COLOR.textSecondary }}>
                      <div style={devAvatarStyle(task.developer_id)}>{task.developer_name?.[0] || '?'}</div>
                      <span>{task.developer_name || '—'}</span>
                    </div>
                    <div className="card-actions" style={cardActionsStyle}>
                      {renderCardActions(task)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={filteredTasks}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10, showSizeChanger: true, showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              scroll={{ x: 1200 }}
              style={{ borderRadius: 0 }}
            />
          )}

          {viewMode === 'grid' && (
            <div style={paginationWrapStyle}>
              <div style={paginationInfoStyle}>显示 1-{Math.min(10, filteredTasks.length)}，共 {filteredTasks.length} 条记录</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select style={{ height: 32, padding: '0 24px 0 10px', border: `1px solid ${COLOR.border}`, borderRadius: 6, fontSize: 13, color: COLOR.textSecondary, background: COLOR.card, cursor: 'pointer', outline: 'none', appearance: 'none' }}>
                  <option>10 条/页</option><option>20 条/页</option><option>50 条/页</option>
                </select>
                <button style={{ ...viewBtnBaseStyle, width: 32, height: 32, border: `1px solid ${COLOR.border}`, borderRadius: 6, fontSize: 13 }} disabled>
                  <span style={{ transform: 'rotate(90deg)', display: 'flex' }}>&#xe6a0;</span>
                </button>
                <button style={{ ...viewBtnActiveStyle, width: 32, height: 32 }}>1</button>
                <button style={{ ...viewBtnBaseStyle, width: 32, height: 32, border: `1px solid ${COLOR.border}`, borderRadius: 6, fontSize: 13 }} disabled>
                  <span style={{ transform: 'rotate(-90deg)', display: 'flex' }}>&#xe6a0;</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <Modal
          title={
            <div style={modalTitleStyle}>
              <div style={modalTitleIconStyle(COLOR.primaryLight, COLOR.primary)}><PlusOutlined /></div>
              新建任务
            </div>
          }
          open={createModalVisible}
          onOk={handleSubmit}
          onCancel={() => setCreateModalVisible(false)}
          okText="创建" cancelText="取消" width={680} destroyOnClose maskClosable={false}
          styles={{ body: { padding: '24px' } }}
        >
          <Form form={form} layout="vertical" requiredMark="optional" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={24}><Form.Item label="任务名称" name="name" rules={[{ required: true, message: '请输入任务名称', whitespace: true }]}>
                <Input placeholder="请输入任务名称" maxLength={100} showCount style={{ borderRadius: 6 }} />
              </Form.Item></Col>
              <Col span={24}><Form.Item label="任务描述" name="description">
                <TextArea rows={3} placeholder="请输入任务详细描述..." maxLength={500} showCount style={{ borderRadius: 6 }} />
              </Form.Item></Col>
              <Col span={12}><Form.Item label="任务类型" name="type" rules={[{ required: true, message: '请选择任务类型' }]}>
                <Select placeholder="请选择任务类型" style={{ borderRadius: 6 }}>{TASK_TYPES.map((t) => <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>)}</Select>
              </Form.Item></Col>
              <Col span={12}><Form.Item label="合作伙伴" name="partner_id" rules={[{ required: true, message: '请选择合作伙伴' }]}>
                <Select placeholder="请选择合作伙伴" showSearch optionFilterProp="label">{mockPartners.map((p) => <Select.Option key={p.id} value={p.id} label={p.name}>{p.name}</Select.Option>)}</Select>
              </Form.Item></Col>
              <Col span={12}><Form.Item label="优先级" name="priority" rules={[{ required: true, message: '请选择优先级' }]} initialValue="MEDIUM">
                <Select>{Object.entries(PRIORITY_MAP).map(([value, { text }]) => <Select.Option key={value} value={value}>{text}</Select.Option>)}</Select>
              </Form.Item></Col>
              <Col span={12}><Form.Item label="预算（元）" name="budget" rules={[{ required: true, message: '请输入预算' }]}>
                <Input type="number" placeholder="0" min={0} style={{ width: '100%', borderRadius: 6 }} addonAfter="元" />
              </Form.Item></Col>
              <Col span={24}><Form.Item label="执行周期" name="date_range" rules={[{ required: true, message: '请选择执行周期' }]}>
                <RangePicker style={{ width: '100%', borderRadius: 6 }} />
              </Form.Item></Col>
              <Col span={24}><Form.Item label="交付标准" name="delivery_standard">
                <TextArea rows={2} placeholder="请描述任务交付标准..." maxLength={300} showCount style={{ borderRadius: 6 }} />
              </Form.Item></Col>
              <Col span={24}><Form.Item label="需求文档" name="requirement_doc" extra="支持 PDF、Word、Excel、图片等格式，单个文件不超过 50MB">
                <Upload.Dragger fileList={uploadFileList} onChange={({ fileList }) => setUploadFileList(fileList)} beforeUpload={() => false} maxCount={5} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png">
                  <p style={{ margin: 0 }}><UploadOutlined style={{ fontSize: 28, color: COLOR.primary }} /></p>
                  <p style={{ margin: '8px 0 0', color: COLOR.textSecondary, fontSize: 13 }}>点击或拖拽上传文件</p>
                  <p style={{ margin: 0, color: COLOR.textMuted, fontSize: 12 }}>支持多文件上传</p>
                </Upload.Dragger>
              </Form.Item></Col>
            </Row>
          </Form>
        </Modal>

        <Drawer
          title={
            <Space>
              <FileTextOutlined style={{ color: COLOR.primary }} />
              <span style={{ fontWeight: 600 }}>任务详情</span>
              {selectedTask && (
                <Tag
                  color={STATUS_MAP[selectedTask.status].color}
                  style={{ borderRadius: 12 }}
                >
                  {STATUS_MAP[selectedTask.status].text}
                </Tag>
              )}
            </Space>
          }
          open={detailVisible}
          onClose={() => setDetailVisible(false)}
          width={780}
          styles={{ body: { padding: 0 } }}
          extra={selectedTask && (
            <Space>
              {selectedTask.status === 'DRAFT' && (<>
                <Button size="small" onClick={() => { handleAssign(selectedTask); setDetailVisible(false) }}>分配</Button>
                <Button type="primary" size="small" onClick={() => { handleSubmitForAudit(selectedTask); setDetailVisible(false) }}>提交审批</Button>
              </>)}
              {selectedTask.status === 'PENDING_AUDIT' && (<>
                <Button size="small" danger onClick={() => { handleAuditReject(selectedTask); setDetailVisible(false) }}>拒绝</Button>
                <Button type="primary" size="small" onClick={() => { handleAuditPass(selectedTask); setDetailVisible(false) }}>通过</Button>
              </>)}
              {['ASSIGNED', 'IN_PROGRESS'].includes(selectedTask.status) && (<>
                <Button size="small" onClick={() => { handleUpdateProgress(selectedTask); setDetailVisible(false) }}>更新进度</Button>
                {selectedTask.status === 'IN_PROGRESS' && <Button type="primary" size="small" onClick={() => { handleUploadDeliverable(selectedTask); setDetailVisible(false) }}>提交交付物</Button>}
              </>)}
              {selectedTask.status === 'DELIVERED' && (<>
                <Button size="small" danger onClick={() => { handleRejectAccept(selectedTask); setDetailVisible(false) }}>拒绝</Button>
                <Button type="primary" size="small" onClick={() => { handleAccept(selectedTask); setDetailVisible(false) }}>验收</Button>
              </>)}
            </Space>
          )}
        >
          {selectedTask && (
            <>
              <div style={drawerTabsBase}>
                {['info', 'assignments', 'progress', 'deliverables', 'archives'].map((tab) => (
                  <button
                    key={tab}
                    style={drawerTabBase(activeTab === tab)}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === 'info' ? '基本信息' : tab === 'assignments' ? `任务分配${assignments.length > 0 ? ` (${assignments.length})` : ''}` : tab === 'progress' ? `进度跟踪${progressList.length > 0 ? ` (${progressList.length})` : ''}` : tab === 'deliverables' ? `交付物${deliverables.length > 0 ? ` (${deliverables.length})` : ''}` : '归档记录'}
                  </button>
                ))}
              </div>

              <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
                {activeTab === 'info' && (
                  <>
                    <div style={infoGridStyle}>
                      {[
                        { label: '任务名称', value: <strong>{selectedTask.name}</strong>, span: 2 },
                        { label: '合作伙伴', value: selectedTask.partner_name },
                        { label: '开发者', value: selectedTask.developer_name || <span style={{ color: COLOR.textMuted }}>未分配</span> },
                        { label: '任务类型', value: TASK_TYPES.find((t) => t.value === selectedTask.type)?.label },
                        { label: '优先级', value: renderPriorityBadge(selectedTask.priority) },
                        { label: '开始日期', value: selectedTask.start_date },
                        { label: '结束日期', value: (
                          <Space>
                            {selectedTask.end_date}
                            {dayjs(selectedTask.end_date).isBefore(dayjs()) && selectedTask.status !== 'COMPLETED' && selectedTask.status !== 'ARCHIVED' && (
                              <Tooltip title="已超时"><WarningOutlined style={{ color: COLOR.error }} /></Tooltip>
                            )}
                          </Space>
                        )},
                        { label: '预算', value: `${selectedTask.budget?.toLocaleString()} 元` },
                        { label: '当前进度', value: (
                          <Space>
                            <Progress percent={selectedTask.progress} size="small" style={{ width: 120 }} strokeColor={getProgressStroke(selectedTask)} />
                            <span style={{ color: COLOR.textMuted, fontSize: 12 }}>{selectedTask.progress}%</span>
                          </Space>
                        )},
                      ].map((item, i) => (
                        <div key={i} style={{ ...infoRowStyle(i % 2 === 0), gridColumn: item.span === 2 ? '1 / -1' : undefined, padding: '10px 14px', borderBottom: `1px solid ${COLOR.borderLight}`, background: i % 2 === 0 ? COLOR.borderLight : 'transparent' }}>
                          <div style={infoLabelStyle}>{item.label}</div>
                          <div style={infoValueStyle}>{item.value}</div>
                        </div>
                      ))}
                      {selectedTask.description && (
                        <div style={{ gridColumn: '1 / -1', padding: '10px 14px', borderBottom: `1px solid ${COLOR.borderLight}`, background: COLOR.borderLight }}>
                          <div style={infoLabelStyle}>任务描述</div>
                          <div style={{ fontSize: 13, color: COLOR.textSecondary, marginTop: 2, lineHeight: 1.6 }}>{selectedTask.description}</div>
                        </div>
                      )}
                      {selectedTask.delivery_standard && (
                        <div style={{ gridColumn: '1 / -1', padding: '10px 14px', background: COLOR.borderLight }}>
                          <div style={infoLabelStyle}>交付标准</div>
                          <div style={{ fontSize: 13, color: COLOR.textSecondary, marginTop: 2, lineHeight: 1.6 }}>{selectedTask.delivery_standard}</div>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 24 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: COLOR.textPrimary }}>任务流程</div>
                      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        {stepsData.map((s, i) => {
                          const idx = getStepIndex(selectedTask.status)
                          let state = 'idle'
                          if (i < idx) state = 'done'
                          else if (i === idx) state = selectedTask.status === 'REJECTED' ? 'error' : 'active'

                          return (
                            <div key={i} style={stepItemStyle}>
                              {i > 0 && <div style={stepConnector(i <= idx)} />}
                              <div style={stepCircleStyle(state)}>
                                {state === 'done' ? '✓' : i + 1}
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 500, marginTop: 8, textAlign: 'center', color: state === 'done' ? COLOR.success : state === 'active' ? COLOR.primary : COLOR.textMuted }}>
                                {s.title}<br />
                                <span style={{ fontSize: 10, fontWeight: 400 }}>{s.sub}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'assignments' && (
                  <div>
                    <Space style={{ marginBottom: 12 }}>
                      <Button
                        type="primary" size="small" icon={<PlusOutlined />}
                        onClick={() => handleAssign(selectedTask)}
                        disabled={!['DRAFT', 'ASSIGNED'].includes(selectedTask.status)}
                      >
                        分配开发者
                      </Button>
                    </Space>
                    {assignments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: COLOR.textMuted }}>
                        <FileTextOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                        暂无分配记录
                      </div>
                    ) : (
                      <Table
                        dataSource={assignments}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: '开发者', dataIndex: 'developer_name', key: 'developer_name', render: (n: string) => (
                            <Space>
                              <div style={devAvatarStyle(mockDevelopers.find(d => d.name === n)?.id)}>{n[0]}</div>
                              <span style={{ fontWeight: 500 }}>{n}</span>
                            </Space>
                          )},
                          { title: '角色', dataIndex: 'role', key: 'role' },
                          { title: '分配时间', dataIndex: 'assigned_at', key: 'assigned_at' },
                          { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => {
                            const colors: Record<string, string> = { ACCEPTED: COLOR.success, REJECTED: COLOR.error, PENDING: COLOR.warning }
                            const texts: Record<string, string> = { ACCEPTED: '已接受', REJECTED: '已拒绝', PENDING: '待确认' }
                            return <Tag color={colors[s]} style={{ borderRadius: 8 }}>{texts[s]}</Tag>
                          }},
                        ]}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'progress' && (
                  <div>
                    <Space style={{ marginBottom: 12 }}>
                      <Button
                        type="primary" size="small" icon={<UploadOutlined />}
                        onClick={() => handleUpdateProgress(selectedTask)}
                        disabled={!['ASSIGNED', 'IN_PROGRESS'].includes(selectedTask.status)}
                      >
                        更新进度
                      </Button>
                    </Space>
                    {progressList.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: COLOR.textMuted }}>
                        <ClockCircleOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                        暂无进度记录
                      </div>
                    ) : (
                      <Timeline
                        items={progressList.map((r) => ({
                          color: r.progress === 100 ? COLOR.success : r.progress >= 50 ? COLOR.primary : COLOR.border,
                          children: (
                            <div>
                              <div style={{ fontWeight: 500, color: COLOR.textPrimary }}>{r.content}</div>
                              <div style={{ fontSize: 12, color: COLOR.textMuted, marginTop: 2 }}>
                                {r.created_at} · {r.creator_name} · 进度 {r.progress}%
                              </div>
                            </div>
                          ),
                        }))}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'deliverables' && (
                  <div>
                    <Space style={{ marginBottom: 12 }}>
                      <Button
                        type="primary" size="small" icon={<UploadOutlined />}
                        onClick={() => handleUploadDeliverable(selectedTask)}
                        disabled={!['IN_PROGRESS'].includes(selectedTask.status)}
                      >
                        上传交付物
                      </Button>
                    </Space>
                    {deliverables.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: COLOR.textMuted }}>
                        <FileTextOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                        暂无交付物
                      </div>
                    ) : (
                      <Table
                        dataSource={deliverables}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: '文件名', dataIndex: 'name', key: 'name', render: (n: string) => <a style={{ color: COLOR.primary }}>{n}</a> },
                          { title: '大小', dataIndex: 'file_size', key: 'file_size', render: (s: number) => `${(s / 1024 / 1024).toFixed(2)} MB` },
                          { title: '上传人', dataIndex: 'uploaded_by', key: 'uploaded_by' },
                          { title: '上传时间', dataIndex: 'uploaded_at', key: 'uploaded_at' },
                          { title: '操作', key: 'action', render: () => (
                            <Space size={4}>
                              <Button type="link" size="small" icon={<DownloadOutlined />}>下载</Button>
                              <Popconfirm title="确认删除？" okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
                                <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                              </Popconfirm>
                            </Space>
                          )},
                        ]}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'archives' && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: COLOR.textMuted }}>
                    <FileTextOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                    归档记录将在任务归档后显示
                  </div>
                )}
              </div>
            </>
          )}
        </Drawer>

        <Modal
          title={
            <div style={modalTitleStyle}>
              <div style={modalTitleIconStyle(COLOR.primaryLight, COLOR.primary)}><SendOutlined /></div>
              分配开发者
            </div>
          }
          open={assignModalVisible}
          onOk={handleAssignSubmit}
          onCancel={() => setAssignModalVisible(false)}
          okText="确认分配" cancelText="取消" destroyOnClose
          styles={{ body: { padding: '24px' } }}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: COLOR.textSecondary, marginBottom: 12 }}>选择开发者 <span style={{ color: COLOR.error }}>*</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              {mockDevelopers.map((d) => (
                <div
                  key={d.id}
                  style={assignDevCardStyle(selectedDevId === d.id)}
                  onClick={() => setSelectedDevId(d.id)}
                >
                  <div style={assignDevAvatarStyle(d.id - 1)}>{d.name[0]}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.textPrimary, marginBottom: 2 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: COLOR.textMuted }}>{d.skill}</div>
                </div>
              ))}
            </div>
          </div>
          <Form form={assignForm} layout="vertical">
            <Form.Item label="角色" name="role" rules={[{ required: true, message: '请输入角色' }]} initialValue="主开发">
              <Select>
                <Select.Option value="主开发">主开发</Select.Option>
                <Select.Option value="辅助开发">辅助开发</Select.Option>
                <Select.Option value="测试">测试</Select.Option>
                <Select.Option value="设计">设计</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={
            <div style={modalTitleStyle}>
              <div style={modalTitleIconStyle(COLOR.warningLight, COLOR.warning)}><UploadOutlined /></div>
              更新进度
            </div>
          }
          open={progressModalVisible}
          onOk={handleProgressSubmit}
          onCancel={() => setProgressModalVisible(false)}
          okText="确认更新" cancelText="取消" destroyOnClose
          styles={{ body: { padding: '24px' } }}
        >
          <Form form={progressForm} layout="vertical">
            <Form.Item label="当前进度（%）" name="progress" rules={[{ required: true, message: '请输入进度' }]}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Slider
                  min={0} max={100}
                  marks={{ 0: '0%', 50: '50%', 100: '100%' }}
                  style={{ width: '100%' }}
                />
              </Space>
            </Form.Item>
            <Form.Item label="进度说明" name="content" rules={[{ required: true, message: '请输入进度说明', whitespace: true }]}>
              <TextArea rows={3} placeholder="请描述当前进度情况..." maxLength={300} showCount />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={
            <div style={modalTitleStyle}>
              <div style={modalTitleIconStyle(COLOR.purpleLight, COLOR.purple)}><UploadOutlined /></div>
              上传交付物
            </div>
          }
          open={deliverableModalVisible}
          onOk={handleDeliverableSubmit}
          onCancel={() => setDeliverableModalVisible(false)}
          okText="确认提交" cancelText="取消" destroyOnClose
          styles={{ body: { padding: '24px' } }}
        >
          <Form layout="vertical">
            <Form.Item label="交付物文件" extra="支持压缩包、文档、图片等格式，单个文件不超过 100MB">
              <Upload.Dragger
                fileList={deliverableFileList}
                onChange={({ fileList }) => setDeliverableFileList(fileList)}
                beforeUpload={() => false} maxCount={10}
                accept=".zip,.rar,.7z,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              >
                <p style={{ margin: 0 }}><UploadOutlined style={{ fontSize: 32, color: COLOR.primary }} /></p>
                <p style={{ margin: '8px 0 0', color: COLOR.textSecondary }}>点击或拖拽上传交付物</p>
                <p style={{ margin: 0, color: COLOR.textMuted, fontSize: 12 }}>支持多文件上传</p>
              </Upload.Dragger>
            </Form.Item>
            <Form.Item label="交付说明">
              <TextArea rows={2} placeholder="可选：填写交付说明..." />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={
            <div style={modalTitleStyle}>
              <div style={modalTitleIconStyle(COLOR.successLight, COLOR.success)}><CheckCircleOutlined /></div>
              验收确认
            </div>
          }
          open={acceptModalVisible}
          onOk={handleAcceptSubmit}
          onCancel={() => setAcceptModalVisible(false)}
          okText="确认验收通过" cancelText="取消"
          okButtonProps={{ style: { background: COLOR.success } }}
          destroyOnClose
          styles={{ body: { padding: '24px' } }}
        >
          <div style={{ background: COLOR.successLight, border: `1px solid ${COLOR.success}`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, color: COLOR.success, marginBottom: 4 }}>验收通过</div>
            <div style={{ fontSize: 13, color: COLOR.textSecondary }}>确认所有交付物符合要求，任务完成验收。</div>
          </div>
          <Form form={acceptForm} layout="vertical">
            <Form.Item label="验收意见" name="comment">
              <TextArea rows={2} placeholder="可选：填写验收意见..." />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={
            <div style={modalTitleStyle}>
              <div style={modalTitleIconStyle(COLOR.warningLight, COLOR.warning)}><ClockCircleOutlined /></div>
              申请延期
            </div>
          }
          open={delayModalVisible}
          onOk={handleDelaySubmit}
          onCancel={() => setDelayModalVisible(false)}
          okText="提交申请" cancelText="取消"
          okButtonProps={{ style: { background: COLOR.warning } }}
          destroyOnClose
          styles={{ body: { padding: '24px' } }}
        >
          <Form form={delayForm} layout="vertical">
            <Form.Item label="原交付日期">
              <Input value={selectedTask?.end_date} disabled />
            </Form.Item>
            <Form.Item label="延期原因" name="reason" rules={[{ required: true, message: '请输入延期原因', whitespace: true }]}>
              <TextArea rows={3} placeholder="请详细描述延期原因..." maxLength={300} showCount />
            </Form.Item>
            <Form.Item label="新的交付时间" name="new_end_date" rules={[{ required: true, message: '请选择新的交付时间' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  )
}

export default TaskRegistration
