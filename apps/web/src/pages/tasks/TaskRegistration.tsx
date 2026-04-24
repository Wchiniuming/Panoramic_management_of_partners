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
  message,
  Drawer,
  Descriptions,
  Tabs,
  Tag,
  Timeline,
  Upload,
  DatePicker,
  Statistic,
  Row,
  Col,
  Steps,
  Badge,
  Popconfirm,
  Progress,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  SendOutlined,
  CheckOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'

const { TabPane } = Tabs
const { RangePicker } = DatePicker
const { TextArea } = Input

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type TaskStatus =
  | 'DRAFT'
  | 'PENDING_AUDIT'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'ARCHIVED'

interface Task {
  id: number
  name: string
  partner_id: number
  partner_name: string
  type: string
  description?: string
  priority: Priority
  status: TaskStatus
  start_date: string
  end_date: string
  budget: number
  progress: number
  created_at: string
  delivery_standard?: string
  developer_id?: number
  developer_name?: string
}

interface ProgressRecord {
  id: number
  task_id: number
  content: string
  progress: number
  created_at: string
  creator_name: string
}

interface Deliverable {
  id: number
  task_id: number
  name: string
  file_url: string
  file_size: number
  uploaded_at: string
  uploaded_by: string
}

interface Assignment {
  id: number
  task_id: number
  developer_id: number
  developer_name: string
  role: string
  assigned_at: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
}

const PRIORITY_MAP: Record<Priority, { color: string; text: string }> = {
  LOW: { color: 'default', text: '低' },
  MEDIUM: { color: 'processing', text: '中' },
  HIGH: { color: 'warning', text: '高' },
  URGENT: { color: 'error', text: '紧急' },
}

