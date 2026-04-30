import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useDebounceSearch } from '@/hooks/useDebounceSearch'
import apiClient from '@/api/axios'
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
  ConfigProvider,
  Slider,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
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
  EditOutlined,
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
  requirementDoc?: string
  developer_id?: number
  developer_name?: string
  developer_count?: number
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

interface DelayRecord {
  id: number
  task_id: number
  reason: string
  new_end_date: string
  status: string
  approver_id?: number
  approved_at?: string
  created_at: string
  approver_name?: string
}

const PRIORITY_MAP: Record<Priority, { color: string; text: string }> = {
  LOW: { color: 'default', text: '低' },
  MEDIUM: { color: 'processing', text: '中' },
  HIGH: { color: 'warning', text: '高' },
  URGENT: { color: 'error', text: '紧急' },
}
const PRIORITY_SORT: Record<Priority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 }
const STATUS_SORT: Record<TaskStatus, number> = { DRAFT: 1, PENDING_AUDIT: 2, ASSIGNED: 3, IN_PROGRESS: 4, DELIVERED: 5, COMPLETED: 6, REJECTED: 7, ARCHIVED: 8 }

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

const TaskRegistration: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [partners, setPartners] = useState<{id: number, name: string}[]>([])
  const [developers, setDevelopers] = useState<{id: number, name: string}[]>([])
  const [taskTypes, setTaskTypes] = useState<{value: string, label: string}[]>([{ value: 'development', label: '开发' }, { value: 'testing', label: '测试' }, { value: 'design', label: '设计' }, { value: 'maintenance', label: '运维' }, { value: 'deployment', label: '部署' }])
  const [filters, setFilters] = useState({
    name: '',
    status: '' as TaskStatus | '',
    priority: '' as Priority | '',
    partner_id: undefined as number | undefined,
    dateRange: undefined as [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  })
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [delayModalVisible, setDelayModalVisible] = useState(false)
  const [assignModalVisible, setAssignModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [progressModalVisible, setProgressModalVisible] = useState(false)
  const [deliverableModalVisible, setDeliverableModalVisible] = useState(false)
  const [acceptModalVisible, setAcceptModalVisible] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [activeTab, setActiveTab] = useState('info')
  const [progressList, setProgressList] = useState<ProgressRecord[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()
  const [delayForm] = Form.useForm()
  const [assignForm] = Form.useForm()
  const [progressForm] = Form.useForm()
  const [acceptForm] = Form.useForm()
  const [uploadFileList, setUploadFileList] = useState<UploadFile[]>([])
  const [editUploadFileList, setEditUploadFileList] = useState<UploadFile[]>([])
  const [deliverableFileList, setDeliverableFileList] = useState<UploadFile[]>([])
  const [progressValue, setProgressValue] = useState(0)
  const [delayRecords, setDelayRecords] = useState<DelayRecord[]>([])

  const totalTasks = tasks.length
  const inProgressTasks = tasks.filter((t) => ['ASSIGNED', 'IN_PROGRESS', 'DELIVERED'].includes(t.status)).length
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const delayedTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'ARCHIVED' && dayjs(t.end_date).isBefore(dayjs())).length
  const delayRate = totalTasks > 0 ? Math.round((delayedTasks / totalTasks) * 100) : 0

  const partnerStats = partners.map((p) => {
    const pt = tasks.filter((t) => t.partner_id === p.id)
    const completed = pt.filter((t) => t.status === 'COMPLETED').length
    return { name: p.name, total: pt.length, completed, rate: pt.length > 0 ? Math.round((completed / pt.length) * 100) : 0 }
  })

  const fetchTasks = useCallback(async (filterOverride?: typeof filters) => {
    setLoading(true)
    try {
      const f = filterOverride ?? filtersRef.current
      const params = new URLSearchParams()
      if (f.name) params.append('name', f.name)
      if (f.status) params.append('status', f.status)
      if (f.priority) params.append('priority', f.priority)
      if (f.partner_id) params.append('partner_id', String(f.partner_id))
      const res = await apiClient.get(`/tasks?${params.toString()}`)
      setTasks(res.data || [])
    } catch { message.error('获取任务列表失败') } finally { setLoading(false) }
  }, [])

  const { debouncedSearch: debouncedSearchTasks, immediateSearch: immediateSearchTasks } = useDebounceSearch(fetchTasks, 300)

  useEffect(() => {
    fetchTasks()
    apiClient.get('/partners').then(res => { if (Array.isArray(res.data)) setPartners(res.data) }).catch(() => {})
    apiClient.get('/developers?limit=100').then(res => {
      const data = res.data
      if (Array.isArray(data)) setDevelopers(data.map((d: any) => ({ id: d.id, name: d.name })))
      else if (data.items) setDevelopers(data.items.map((d: any) => ({ id: d.id, name: d.name })))
    }).catch(() => {})
    apiClient.get('/tasks/types').then(res => {
      if (Array.isArray(res.data) && res.data.length > 0) setTaskTypes(res.data)
    }).catch(() => {})
  }, [])

  const handleCreate = () => { form.resetFields(); setUploadFileList([]); setCreateModalVisible(true) }
  const handleEdit = (task: Task) => {
    editForm.setFieldsValue({
      name: task.name,
      description: task.description,
      type: task.type,
      priority: task.priority,
      budget: task.budget,
      start_date: task.start_date ? dayjs(task.start_date) : null,
      end_date: task.end_date ? dayjs(task.end_date) : null,
      delivery_standard: task.delivery_standard,
    })
    if (task.requirementDoc) {
      setEditUploadFileList([{ uid: '-1', name: task.requirementDoc.split('/').pop() || 'requirement_doc', status: 'done', url: task.requirementDoc }])
    } else {
      setEditUploadFileList([])
    }
    setSelectedTask(task)
    setEditModalVisible(true)
  }
  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields()
      await apiClient.put(`/tasks/${selectedTask!.id}`, {
        name: values.name,
        description: values.description,
        type: values.type,
        priority: values.priority || 'MEDIUM',
        budget: values.budget,
        start_date: values.start_date?.format('YYYY-MM-DD'),
        end_date: values.end_date?.format('YYYY-MM-DD'),
        delivery_standard: values.delivery_standard,
      })
      message.success('任务已更新')
      setEditModalVisible(false)
      fetchTasks()
    } catch {}
  }
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await apiClient.post('/tasks', {
        name: values.name,
        description: values.description,
        type: values.type,
        partner_id: values.partner_id,
        priority: values.priority || 'MEDIUM',
        budget: values.budget,
        start_date: values.date_range?.[0]?.format('YYYY-MM-DD'),
        end_date: values.date_range?.[1]?.format('YYYY-MM-DD'),
        delivery_standard: values.delivery_standard,
      })
      message.success('任务创建成功')
      setCreateModalVisible(false)
      fetchTasks()
    } catch {}
  }
  const handleViewDetail = async (task: Task) => {
    setSelectedTask(task)
    setActiveTab('info')
    setDetailVisible(true)
    try {
      const [progRes, delRes, assignRes, delayRes] = await Promise.all([
        apiClient.get(`/tasks/${task.id}/progress`),
        apiClient.get(`/tasks/${task.id}/deliverables`),
        apiClient.get(`/tasks/${task.id}/assignments`),
        apiClient.get(`/tasks/${task.id}/delays`),
      ])
      setProgressList(Array.isArray(progRes.data) ? progRes.data : [])
      setDeliverables(Array.isArray(delRes.data) ? delRes.data : [])
      setAssignments(Array.isArray(assignRes.data) ? assignRes.data : [])
      setDelayRecords(Array.isArray(delayRes.data) ? delayRes.data : [])
    } catch { setProgressList([]); setDeliverables([]); setAssignments([]); setDelayRecords([]) }
  }
  const handleDelay = async (task: Task) => {
    setSelectedTask(task)
    delayForm.resetFields()
    try {
      const delayRes = await apiClient.get(`/tasks/${task.id}/delays`)
      const taskDelays = Array.isArray(delayRes.data) ? delayRes.data : []
      if (taskDelays.some((d: DelayRecord) => d.status === 'PENDING')) {
        Modal.warning({ title: '已有待审批的延期申请', content: '该任务存在尚未审批的延期申请，无法重复提交。' })
        return
      }
      setDelayModalVisible(true)
    } catch {
      setDelayModalVisible(true)
    }
  }
  const handleDelaySubmit = async () => {
    try {
      const values = await delayForm.validateFields()
      await apiClient.post(`/tasks/${selectedTask!.id}/delay`, null, { params: { reason: values.reason, new_end_date: values.new_end_date.format('YYYY-MM-DD') } })
      message.success('延期申请已提交，等待审批')
      setDelayModalVisible(false)
      fetchTasks()
    } catch {}
  }
  const handleDeleteAssignment = async (assignmentId: number) => {
    try {
      await apiClient.delete(`/tasks/${selectedTask!.id}/assignments/${assignmentId}`)
      setAssignments(prev => prev.filter(a => a.id !== assignmentId))
      message.success('分配已删除')
      fetchTasks()
    } catch { message.error('删除失败') }
  }
  const handleApproveDelay = async (delayId: number) => {
    try {
      await apiClient.put(`/tasks/${selectedTask!.id}/delays/${delayId}`, { action: 'APPROVED' })
      message.success('延期申请已通过')
      const delayRes = await apiClient.get(`/tasks/${selectedTask!.id}/delays`)
      setDelayRecords(Array.isArray(delayRes.data) ? delayRes.data : [])
      fetchTasks()
    } catch { message.error('操作失败') }
  }
  const handleRejectDelay = async (delayId: number) => {
    try {
      await apiClient.put(`/tasks/${selectedTask!.id}/delays/${delayId}`, { action: 'REJECTED' })
      message.success('延期申请已拒绝')
      const delayRes = await apiClient.get(`/tasks/${selectedTask!.id}/delays`)
      setDelayRecords(Array.isArray(delayRes.data) ? delayRes.data : [])
      fetchTasks()
    } catch { message.error('操作失败') }
  }
  const handleAssign = async (task: Task) => {
    setSelectedTask(task)
    assignForm.resetFields()
    try {
      const assignRes = await apiClient.get(`/tasks/${task.id}/assignments`)
      setAssignments(Array.isArray(assignRes.data) ? assignRes.data : [])
    } catch {
      setAssignments([])
    }
    setAssignModalVisible(true)
  }
  const handleAssignSubmit = async () => {
    try {
      const values = await assignForm.validateFields()
      const isDuplicate = assignments.some((a) => a.developer_id === values.developer_id && a.role === values.role)
      if (isDuplicate) { message.error('该开发者和角色组合已存在，请勿重复分配'); return }
      const res = await apiClient.post(`/tasks/${selectedTask!.id}/assign-developer`, {
        developer_id: values.developer_id,
        role: values.role,
      })
      const newAssign = res.data
      setAssignments((prev) => [...(prev || []), { id: newAssign.id, task_id: newAssign.task_id, developer_id: newAssign.developer_id, developer_name: newAssign.developer_name, role: newAssign.role, assigned_at: newAssign.assigned_at, status: (newAssign.status || 'ACCEPTED') as 'PENDING' | 'ACCEPTED' | 'REJECTED' }])
      message.success('开发者分配成功')
      assignForm.resetFields()
      fetchTasks()
    } catch {}
  }
  const handleSubmitForAudit = (task: Task) => {
    Modal.confirm({ title: '提交审批', icon: <ExclamationCircleOutlined />, content: '确认提交任务至审批？提交后任务将进入待审批状态。', okText: '确认提交', cancelText: '取消', onOk: async () => { try { await apiClient.put(`/tasks/${task.id}`, { status: 'PENDING_AUDIT' }); message.success('任务已提交审批'); fetchTasks() } catch {} } })
  }
  const handleAuditPass = (task: Task) => {
    Modal.confirm({ title: '审批通过', icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />, content: '确认审批通过？通过后任务将进入已分配状态。', okText: '通过', cancelText: '取消', onOk: async () => { try { await apiClient.post(`/tasks/${task.id}/accept`); message.success('审批已通过'); fetchTasks(); setDetailVisible(false) } catch {} } })
  }
  const handleAuditReject = (task: Task) => {
    Modal.confirm({ title: '审批拒绝', icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />, content: '确认拒绝该任务？', okText: '拒绝', cancelText: '取消', okButtonProps: { danger: true }, onOk: async () => { try { await apiClient.post(`/tasks/${task.id}/reject`, null, { params: { reason: '' } }); message.error('任务已被拒绝'); fetchTasks(); setDetailVisible(false) } catch {} } })
  }
  const handleUpdateProgress = (task: Task) => { setSelectedTask(task); progressForm.resetFields(); progressForm.setFieldsValue({ progress: task.progress }); setProgressValue(task.progress || 0); setProgressModalVisible(true) }
  const handleProgressSubmit = async () => {
    try {
      const values = await progressForm.validateFields()
      await apiClient.put(`/tasks/${selectedTask!.id}/progress`, { progress: values.progress, description: values.content, status: selectedTask!.status })
      message.success('进度已更新')
      setProgressModalVisible(false)
      await fetchTasks()
    } catch {}
  }
  const handleUploadDeliverable = (task: Task) => { setSelectedTask(task); setDeliverableFileList([]); setDeliverableModalVisible(true) }
  const handleDeliverableSubmit = async () => {
    try {
      const file = deliverableFileList[0]
      if (!file) { message.error('请上传交付物'); return }
      await apiClient.post(`/tasks/${selectedTask!.id}/deliverables`, null, { params: { name: file.name, file_url: file.url || '' } })
      message.success('交付物已上传')
      setDeliverableModalVisible(false)
      handleViewDetail(selectedTask!)
      fetchTasks()
    } catch { message.error('上传失败') }
  }
  const handleAccept = (task: Task) => { setSelectedTask(task); acceptForm.resetFields(); setAcceptModalVisible(true) }
  const handleAcceptSubmit = async () => {
    try {
      await acceptForm.validateFields()
      await apiClient.post(`/tasks/${selectedTask!.id}/accept`)
      message.success('任务已完成验收')
      setAcceptModalVisible(false)
      setDetailVisible(false)
      fetchTasks()
    } catch {}
  }
  const handleRejectAccept = (task: Task) => {
    Modal.confirm({ title: '拒绝验收', icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />, content: '确认拒绝本次交付物？', okText: '拒绝', cancelText: '取消', okButtonProps: { danger: true }, onOk: async () => { try { await apiClient.post(`/tasks/${task.id}/reject`, null, { params: { reason: '' } }); message.warning('已拒绝验收，任务退回进行中状态'); fetchTasks() } catch {} } })
  }
  const handleArchive = (task: Task) => {
    Modal.confirm({ title: '归档任务', icon: <FileTextOutlined />, content: '确认归档该任务？归档后可随时从归档区查看。', okText: '归档', cancelText: '取消', onOk: async () => { try { await apiClient.post(`/tasks/${task.id}/archive`); message.success('任务已归档'); fetchTasks() } catch {} } })
  }
  const handleDelete = (task: Task) => {
    Modal.confirm({ title: '删除任务', icon: <ExclamationCircleOutlined />, content: `确认删除任务"${task.name}"？此操作不可恢复。`, okText: '删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: async () => { try { await apiClient.delete(`/tasks/${task.id}`); message.success('任务已删除'); fetchTasks() } catch {} } })
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
    const isDraft = record.status === 'DRAFT'
    const isRejected = record.status === 'REJECTED'
    const isPendingAudit = record.status === 'PENDING_AUDIT'
    const isAssigned = record.status === 'ASSIGNED'
    const isInProgress = record.status === 'IN_PROGRESS'
    const isDelivered = record.status === 'DELIVERED'
    const isCompleted = record.status === 'COMPLETED'
    const isArchived = record.status === 'ARCHIVED'

    const allBtns = [
      { key: 'edit', label: '编辑', icon: <EditOutlined />, onClick: () => handleEdit(record), enabled: isDraft || isRejected, color: undefined },
      { key: 'submit', label: '提交', icon: <SendOutlined />, onClick: () => handleSubmitForAudit(record), enabled: isDraft, color: undefined },
      { key: 'assign', label: '分配', icon: <SendOutlined />, onClick: () => handleAssign(record), enabled: isDraft || isAssigned || isRejected, color: undefined },
      { key: 'pass', label: '通过', icon: <CheckOutlined />, onClick: () => handleAuditPass(record), enabled: isPendingAudit, color: '#52c41a' },
      { key: 'reject-audit', label: '拒绝', icon: <CloseCircleOutlined />, onClick: () => handleAuditReject(record), enabled: isPendingAudit, color: '#ff4d4f' },
      { key: 'progress', label: '进度', icon: <UploadOutlined />, onClick: () => handleUpdateProgress(record), enabled: isAssigned || isInProgress, color: undefined },
      { key: 'deliver', label: '交付', icon: <UploadOutlined />, onClick: () => handleUploadDeliverable(record), enabled: isInProgress, color: undefined },
      { key: 'accept', label: '验收', icon: <CheckCircleOutlined />, onClick: () => handleAccept(record), enabled: isDelivered, color: '#52c41a' },
      { key: 'reject-del', label: '拒绝', icon: <CloseCircleOutlined />, onClick: () => handleRejectAccept(record), enabled: isDelivered, color: '#ff4d4f' },
      { key: 'delay', label: '延期', icon: <ClockCircleOutlined />, onClick: () => handleDelay(record), enabled: isAssigned || isInProgress || isDelivered, color: undefined },
      { key: 'archive', label: '归档', icon: <FileTextOutlined />, onClick: () => handleArchive(record), enabled: (isCompleted || isRejected) && !isArchived, color: undefined },
      { key: 'delete', label: '删除', icon: <DeleteOutlined />, onClick: () => handleDelete(record), enabled: isCompleted || isRejected || isArchived, color: '#ff4d4f', danger: true, confirm: true },
    ]

    return (
      <Space size={4}>
        {allBtns.filter(b => b.enabled).map(b => (
          b.confirm ? (
            <Popconfirm key={b.key} title="确认删除？" onConfirm={b.onClick} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
              <Button type="link" size="small" icon={b.icon} danger style={b.color ? { color: b.color } : undefined}>
                {b.label}
              </Button>
            </Popconfirm>
          ) : (
            <Button key={b.key} type="link" size="small" icon={b.icon} onClick={b.onClick} style={b.color ? { color: b.color } : undefined}>
              {b.label}
            </Button>
          )
        ))}
      </Space>
    )
  }

  const columns: ColumnsType<Task> = [
    { title: '任务名称', dataIndex: 'name', key: 'name', ellipsis: true, render: (name: string, record) => <a onClick={() => handleViewDetail(record)} style={{ fontWeight: 500 }}>{name}</a> },
    { title: '合作伙伴', dataIndex: 'partner_name', key: 'partner_name', ellipsis: true },
    { title: '类型', dataIndex: 'type', key: 'type', render: (t: string) => taskTypes.find((x) => x.value === t)?.label || t },
    { title: '优先级', dataIndex: 'priority', key: 'priority', sorter: (a: Task, b: Task) => PRIORITY_SORT[a.priority] - PRIORITY_SORT[b.priority] || b.progress - a.progress || STATUS_SORT[a.status] - STATUS_SORT[b.status], defaultSortOrder: 'descend' as const, render: (p: Priority) => <Tag color={PRIORITY_MAP[p].color} style={{ borderRadius: 12 }}>{PRIORITY_MAP[p].text}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: TaskStatus) => <Badge status={STATUS_MAP[s].color as any} text={<span style={{ color: STATUS_MAP[s].color === 'error' ? '#ff4d4f' : STATUS_MAP[s].color === 'success' ? '#52c41a' : undefined }}>{STATUS_MAP[s].text}</span>} /> },
    { title: '进度', dataIndex: 'progress', key: 'progress', width: 130, render: (p: number, record) => <Progress percent={p} size="small" status={record.status === 'REJECTED' ? 'exception' : p === 100 ? 'success' : 'active'} strokeColor={record.status === 'REJECTED' ? '#ff4d4f' : p === 100 ? '#52c41a' : '#1677ff'} /> },
    { title: '开始日期', dataIndex: 'start_date', key: 'start_date', width: 110, render: (d: string) => d ? dayjs(d).format('YYYY-MM-DD') : '-' },
    { title: '结束日期', dataIndex: 'end_date', key: 'end_date', width: 110, render: (d: string) => d ? dayjs(d).format('YYYY-MM-DD') : '-' },
    { title: '开发者', dataIndex: 'developer_name', key: 'developer_name', ellipsis: true, render: (v, record: Task) => {
      if (!v) return <span style={{ color: '#999' }}>—</span>
      if (record.developer_count && record.developer_count > 1) {
        return <Space><span>{v}</span><Tooltip title={`共 ${record.developer_count} 人`}><span style={{ color: '#1677ff', cursor: 'pointer' }}>+{record.developer_count - 1}人</span></Tooltip></Space>
      }
      return <span>{v}</span>
    } },
    { title: '操作', key: 'action', width: 320, render: (_, record) => renderActionButtons(record) },
  ]

  const infoTabStyle = {
    wrapper: { padding: 0 } as React.CSSProperties,
    row: {
      display: 'grid',
      gridTemplateColumns: '120px 1fr 120px 1fr',
      borderBottom: '1px solid #f0f0f0',
    } as React.CSSProperties,
    fullRow: {
      display: 'grid',
      gridTemplateColumns: '120px 1fr',
      borderBottom: '1px solid #f0f0f0',
    } as React.CSSProperties,
    labelCol: {
      padding: '12px 16px',
      background: '#fafafa',
      fontSize: 13,
      color: '#8c8c8c',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'flex-start',
    } as React.CSSProperties,
    valueCol: {
      padding: '12px 16px',
      fontSize: 14,
      color: '#262626',
      wordBreak: 'break-word',
      textWrap: 'pretty',
      display: 'flex',
      alignItems: 'center',
    } as React.CSSProperties,
  }

  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ padding: '0 24px' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>任务登记管理</h1>
            <p style={{ color: '#999', margin: '4px 0 0', fontSize: 13 }}>创建、分配、跟踪、交付、验收全流程管理</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ background: '#1677ff', marginTop: 4 }}>新建任务</Button>
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
                <Input placeholder="搜索任务名称..." prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} value={filters.name} onChange={(e) => { const v = e.target.value; const nf = { ...filters, name: v }; setFilters(nf); debouncedSearchTasks(nf); }} allowClear style={{ borderRadius: 8 }} />
              </Col>
              <Col xs={24} sm={12} lg={4}>
                <Select placeholder="选择状态" style={{ width: '100%', borderRadius: 8 }} allowClear value={filters.status || undefined} onChange={(v) => { const nf = { ...filters, status: v || '' }; setFilters(nf); immediateSearchTasks(nf); }}>
                  {Object.entries(STATUS_MAP).map(([value, { text }]) => <Select.Option key={value} value={value}>{text}</Select.Option>)}
                </Select>
              </Col>
              <Col xs={24} sm={12} lg={3}>
                <Select placeholder="优先级" style={{ width: '100%' }} allowClear value={filters.priority || undefined} onChange={(v) => { const nf = { ...filters, priority: v || '' }; setFilters(nf); immediateSearchTasks(nf); }}>
                  {Object.entries(PRIORITY_MAP).map(([value, { text }]) => <Select.Option key={value} value={value}>{text}</Select.Option>)}
                </Select>
              </Col>
              <Col xs={24} sm={12} lg={5}>
                <Select placeholder="选择合作伙伴" style={{ width: '100%' }} allowClear showSearch optionFilterProp="label" value={filters.partner_id} onChange={(v) => { const nf = { ...filters, partner_id: v }; setFilters(nf); immediateSearchTasks(nf); }}>
                  {partners.map((p) => <Select.Option key={p.id} value={p.id} label={p.name}>{p.name}</Select.Option>)}
                </Select>
              </Col>
              <Col xs={24} sm={12} lg={5}>
                <RangePicker style={{ width: '100%', borderRadius: 8 }} value={filters.dateRange} onChange={(dates) => { const nf = { ...filters, dateRange: dates as any }; setFilters(nf); immediateSearchTasks(nf); }} placeholder={['开始日期', '结束日期']} allowClear />
              </Col>
            </Row>
          </div>
          <Table columns={columns} dataSource={tasks} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true, showTotal: (total) => `共 ${total} 条记录` }} scroll={{ x: 1200 }} />
        </Card>

        <Modal title={<Space><FileTextOutlined style={{ color: '#1677ff' }} /><span style={{ fontSize: 16, fontWeight: 600 }}>新建任务</span></Space>} open={createModalVisible} onOk={handleSubmit} onCancel={() => setCreateModalVisible(false)} okText="创建" cancelText="取消" width={720} destroyOnClose maskClosable={false} styles={{ body: { padding: '0 24px 24px' } }}>
          <Form form={form} layout="vertical" requiredMark="optional" style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 4, height: 16, background: '#1677ff', borderRadius: 2, display: 'inline-block' }} />基本信息</div>
              <Row gutter={12}>
                <Col span={24}><Form.Item label="任务名称" name="name" rules={[{ required: true, message: '请输入任务名称', whitespace: true }]} style={{ marginBottom: 12 }}><Input placeholder="请输入任务名称，如：BOSS系统接口优化" maxLength={100} showCount /></Form.Item></Col>
                <Col span={24}><Form.Item label="任务描述" name="description" style={{ marginBottom: 12 }}><TextArea rows={2} placeholder="请描述任务背景、目标和范围..." maxLength={500} showCount /></Form.Item></Col>
              </Row>
            </div>
            <div style={{ marginBottom: 20, padding: '16px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 4, height: 16, background: '#1677ff', borderRadius: 2, display: 'inline-block' }} />分类属性</div>
              <Row gutter={12}>
                <Col span={8}><Form.Item label="任务类型" name="type" rules={[{ required: true, message: '请选择' }]} style={{ marginBottom: 8 }}><Select placeholder="请选择">{taskTypes.map((t) => <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>)}</Select></Form.Item></Col>
                <Col span={10}><Form.Item label="合作伙伴" name="partner_id" rules={[{ required: true, message: '请选择' }]} style={{ marginBottom: 8 }}><Select placeholder="请选择合作伙伴" showSearch optionFilterProp="label">{partners.map((p) => <Select.Option key={p.id} value={p.id} label={p.name}>{p.name}</Select.Option>)}</Select></Form.Item></Col>
                <Col span={6}><Form.Item label="优先级" name="priority" rules={[{ required: true, message: '请选择' }]} initialValue="MEDIUM" style={{ marginBottom: 8 }}><Select>{Object.entries(PRIORITY_MAP).map(([value, { text, color }]) => <Select.Option key={value} value={value}><Tag color={color} style={{ borderRadius: 10 }}>{text}</Tag></Select.Option>)}</Select></Form.Item></Col>
              </Row>
            </div>
            <div style={{ marginBottom: 20, padding: '16px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 4, height: 16, background: '#1677ff', borderRadius: 2, display: 'inline-block' }} />计划与预算</div>
              <Row gutter={12}>
                <Col span={12}><Form.Item label="开始日期" name="date_range" rules={[{ required: true, message: '请选择' }]} style={{ marginBottom: 8 }}><DatePicker style={{ width: '100%' }} placeholder="开始日期" /></Form.Item></Col>
                <Col span={12}><Form.Item label="结束日期" style={{ marginBottom: 8 }}><DatePicker style={{ width: '100%' }} placeholder="结束日期" /></Form.Item></Col>
                <Col span={12}><Form.Item label="预算（元）" name="budget" rules={[{ required: true, message: '请输入' }]} style={{ marginBottom: 8 }}><Input type="number" placeholder="0" min={0} style={{ width: '100%' }} addonAfter="元" /></Form.Item></Col>
                <Col span={12}><Form.Item label="交付标准" name="delivery_standard" style={{ marginBottom: 8 }}><Input placeholder="请描述交付标准..." maxLength={300} /></Form.Item></Col>
              </Row>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 4, height: 16, background: '#1677ff', borderRadius: 2, display: 'inline-block' }} />需求文档</div>
              <Form.Item label="需求文档" name="requirement_doc" extra="支持 PDF、Word、Excel、图片等格式，单个文件不超过 50MB" style={{ marginBottom: 0 }}>
                <Upload.Dragger fileList={uploadFileList} onChange={({ fileList }) => setUploadFileList(fileList)} beforeUpload={() => false} maxCount={5} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png">
                  <p style={{ margin: 0 }}><UploadOutlined style={{ fontSize: 28, color: '#1677ff' }} /></p>
                  <p style={{ margin: '8px 0 0', color: '#666', fontSize: 13 }}>点击或拖拽上传文件</p>
                  <p style={{ margin: 0, color: '#999', fontSize: 12 }}>支持多文件上传</p>
                </Upload.Dragger>
              </Form.Item>
            </div>
          </Form>
        </Modal>

        <Modal title={<Space><EditOutlined style={{ color: '#1677ff' }} /><span style={{ fontSize: 16, fontWeight: 600 }}>编辑任务</span></Space>} open={editModalVisible} onOk={handleEditSubmit} onCancel={() => setEditModalVisible(false)} okText="保存" cancelText="取消" width={720} destroyOnClose maskClosable={false} styles={{ body: { padding: '0 24px 24px' } }}>
          <Form form={editForm} layout="vertical" requiredMark="optional" style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 4, height: 16, background: '#1677ff', borderRadius: 2, display: 'inline-block' }} />基本信息</div>
              <Row gutter={12}>
                <Col span={24}><Form.Item label="任务名称" name="name" rules={[{ required: true, message: '请输入任务名称', whitespace: true }]} style={{ marginBottom: 12 }}><Input placeholder="请输入任务名称" maxLength={100} showCount /></Form.Item></Col>
                <Col span={24}><Form.Item label="任务描述" name="description" style={{ marginBottom: 12 }}><TextArea rows={2} placeholder="请描述任务背景、目标和范围..." maxLength={500} showCount /></Form.Item></Col>
              </Row>
            </div>
            <div style={{ marginBottom: 20, padding: '16px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 4, height: 16, background: '#1677ff', borderRadius: 2, display: 'inline-block' }} />分类属性</div>
              <Row gutter={12}>
                <Col span={8}><Form.Item label="任务类型" name="type" rules={[{ required: true, message: '请选择' }]} style={{ marginBottom: 8 }}><Select placeholder="请选择">{taskTypes.map((t) => <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>)}</Select></Form.Item></Col>
                <Col span={8}><Form.Item label="优先级" name="priority" rules={[{ required: true, message: '请选择' }]} style={{ marginBottom: 8 }}><Select>{Object.entries(PRIORITY_MAP).map(([value, { text, color }]) => <Select.Option key={value} value={value}><Tag color={color} style={{ borderRadius: 10 }}>{text}</Tag></Select.Option>)}</Select></Form.Item></Col>
              </Row>
            </div>
            <div style={{ marginBottom: 20, padding: '16px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 4, height: 16, background: '#1677ff', borderRadius: 2, display: 'inline-block' }} />计划与预算</div>
              <Row gutter={12}>
                <Col span={12}><Form.Item label="开始日期" name="start_date" style={{ marginBottom: 8 }}><DatePicker style={{ width: '100%' }} placeholder="开始日期" /></Form.Item></Col>
                <Col span={12}><Form.Item label="结束日期" name="end_date" style={{ marginBottom: 8 }}><DatePicker style={{ width: '100%' }} placeholder="结束日期" /></Form.Item></Col>
                <Col span={12}><Form.Item label="预算（元）" name="budget" style={{ marginBottom: 8 }}><Input type="number" placeholder="0" min={0} style={{ width: '100%' }} addonAfter="元" /></Form.Item></Col>
                <Col span={12}><Form.Item label="交付标准" name="delivery_standard" style={{ marginBottom: 8 }}><Input placeholder="请描述交付标准..." maxLength={300} /></Form.Item></Col>
              </Row>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 4, height: 16, background: '#1677ff', borderRadius: 2, display: 'inline-block' }} />需求文档</div>
              <Form.Item label="需求文档" name="requirement_doc" extra="支持 PDF、Word、Excel、图片等格式，单个文件不超过 50MB，支持删除后重新上传" style={{ marginBottom: 0 }}>
                <Upload.Dragger fileList={editUploadFileList} onChange={({ fileList }) => setEditUploadFileList(fileList)} beforeUpload={() => false} maxCount={5} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png">
                  <p style={{ margin: 0 }}><UploadOutlined style={{ fontSize: 28, color: '#1677ff' }} /></p>
                  <p style={{ margin: '8px 0 0', color: '#666', fontSize: 13 }}>点击或拖拽上传文件</p>
                  <p style={{ margin: 0, color: '#999', fontSize: 12 }}>支持多文件上传</p>
                </Upload.Dragger>
              </Form.Item>
            </div>
          </Form>
        </Modal>

        <Drawer
          title={
            <Space>
              <FileTextOutlined style={{ color: '#1677ff' }} />
              <span style={{ fontWeight: 600 }}>任务详情</span>
              {selectedTask && (
                <Tag color={STATUS_MAP[selectedTask.status]?.color} style={{ borderRadius: 10 }}>
                  {STATUS_MAP[selectedTask.status]?.text}
                </Tag>
              )}
            </Space>
          }
          open={detailVisible}
          onClose={() => setDetailVisible(false)}
          width={820}
          styles={{ body: { padding: 0 } }}
          extra={
            selectedTask && (
              <Space>
                {['DRAFT', 'REJECTED'].includes(selectedTask.status) && (
                  <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(selectedTask)}>
                    编辑
                  </Button>
                )}
                {selectedTask.status === 'DRAFT' && (
                  <Button type="primary" size="small" onClick={() => handleSubmitForAudit(selectedTask)}>
                    提交审批
                  </Button>
                )}
                {['DRAFT', 'ASSIGNED'].includes(selectedTask.status) && (
                  <Button size="small" onClick={() => handleAssign(selectedTask)}>
                    分配
                  </Button>
                )}
                {selectedTask.status === 'PENDING_AUDIT' && (
                  <>
                    <Button size="small" danger onClick={() => handleAuditReject(selectedTask)}>
                      拒绝
                    </Button>
                    <Button type="primary" size="small" onClick={() => handleAuditPass(selectedTask)}>
                      通过
                    </Button>
                  </>
                )}
                {['ASSIGNED', 'IN_PROGRESS'].includes(selectedTask.status) && (
                  <>
                    <Button size="small" onClick={() => handleUpdateProgress(selectedTask)}>
                      更新进度
                    </Button>
                    {selectedTask.status === 'IN_PROGRESS' && (
                      <Button type="primary" size="small" onClick={() => handleUploadDeliverable(selectedTask)}>
                        提交交付物
                      </Button>
                    )}
                  </>
                )}
                {['ASSIGNED', 'IN_PROGRESS', 'DELIVERED'].includes(selectedTask.status) && (
                  <Button size="small" onClick={() => setActiveTab('delays')}>
                    延期申请
                  </Button>
                )}
                {selectedTask.status === 'DELIVERED' && (
                  <>
                    <Button size="small" danger onClick={() => handleRejectAccept(selectedTask)}>
                      拒绝
                    </Button>
                    <Button type="primary" size="small" onClick={() => handleAccept(selectedTask)}>
                      验收
                    </Button>
                  </>
                )}
              </Space>
            )
          }
        >
          {selectedTask && (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              tabBarStyle={{ padding: '0 24px', margin: 0, borderBottom: '1px solid #f0f0f0', background: '#fff' }}
            >
              <TabPane tab="基本信息" key="info">
                <div style={infoTabStyle.wrapper}>
                                  <div style={infoTabStyle.fullRow}>
                    <div style={infoTabStyle.labelCol}>任务名称</div>
                    <div style={{ ...infoTabStyle.valueCol, alignItems: 'flex-start', paddingTop: 10 }}>
                      <strong style={{ fontSize: 15 }}>{selectedTask.name}</strong>
                    </div>
                  </div>

                                  <div style={infoTabStyle.row}>
                    <div style={infoTabStyle.labelCol}>合作伙伴</div>
                    <div style={infoTabStyle.valueCol}>{selectedTask.partner_name}</div>
                    <div style={infoTabStyle.labelCol}>开发者</div>
                    <div style={{ ...infoTabStyle.valueCol, alignItems: 'center' }}>
                      <Space wrap size={[4, 4]}>
                        {assignments.length > 0
                          ? assignments.map(a => (
                              <Tag key={a.id} style={{ borderRadius: 6 }}>
                                {a.developer_name}
                                <span style={{ color: '#8c8c8c', marginLeft: 4, fontSize: 11 }}>({a.role})</span>
                              </Tag>
                            ))
                          : <span style={{ color: '#999' }}>未分配</span>}
                      </Space>
                    </div>
                  </div>

                                  <div style={infoTabStyle.row}>
                    <div style={infoTabStyle.labelCol}>任务类型</div>
                    <div style={infoTabStyle.valueCol}>
                      {taskTypes.find(t => t.value === selectedTask.type)?.label}
                    </div>
                    <div style={infoTabStyle.labelCol}>优先级</div>
                    <div style={infoTabStyle.valueCol}>
                      <Tag color={PRIORITY_MAP[selectedTask.priority]?.color} style={{ borderRadius: 10 }}>
                        {PRIORITY_MAP[selectedTask.priority]?.text}
                      </Tag>
                    </div>
                  </div>

                                  <div style={infoTabStyle.row}>
                    <div style={infoTabStyle.labelCol}>开始日期</div>
                    <div style={infoTabStyle.valueCol}>{selectedTask.start_date}</div>
                    <div style={infoTabStyle.labelCol}>结束日期</div>
                    <div style={infoTabStyle.valueCol}>
                      <Space>
                        {selectedTask.end_date}
                        {dayjs(selectedTask.end_date).isBefore(dayjs()) &&
                          !['COMPLETED', 'ARCHIVED'].includes(selectedTask.status) && (
                            <Tooltip title="已超时">
                              <WarningOutlined style={{ color: '#ff4d4f' }} />
                            </Tooltip>
                          )}
                      </Space>
                    </div>
                  </div>

                                  <div style={infoTabStyle.row}>
                    <div style={infoTabStyle.labelCol}>预算</div>
                    <div style={infoTabStyle.valueCol}>{selectedTask.budget?.toLocaleString()} 元</div>
                    <div style={infoTabStyle.labelCol}>当前进度</div>
                    <div style={{ ...infoTabStyle.valueCol, alignItems: 'center' }}>
                      <div style={{ flex: 1, maxWidth: 200, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${selectedTask.progress}%`, height: '100%', background: '#1677ff', borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontWeight: 600, color: '#1677ff', minWidth: 38, textAlign: 'right' }}>{selectedTask.progress}%</span>
                    </div>
                  </div>

                                  {selectedTask.description && (
                    <div style={infoTabStyle.fullRow}>
                      <div style={infoTabStyle.labelCol}>任务描述</div>
                      <div style={{ ...infoTabStyle.valueCol, alignItems: 'flex-start', paddingTop: 10 }}>
                        {selectedTask.description}
                      </div>
                    </div>
                  )}

                                  {selectedTask.delivery_standard && (
                    <div style={infoTabStyle.fullRow}>
                      <div style={infoTabStyle.labelCol}>交付标准</div>
                      <div style={{ ...infoTabStyle.valueCol, alignItems: 'flex-start', paddingTop: 10 }}>
                        {selectedTask.delivery_standard}
                      </div>
                    </div>
                  )}

                                  {selectedTask.requirementDoc && (
                    <div style={infoTabStyle.fullRow}>
                      <div style={infoTabStyle.labelCol}>需求文档</div>
                      <div style={{ ...infoTabStyle.valueCol, alignItems: 'center' }}>
                        <span style={{ wordBreak: 'break-all' }}>{selectedTask.requirementDoc.split('/').pop()}</span>
                        <Button
                          type="link"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => window.open(selectedTask.requirementDoc, '_blank')}
                        >
                          下载
                        </Button>
                      </div>
                    </div>
                  )}

                                  <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                    <Steps
                      current={getStepIndex(selectedTask.status)}
                      size="small"
                      status={
                        selectedTask.status === 'REJECTED'
                          ? 'error'
                          : selectedTask.status === 'COMPLETED'
                          ? 'finish'
                          : 'process'
                      }
                      items={[
                        { title: '创建', description: '草稿' },
                        { title: '审批', description: '待审核' },
                        { title: '分配', description: '已分配' },
                        { title: '执行', description: '进行中' },
                        { title: '完成', description: '已完成' },
                      ]}
                    />
                  </div>
                </div>
              </TabPane>
              <TabPane tab={<span>任务分配{assignments.length > 0 && <Badge count={assignments.length} size="small" style={{ marginLeft: 6 }} />}</span>} key="assignments">
                <div style={{ padding: '16px 24px' }}>
                  <Space style={{ marginBottom: 12 }}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleAssign(selectedTask)}
                      disabled={!['DRAFT', 'ASSIGNED'].includes(selectedTask.status)}
                    >
                      分配开发者
                    </Button>
                  </Space>
                  {assignments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
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
                        { title: '开发者', dataIndex: 'developer_name', key: 'developer_name' },
                        { title: '角色', dataIndex: 'role', key: 'role' },
                        { title: '分配时间', dataIndex: 'assigned_at', key: 'assigned_at' },
                        {
                          title: '状态',
                          dataIndex: 'status',
                          key: 'status',
                          render: (s: string) => {
                            const colors: Record<string, string> = { ACCEPTED: '#52c41a', REJECTED: '#ff4d4f', PENDING: '#faad14' }
                            const texts: Record<string, string> = { ACCEPTED: '已接受', REJECTED: '已拒绝', PENDING: '待确认' }
                            return <Tag color={colors[s]} style={{ borderRadius: 8 }}>{texts[s]}</Tag>
                          },
                        },
                        {
                          title: '操作',
                          key: 'action',
                          render: (_, record: Assignment) => (
                            <Popconfirm
                              title="确认删除该分配？"
                              onConfirm={() => handleDeleteAssignment(record.id)}
                              okText="删除"
                              cancelText="取消"
                              okButtonProps={{ danger: true }}
                            >
                              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                                删除
                              </Button>
                            </Popconfirm>
                          ),
                        },
                      ]}
                    />
                  )}
                </div>
              </TabPane>
              <TabPane tab={<span>进度跟踪{progressList.length > 0 && <Badge count={progressList.length} size="small" style={{ marginLeft: 6 }} />}</span>} key="progress">
                <div style={{ padding: '16px 24px' }}>
                  <Space style={{ marginBottom: 12 }}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<UploadOutlined />}
                      onClick={() => handleUpdateProgress(selectedTask)}
                      disabled={!['ASSIGNED', 'IN_PROGRESS'].includes(selectedTask.status)}
                    >
                      更新进度
                    </Button>
                  </Space>
                  {progressList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                      <ClockCircleOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                      暂无进度记录
                    </div>
                  ) : (
                    <Timeline
                      items={progressList.map(r => ({
                        color: r.progress === 100 ? 'green' : r.progress >= 50 ? 'blue' : 'gray',
                        children: (
                          <div>
                            <div style={{ fontWeight: 500 }}>{r.content}</div>
                            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                              {r.created_at} · {r.creator_name} · 进度 {r.progress}%
                            </div>
                          </div>
                        ),
                      }))}
                    />
                  )}
                </div>
              </TabPane>
              <TabPane tab={<span>交付物{deliverables.length > 0 && <Badge count={deliverables.length} size="small" style={{ marginLeft: 6 }} />}</span>} key="deliverables">
                <div style={{ padding: '16px 24px' }}>
                  <Space style={{ marginBottom: 12 }}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<UploadOutlined />}
                      onClick={() => handleUploadDeliverable(selectedTask)}
                      disabled={!['IN_PROGRESS'].includes(selectedTask.status)}
                    >
                      上传交付物
                    </Button>
                  </Space>
                  {deliverables.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
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
                        { title: '文件名', dataIndex: 'name', key: 'name', render: (n: string) => <a>{n}</a> },
                        {
                          title: '大小',
                          dataIndex: 'file_size',
                          key: 'file_size',
                          render: (s: number) => `${(s / 1024 / 1024).toFixed(2)} MB`,
                        },
                        { title: '上传人', dataIndex: 'uploaded_by', key: 'uploaded_by' },
                        { title: '上传时间', dataIndex: 'uploaded_at', key: 'uploaded_at' },
                        {
                          title: '操作',
                          key: 'action',
                          render: () => (
                            <Space size={4}>
                              <Button type="link" size="small" icon={<DownloadOutlined />}>
                                下载
                              </Button>
                              <Popconfirm
                                title="确认删除？"
                                okText="删除"
                                cancelText="取消"
                                okButtonProps={{ danger: true }}
                              >
                                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                                  删除
                                </Button>
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                    />
                  )}
                </div>
              </TabPane>
              <TabPane tab="归档记录" key="archives">
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  <FileTextOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                  归档记录将在任务归档后显示
                </div>
              </TabPane>
              <TabPane tab={<span>延期申请{delayRecords.length > 0 && <Badge count={delayRecords.length} size="small" style={{ marginLeft: 6 }} />}</span>} key="delays">
                <div style={{ padding: '16px 24px' }}>
                  {delayRecords.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                      <ClockCircleOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                      暂无延期申请
                    </div>
                  ) : (
                    delayRecords.map(delay => (
                      <Card key={delay.id} size="small" style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, color: '#262626', marginBottom: 4, wordBreak: 'break-word' }}>
                              {delay.reason}
                            </div>
                            <div style={{ fontSize: 12, color: '#999' }}>
                              申请延期至: {delay.new_end_date} · 申请时间: {delay.created_at}
                            </div>
                            {delay.status === 'APPROVED' && (
                              <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>
                                已通过 · 审批时间: {delay.approved_at}
                              </div>
                            )}
                            {delay.status === 'REJECTED' && (
                              <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>已拒绝</div>
                            )}
                            {delay.status === 'PENDING' && (
                              <div style={{ fontSize: 12, color: '#faad14', marginTop: 4 }}>待审批</div>
                            )}
                          </div>
                          {delay.status === 'PENDING' && (
                            <Space>
                              <Button
                                type="primary"
                                size="small"
                                style={{ background: '#52c41a' }}
                                onClick={() => handleApproveDelay(delay.id)}
                              >
                                通过
                              </Button>
                              <Button danger size="small" onClick={() => handleRejectDelay(delay.id)}>
                                拒绝
                              </Button>
                            </Space>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabPane>
            </Tabs>
          )}
        </Drawer>

        <Modal title="分配开发者" open={assignModalVisible} onCancel={() => setAssignModalVisible(false)} okText="确认分配" cancelText="取消" destroyOnClose footer={<Space style={{ width: '100%', justifyContent: 'flex-end' }}><Button onClick={() => setAssignModalVisible(false)}>关闭</Button><Button type="primary" onClick={handleAssignSubmit}>确认分配</Button></Space>}>
          {assignments.length > 0 && (
            <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>已分配人员</div>
              {assignments.map(a => (
                <Tag key={a.id} style={{ marginBottom: 4 }} closable onClose={() => handleDeleteAssignment(a.id)}>{a.developer_name} - {a.role}</Tag>
              ))}
            </div>
          )}
          <Form form={assignForm} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="选择开发者" name="developer_id" rules={[{ required: true, message: '请选择开发者' }]}><Select placeholder="请选择开发者" showSearch optionFilterProp="label">{developers.map((d) => <Select.Option key={d.id} value={d.id} label={d.name}><Space><span>{d.name}</span></Space></Select.Option>)}</Select></Form.Item>
            <Form.Item label="角色" name="role" rules={[{ required: true, message: '请输入角色' }]} initialValue="主开发"><Select><Select.Option value="主开发">主开发</Select.Option><Select.Option value="辅助开发">辅助开发</Select.Option><Select.Option value="测试">测试</Select.Option><Select.Option value="设计">设计</Select.Option></Select></Form.Item>
          </Form>
        </Modal>

        <Modal title="更新进度" open={progressModalVisible} onOk={handleProgressSubmit} onCancel={() => setProgressModalVisible(false)} okText="确认更新" cancelText="取消" destroyOnClose>
          <Form form={progressForm} layout="vertical" style={{ marginTop: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 14, color: '#666' }}>
              当前进度：<span style={{ fontSize: 20, color: '#1677ff', fontWeight: 600 }}>{progressValue}%</span>
            </div>
            <Form.Item label="当前进度（%）" name="progress" rules={[{ required: true, message: '请输入进度' }]} initialValue={selectedTask?.progress || 0}><Slider min={0} max={100} tooltip={{ formatter: (v) => v !== undefined ? `${v}%` : '0%' }} onChange={(v) => setProgressValue(v)} /></Form.Item>
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
            <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 8, border: '1px solid #ffd591' }}>
              <div style={{ fontSize: 13, color: '#666' }}>任务名称</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#262626', marginTop: 4 }}>{selectedTask?.name}</div>
            </div>
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
