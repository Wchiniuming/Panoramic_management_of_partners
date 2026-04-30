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
  Steps,
  Tree,
  Input,
  InputNumber,
  Descriptions,
  Drawer,
  Progress,
  Divider,
  Empty,
  ConfigProvider,
  Popconfirm,
  Upload,
  DatePicker,
  Row,
  Col,
  Card,
} from 'antd'
import {
  PlusOutlined,
  CheckCircleOutlined,
  RadarChartOutlined,
  FileTextOutlined,
  HistoryOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  DownloadOutlined,
  AuditOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import apiClient from '@/api/axios'
import dayjs from 'dayjs'
import zhCN from 'antd/locale/zh_CN'

const { TabPane } = Tabs
const { RangePicker } = DatePicker

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

interface TreeNode {
  title: React.ReactNode
  key: number
  children?: TreeNode[]
}

interface Indicator {
  id: number
  name: string
  parent_id: number | null
  weight: number
  scoring_type: string
  description: string
  children?: Indicator[]
}

interface AssessmentPlan {
  id: number
  name: string
  partner_id: number
  partner_name: string
  period_type: string
  start_date: string
  end_date: string
  status: string
  total_score?: number
  indicator_ids?: number[]
}

interface AssessmentReport {
  id: number
  plan_id: number
  partner_id: number
  partner_name: string
  total_score: number
  status: string
  created_at: string
  scores?: IndicatorScore[]
  strengths?: string
  weaknesses?: string
  suggestions?: string
}

interface IndicatorScore {
  indicator_id: number
  indicator_name: string
  weight: number
  score: number
  comment?: string
}

interface Partner {
  id: number
  name: string
}

const statusMap: Record<string, { color: string; text: string; bg: string }> = {
  DRAFT: { color: '#94a3b8', bg: '#f1f5f9', text: '草稿' },
  PENDING_AUDIT: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', text: '待审批' },
  APPROVED: { color: '#1890ff', bg: 'rgba(24, 144, 255, 0.1)', text: '已批准' },
  IN_PROGRESS: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', text: '进行中' },
  COMPLETED: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', text: '已完成' },
  PUBLISHED: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', text: '已发布' },
  REJECTED: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', text: '已拒绝' },
}

const mockIndicators: Indicator[] = [
  {
    id: 1,
    name: '技术能力',
    parent_id: null,
    weight: 30,
    scoring_type: 'quantitative',
    description: '评估合作伙伴的技术实力',
    children: [
      { id: 11, name: '代码质量', parent_id: 1, weight: 10, scoring_type: 'grade', description: '代码规范性、可维护性' },
      { id: 12, name: '架构设计', parent_id: 1, weight: 10, scoring_type: 'grade', description: '系统架构合理性' },
      { id: 13, name: '技术文档', parent_id: 1, weight: 10, scoring_type: 'grade', description: '文档完整性' },
    ],
  },
  {
    id: 2,
    name: '服务质量',
    parent_id: null,
    weight: 25,
    scoring_type: 'quantitative',
    description: '评估服务交付质量',
    children: [
      { id: 21, name: '响应时效', parent_id: 2, weight: 12, scoring_type: 'quantitative', description: '问题响应时间' },
      { id: 22, name: '交付质量', parent_id: 2, weight: 13, scoring_type: 'grade', description: '交付物质量' },
    ],
  },
  {
    id: 3,
    name: '项目管理',
    parent_id: null,
    weight: 20,
    scoring_type: 'quantitative',
    description: '项目管理能力',
    children: [
      { id: 31, name: '进度控制', parent_id: 3, weight: 10, scoring_type: 'quantitative', description: '项目进度管理' },
      { id: 32, name: '风险管理', parent_id: 3, weight: 10, scoring_type: 'grade', description: '风险识别与应对' },
    ],
  },
  {
    id: 4,
    name: '团队能力',
    parent_id: null,
    weight: 15,
    scoring_type: 'quantitative',
    description: '团队配置与能力',
    children: [
      { id: 41, name: '人员配置', parent_id: 4, weight: 8, scoring_type: 'grade', description: '人员数量与资质' },
      { id: 42, name: '培训支持', parent_id: 4, weight: 7, scoring_type: 'grade', description: '培训与知识传递' },
    ],
  },
  {
    id: 5,
    name: '合作信誉',
    parent_id: null,
    weight: 10,
    scoring_type: 'quantitative',
    description: '历史合作表现',
    children: [
      { id: 51, name: '历史履约', parent_id: 5, weight: 5, scoring_type: 'quantitative', description: '历史项目完成情况' },
      { id: 52, name: '合规表现', parent_id: 5, weight: 5, scoring_type: 'grade', description: '遵守法规与合同' },
    ],
  },
]

const getMockPlans = (partners: Partner[]): AssessmentPlan[] => [
  { id: 1, name: '2024年Q1季度评估', partner_id: partners[0]?.id || 1, partner_name: partners[0]?.name || '加载中...', period_type: 'quarterly', start_date: '2024-01-01', end_date: '2024-03-31', status: 'COMPLETED', total_score: 85 },
  { id: 2, name: '2024年Q2季度评估', partner_id: partners[0]?.id || 1, partner_name: partners[0]?.name || '加载中...', period_type: 'quarterly', start_date: '2024-04-01', end_date: '2024-06-30', status: 'IN_PROGRESS' },
  { id: 3, name: '2024年Q1季度评估', partner_id: partners[1]?.id || 2, partner_name: partners[1]?.name || '加载中...', period_type: 'quarterly', start_date: '2024-01-01', end_date: '2024-03-31', status: 'COMPLETED', total_score: 72 },
  { id: 4, name: '2024年Q2季度评估', partner_id: partners[1]?.id || 2, partner_name: partners[1]?.name || '加载中...', period_type: 'quarterly', start_date: '2024-04-01', end_date: '2024-06-30', status: 'PENDING_AUDIT' },
  { id: 5, name: '2024年年度评估', partner_id: partners[2]?.id || 3, partner_name: partners[2]?.name || '加载中...', period_type: 'annual', start_date: '2024-01-01', end_date: '2024-12-31', status: 'DRAFT' },
]

const getMockReports = (partners: Partner[]): AssessmentReport[] => [
  { id: 1, plan_id: 1, partner_id: partners[0]?.id || 1, partner_name: partners[0]?.name || '加载中...', total_score: 85, status: 'PUBLISHED', created_at: '2024-04-01', strengths: '技术能力强，代码质量高，团队稳定', weaknesses: '响应时效有待提升', suggestions: '建议加强值班响应机制' },
  { id: 2, plan_id: 3, partner_id: partners[1]?.id || 2, partner_name: partners[1]?.name || '加载中...', total_score: 72, status: 'PENDING_AUDIT', created_at: '2024-04-02', strengths: '项目管理规范', weaknesses: '技术深度不足', suggestions: '建议提升核心技术能力' },
]

const VendorAssessment: React.FC = () => {
  const [activeTab, setActiveTab] = useState('plans')
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [plans, setPlans] = useState<AssessmentPlan[]>([])
  const [reports, setReports] = useState<AssessmentReport[]>([])
  const [loading, setLoading] = useState(false)
  const [indicatorModalVisible, setIndicatorModalVisible] = useState(false)
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null)
  const [wizardVisible, setWizardVisible] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [wizardData, setWizardData] = useState<Record<string, any>>({})
  const [form] = Form.useForm()
  const [planDetailVisible, setPlanDetailVisible] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<AssessmentPlan | null>(null)
  const [executionVisible, setExecutionVisible] = useState(false)
  const [executionPlan, setExecutionPlan] = useState<AssessmentPlan | null>(null)
  const [executionScores, setExecutionScores] = useState<Record<number, number>>({})
  const [executionComments, setExecutionComments] = useState<Record<number, string>>({})
  const [executionSWSC, setExecutionSWSC] = useState({ strengths: '', weaknesses: '', suggestions: '' })
  const [reportDetailVisible, setReportDetailVisible] = useState(false)
  const [selectedReport, setSelectedReport] = useState<AssessmentReport | null>(null)
  const [auditComment, setAuditComment] = useState('')
  const [partners, setPartners] = useState<Partner[]>([])

  const [planFilters, setPlanFilters] = useState({
    name: '',
    partner_id: undefined as number | undefined,
    status: undefined as string | undefined,
    period_type: undefined as string | undefined,
  })

  const filteredPlans = plans.filter(plan => {
    if (planFilters.name && !plan.name.toLowerCase().includes(planFilters.name.toLowerCase())) return false
    if (planFilters.partner_id && plan.partner_id !== planFilters.partner_id) return false
    if (planFilters.status && plan.status !== planFilters.status) return false
    if (planFilters.period_type && plan.period_type !== planFilters.period_type) return false
    return true
  })

  useEffect(() => {
    fetchIndicators()
    fetchPlans()
    fetchReports()
    fetchPartners()
  }, [])

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

  const fetchIndicators = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/assessment/indicators')
      const data = response.data
      if (Array.isArray(data) && data.length > 0) {
        setIndicators(data)
      } else {
        setIndicators(mockIndicators)
      }
    } catch {
      setIndicators(mockIndicators)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPlans = useCallback(async () => {
    try {
      const response = await apiClient.get('/assessment/plans')
      const data = response.data
      if (Array.isArray(data) && data.length > 0) {
        setPlans(data)
      } else {
        setPlans(getMockPlans(partners))
      }
    } catch {
      setPlans(getMockPlans(partners))
    }
  }, [partners])

  const fetchReports = useCallback(async () => {
    try {
      const response = await apiClient.get('/assessment/reports')
      const data = response.data
      if (Array.isArray(data) && data.length > 0) {
        setReports(data)
      } else {
        setReports(getMockReports(partners))
      }
    } catch {
      setReports(getMockReports(partners))
    }
  }, [partners])

  const handleCreateIndicator = () => {
    setEditingIndicator(null)
    form.resetFields()
    setIndicatorModalVisible(true)
  }

  const handleEditIndicator = (ind: Indicator) => {
    setEditingIndicator(ind)
    form.setFieldsValue({
      name: ind.name,
      parent_id: ind.parent_id,
      weight: ind.weight,
      scoring_type: ind.scoring_type,
      description: ind.description,
    })
    setIndicatorModalVisible(true)
  }

  const handleDeleteIndicator = async (ind: Indicator) => {
    try {
      await apiClient.delete(`/assessment/indicators/${ind.id}`)
      message.success('删除成功')
      fetchIndicators()
    } catch {
      message.error('删除失败')
    }
  }

  const handleIndicatorSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingIndicator) {
        await apiClient.put(`/assessment/indicators/${editingIndicator.id}`, values)
        message.success('更新成功')
      } else {
        await apiClient.post('/assessment/indicators', values)
        message.success('创建成功')
      }
      setIndicatorModalVisible(false)
      fetchIndicators()
    } catch {
      message.error('操作失败，请检查输入')
    }
  }

  const handleStartWizard = () => {
    setWizardData({})
    setWizardStep(0)
    setWizardVisible(true)
  }

  const handleWizardNext = () => {
    if (wizardStep === 0 && !wizardData.partner_id) {
      message.error('请选择合作伙伴')
      return
    }
    if (wizardStep === 1 && (!wizardData.indicator_ids || wizardData.indicator_ids.length === 0)) {
      message.error('请选择评估指标')
      return
    }
    setWizardStep(wizardStep + 1)
  }

  const handleWizardFinish = async () => {
    if (!wizardData.name) {
      message.error('请输入计划名称')
      return
    }
    if (!wizardData.partner_id) {
      message.error('请选择合作伙伴')
      return
    }
    if (!wizardData.indicator_ids || wizardData.indicator_ids.length === 0) {
      message.error('请选择至少一个评估指标')
      return
    }
    try {
      await apiClient.post('/assessment/plans', {
        name: wizardData.name,
        partner_id: wizardData.partner_id,
        period_type: wizardData.period_type || 'quarterly',
        start_date: wizardData.start_date,
        end_date: wizardData.end_date,
        indicator_ids: wizardData.indicator_ids,
        status: 'DRAFT',
      })
      message.success('评估计划创建成功')
      setWizardVisible(false)
      fetchPlans()
    } catch {
      message.error('创建失败')
    }
  }

  const handleViewPlanDetail = (plan: AssessmentPlan) => {
    setSelectedPlan(plan)
    setPlanDetailVisible(true)
  }

  const handleStartExecution = (plan: AssessmentPlan) => {
    setExecutionPlan(plan)
    setExecutionScores({})
    setExecutionComments({})
    setExecutionSWSC({ strengths: '', weaknesses: '', suggestions: '' })

    if (plan.status === 'IN_PROGRESS') {
      Promise.all([
        apiClient.get(`/assessment/plans/${plan.id}/results`),
        apiClient.get('/assessment/reports').catch(() => ({ data: [] })),
      ]).then(([resultsRes, reportsRes]) => {
        const results = resultsRes.data || []
        const scoresMap: Record<number, number> = {}
        const commentsMap: Record<number, string> = {}
        results.forEach((r: any) => {
          scoresMap[r.indicator_id] = r.score
          if (r.comment) commentsMap[r.indicator_id] = r.comment
        })
        setExecutionScores(scoresMap)
        setExecutionComments(commentsMap)

        const existingReport = (reportsRes.data || []).find((r: any) => r.plan_id === plan.id)
        if (existingReport) {
          setExecutionSWSC({
            strengths: existingReport.strengths || '',
            weaknesses: existingReport.weaknesses || '',
            suggestions: existingReport.suggestions || '',
          })
        }
      }).catch(() => {})
    }

    setExecutionVisible(true)
  }

  const handleExecutionSubmit = async () => {
    if (!executionPlan) return
    const scoreEntries = Object.entries(executionScores)
    if (scoreEntries.length === 0) {
      message.error('请至少填写一个指标评分')
      return
    }
    try {
      await apiClient.post(`/assessment/plans/${executionPlan.id}/execute`, {
        scores: scoreEntries.map(([id, score]) => ({
          indicator_id: Number(id),
          score,
          comment: executionComments[Number(id)] || '',
        })),
        ...executionSWSC,
        finalize: true,
      })
      message.success('评估执行提交成功')
      setExecutionVisible(false)
      fetchPlans()
      fetchReports()
    } catch {
      message.error('提交失败')
    }
  }

  const handleSaveProgress = async (finalize: boolean) => {
    if (!executionPlan) return
    const scoreEntries = Object.entries(executionScores)
    if (scoreEntries.length === 0) {
      message.error('请至少填写一个指标评分')
      return
    }
    try {
      const res = await apiClient.post(`/assessment/plans/${executionPlan.id}/execute`, {
        scores: scoreEntries.map(([id, score]) => ({
          indicator_id: Number(id),
          score,
          comment: executionComments[Number(id)] || '',
        })),
        ...executionSWSC,
        finalize,
      })
      message.success(finalize ? '评估执行提交成功' : '进度已保存')
      setExecutionVisible(false)
      fetchPlans()
      if (finalize) fetchReports()
    } catch {
      message.error('保存失败')
    }
  }

  const handleAudit = (plan: AssessmentPlan, action: 'APPROVED' | 'REJECTED' | 'SUBMIT') => {
    if (action === 'SUBMIT') {
      Modal.confirm({
        title: '提交审批',
        content: <p>确认提交计划「{plan.name}」进行审批？</p>,
        onOk: async () => {
          try {
            await apiClient.post(`/assessment/plans/${plan.id}/audit`, { action: 'submit' })
            message.success('提交审批成功')
            fetchPlans()
          } catch {
            message.error('操作失败')
          }
        },
      })
      return
    }
    setSelectedPlan(plan)
    setAuditComment('')
    Modal.confirm({
      title: action === 'APPROVED' ? '审批通过' : '审批拒绝',
      content: (
        <div>
          <p>确认{action === 'APPROVED' ? '通过' : '拒绝'}计划「{plan.name}」？</p>
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
          const backendAction = action === 'APPROVED' ? 'approve' : 'reject'
          await apiClient.post(`/assessment/plans/${plan.id}/audit`, { action: backendAction, comment: auditComment })
          message.success(action === 'APPROVED' ? '审批通过' : '审批拒绝')
          fetchPlans()
        } catch {
          message.error('操作失败')
        }
      },
    })
  }

  const handleViewReportDetail = (report: AssessmentReport) => {
    setSelectedReport(report)
    setReportDetailVisible(true)
  }

  const handleReportAudit = async (report: AssessmentReport, action: 'APPROVED' | 'REJECTED') => {
    try {
      const backendAction = action === 'APPROVED' ? 'approve' : 'reject'
      await apiClient.post(`/assessment/reports/${report.id}/audit`, { action: backendAction })
      message.success(action === 'APPROVED' ? '审核通过' : '审核拒绝')
      fetchReports()
    } catch {
      message.error('操作失败')
    }
  }

  const handleImportIndicators = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      await apiClient.post('/assessment/indicators/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      message.success('导入成功')
      fetchIndicators()
    } catch {
      message.error('导入失败，请检查文件格式')
    }
    return false
  }

  const handleDownloadIndicatorTemplate = () => {
    const headers = ['指标名称', '上级指标ID', '权重(%)', '评分类型', '描述']
    const sampleRows = [
      ['技术能力', '', '30', 'quantitative', '技术能力评估'],
      ['代码质量', '1', '10', 'grade', '代码规范性'],
    ]
    const csv = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '评估指标导入模板.csv'
    link.click()
    URL.revokeObjectURL(url)
    message.success('模板已下载')
  }

  const getTreeData = (items: Indicator[]): TreeNode[] => {
    return items.map(ind => ({
      title: (
        <Space>
          <span style={{ fontWeight: 500, color: colorPalette.textPrimary }}>{ind.name}</span>
          <Tag color="blue" style={{ fontSize: 11, borderRadius: 4 }}>权重{ind.weight}%</Tag>
          <Tag color={ind.scoring_type === 'quantitative' ? 'green' : 'orange'} style={{ fontSize: 11, borderRadius: 4 }}>
            {ind.scoring_type === 'quantitative' ? '量化' : '等级'}
          </Tag>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={e => { e.stopPropagation(); handleEditIndicator(ind) }}
            style={{ color: colorPalette.primary }}
          />
          <Popconfirm
            title="确认删除"
            description={`确定删除指标「${ind.name}」吗？`}
            onConfirm={e => { e?.stopPropagation(); handleDeleteIndicator(ind) }}
            onCancel={e => e?.stopPropagation()}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={e => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
      key: ind.id,
      checkable: !ind.children || ind.children.length === 0,
      children: ind.children ? getTreeData(ind.children) : undefined,
    }))
  }

  const getFlatIndicators = (items: Indicator[], result: Indicator[] = []): Indicator[] => {
    for (const item of items) {
      result.push(item)
      if (item.children) getFlatIndicators(item.children, result)
    }
    return result
  }

  const getLeafIndicators = (items: Indicator[], result: Indicator[] = []): Indicator[] => {
    for (const item of items) {
      if (!item.children || item.children.length === 0) {
        result.push(item)
      } else {
        getLeafIndicators(item.children, result)
      }
    }
    return result
  }

  const getParentIndicators = (items: Indicator[], result: Indicator[] = []): Indicator[] => {
    for (const item of items) {
      if (item.children && item.children.length > 0) {
        result.push(item)
        getParentIndicators(item.children, result)
      }
    }
    return result
  }

  const planColumns: ColumnsType<AssessmentPlan> = [
    { title: '计划名称', dataIndex: 'name', key: 'name', width: 200 },
    { title: '合作伙伴', dataIndex: 'partner_name', key: 'partner_name', width: 140 },
    {
      title: '评估周期',
      dataIndex: 'period_type',
      key: 'period_type',
      width: 100,
      render: (v: string) => ({ quarterly: '季度', annual: '年度', onetime: '一次性' }[v] || v),
    },
    { title: '开始日期', dataIndex: 'start_date', key: 'start_date', width: 120 },
    { title: '结束日期', dataIndex: 'end_date', key: 'end_date', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => {
        const map = statusMap[s]
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 500,
            background: map?.bg,
            color: map?.color,
          }}>
            {map?.text || s}
          </span>
        )
      },
    },
    {
      title: '综合得分',
      dataIndex: 'total_score',
      key: 'total_score',
      width: 100,
      render: (score?: number) =>
        score != null ? (
          <span style={{ color: score >= 80 ? colorPalette.success : score >= 60 ? colorPalette.warning : colorPalette.error, fontWeight: 600 }}>
            {score}
          </span>
        ) : (
          <span style={{ color: colorPalette.textMuted }}>-</span>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewPlanDetail(record)} title="查看详情" style={{ padding: '2px 6px' }} />
          {record.status === 'DRAFT' && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setSelectedPlan(record); setWizardStep(2); setWizardData(record); setWizardVisible(true) }} title="编辑" style={{ padding: '2px 6px' }} />
              <Button type="link" size="small" icon={<AuditOutlined />} onClick={() => handleAudit(record, 'SUBMIT')} title="提交审批" style={{ padding: '2px 6px', color: colorPalette.warning }} />
            </>
          )}
          {record.status === 'PENDING_AUDIT' && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleAudit(record, 'APPROVED')} title="审批通过" style={{ padding: '2px 6px', color: colorPalette.success }} />
              <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleAudit(record, 'REJECTED')} title="审批拒绝" style={{ padding: '2px 6px' }} />
            </>
          )}
          {record.status === 'APPROVED' && (
            <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleStartExecution(record)} title="开始评估" style={{ padding: '2px 6px' }} />
          )}
          {record.status === 'IN_PROGRESS' && (
            <Button type="link" size="small" icon={<SyncOutlined spin />} onClick={() => handleStartExecution(record)} title="继续评估" style={{ padding: '2px 6px' }} />
          )}
        </Space>
      ),
    },
  ]

  const reportColumns: ColumnsType<AssessmentReport> = [
    { title: '合作伙伴', dataIndex: 'partner_name', key: 'partner_name', width: 140 },
    { title: '评估时间', dataIndex: 'created_at', key: 'created_at', width: 120 },
    {
      title: '综合得分',
      dataIndex: 'total_score',
      key: 'total_score',
      width: 100,
      render: (score: number) => (
        <span
          style={{
            color: score >= 80 ? colorPalette.success : score >= 60 ? colorPalette.warning : colorPalette.error,
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          {score}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => {
        const map = statusMap[s]
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 500,
            background: map?.bg,
            color: map?.color,
          }}>
            {map?.text || s}
          </span>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => handleViewReportDetail(record)} title="查看报告" style={{ padding: '2px 6px' }} />
          {record.status === 'PENDING_AUDIT' && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleReportAudit(record, 'APPROVED')} title="审核通过" style={{ padding: '2px 6px', color: colorPalette.success }} />
              <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleReportAudit(record, 'REJECTED')} title="审核拒绝" style={{ padding: '2px 6px' }} />
            </>
          )}
        </Space>
      ),
    },
  ]

  const stats = {
    totalIndicators: getFlatIndicators(indicators).length,
    activePlans: plans.filter(p => p.status === 'IN_PROGRESS' || p.status === 'APPROVED').length,
    monthlyReports: reports.length,
    avgScore: reports.length > 0 ? Math.round((reports.reduce((s, r) => s + r.total_score, 0) / reports.length) * 10) / 10 : 0,
  }

  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: colorPalette.textPrimary, letterSpacing: '-0.02em', marginBottom: 4 }}>厂商支撑能力评估</h1>
            <p style={{ fontSize: 14, color: colorPalette.textSecondary }}>全面管理合作伙伴的技术能力、服务质量与综合信誉</p>
          </div>
        </div>

        <Row gutter={20} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              style={{ borderTop: `3px solid ${colorPalette.purple}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              styles={{ body: { padding: 22 } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: colorPalette.purpleLight, marginBottom: 16 }}>
                <RadarChartOutlined style={{ fontSize: 22, color: colorPalette.purple }} />
              </div>
              <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>评估指标总数</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginTop: 4 }}>{stats.totalIndicators}</div>
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
              <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>进行中的计划</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginTop: 4 }}>{stats.activePlans}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              style={{ borderTop: `3px solid ${colorPalette.primary}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              styles={{ body: { padding: 22 } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: colorPalette.primaryLight, marginBottom: 16 }}>
                <FileTextOutlined style={{ fontSize: 22, color: colorPalette.primary }} />
              </div>
              <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>评估报告总数</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: colorPalette.textPrimary, lineHeight: 1, marginTop: 4 }}>{stats.monthlyReports}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              style={{ borderTop: `3px solid ${stats.avgScore >= 80 ? colorPalette.success : stats.avgScore >= 60 ? colorPalette.warning : colorPalette.error}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              styles={{ body: { padding: 22 } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: stats.avgScore >= 80 ? colorPalette.successLight : stats.avgScore >= 60 ? colorPalette.warningLight : colorPalette.errorLight, marginBottom: 16 }}>
                <BarChartOutlined style={{ fontSize: 22, color: stats.avgScore >= 80 ? colorPalette.success : stats.avgScore >= 60 ? colorPalette.warning : colorPalette.error }} />
              </div>
              <div style={{ fontSize: 13, color: colorPalette.textSecondary }}>平均得分</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: stats.avgScore >= 80 ? colorPalette.success : stats.avgScore >= 60 ? colorPalette.warning : colorPalette.error, lineHeight: 1, marginTop: 4 }}>
                {stats.avgScore}<span style={{ fontSize: 14, fontWeight: 400, color: colorPalette.textMuted, marginLeft: 2 }}>分</span>
              </div>
            </Card>
          </Col>
        </Row>

        <div style={{ background: colorPalette.card, borderRadius: 14, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
          <div style={{ borderBottom: `1px solid ${colorPalette.borderLight}`, padding: '0 24px', background: colorPalette.card }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="large"
              tabBarStyle={{ marginBottom: 0, borderBottom: 'none' }}
            >
              <TabPane
                tab={<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}><AuditOutlined /> 评估计划</span>}
                key="plans"
              />
              <TabPane
                tab={<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}><RadarChartOutlined /> 评估指标</span>}
                key="indicators"
              />
              <TabPane
                tab={<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}><FileTextOutlined /> 评估报告</span>}
                key="reports"
              />
            </Tabs>
          </div>

          <div style={{ padding: 24 }}>
            {activeTab === 'indicators' && (
              <>
                <div style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateIndicator} style={{ borderRadius: 8, fontWeight: 500, height: 36 }}>
                    新建指标
                  </Button>
                  <Upload beforeUpload={handleImportIndicators} showUploadList={false} accept=".xlsx,.xls,.csv">
                    <Button icon={<UploadOutlined />} style={{ borderRadius: 8, height: 36 }}>
                      导入指标
                    </Button>
                  </Upload>
                  <Button icon={<DownloadOutlined />} onClick={handleDownloadIndicatorTemplate} style={{ borderRadius: 8, height: 36 }}>
                    导出指标
                  </Button>
                </div>
                {indicators.length > 0 ? (
                  <div style={{
                    background: colorPalette.bg,
                    borderRadius: 10,
                    border: `1px solid ${colorPalette.border}`,
                    padding: 16,
                  }}>
                    <Tree
                      showLine={{ showLeafIcon: false }}
                      selectable={false}
                      treeData={getTreeData(indicators)}
                      defaultExpandAll
                      blockNode
                      style={{ background: 'transparent' }}
                    />
                  </div>
                ) : (
                  <Empty description="暂无评估指标" style={{ padding: 40 }} />
                )}
              </>
            )}

            {activeTab === 'plans' && (
              <>
                <div style={{ background: colorPalette.bg, borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Input
                    placeholder="搜索计划名称"
                    prefix={<SearchOutlined style={{ color: colorPalette.textMuted }} />}
                    value={planFilters.name}
                    onChange={e => { setPlanFilters({ ...planFilters, name: e.target.value }); }}
                    style={{ width: 200, borderRadius: 8 }}
                    allowClear
                  />
                  <Select
                    placeholder="选择合作伙伴"
                    style={{ width: 180 }}
                    allowClear
                    value={planFilters.partner_id}
                    onChange={v => setPlanFilters({ ...planFilters, partner_id: v || undefined })}
                  >
                    {partners.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
                  </Select>
                  <Select
                    placeholder="评估周期"
                    style={{ width: 120 }}
                    allowClear
                    value={planFilters.period_type}
                    onChange={v => setPlanFilters({ ...planFilters, period_type: v || undefined })}
                  >
                    <Select.Option value="quarterly">季度</Select.Option>
                    <Select.Option value="annual">年度</Select.Option>
                    <Select.Option value="onetime">一次性</Select.Option>
                  </Select>
                  <Select
                    placeholder="选择状态"
                    style={{ width: 120 }}
                    allowClear
                    value={planFilters.status}
                    onChange={v => setPlanFilters({ ...planFilters, status: v || undefined })}
                  >
                    <Select.Option value="DRAFT">草稿</Select.Option>
                    <Select.Option value="PENDING_AUDIT">待审批</Select.Option>
                    <Select.Option value="APPROVED">已审批</Select.Option>
                    <Select.Option value="IN_PROGRESS">进行中</Select.Option>
                    <Select.Option value="COMPLETED">已完成</Select.Option>
                  </Select>
                  <div style={{ flex: 1 }} />
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleStartWizard} style={{ borderRadius: 8, fontWeight: 500, height: 36 }}>
                    新建评估计划
                  </Button>
                </div>
                <Table
                  columns={planColumns}
                  dataSource={filteredPlans}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: total => `共 ${total} 条`,
                  } as TablePaginationConfig}
                  scroll={{ x: 1100 }}
                  size="middle"
                  style={{ borderRadius: 8, overflow: 'hidden' }}
                />
              </>
            )}

            {activeTab === 'reports' && (
              <>
                <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
                  <Button icon={<HistoryOutlined />} style={{ borderRadius: 8, height: 36 }}>
                    历史对比
                  </Button>
                  <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, height: 36 }}>
                    导出报告
                  </Button>
                </div>
                <Table
                  columns={reportColumns}
                  dataSource={reports}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: total => `共 ${total} 条`,
                  } as TablePaginationConfig}
                  size="middle"
                  style={{ borderRadius: 8, overflow: 'hidden' }}
                />

                <div style={{
                  marginTop: 24,
                  background: colorPalette.bg,
                  borderRadius: 10,
                  border: `1px solid ${colorPalette.border}`,
                  padding: 24,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <RadarChartOutlined style={{ fontSize: 16, color: colorPalette.purple }} />
                      <span style={{ fontSize: 15, fontWeight: 600, color: colorPalette.textPrimary }}>得分趋势对比 - {partners[0]?.name || '加载中...'}</span>
                    </div>
                    <Select
                      placeholder="选择合作伙伴"
                      style={{ width: 180 }}
                      options={partners.map(p => ({ label: p.name, value: p.id }))}
                    />
                  </div>
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    background: colorPalette.card,
                    borderRadius: 10,
                    border: `1px solid ${colorPalette.border}`,
                  }}>
                    <TeamOutlined style={{ fontSize: 48, color: colorPalette.textMuted, marginBottom: 12 }} />
                    <p style={{ margin: 0, fontSize: 14, color: colorPalette.textSecondary, fontWeight: 500 }}>雷达图展示区域</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: colorPalette.textMuted }}>可视化展示各指标维度得分对比（Q1 vs Q2）</p>
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 24 }}>
                      <Space>
                        <span style={{ display: 'inline-block', width: 12, height: 12, background: colorPalette.primary, borderRadius: 2 }}></span>
                        <span style={{ fontSize: 13, color: colorPalette.textSecondary }}>Q1得分</span>
                      </Space>
                      <Space>
                        <span style={{ display: 'inline-block', width: 12, height: 12, background: colorPalette.success, borderRadius: 2 }}></span>
                        <span style={{ fontSize: 13, color: colorPalette.textSecondary }}>Q2得分</span>
                      </Space>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <Modal
          title={
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 16,
              fontWeight: 600,
              color: colorPalette.textPrimary,
              borderBottom: `2px solid ${colorPalette.primary}`,
              paddingBottom: 12,
              marginBottom: -16,
            }}>
              <div style={{
                width: 4,
                height: 18,
                background: colorPalette.primary,
                borderRadius: 2,
              }} />
              {editingIndicator ? '编辑评估指标' : '新建评估指标'}
            </div>
          }
          open={indicatorModalVisible}
          onOk={handleIndicatorSubmit}
          onCancel={() => setIndicatorModalVisible(false)}
          width={500}
          okText={editingIndicator ? '保存' : '创建'}
          cancelText="取消"
          styles={{ body: { paddingTop: 20 } }}
          style={{ top: 120 }}
        >
          <Form form={form} layout="vertical" requiredMark="optional">
            <Form.Item label={<span style={{ fontWeight: 500 }}>指标名称</span>} name="name" rules={[{ required: true, message: '请输入指标名称' }]}>
              <Input placeholder="请输入指标名称" maxLength={100} style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item label={<span style={{ fontWeight: 500 }}>上级指标</span>} name="parent_id">
              <Select placeholder="选择上级指标（可选）" allowClear style={{ borderRadius: 8 }}>
                {getFlatIndicators(indicators)
                  .filter(ind => !editingIndicator || ind.id !== editingIndicator.id)
                  .map(ind => (
                    <Select.Option key={ind.id} value={ind.id}>{ind.name}</Select.Option>
                  ))}
              </Select>
            </Form.Item>
            <Form.Item
              label={<span style={{ fontWeight: 500 }}>权重(%)</span>}
              name="weight"
              rules={[
                { required: true, message: '请输入权重' },
                { type: 'number', min: 0, max: 100, message: '权重需在0-100之间' },
              ]}
            >
              <InputNumber min={0} max={100} style={{ width: '100%', borderRadius: 8 }} placeholder="0-100" />
            </Form.Item>
            <Form.Item label={<span style={{ fontWeight: 500 }}>评分类型</span>} name="scoring_type" rules={[{ required: true, message: '请选择评分类型' }]}>
              <Select placeholder="选择评分类型" style={{ borderRadius: 8 }}>
                <Select.Option value="quantitative">量化评分（0-100分）</Select.Option>
                <Select.Option value="grade">等级评分（A/B/C/D）</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label={<span style={{ fontWeight: 500 }}>描述</span>} name="description">
              <Input.TextArea rows={3} placeholder="请输入指标描述" maxLength={500} style={{ borderRadius: 8 }} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 16,
              fontWeight: 600,
              color: colorPalette.textPrimary,
              borderBottom: `2px solid ${colorPalette.primary}`,
              paddingBottom: 12,
              marginBottom: -16,
            }}>
              <div style={{ width: 4, height: 18, background: colorPalette.primary, borderRadius: 2 }} />
              新建评估计划
            </div>
          }
          open={wizardVisible}
          onCancel={() => setWizardVisible(false)}
          footer={
            <Space>
              <Button onClick={() => setWizardVisible(false)} style={{ borderRadius: 8 }}>取消</Button>
              <Button type="primary" onClick={handleWizardFinish} style={{ borderRadius: 8 }}>创建</Button>
            </Space>
          }
          width={720}
          destroyOnClose
          style={{ top: 100 }}
          styles={{ body: { paddingTop: 20 } }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: colorPalette.primaryLight, borderRadius: 8, padding: '12px 16px', border: `1px solid ${colorPalette.border}` }}>
              <div style={{ fontWeight: 600, color: colorPalette.textPrimary, marginBottom: 12, fontSize: 14 }}>基本信息</div>
              <Form layout="vertical" requiredMark="optional">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Form.Item label={<span style={{ fontWeight: 500 }}>计划名称</span>} rules={[{ required: true, message: '请输入计划名称' }]}>
                    <Input
                      placeholder="如：2024年Q2季度评估"
                      value={wizardData.name || ''}
                      onChange={e => setWizardData(prev => ({ ...prev, name: e.target.value }))}
                      maxLength={200}
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>
                  <Form.Item label={<span style={{ fontWeight: 500 }}>合作伙伴</span>} rules={[{ required: true, message: '请选择合作伙伴' }]}>
                    <Select
                      placeholder="请选择合作伙伴"
                      value={wizardData.partner_id}
                      onChange={v => setWizardData(prev => ({ ...prev, partner_id: v }))}
                      showSearch
                      optionFilterProp="children"
                      style={{ width: '100%', borderRadius: 8 }}
                    >
                      {partners.map(p => (
                        <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item label={<span style={{ fontWeight: 500 }}>评估周期</span>}>
                    <Select
                      placeholder="选择评估周期"
                      value={wizardData.period_type}
                      onChange={v => setWizardData(prev => ({ ...prev, period_type: v }))}
                      style={{ width: '100%', borderRadius: 8 }}
                    >
                      <Select.Option value="quarterly">季度评估</Select.Option>
                      <Select.Option value="annual">年度评估</Select.Option>
                      <Select.Option value="onetime">一次性评估</Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label={<span style={{ fontWeight: 500 }}>评估时间范围</span>}>
                    <RangePicker
                      style={{ width: '100%', borderRadius: 8 }}
                      onChange={(dates) => {
                        if (dates && dates[0] && dates[1]) {
                          const [start, end] = dates
                          setWizardData(prev => ({
                            ...prev,
                            start_date: start!.format('YYYY-MM-DD'),
                            end_date: end!.format('YYYY-MM-DD'),
                          }))
                        }
                      }}
                      value={
                        wizardData.start_date
                          ? ([dayjs(wizardData.start_date), dayjs(wizardData.end_date)] as [dayjs.Dayjs, dayjs.Dayjs])
                          : null
                      }
                    />
                  </Form.Item>
                </div>
              </Form>
            </div>

            <div style={{ background: colorPalette.bg, borderRadius: 8, padding: '12px 16px', border: `1px solid ${colorPalette.border}` }}>
              <div style={{ fontWeight: 600, color: colorPalette.textPrimary, marginBottom: 12, fontSize: 14 }}>选择评估指标 <span style={{ color: colorPalette.textMuted, fontWeight: 400, fontSize: 12 }}>（仅可选择叶子指标）</span></div>
              <div style={{ background: '#fff', borderRadius: 8, border: `1px solid ${colorPalette.border}`, padding: 12, maxHeight: 280, overflow: 'auto' }}>
                <Tree
                  checkable
                  selectable={false}
                  treeData={getTreeData(indicators)}
                  checkedKeys={wizardData.indicator_ids || []}
                  onCheck={(checked) => {
                    const leafIds = getLeafIndicators(indicators).map(ind => ind.id)
                    const keys = (checked as number[]).filter(k => leafIds.includes(k))
                    setWizardData(prev => ({ ...prev, indicator_ids: keys }))
                  }}
                  defaultExpandAll
                />
              </div>
              <div style={{ color: colorPalette.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'right' }}>
                已选 <strong style={{ color: colorPalette.primary }}>{wizardData.indicator_ids?.length || 0}</strong> 个指标
              </div>
            </div>
          </div>
        </Modal>

        <Drawer
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 18, background: colorPalette.primary, borderRadius: 2 }} />
              <span style={{ fontWeight: 600, color: colorPalette.textPrimary }}>评估计划详情</span>
            </div>
          }
          open={planDetailVisible}
          onClose={() => setPlanDetailVisible(false)}
          width={640}
          extra={
            selectedPlan && selectedPlan.status !== 'COMPLETED' && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => { setPlanDetailVisible(false); handleStartExecution(selectedPlan) }}
                style={{ borderRadius: 8 }}
              >
                {selectedPlan.status === 'DRAFT' || selectedPlan.status === 'APPROVED' ? '开始评估' : '继续评估'}
              </Button>
            )
          }
        >
          {selectedPlan && (
            <>
              <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="计划名称" span={2}>
                  <span style={{ fontWeight: 500, color: colorPalette.textPrimary }}>{selectedPlan.name}</span>
                </Descriptions.Item>
                <Descriptions.Item label="合作伙伴">{selectedPlan.partner_name}</Descriptions.Item>
                <Descriptions.Item label="评估周期">
                  {{ quarterly: '季度', annual: '年度', onetime: '一次性' }[selectedPlan.period_type] || selectedPlan.period_type}
                </Descriptions.Item>
                <Descriptions.Item label="开始日期">{selectedPlan.start_date}</Descriptions.Item>
                <Descriptions.Item label="结束日期">{selectedPlan.end_date}</Descriptions.Item>
                <Descriptions.Item label="状态" span={2}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 500,
                    background: statusMap[selectedPlan.status]?.bg,
                    color: statusMap[selectedPlan.status]?.color,
                  }}>
                    {statusMap[selectedPlan.status]?.text || selectedPlan.status}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="综合得分" span={2}>
                  {selectedPlan.total_score != null ? (
                    <span style={{ color: selectedPlan.total_score >= 80 ? colorPalette.success : colorPalette.warning, fontWeight: 600, fontSize: 16 }}>
                      {selectedPlan.total_score}
                    </span>
                  ) : <span style={{ color: colorPalette.textMuted }}>待评估</span>}
                </Descriptions.Item>
              </Descriptions>

              {selectedPlan.status === 'PENDING_AUDIT' && (
                <>
                  <Divider style={{ margin: '16px 0' }} />
                  <Space>
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleAudit(selectedPlan, 'APPROVED')} style={{ borderRadius: 8 }}>
                      审批通过
                    </Button>
                    <Button danger icon={<CloseCircleOutlined />} onClick={() => handleAudit(selectedPlan, 'REJECTED')} style={{ borderRadius: 8 }}>
                      审批拒绝
                    </Button>
                  </Space>
                </>
              )}
            </>
          )}
        </Drawer>

        <Drawer
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 18, background: colorPalette.primary, borderRadius: 2 }} />
              <span style={{ fontWeight: 600, color: colorPalette.textPrimary }}>{executionPlan ? `执行评估 - ${executionPlan.name}` : '执行评估'}</span>
            </div>
          }
          open={executionVisible}
          onClose={() => setExecutionVisible(false)}
          width={720}
          extra={
            <Space>
              <Button onClick={() => setExecutionVisible(false)} style={{ borderRadius: 8 }}>取消</Button>
              {executionPlan?.status === 'IN_PROGRESS' ? (
                <>
                  <Button onClick={() => handleSaveProgress(false)} style={{ borderRadius: 8 }}>保存继续</Button>
                  <Button type="primary" onClick={() => handleSaveProgress(true)} style={{ borderRadius: 8 }}>提交评估</Button>
                </>
              ) : (
                <Button type="primary" onClick={handleExecutionSubmit} style={{ borderRadius: 8 }}>提交评估</Button>
              )}
            </Space>
          }
        >
          {executionPlan && (
            <>
              <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="合作伙伴">{executionPlan.partner_name}</Descriptions.Item>
                <Descriptions.Item label="评估周期">
                  {{ quarterly: '季度', annual: '年度', onetime: '一次性' }[executionPlan.period_type] || executionPlan.period_type}
                </Descriptions.Item>
                <Descriptions.Item label="时间范围" span={2}>
                  {executionPlan.start_date} ~ {executionPlan.end_date}
                </Descriptions.Item>
              </Descriptions>

              <Divider style={{ margin: '16px 0' }}>
                <span style={{ fontWeight: 600, color: colorPalette.textPrimary, fontSize: 14 }}>综合评价</span>
              </Divider>

              <div style={{ marginBottom: 16 }}>
                <Form.Item label="优势亮点" style={{ marginBottom: 8 }}>
                  <Input.TextArea
                    rows={2}
                    placeholder="请描述该合作伙伴的优势和亮点"
                    value={executionSWSC.strengths}
                    onChange={e => setExecutionSWSC(prev => ({ ...prev, strengths: e.target.value }))}
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
                <Form.Item label="不足之处" style={{ marginBottom: 8 }}>
                  <Input.TextArea
                    rows={2}
                    placeholder="请描述该合作伙伴存在的不足"
                    value={executionSWSC.weaknesses}
                    onChange={e => setExecutionSWSC(prev => ({ ...prev, weaknesses: e.target.value }))}
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
                <Form.Item label="改进建议">
                  <Input.TextArea
                    rows={2}
                    placeholder="请提出具体的改进建议"
                    value={executionSWSC.suggestions}
                    onChange={e => setExecutionSWSC(prev => ({ ...prev, suggestions: e.target.value }))}
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </div>

              <Divider style={{ margin: '16px 0' }}>
                <span style={{ fontWeight: 600, color: colorPalette.textPrimary, fontSize: 14 }}>指标评分</span>
              </Divider>

              {(() => {
                const planIndicatorIds = executionPlan?.indicator_ids || []
                const planIndicatorIdSet = new Set(planIndicatorIds)

                if (planIndicatorIds.length === 0) {
                  return <Empty description="该计划未选择指标" style={{ margin: '40px 0' }} />
                }

                // Build parent->children map for flat indicator lists (from API)
                const childrenOfParent: Record<number, Indicator[]> = {}
                const leafIdsInPlan = new Set<number>()
                indicators.forEach(ind => {
                  if (ind.parent_id === null && ind.children?.length) {
                    // Has explicit children array (nested mock data)
                  } else if (ind.parent_id !== null) {
                    // Flat structure: track children by parent_id
                    if (!childrenOfParent[ind.parent_id]) childrenOfParent[ind.parent_id] = []
                    childrenOfParent[ind.parent_id].push(ind)
                  }
                  if (planIndicatorIdSet.has(ind.id)) {
                    leafIdsInPlan.add(ind.id)
                  }
                })

                // Separate parents (have children in plan) from standalone leaves
                const parentIndicators = indicators.filter(ind => {
                  const children = ind.children || childrenOfParent[ind.id] || []
                  return children.length > 0 && children.some(c => planIndicatorIdSet.has(c.id))
                })
                const standaloneLeaves = indicators.filter(ind => {
                  const children = ind.children || childrenOfParent[ind.id] || []
                  return children.length === 0 && planIndicatorIdSet.has(ind.id)
                })

                const renderIndicator = (ind: Indicator, isParentSection: boolean) => {
                  const children = isParentSection
                    ? (ind.children || childrenOfParent[ind.id] || []).filter((c: Indicator) => planIndicatorIdSet.has(c.id))
                    : [ind]

                  return (
                    <div key={ind.id} style={{ marginBottom: 24 }}>
                      {isParentSection && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 10,
                          paddingBottom: 8,
                          borderBottom: `1px solid ${colorPalette.borderLight}`,
                        }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: colorPalette.textPrimary }}>{ind.name}</span>
                          <Tag color="blue" style={{ borderRadius: 4 }}>权重 {ind.weight}%</Tag>
                        </div>
                      )}

                      {children.map((child: Indicator) => (
                        <div
                          key={child.id}
                          style={{
                            background: colorPalette.bg,
                            borderRadius: 10,
                            border: `1px solid ${colorPalette.border}`,
                            padding: '12px 16px',
                            marginBottom: 10,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {!isParentSection && (
                                <span style={{ fontSize: 14, fontWeight: 600, color: colorPalette.textPrimary }}>{child.name}</span>
                              )}
                              {isParentSection && (
                                <span style={{ fontWeight: 500, color: colorPalette.textPrimary }}>{child.name}</span>
                              )}
                              <Tag color="purple" style={{ borderRadius: 4 }}>权重 {child.weight}%</Tag>
                              <Tag color={child.scoring_type === 'quantitative' ? 'green' : 'orange'} style={{ borderRadius: 4 }}>
                                {child.scoring_type === 'quantitative' ? '量化(0-100)' : '等级'}
                              </Tag>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, color: colorPalette.textSecondary }}>评分：</span>
                              {child.scoring_type === 'quantitative' ? (
                                <InputNumber
                                  min={0}
                                  max={100}
                                  value={executionScores[child.id]}
                                  onChange={v => setExecutionScores(prev => ({ ...prev, [child.id]: v ?? 0 }))}
                                  style={{ width: 100, borderRadius: 8 }}
                                  placeholder="0-100"
                                />
                              ) : (
                                <Select
                                  placeholder="选择等级"
                                  value={executionScores[child.id]}
                                  onChange={v => setExecutionScores(prev => ({ ...prev, [child.id]: v }))}
                                  style={{ width: 130, borderRadius: 8 }}
                                >
                                  <Select.Option value={100}>A (90-100)</Select.Option>
                                  <Select.Option value={80}>B (70-89)</Select.Option>
                                  <Select.Option value={60}>C (60-69)</Select.Option>
                                  <Select.Option value={40}>D (0-59)</Select.Option>
                                </Select>
                              )}
                            </div>
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <Input.TextArea
                              placeholder="评分说明（可选）"
                              rows={1}
                              value={executionComments[child.id] || ''}
                              onChange={e => setExecutionComments(prev => ({ ...prev, [child.id]: e.target.value }))}
                              style={{ borderRadius: 8, fontSize: 13 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }

                return (
                  <>
                    {parentIndicators.map(ind => renderIndicator(ind, true))}
                    {standaloneLeaves.map(ind => renderIndicator(ind, false))}
                  </>
                )
              })()}
            </>
          )}
        </Drawer>

        <Drawer
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 18, background: colorPalette.primary, borderRadius: 2 }} />
              <span style={{ fontWeight: 600, color: colorPalette.textPrimary }}>评估报告</span>
            </div>
          }
          open={reportDetailVisible}
          onClose={() => setReportDetailVisible(false)}
          width={720}
          extra={
            selectedReport && selectedReport.status === 'PENDING_AUDIT' && (
              <Space>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => { handleReportAudit(selectedReport, 'APPROVED'); setReportDetailVisible(false) }}
                  style={{ borderRadius: 8 }}
                >
                  审核通过
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => { handleReportAudit(selectedReport, 'REJECTED'); setReportDetailVisible(false) }}
                  style={{ borderRadius: 8 }}
                >
                  审核拒绝
                </Button>
              </Space>
            )
          }
        >
          {selectedReport && (
            <>
              <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="合作伙伴">{selectedReport.partner_name}</Descriptions.Item>
                <Descriptions.Item label="评估时间">{selectedReport.created_at}</Descriptions.Item>
                <Descriptions.Item label="综合得分" span={2}>
                  <span style={{
                    color: selectedReport.total_score >= 80 ? colorPalette.success : selectedReport.total_score >= 60 ? colorPalette.warning : colorPalette.error,
                    fontWeight: 700,
                    fontSize: 24,
                  }}>
                    {selectedReport.total_score}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="报告状态" span={2}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 500,
                    background: statusMap[selectedReport.status]?.bg,
                    color: statusMap[selectedReport.status]?.color,
                  }}>
                    {statusMap[selectedReport.status]?.text || selectedReport.status}
                  </span>
                </Descriptions.Item>
              </Descriptions>

              <div style={{
                background: colorPalette.successLight,
                borderLeft: `3px solid ${colorPalette.success}`,
                borderRadius: '0 10px 10px 0',
                padding: '14px 16px',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colorPalette.success, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircleOutlined /> 优势
                </div>
                <p style={{ margin: 0, fontSize: 14, color: colorPalette.textPrimary, lineHeight: 1.6 }}>{selectedReport.strengths || '暂无数据'}</p>
              </div>

              <div style={{
                background: colorPalette.errorLight,
                borderLeft: `3px solid ${colorPalette.error}`,
                borderRadius: '0 10px 10px 0',
                padding: '14px 16px',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colorPalette.error, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CloseCircleOutlined /> 不足
                </div>
                <p style={{ margin: 0, fontSize: 14, color: colorPalette.textPrimary, lineHeight: 1.6 }}>{selectedReport.weaknesses || '暂无数据'}</p>
              </div>

              <div style={{
                background: colorPalette.primaryLight,
                borderLeft: `3px solid ${colorPalette.primary}`,
                borderRadius: '0 10px 10px 0',
                padding: '14px 16px',
                marginBottom: 20,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colorPalette.primary, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileTextOutlined /> 改进建议
                </div>
                <p style={{ margin: 0, fontSize: 14, color: colorPalette.textPrimary, lineHeight: 1.6 }}>{selectedReport.suggestions || '暂无数据'}</p>
              </div>

              <Divider style={{ margin: '16px 0' }}>
                <span style={{ fontWeight: 600, color: colorPalette.textPrimary, fontSize: 14 }}>得分明细</span>
              </Divider>
              {selectedReport.scores && selectedReport.scores.length > 0 ? (
                <div style={{
                  border: `1px solid ${colorPalette.border}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                }}>
                  {selectedReport.scores.map((item, idx) => (
                    <div
                      key={item.indicator_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: idx < selectedReport.scores!.length - 1 ? `1px solid ${colorPalette.border}` : 'none',
                        background: idx % 2 === 0 ? colorPalette.card : colorPalette.bg,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 500, color: colorPalette.textPrimary }}>{item.indicator_name}</span>
                        <Tag color="blue" style={{ borderRadius: 4, fontSize: 11 }}>权重 {item.weight}%</Tag>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          color: item.score >= 80 ? colorPalette.success : item.score >= 60 ? colorPalette.warning : colorPalette.error,
                          fontWeight: 600,
                          fontSize: 15,
                          minWidth: 30,
                          textAlign: 'right',
                        }}>
                          {item.score}
                        </span>
                        <Progress
                          percent={item.score}
                          size="small"
                          style={{ width: 120 }}
                          strokeColor={item.score >= 80 ? colorPalette.success : item.score >= 60 ? colorPalette.warning : colorPalette.error}
                          showInfo={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="暂无得分明细" style={{ padding: 40 }} />
              )}
            </>
          )}
        </Drawer>
      </div>
    </ConfigProvider>
  )
}

export default VendorAssessment