const STATUS_MAP: Record<TaskStatus, { color: string; text: string }> = {
  DRAFT: { color: 'default', text: '草稿' },
  PENDING_AUDIT: { color: 'warning', text: '待审批' },
  ASSIGNED: { color: 'processing', text: '已分配' },
  IN_PROGRESS: { color: 'processing', text: '进行中' },
  DELIVERED: { color: 'blue', text: '已提交' },
  COMPLETED: { color: 'success', text: '已完成' },
  REJECTED: { color: 'error', text: '已拒绝' },
  ARCHIVED: { color: 'default', text: '已归档' },
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
  const [filters, setFilters] = useState({
    name: '',
    status: '' as TaskStatus | '',
    priority: '' as Priority | '',
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

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.name) params.append('name', filters.name)
      if (filters.status) params.append('status', filters.status)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.partner_id) params.append('partner_id', String(filters.partner_id))
      if (filters.dateRange) {
        params.append('start_date', filters.dateRange[0].format('YYYY-MM-DD'))
        params.append('end_date', filters.dateRange[1].format('YYYY-MM-DD'))
      }
      setTasks(mockTasks.filter((t) => {
        if (filters.name && !t.name.includes(filters.name)) return false
        if (filters.status && t.status !== filters.status) return false
        if (filters.priority && t.priority !== filters.priority) return false
        if (filters.partner_id && t.partner_id !== filters.partner_id) return false
        if (filters.dateRange) {
          const start = dayjs(t.start_date)
          if (start.isBefore(filters.dateRange[0]) || start.isAfter(filters.dateRange[1])) return false
        }
        return true
      }))
    } catch { message.error('获取任务列表失败') } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleCreate = () => { form.resetFields(); setUploadFileList([]); setCreateModalVisible(true) }
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const newTask: Task = {
        id: Math.max(...mockTasks.map((t) => t.id)) + 1,
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
  const handleAssign = (task: Task) => { setSelectedTask(task); assignForm.resetFields(); setAssignModalVisible(true) }
  const handleAssignSubmit = async () => {
    try {
      const values = await assignForm.validateFields()
      const dev = mockDevelopers.find((d) => d.id === values.developer_id)
      setAssignments((prev) => [...prev, { id: Date.now(), task_id: selectedTask!.id, developer_id: values.developer_id, developer_name: dev?.name || '', role: values.role, assigned_at: dayjs().format('YYYY-MM-DD HH:mm'), status: 'ACCEPTED' }])
      setTasks((prev) => prev.map((t) => t.id === selectedTask?.id ? { ...t, status: 'ASSIGNED', developer_id: values.developer_id, developer_name: dev?.name } : t))
      message.success('开发者分配成功')
      setAssignModalVisible(false)
    } catch {}
  }
  const handleSubmitForAudit = (task: Task) => {
    Modal.confirm({ title: '提交审批', icon: <ExclamationCircleOutlined />, content: '确认提交任务至审批？提交后任务将进入待审批状态。', okText: '确认提交', cancelText: '取消', onOk: () => { setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'PENDING_AUDIT' } : t)); message.success('任务已提交审批') } })
  }
  const handleAuditPass = (task: Task) => {
    Modal.confirm({ title: '审批通过', icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />, content: '确认审批通过？通过后任务将进入已分配状态。', okText: '通过', cancelText: '取消', onOk: () => { setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'ASSIGNED' } : t)); if (selectedTask?.id === task.id) setSelectedTask((prev) => prev ? { ...prev, status: 'ASSIGNED' } : null); message.success('审批已通过') } })
  }
  const handleAuditReject = (task: Task) => {
    Modal.confirm({ title: '审批拒绝', icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />, content: '确认拒绝该任务？', okText: '拒绝', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => { setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'REJECTED' } : t)); if (selectedTask?.id === task.id) setSelectedTask((prev) => prev ? { ...prev, status: 'REJECTED' } : null); message.error('任务已被拒绝') } })
  }
  const handleUpdateProgress = (task: Task) => { setSelectedTask(task); progressForm.resetFields(); setProgressModalVisible(true) }
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
    try {
      setDeliverables((prev) => [...prev, { id: Date.now(), task_id: selectedTask!.id, name: deliverableFileList[0]?.name || '交付物文件', file_url: '/files/deliverable', file_size: deliverableFileList[0]?.size || 0, uploaded_at: dayjs().format('YYYY-MM-DD HH:mm'), uploaded_by: '当前用户' }])
      setTasks((prev) => prev.map((t) => t.id === selectedTask?.id ? { ...t, status: 'DELIVERED' } : t))
      message.success('交付物已上传')
      setDeliverableModalVisible(false)
    } catch {}
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
    Modal.confirm({ title: '拒绝验收', icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />, content: '确认拒绝本次交付物？', okText: '拒绝', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => { setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'IN_PROGRESS' } : t)); message.warning('已拒绝验收，任务退回进行中状态') } })
  }
  const handleArchive = (task: Task) => {
    Modal.confirm({ title: '归档任务', icon: <FileTextOutlined />, content: '确认归档该任务？归档后可随时从归档区查看。', okText: '归档', cancelText: '取消', onOk: () => { setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'ARCHIVED' } : t)); message.success('任务已归档') } })
  }
  const handleDelete = (task: Task) => {
    Modal.confirm({ title: '删除任务', icon: <ExclamationCircleOutlined />, content: `确认删除任务"${task.name}"？此操作不可恢复。`, okText: '删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => { setTasks((prev) => prev.filter((t) => t.id !== task.id)); message.success('任务已删除') } })
  }

  const getStepIndex = (status: TaskStatus) => {
    const steps: TaskStatus[] = ['DRAFT', 'PENDING_AUDIT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']
    const idx = steps.indexOf(status)
    if (idx >= 0) return idx
    if (status === 'DELIVERED') return 3
    if (status === 'REJECTED') return 1
    if (status === 'ARCHIVED') return 4
    return 0
  }

  const renderActionButtons = (record: Task) => {
    const btns: React.ReactNode[] = []
    btns.push(<Button key="view" type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>查看</Button>)
    if (record.status === 'DRAFT') {
      btns.push(<Button key="audit" type="link" size="small" icon={<SendOutlined />} onClick={() => handleSubmitForAudit(record)}>提交</Button>)
      btns.push(<Button key="assign" type="link" size="small" icon={<SendOutlined />} onClick={() => handleAssign(record)}>分配</Button>)
    }
    if (record.status === 'PENDING_AUDIT') {
      btns.push(<Button key="pass" type="link" size="small" icon={<CheckOutlined />} onClick={() => handleAuditPass(record)} style={{ color: '#52c41a' }}>通过</Button>)
      btns.push(<Button key="reject" type="link" size="small" icon={<CloseCircleOutlined />} onClick={() => handleAuditReject(record)} style={{ color: '#ff4d4f' }}>拒绝</Button>)
    }
    if (['ASSIGNED', 'IN_PROGRESS'].includes(record.status)) {
      btns.push(<Button key="progress" type="link" size="small" icon={<UploadOutlined />} onClick={() => handleUpdateProgress(record)}>进度</Button>)
      if (record.status === 'IN_PROGRESS') btns.push(<Button key="deliver" type="link" size="small" icon={<UploadOutlined />} onClick={() => handleUploadDeliverable(record)}>交付</Button>)
    }
    if (record.status === 'DELIVERED') {
      btns.push(<Button key="accept" type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleAccept(record)} style={{ color: '#52c41a' }}>验收</Button>)
      btns.push(<Button key="reject-del" type="link" size="small" icon={<CloseCircleOutlined />} onClick={() => handleRejectAccept(record)} style={{ color: '#ff4d4f' }}>拒绝</Button>)
    }
    if (['ASSIGNED', 'IN_PROGRESS', 'DELIVERED'].includes(record.status)) {
      btns.push(<Button key="delay" type="link" size="small" icon={<ClockCircleOutlined />} onClick={() => handleDelay(record)}>延期</Button>)
    }
    if (['COMPLETED', 'REJECTED', 'ARCHIVED'].includes(record.status)) {
      if (record.status !== 'ARCHIVED') btns.push(<Button key="archive" type="link" size="small" icon={<FileTextOutlined />} onClick={() => handleArchive(record)}>归档</Button>)
      btns.push(<Popconfirm key="delete" title="确认删除？" onConfirm={() => handleDelete(record)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}><Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button></Popconfirm>)
    }
    return <Space size={4}>{btns}</Space>
  }

  const columns: ColumnsType<Task> = [
    { title: '任务名称', dataIndex: 'name', key: 'name', ellipsis: true, render: (name: string, record) => <a onClick={() => handleViewDetail(record)} style={{ fontWeight: 500 }}>{name}</a> },
    { title: '合作伙伴', dataIndex: 'partner_name', key: 'partner_name', ellipsis: true },
    { title: '类型', dataIndex: 'type', key: 'type', render: (t: string) => TASK_TYPES.find((x) => x.value === t)?.label || t },
    { title: '优先级', dataIndex: 'priority', key: 'priority', render: (p: Priority) => <Tag color={PRIORITY_MAP[p].color} style={{ borderRadius: 12 }}>{PRIORITY_MAP[p].text}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: TaskStatus) => <Badge status={STATUS_MAP[s].color as any} text={<span style={{ color: STATUS_MAP[s].color === 'error' ? '#ff4d4f' : STATUS_MAP[s].color === 'success' ? '#52c41a' : undefined }}>{STATUS_MAP[s].text}</span>} /> },
    { title: '进度', dataIndex: 'progress', key: 'progress', width: 130, render: (p: number, record) => <Progress percent={p} size="small" status={record.status === 'REJECTED' ? 'exception' : p === 100 ? 'success' : 'active'} strokeColor={record.status === 'REJECTED' ? '#ff4d4f' : p === 100 ? '#52c41a' : '#1677ff'} /> },
    { title: '开始日期', dataIndex: 'start_date', key: 'start_date', width: 110 },
    { title: '结束日期', dataIndex: 'end_date', key: 'end_date', width: 110 },
    { title: '开发者', dataIndex: 'developer_name', key: 'developer_name', ellipsis: true, render: (v) => v || <span style={{ color: '#999' }}>—</span> },
    { title: '操作', key: 'action', width: 260, fixed: 'right', render: (_, record) => renderActionButtons(record) },
  ]

  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ padding: '0 24px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>任务登记管理</h1>
          <p style={{ color: '#999', margin: '4px 0 0', fontSize: 13 }}>创建、分配、跟踪、交付、验收全流程管理</p>
        </div>

        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} styles={{ body: { padding: '16px 20px' } }} style={{ background: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)', borderRadius: 12 }}>
              <Statistic title={<span style={{ color: '#666', fontSize: 13 }}>任务总数</span>} value={totalTasks} valueStyle={{ color: '#1677ff', fontSize: 28, fontWeight: 700 }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} styles={{ body: { padding: '16px 20px' } }} style={{ background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)', borderRadius: 12 }}>
              <Statistic title={<span style={{ color: '#666', fontSize: 13 }}>进行中</span>} value={inProgressTasks} valueStyle={{ color: '#fa8c16', fontSize: 28, fontWeight: 700 }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} styles={{ body: { padding: '16px 20px' } }} style={{ background: 'linear-gradient(135deg, #f6ffed 0%, #b7eb8f 100%)', borderRadius: 12 }}>
              <Statistic title={<span style={{ color: '#666', fontSize: 13 }}>完成率</span>} value={completionRate} suffix="%" prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} valueStyle={{ color: '#52c41a', fontSize: 28, fontWeight: 700 }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} styles={{ body: { padding: '16px 20px' } }} style={{ background: delayRate > 15 ? 'linear-gradient(135deg, #fff2e8 0%, #ffbb96 100%)' : 'linear-gradient(135deg, #f9f0ff 0%, #d3adf7 100%)', borderRadius: 12 }}>
              <Statistic title={<span style={{ color: '#666', fontSize: 13 }}>延期率</span>} value={delayRate} suffix="%" prefix={<ClockCircleOutlined style={{ color: delayRate > 15 ? '#ff4d4f' : '#722ed1' }} />} valueStyle={{ color: delayRate > 15 ? '#ff4d4f' : '#722ed1', fontSize: 28, fontWeight: 700 }} />
            </Card>
          </Col>
        </Row>

        <Card bordered={false} styles={{ body: { padding: '16px 20px' } }} style={{ marginBottom: 20, borderRadius: 12, background: '#fafafa' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#333' }}>合作伙伴任务完成情况</div>
          <Row gutter={16}>
            {partnerStats.map((p) => (
              <Col key={p.name} xs={24} sm={12} lg={6}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#666', flexShrink: 0, minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <Progress percent={p.rate} size="small" strokeColor={p.rate >= 80 ? '#52c41a' : p.rate >= 50 ? '#faad14' : '#ff4d4f'} style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, color: '#999', minWidth: 50 }}>{p.completed}/{p.total}</span>
                </div>
              </Col>
            ))}
          </Row>
        </Card>

        <Card bordered={false} styles={{ body: { padding: '0 24px 24px' } }} style={{ borderRadius: 12 }}>
          <div style={{ padding: '16px 0 12px' }}>
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} sm={12} lg={6}>
                <Input placeholder="搜索任务名称..." prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} allowClear style={{ borderRadius: 8 }} />
              </Col>
              <Col xs={24} sm={12} lg={4}>
                <Select placeholder="选择状态" style={{ width: '100%', borderRadius: 8 }} allowClear value={filters.status || undefined} onChange={(v) => setFilters({ ...filters, status: v || '' })}>
                  {Object.entries(STATUS_MAP).map(([value, { text }]) => <Select.Option key={value} value={value}>{text}</Select.Option>)}
                </Select>
              </Col>
              <Col xs={24} sm={12} lg={3}>
                <Select placeholder="优先级" style={{ width: '100%' }} allowClear value={filters.priority || undefined} onChange={(v) => setFilters({ ...filters, priority: v || '' })}>
                  {Object.entries(PRIORITY_MAP).map(([value, { text }]) => <Select.Option key={value} value={value}>{text}</Select.Option>)}
                </Select>
              </Col>
              <Col xs={24} sm={12} lg={5}>
                <Select placeholder="选择合作伙伴" style={{ width: '100%' }} allowClear showSearch optionFilterProp="label" value={filters.partner_id} onChange={(v) => setFilters({ ...filters, partner_id: v })}>
                  {mockPartners.map((p) => <Select.Option key={p.id} value={p.id} label={p.name}>{p.name}</Select.Option>)}
                </Select>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <RangePicker style={{ width: '100%', borderRadius: 8 }} value={filters.dateRange} onChange={(dates) => setFilters({ ...filters, dateRange: dates as any })} placeholder={['开始日期', '结束日期']} />
              </Col>
              <Col xs={24} sm={12} lg={24} style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setFilters({ name: '', status: '', priority: '', partner_id: undefined, dateRange: undefined })}>重置</Button>
                  <Button type="primary" icon={<SearchOutlined />} onClick={fetchTasks}>搜索</Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ background: '#1677ff' }}>新建任务</Button>
                </Space>
              </Col>
            </Row>
          </div>
          <Table columns={columns} dataSource={tasks} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true, showTotal: (total) => `共 ${total} 条记录` }} scroll={{ x: 1200 }} />
        </Card>

        <Modal title={<div style={{ fontSize: 16, fontWeight: 600, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>新建任务</div>} open={createModalVisible} onOk={handleSubmit} onCancel={() => setCreateModalVisible(false)} okText="创建" cancelText="取消" width={680} destroyOnClose maskClosable={false}>
          <Form form={form} layout="vertical" requiredMark="optional" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={24}><Form.Item label="任务名称" name="name" rules={[{ required: true, message: '请输入任务名称', whitespace: true }]}><Input placeholder="请输入任务名称" maxLength={100} showCount /></Form.Item></Col>
              <Col span={24}><Form.Item label="任务描述" name="description"><TextArea rows={3} placeholder="请输入任务详细描述..." maxLength={500} showCount /></Form.Item></Col>
              <Col span={12}><Form.Item label="任务类型" name="type" rules={[{ required: true, message: '请选择任务类型' }]}><Select placeholder="请选择任务类型">{TASK_TYPES.map((t) => <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>)}</Select></Form.Item></Col>
              <Col span={12}><Form.Item label="合作伙伴" name="partner_id" rules={[{ required: true, message: '请选择合作伙伴' }]}><Select placeholder="请选择合作伙伴" showSearch optionFilterProp="label">{mockPartners.map((p) => <Select.Option key={p.id} value={p.id} label={p.name}>{p.name}</Select.Option>)}</Select></Form.Item></Col>
              <Col span={12}><Form.Item label="优先级" name="priority" rules={[{ required: true, message: '请选择优先级' }]} initialValue="MEDIUM"><Select>{Object.entries(PRIORITY_MAP).map(([value, { text, color }]) => <Select.Option key={value} value={value}><Tag color={color} style={{ borderRadius: 10 }}>{text}</Tag></Select.Option>)}</Select></Form.Item></Col>
              <Col span={12}><Form.Item label="预算（元）" name="budget" rules={[{ required: true, message: '请输入预算' }]}><Input type="number" placeholder="0" min={0} style={{ width: '100%' }} addonAfter="元" /></Form.Item></Col>
              <Col span={24}><Form.Item label="执行周期" name="date_range" rules={[{ required: true, message: '请选择执行周期' }]}><RangePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={24}><Form.Item label="交付标准" name="delivery_standard"><TextArea rows={2} placeholder="请描述任务交付标准..." maxLength={300} showCount /></Form.Item></Col>
              <Col span={24}><Form.Item label="需求文档" name="requirement_doc" extra="支持 PDF、Word、Excel、图片等格式，单个文件不超过 50MB"><Upload.Dragger fileList={uploadFileList} onChange={({ fileList }) => setUploadFileList(fileList)} beforeUpload={() => false} maxCount={5} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"><p style={{ margin: 0 }}><UploadOutlined style={{ fontSize: 28, color: '#1677ff' }} /></p><p style={{ margin: '8px 0 0', color: '#666', fontSize: 13 }}>点击或拖拽上传文件</p><p style={{ margin: 0, color: '#999', fontSize: 12 }}>支持多文件上传</p></Upload.Dragger></Form.Item></Col>
            </Row>
          </Form>
        </Modal>

        <Drawer title={<Space><FileTextOutlined style={{ color: '#1677ff' }} /><span style={{ fontWeight: 600 }}>任务详情</span>{selectedTask && <Tag color={STATUS_MAP[selectedTask.status].color} style={{ borderRadius: 10 }}>{STATUS_MAP[selectedTask.status].text}</Tag>}</Space>} open={detailVisible} onClose={() => setDetailVisible(false)} width={780} styles={{ body: { padding: '0 24px 24px' } }}
          extra={selectedTask && <Space>
            {selectedTask.status === 'DRAFT' && (<><Button size="small" onClick={() => handleAssign(selectedTask)}>分配</Button><Button type="primary" size="small" onClick={() => handleSubmitForAudit(selectedTask)}>提交审批</Button></>)}
            {selectedTask.status === 'PENDING_AUDIT' && (<><Button size="small" danger onClick={() => handleAuditReject(selectedTask)}>拒绝</Button><Button type="primary" size="small" onClick={() => handleAuditPass(selectedTask)}>通过</Button></>)}
            {['ASSIGNED', 'IN_PROGRESS'].includes(selectedTask.status) && (<><Button size="small" onClick={() => handleUpdateProgress(selectedTask)}>更新进度</Button>{selectedTask.status === 'IN_PROGRESS' && <Button type="primary" size="small" onClick={() => handleUploadDeliverable(selectedTask)}>提交交付物</Button>}</>)}
            {selectedTask.status === 'DELIVERED' && (<><Button size="small" danger onClick={() => handleRejectAccept(selectedTask)}>拒绝</Button><Button type="primary" size="small" onClick={() => handleAccept(selectedTask)}>验收</Button></>)}
          </Space>}
        >
          {selectedTask && (
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane tab="基本信息" key="info">
                <Descriptions column={2} bordered size="small" style={{ marginTop: 16 }}>
                  <Descriptions.Item label="任务名称" span={2}><strong>{selectedTask.name}</strong></Descriptions.Item>
                  <Descriptions.Item label="合作伙伴">{selectedTask.partner_name}</Descriptions.Item>
                  <Descriptions.Item label="开发者">{selectedTask.developer_name || <span style={{ color: '#999' }}>未分配</span>}</Descriptions.Item>
                  <Descriptions.Item label="任务类型">{TASK_TYPES.find((t) => t.value === selectedTask.type)?.label}</Descriptions.Item>
                  <Descriptions.Item label="优先级"><Tag color={PRIORITY_MAP[selectedTask.priority].color} style={{ borderRadius: 10 }}>{PRIORITY_MAP[selectedTask.priority].text}</Tag></Descriptions.Item>
                  <Descriptions.Item label="开始日期">{selectedTask.start_date}</Descriptions.Item>
                  <Descriptions.Item label="结束日期"><Space>{selectedTask.end_date}{dayjs(selectedTask.end_date).isBefore(dayjs()) && selectedTask.status !== 'COMPLETED' && selectedTask.status !== 'ARCHIVED' && <Tooltip title="已超时"><WarningOutlined style={{ color: '#ff4d4f' }} /></Tooltip>}</Space></Descriptions.Item>
                  <Descriptions.Item label="预算">{selectedTask.budget?.toLocaleString()} 元</Descriptions.Item>
                  <Descriptions.Item label="当前进度"><Space><Progress percent={selectedTask.progress} size="small" style={{ width: 120 }} /><span style={{ color: '#666', fontSize: 12 }}>{selectedTask.progress}%</span></Space></Descriptions.Item>
                  {selectedTask.description && <Descriptions.Item label="任务描述" span={2}>{selectedTask.description}</Descriptions.Item>}
                  {selectedTask.delivery_standard && <Descriptions.Item label="交付标准" span={2}>{selectedTask.delivery_standard}</Descriptions.Item>}
                </Descriptions>
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#333' }}>任务流程</div>
                  <Steps current={getStepIndex(selectedTask.status)} size="small" status={selectedTask.status === 'REJECTED' ? 'error' : selectedTask.status === 'COMPLETED' ? 'finish' : 'process'} items={[{ title: '创建', description: '草稿' }, { title: '审批', description: '待审核' }, { title: '分配', description: '已分配' }, { title: '执行', description: '进行中' }, { title: '完成', description: '已完成' }]} />
                </div>
              </TabPane>
              <TabPane tab={<span>任务分配{assignments.length > 0 && <Badge count={assignments.length} size="small" style={{ marginLeft: 6 }} />}</span>} key="assignments">
                <div style={{ marginTop: 16 }}>
                  <Space style={{ marginBottom: 12 }}><Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleAssign(selectedTask)} disabled={!['DRAFT', 'ASSIGNED'].includes(selectedTask.status)}>分配开发者</Button></Space>
                  {assignments.length === 0 ? (<div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}><FileTextOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />暂无分配记录</div>) : (<Table dataSource={assignments} rowKey="id" pagination={false} size="small" columns={[{ title: '开发者', dataIndex: 'developer_name', key: 'developer_name' }, { title: '角色', dataIndex: 'role', key: 'role' }, { title: '分配时间', dataIndex: 'assigned_at', key: 'assigned_at' }, { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => { const colors: Record<string, string> = { ACCEPTED: '#52c41a', REJECTED: '#ff4d4f', PENDING: '#faad14' }; const texts: Record<string, string> = { ACCEPTED: '已接受', REJECTED: '已拒绝', PENDING: '待确认' }; return <Tag color={colors[s]} style={{ borderRadius: 8 }}>{texts[s]}</Tag> } }]} />)}
                </div>
              </TabPane>
              <TabPane tab={<span>进度跟踪{progressList.length > 0 && <Badge count={progressList.length} size="small" style={{ marginLeft: 6 }} />}</span>} key="progress">
                <div style={{ marginTop: 16 }}>
                  <Space style={{ marginBottom: 12 }}><Button type="primary" size="small" icon={<UploadOutlined />} onClick={() => handleUpdateProgress(selectedTask)} disabled={!['ASSIGNED', 'IN_PROGRESS'].includes(selectedTask.status)}>更新进度</Button></Space>
                  {progressList.length === 0 ? (<div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}><ClockCircleOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />暂无进度记录</div>) : (<Timeline items={progressList.map((r) => ({ color: r.progress === 100 ? 'green' : r.progress >= 50 ? 'blue' : 'gray', children: (<div><div style={{ fontWeight: 500 }}>{r.content}</div><div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{r.created_at} · {r.creator_name} · 进度 {r.progress}%</div></div>) }))} />)}
                </div>
              </TabPane>
              <TabPane tab={<span>交付物{deliverables.length > 0 && <Badge count={deliverables.length} size="small" style={{ marginLeft: 6 }} />}</span>} key="deliverables">
                <div style={{ marginTop: 16 }}>
                  <Space style={{ marginBottom: 12 }}><Button type="primary" size="small" icon={<UploadOutlined />} onClick={() => handleUploadDeliverable(selectedTask)} disabled={!['IN_PROGRESS'].includes(selectedTask.status)}>上传交付物</Button></Space>
                  {deliverables.length === 0 ? (<div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}><FileTextOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />暂无交付物</div>) : (<Table dataSource={deliverables} rowKey="id" pagination={false} size="small" columns={[{ title: '文件名', dataIndex: 'name', key: 'name', render: (n: string) => <a>{n}</a> }, { title: '大小', dataIndex: 'file_size', key: 'file_size', render: (s: number) => `${(s / 1024 / 1024).toFixed(2)} MB` }, { title: '上传人', dataIndex: 'uploaded_by', key: 'uploaded_by' }, { title: '上传时间', dataIndex: 'uploaded_at', key: 'uploaded_at' }, { title: '操作', key: 'action', render: () => (<Space size={4}><Button type="link" size="small" icon={<DownloadOutlined />}>下载</Button><Popconfirm title="确认删除？" okText="删除" cancelText="取消" okButtonProps={{ danger: true }}><Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button></Popconfirm></Space>) }]} />)}
                </div>
              </TabPane>
              <TabPane tab="归档记录" key="archives"><div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}><FileTextOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />归档记录将在任务归档后显示</div></TabPane>
            </Tabs>
          )}
        </Drawer>

        <Modal title="分配开发者" open={assignModalVisible} onOk={handleAssignSubmit} onCancel={() => setAssignModalVisible(false)} okText="确认分配" cancelText="取消" destroyOnClose>
          <Form form={assignForm} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="选择开发者" name="developer_id" rules={[{ required: true, message: '请选择开发者' }]}><Select placeholder="请选择开发者" showSearch optionFilterProp="label">{mockDevelopers.map((d) => <Select.Option key={d.id} value={d.id} label={`${d.name} - ${d.skill}`}><Space><span>{d.name}</span><Tag color="blue" style={{ borderRadius: 8, fontSize: 11 }}>{d.skill}</Tag></Space></Select.Option>)}</Select></Form.Item>
            <Form.Item label="角色" name="role" rules={[{ required: true, message: '请输入角色' }]} initialValue="主开发"><Select><Select.Option value="主开发">主开发</Select.Option><Select.Option value="辅助开发">辅助开发</Select.Option><Select.Option value="测试">测试</Select.Option><Select.Option value="设计">设计</Select.Option></Select></Form.Item>
          </Form>
        </Modal>

        <Modal title="更新进度" open={progressModalVisible} onOk={handleProgressSubmit} onCancel={() => setProgressModalVisible(false)} okText="确认更新" cancelText="取消" destroyOnClose>
          <Form form={progressForm} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="当前进度（%）" name="progress" rules={[{ required: true, message: '请输入进度' }]} initialValue={selectedTask?.progress || 0}><Input type="number" min={0} max={100} placeholder="0-100" /></Form.Item>
            <Form.Item label="进度说明" name="content" rules={[{ required: true, message: '请输入进度说明', whitespace: true }]}><TextArea rows={3} placeholder="请描述当前进度情况..." maxLength={300} showCount /></Form.Item>
          </Form>
        </Modal>

        <Modal title="上传交付物" open={deliverableModalVisible} onOk={handleDeliverableSubmit} onCancel={() => setDeliverableModalVisible(false)} okText="确认提交" cancelText="取消" destroyOnClose>
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="交付物文件" extra="支持压缩包、文档、图片等格式，单个文件不超过 100MB"><Upload.Dragger fileList={deliverableFileList} onChange={({ fileList }) => setDeliverableFileList(fileList)} beforeUpload={() => false} maxCount={10} accept=".zip,.rar,.7z,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"><p style={{ margin: 0 }}><UploadOutlined style={{ fontSize: 32, color: '#1677ff' }} /></p><p style={{ margin: '8px 0 0', color: '#666' }}>点击或拖拽上传交付物</p><p style={{ margin: 0, color: '#999', fontSize: 12 }}>支持多文件上传</p></Upload.Dragger></Form.Item>
            <Form.Item label="交付说明"><TextArea rows={2} placeholder="可选：填写交付说明..." /></Form.Item>
          </Form>
        </Modal>

        <Modal title={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} />验收确认</Space>} open={acceptModalVisible} onOk={handleAcceptSubmit} onCancel={() => setAcceptModalVisible(false)} okText="确认验收通过" cancelText="取消" okButtonProps={{ style: { background: '#52c41a' } }} destroyOnClose>
          <div style={{ marginTop: 16 }}>
            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 12, marginBottom: 16 }}><div style={{ fontWeight: 600, color: '#52c41a', marginBottom: 4 }}>验收通过</div><div style={{ fontSize: 13, color: '#666' }}>确认所有交付物符合要求，任务完成验收。</div></div>
            <Form form={acceptForm} layout="vertical"><Form.Item label="验收意见" name="comment"><TextArea rows={2} placeholder="可选：填写验收意见..." /></Form.Item></Form>
          </div>
        </Modal>

        <Modal title={<Space><ClockCircleOutlined style={{ color: '#fa8c16' }} />申请延期</Space>} open={delayModalVisible} onOk={handleDelaySubmit} onCancel={() => setDelayModalVisible(false)} okText="提交申请" cancelText="取消" okButtonProps={{ style: { background: '#fa8c16' } }} destroyOnClose>
          <Form form={delayForm} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="原交付日期"><Input value={selectedTask?.end_date} disabled /></Form.Item>
            <Form.Item label="延期原因" name="reason" rules={[{ required: true, message: '请输入延期原因', whitespace: true }]}><TextArea rows={3} placeholder="请详细描述延期原因..." maxLength={300} showCount /></Form.Item>
            <Form.Item label="新的交付时间" name="new_end_date" rules={[{ required: true, message: '请选择新的交付时间' }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  )
}

export default TaskRegistration
