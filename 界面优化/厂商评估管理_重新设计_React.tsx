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
  List,
  Progress,
  Divider,
  Empty,
  ConfigProvider,
  Badge,
  Popconfirm,
  Upload,
  DatePicker,
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
} from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import apiClient from '@/api/axios'
import dayjs from 'dayjs'
import zhCN from 'antd/locale/zh_CN'

const { TabPane } = Tabs
const { RangePicker } = DatePicker

// ============ Types ============
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

// ============ Constants ============
const statusMap: Record<string, { color: string; text: string }> = {
  DRAFT: { color: 'default', text: '草稿' },
  PENDING_AUDIT: { color: 'warning', text: '待审批' },
  APPROVED: { color: 'processing', text: '已批准' },
  IN_PROGRESS: { color: 'processing', text: '进行中' },
  COMPLETED: { color: 'success', text: '已完成' },
  PUBLISHED: { color: 'success', text: '已发布' },
  REJECTED: { color: 'error', text: '已拒绝' },
}

// Mock indicator data (hierarchical)
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

// Mock plans
const mockPlans: AssessmentPlan[] = [
  { id: 1, name: '2024年Q1季度评估', partner_id: 1, partner_name: '合作伙伴A', period_type: 'quarterly', start_date: '2024-01-01', end_date: '2024-03-31', status: 'COMPLETED', total_score: 85 },
  { id: 2, name: '2024年Q2季度评估', partner_id: 1, partner_name: '合作伙伴A', period_type: 'quarterly', start_date: '2024-04-01', end_date: '2024-06-30', status: 'IN_PROGRESS' },
  { id: 3, name: '2024年Q1季度评估', partner_id: 2, partner_name: '合作伙伴B', period_type: 'quarterly', start_date: '2024-01-01', end_date: '2024-03-31', status: 'COMPLETED', total_score: 72 },
  { id: 4, name: '2024年Q2季度评估', partner_id: 2, partner_name: '合作伙伴B', period_type: 'quarterly', start_date: '2024-04-01', end_date: '2024-06-30', status: 'PENDING_AUDIT' },
  { id: 5, name: '2024年年度评估', partner_id: 3, partner_name: '合作伙伴C', period_type: 'annual', start_date: '2024-01-01', end_date: '2024-12-31', status: 'DRAFT' },
]

// Mock reports
const mockReports: AssessmentReport[] = [
  { id: 1, plan_id: 1, partner_id: 1, partner_name: '合作伙伴A', total_score: 85, status: 'PUBLISHED', created_at: '2024-04-01', strengths: '技术能力强，代码质量高，团队稳定', weaknesses: '响应时效有待提升', suggestions: '建议加强值班响应机制' },
  { id: 2, plan_id: 3, partner_id: 2, partner_name: '合作伙伴B', total_score: 72, status: 'PENDING_AUDIT', created_at: '2024-04-02', strengths: '项目管理规范', weaknesses: '技术深度不足', suggestions: '建议提升核心技术能力' },
]

// Mock partners
const mockPartners: Partner[] = [
  { id: 1, name: '合作伙伴A' },
  { id: 2, name: '合作伙伴B' },
  { id: 3, name: '合作伙伴C' },
  { id: 4, name: '合作伙伴D' },
  { id: 5, name: '合作伙伴E' },
]

// ============ Component ============
const VendorAssessment: React.FC = () => {
  const [activeTab, setActiveTab] = useState('indicators')
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

  // Detail drawer
  const [planDetailVisible, setPlanDetailVisible] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<AssessmentPlan | null>(null)

  // Execution drawer
  const [executionVisible, setExecutionVisible] = useState(false)
  const [executionPlan, setExecutionPlan] = useState<AssessmentPlan | null>(null)
  const [executionScores, setExecutionScores] = useState<Record<number, number>>({})
  const [executionComments, setExecutionComments] = useState<Record<number, string>>({})

  // Report detail drawer
  const [reportDetailVisible, setReportDetailVisible] = useState(false)
  const [selectedReport, setSelectedReport] = useState<AssessmentReport | null>(null)

  // Audit
  const [auditComment, setAuditComment] = useState('')

  // Partners
  const [partners] = useState<Partner[]>(mockPartners)

  useEffect(() => {
    fetchIndicators()
    fetchPlans()
    fetchReports()
  }, [])

  // ============ Data Fetching ============
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
        setPlans(mockPlans)
      }
    } catch {
      setPlans(mockPlans)
    }
  }, [])

  const fetchReports = useCallback(async () => {
    try {
      const response = await apiClient.get('/assessment/reports')
      const data = response.data
      if (Array.isArray(data) && data.length > 0) {
        setReports(data)
      } else {
        setReports(mockReports)
      }
    } catch {
      setReports(mockReports)
    }
  }, [])

  // ============ Handlers ============
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
    try {
      await apiClient.post('/assessment/plans', {
        ...wizardData,
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
      })
      message.success('评估执行提交成功')
      setExecutionVisible(false)
      fetchPlans()
      fetchReports()
    } catch {
      message.error('提交失败')
    }
  }

  const handleAudit = (plan: AssessmentPlan, action: 'APPROVED' | 'REJECTED') => {
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
          await apiClient.post(`/assessment/plans/${plan.id}/audit`, { action, comment: auditComment })
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
      await apiClient.post(`/assessment/reports/${report.id}/audit`, { action })
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

  // ============ Tree Data ============
  const getTreeData = (items: Indicator[]): TreeNode[] => {
    return items.map(ind => ({
      title: (
        <Space>
          <span style={{ fontWeight: 500 }}>{ind.name}</span>
          <Tag color="blue" style={{ fontSize: 11, borderRadius: 4 }}>权重{ind.weight}%</Tag>
          <Tag color={ind.scoring_type === 'quantitative' ? 'green' : 'orange'} style={{ fontSize: 11, borderRadius: 4 }}>
            {ind.scoring_type === 'quantitative' ? '量化' : '等级'}
          </Tag>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={e => { e.stopPropagation(); handleEditIndicator(ind) }}
            style={{ color: '#1890ff' }}
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

  // ============ Columns ============
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
        return <Badge status={map?.color as 'success' | 'processing' | 'error' | 'default' | 'warning'} text={map?.text || s} />
      },
    },
    {
      title: '综合得分',
      dataIndex: 'total_score',
      key: 'total_score',
      width: 100,
      render: (score?: number) =>
        score != null ? (
          <span style={{ color: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
            {score}
          </span>
        ) : (
          <span style={{ color: '#9ca3af' }}>-</span>
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
              <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleStartExecution(record)} title="开始评估" style={{ padding: '2px 6px' }} />
            </>
          )}
          {record.status === 'PENDING_AUDIT' && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleAudit(record, 'APPROVED')} title="审批通过" style={{ padding: '2px 6px', color: '#22c55e' }} />
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
            color: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444',
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
        return <Badge status={map?.color as 'success' | 'processing' | 'error' | 'default' | 'warning'} text={map?.text || s} />
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
              <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleReportAudit(record, 'APPROVED')} title="审核通过" style={{ padding: '2px 6px', color: '#22c55e' }} />
              <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleReportAudit(record, 'REJECTED')} title="审核拒绝" style={{ padding: '2px 6px' }} />
            </>
          )}
        </Space>
      ),
    },
  ]

  // ============ Stats ============
  const stats = {
    totalIndicators: getFlatIndicators(indicators).length,
    activePlans: plans.filter(p => p.status === 'IN_PROGRESS' || p.status === 'APPROVED').length,
    monthlyReports: reports.length,
    avgScore: reports.length > 0 ? Math.round((reports.reduce((s, r) => s + r.total_score, 0) / reports.length) * 10) / 10 : 0,
  }

  // ============ Render ============
  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ minHeight: '100vh', background: '#f5f7fa', padding: '24px 28px' }}>
        {/* Page Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontSize: 22,
            fontWeight: 600,
            color: '#1a1a2e',
            margin: 0,
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
          }}>
            厂商支撑能力评估
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 0', lineHeight: 1.5 }}>
            全面管理合作伙伴的技术能力、服务质量与综合信誉
          </p>
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}>
          {/* Stat 1: 评估指标总数 */}
          <div style={{
            background: '#fff',
            borderRadius: 10,
            padding: '20px 24px',
            borderTop: '3px solid #8b5cf6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <RadarChartOutlined style={{ fontSize: 18, color: '#fff' }} />
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>评估指标总数</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.2 }}>{stats.totalIndicators}</div>
          </div>

          {/* Stat 2: 进行中的计划 */}
          <div style={{
            background: '#fff',
            borderRadius: 10,
            padding: '20px 24px',
            borderTop: '3px solid #f59e0b',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <AuditOutlined style={{ fontSize: 18, color: '#fff' }} />
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>进行中的计划</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.2 }}>{stats.activePlans}</div>
          </div>

          {/* Stat 3: 评估报告总数 */}
          <div style={{
            background: '#fff',
            borderRadius: 10,
            padding: '20px 24px',
            borderTop: '3px solid #1890ff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #1890ff 0%, #69b1ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <FileTextOutlined style={{ fontSize: 18, color: '#fff' }} />
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>评估报告总数</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.2 }}>{stats.monthlyReports}</div>
          </div>

          {/* Stat 4: 平均得分 */}
          <div style={{
            background: '#fff',
            borderRadius: 10,
            padding: '20px 24px',
            borderTop: `3px solid ${stats.avgScore >= 80 ? '#22c55e' : stats.avgScore >= 60 ? '#f59e0b' : '#ef4444'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${stats.avgScore >= 80 ? '#22c55e' : stats.avgScore >= 60 ? '#f59e0b' : '#ef4444'} 0%, ${stats.avgScore >= 80 ? '#4ade80' : stats.avgScore >= 60 ? '#fbbf24' : '#f87171'} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <BarChartOutlined style={{ fontSize: 18, color: '#fff' }} />
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>平均得分</div>
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              color: stats.avgScore >= 80 ? '#22c55e' : stats.avgScore >= 60 ? '#f59e0b' : '#ef4444',
              lineHeight: 1.2
            }}>
              {stats.avgScore}<span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280', marginLeft: 2 }}>分</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
          {/* Tabs */}
          <div style={{
            borderBottom: '1px solid #f0f0f0',
            padding: '0 24px',
            background: '#fff',
          }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="large"
              tabBarStyle={{
                marginBottom: 0,
                borderBottom: 'none',
              }}
              inkBarStyle={{ height: 2, background: '#1890ff', borderRadius: 2 }}
            >
              <TabPane
                tab={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                    <RadarChartOutlined /> 评估指标
                  </span>
                }
                key="indicators"
              />
              <TabPane
                tab={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                    <AuditOutlined /> 评估计划
                  </span>
                }
                key="plans"
              />
              <TabPane
                tab={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                    <FileTextOutlined /> 评估报告
                  </span>
                }
                key="reports"
              />
            </Tabs>
          </div>

          {/* Tab Content */}
          <div style={{ padding: 24 }}>
            {/* Tab 1: 评估指标 */}
            {activeTab === 'indicators' && (
              <>
                <div style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreateIndicator}
                    style={{ borderRadius: 6, fontWeight: 500, height: 36 }}
                  >
                    新建指标
                  </Button>
                  <Upload beforeUpload={handleImportIndicators} showUploadList={false} accept=".xlsx,.xls,.csv">
                    <Button icon={<UploadOutlined />} style={{ borderRadius: 6, height: 36 }}>
                      导入指标
                    </Button>
                  </Upload>
                  <Button icon={<DownloadOutlined />} onClick={handleDownloadIndicatorTemplate} style={{ borderRadius: 6, height: 36 }}>
                    导出指标
                  </Button>
                </div>
                {indicators.length > 0 ? (
                  <div style={{
                    background: '#fafafa',
                    borderRadius: 8,
                    border: '1px solid #f0f0f0',
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

            {/* Tab 2: 评估计划 */}
            {activeTab === 'plans' && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleStartWizard}
                    style={{ borderRadius: 6, fontWeight: 500, height: 36 }}
                  >
                    新建评估计划
                  </Button>
                </div>
                <Table
                  columns={planColumns}
                  dataSource={plans}
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
                  style={{
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                />
              </>
            )}

            {/* Tab 3: 评估报告 */}
            {activeTab === 'reports' && (
              <>
                <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
                  <Button icon={<HistoryOutlined />} style={{ borderRadius: 6, height: 36 }}>
                    历史对比
                  </Button>
                  <Button icon={<DownloadOutlined />} style={{ borderRadius: 6, height: 36 }}>
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
                  style={{
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                />

                {/* Radar Chart Placeholder */}
                <div style={{
                  marginTop: 24,
                  background: '#fafafa',
                  borderRadius: 8,
                  border: '1px solid #f0f0f0',
                  padding: 24,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <RadarChartOutlined style={{ fontSize: 16, color: '#8b5cf6' }} />
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>得分趋势对比 - 合作伙伴A</span>
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
                    background: '#fff',
                    borderRadius: 8,
                    border: '1px solid #f0f0f0',
                  }}>
                    <RadarChartOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 12 }} />
                    <p style={{ margin: 0, fontSize: 14, color: '#6b7280', fontWeight: 500 }}>雷达图展示区域</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>可视化展示各指标维度得分对比（Q1 vs Q2）</p>
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 24 }}>
                      <Space>
                        <span style={{ display: 'inline-block', width: 12, height: 12, background: '#1890ff', borderRadius: 2 }}></span>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>Q1得分</span>
                      </Space>
                      <Space>
                        <span style={{ display: 'inline-block', width: 12, height: 12, background: '#22c55e', borderRadius: 2 }}></span>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>Q2得分</span>
                      </Space>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Create/Edit Indicator Modal */}
        <Modal
          title={
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 16,
              fontWeight: 600,
              color: '#1a1a2e',
              borderBottom: '2px solid #1890ff',
              paddingBottom: 12,
              marginBottom: -16,
            }}>
              <div style={{
                width: 4,
                height: 18,
                background: '#1890ff',
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
          styles={{
            body: { paddingTop: 20 },
          }}
          style={{ top: 120 }}
        >
          <Form form={form} layout="vertical" requiredMark="optional">
            <Form.Item label={<span style={{ fontWeight: 500 }}>指标名称</span>} name="name" rules={[{ required: true, message: '请输入指标名称' }]}>
              <Input placeholder="请输入指标名称" maxLength={100} style={{ borderRadius: 6 }} />
            </Form.Item>
            <Form.Item label={<span style={{ fontWeight: 500 }}>上级指标</span>} name="parent_id">
              <Select placeholder="选择上级指标（可选）" allowClear style={{ borderRadius: 6 }}>
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
              <InputNumber min={0} max={100} style={{ width: '100%', borderRadius: 6 }} placeholder="0-100" />
            </Form.Item>
            <Form.Item label={<span style={{ fontWeight: 500 }}>评分类型</span>} name="scoring_type" rules={[{ required: true, message: '请选择评分类型' }]}>
              <Select placeholder="选择评分类型" style={{ borderRadius: 6 }}>
                <Select.Option value="quantitative">量化评分（0-100分）</Select.Option>
                <Select.Option value="grade">等级评分（A/B/C/D）</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label={<span style={{ fontWeight: 500 }}>描述</span>} name="description">
              <Input.TextArea rows={3} placeholder="请输入指标描述" maxLength={500} style={{ borderRadius: 6 }} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Assessment Plan Wizard Modal */}
        <Modal
          title={
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 16,
              fontWeight: 600,
              color: '#1a1a2e',
              borderBottom: '2px solid #1890ff',
              paddingBottom: 12,
              marginBottom: -16,
            }}>
              <div style={{ width: 4, height: 18, background: '#1890ff', borderRadius: 2 }} />
              新建评估计划
            </div>
          }
          open={wizardVisible}
          onCancel={() => setWizardVisible(false)}
          footer={
            <Space>
              {wizardStep > 0 && (
                <Button onClick={() => setWizardStep(wizardStep - 1)} style={{ borderRadius: 6 }}>上一步</Button>
              )}
              {wizardStep < 2 && (
                <Button type="primary" onClick={handleWizardNext} style={{ borderRadius: 6 }}>下一步</Button>
              )}
              {wizardStep === 2 && (
                <Button type="primary" onClick={handleWizardFinish} style={{ borderRadius: 6 }}>完成</Button>
              )}
            </Space>
          }
          width={700}
          destroyOnClose
          style={{ top: 100 }}
          styles={{ body: { paddingTop: 20 } }}
        >
          <Steps current={wizardStep} style={{ marginBottom: 24 }} size="small" />
          <div style={{ minHeight: 200 }}>
            {wizardStep === 0 && (
              <Form layout="vertical">
                <Form.Item label={<span style={{ fontWeight: 500 }}>合作伙伴</span>} required rules={[{ required: true, message: '请选择合作伙伴' }]}>
                  <Select
                    placeholder="请选择合作伙伴"
                    onChange={v => setWizardData(prev => ({ ...prev, partner_id: v }))}
                    value={wizardData.partner_id}
                    showSearch
                    optionFilterProp="children"
                    style={{ width: '100%', borderRadius: 6 }}
                  >
                    {partners.map(p => (
                      <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Form>
            )}

            {wizardStep === 1 && (
              <Form layout="vertical">
                <Form.Item label={<span style={{ fontWeight: 500 }}>选择评估指标</span>} required>
                  <div style={{
                    background: '#fafafa',
                    borderRadius: 8,
                    border: '1px solid #f0f0f0',
                    padding: 12,
                    maxHeight: 300,
                    overflow: 'auto',
                  }}>
                    <Tree
                      checkable
                      selectable={false}
                      treeData={getTreeData(indicators)}
                      checkedKeys={wizardData.indicator_ids || []}
                      onCheck={(checked) => {
                        const keys = (checked as number[]).filter(k =>
                          getFlatIndicators(indicators).some(ind => ind.id === k)
                        )
                        setWizardData(prev => ({ ...prev, indicator_ids: keys }))
                      }}
                      defaultExpandAll
                    />
                  </div>
                </Form.Item>
                <div style={{ color: '#6b7280', fontSize: 13, marginTop: 8 }}>
                  已选 <strong style={{ color: '#1890ff' }}>{wizardData.indicator_ids?.length || 0}</strong> 个指标
                </div>
              </Form>
            )}

            {wizardStep === 2 && (
              <Form layout="vertical">
                <Form.Item label={<span style={{ fontWeight: 500 }}>计划名称</span>} required rules={[{ required: true, message: '请输入计划名称' }]}>
                  <Input
                    placeholder="如：2024年Q2季度评估"
                    value={wizardData.name || ''}
                    onChange={e => setWizardData(prev => ({ ...prev, name: e.target.value }))}
                    maxLength={200}
                    style={{ borderRadius: 6 }}
                  />
                </Form.Item>
                <Form.Item label={<span style={{ fontWeight: 500 }}>评估周期</span>} required>
                  <Select
                    placeholder="选择评估周期"
                    value={wizardData.period_type}
                    onChange={v => setWizardData(prev => ({ ...prev, period_type: v }))}
                    style={{ width: '100%', borderRadius: 6 }}
                  >
                    <Select.Option value="quarterly">季度评估</Select.Option>
                    <Select.Option value="annual">年度评估</Select.Option>
                    <Select.Option value="onetime">一次性评估</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label={<span style={{ fontWeight: 500 }}>评估时间范围</span>} required>
                  <RangePicker
                    style={{ width: '100%', borderRadius: 6 }}
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
              </Form>
            )}
          </div>
        </Modal>

        {/* Plan Detail Drawer */}
        <Drawer
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 18, background: '#1890ff', borderRadius: 2 }} />
              <span style={{ fontWeight: 600 }}>评估计划详情</span>
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
                style={{ borderRadius: 6 }}
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
                  <span style={{ fontWeight: 500 }}>{selectedPlan.name}</span>
                </Descriptions.Item>
                <Descriptions.Item label="合作伙伴">{selectedPlan.partner_name}</Descriptions.Item>
                <Descriptions.Item label="评估周期">
                  {{ quarterly: '季度', annual: '年度', onetime: '一次性' }[selectedPlan.period_type] || selectedPlan.period_type}
                </Descriptions.Item>
                <Descriptions.Item label="开始日期">{selectedPlan.start_date}</Descriptions.Item>
                <Descriptions.Item label="结束日期">{selectedPlan.end_date}</Descriptions.Item>
                <Descriptions.Item label="状态" span={2}>
                  <Badge
                    status={statusMap[selectedPlan.status]?.color as 'success' | 'processing' | 'error' | 'default' | 'warning'}
                    text={statusMap[selectedPlan.status]?.text || selectedPlan.status}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="综合得分" span={2}>
                  {selectedPlan.total_score != null ? (
                    <span style={{ color: selectedPlan.total_score >= 80 ? '#22c55e' : '#f59e0b', fontWeight: 600, fontSize: 16 }}>
                      {selectedPlan.total_score}
                    </span>
                  ) : <span style={{ color: '#9ca3af' }}>待评估</span>}
                </Descriptions.Item>
              </Descriptions>

              {selectedPlan.status === 'PENDING_AUDIT' && (
                <>
                  <Divider style={{ margin: '16px 0' }} />
                  <Space>
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleAudit(selectedPlan, 'APPROVED')} style={{ borderRadius: 6 }}>
                      审批通过
                    </Button>
                    <Button danger icon={<CloseCircleOutlined />} onClick={() => handleAudit(selectedPlan, 'REJECTED')} style={{ borderRadius: 6 }}>
                      审批拒绝
                    </Button>
                  </Space>
                </>
              )}
            </>
          )}
        </Drawer>

        {/* Assessment Execution Drawer */}
        <Drawer
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 18, background: '#1890ff', borderRadius: 2 }} />
              <span style={{ fontWeight: 600 }}>{executionPlan ? `执行评估 - ${executionPlan.name}` : '执行评估'}</span>
            </div>
          }
          open={executionVisible}
          onClose={() => setExecutionVisible(false)}
          width={720}
          extra={
            <Space>
              <Button onClick={() => setExecutionVisible(false)} style={{ borderRadius: 6 }}>取消</Button>
              <Button type="primary" onClick={handleExecutionSubmit} style={{ borderRadius: 6 }}>提交评估</Button>
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

                <span style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>指标评分</span>
              </Divider>

              {indicators.map(ind => (
                <div key={ind.id} style={{ marginBottom: 24 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                    paddingBottom: 8,
                    borderBottom: '1px solid #f0f0f0',
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>{ind.name}</span>
                    <Tag color="blue" style={{ borderRadius: 4 }}>权重 {ind.weight}%</Tag>
                  </div>

                  {ind.children?.map(child => (
                    <div
                      key={child.id}
                      style={{
                        background: '#fafafa',
                        borderRadius: 8,
                        border: '1px solid #f0f0f0',
                        padding: '12px 16px',
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 500, color: '#374151' }}>{child.name}</span>
                          <Tag color="purple" style={{ borderRadius: 4 }}>权重 {child.weight}%</Tag>
                          <Tag color={child.scoring_type === 'quantitative' ? 'green' : 'orange'} style={{ borderRadius: 4 }}>
                            {child.scoring_type === 'quantitative' ? '量化(0-100)' : '等级'}
                          </Tag>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>评分：</span>
                          {child.scoring_type === 'quantitative' ? (
                            <InputNumber
                              min={0}
                              max={100}
                              value={executionScores[child.id]}
                              onChange={v => setExecutionScores(prev => ({ ...prev, [child.id]: v ?? 0 }))}
                              style={{ width: 100, borderRadius: 6 }}
                              placeholder="0-100"
                            />
                          ) : (
                            <Select
                              placeholder="选择等级"
                              value={executionScores[child.id]}
                              onChange={v => setExecutionScores(prev => ({ ...prev, [child.id]: v }))}
                              style={{ width: 130, borderRadius: 6 }}
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
                          style={{ borderRadius: 6, fontSize: 13 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </Drawer>

        {/* Report Detail Drawer */}
        <Drawer
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 18, background: '#1890ff', borderRadius: 2 }} />
              <span style={{ fontWeight: 600 }}>评估报告</span>
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
                  style={{ borderRadius: 6 }}
                >
                  审核通过
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => { handleReportAudit(selectedReport, 'REJECTED'); setReportDetailVisible(false) }}
                  style={{ borderRadius: 6 }}
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
                    color: selectedReport.total_score >= 80 ? '#22c55e' : selectedReport.total_score >= 60 ? '#f59e0b' : '#ef4444',
                    fontWeight: 700,
                    fontSize: 24,
                  }}>
                    {selectedReport.total_score}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="报告状态" span={2}>
                  <Badge
                    status={statusMap[selectedReport.status]?.color as 'success' | 'processing' | 'error' | 'default' | 'warning'}
                    text={statusMap[selectedReport.status]?.text || selectedReport.status}
                  />
                </Descriptions.Item>
              </Descriptions>

              {/* Analysis sections with colored left border */}
              <div style={{
                background: '#f0fdf4',
                borderLeft: '3px solid #22c55e',
                borderRadius: '0 8px 8px 0',
                padding: '14px 16px',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircleOutlined /> 优势
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#15803d', lineHeight: 1.6 }}>{selectedReport.strengths || '暂无数据'}</p>
              </div>

              <div style={{
                background: '#fef2f2',
                borderLeft: '3px solid #ef4444',
                borderRadius: '0 8px 8px 0',
                padding: '14px 16px',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CloseCircleOutlined /> 不足
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#b91c1c', lineHeight: 1.6 }}>{selectedReport.weaknesses || '暂无数据'}</p>
              </div>

              <div style={{
                background: '#eff6ff',
                borderLeft: '3px solid #1890ff',
                borderRadius: '0 8px 8px 0',
                padding: '14px 16px',
                marginBottom: 20,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileTextOutlined /> 改进建议
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#1e40af', lineHeight: 1.6 }}>{selectedReport.suggestions || '暂无数据'}</p>
              </div>

              {/* Score details table */}
              <Divider style={{ margin: '16px 0' }}>
                <span style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>得分明细</span>
              </Divider>
              {selectedReport.scores && selectedReport.scores.length > 0 ? (
                <div style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
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
                        borderBottom: idx < selectedReport.scores!.length - 1 ? '1px solid #f0f0f0' : 'none',
                        background: idx % 2 === 0 ? '#fff' : '#fafafa',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 500, color: '#374151' }}>{item.indicator_name}</span>
                        <Tag color="blue" style={{ borderRadius: 4, fontSize: 11 }}>权重 {item.weight}%</Tag>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          color: item.score >= 80 ? '#22c55e' : item.score >= 60 ? '#f59e0b' : '#ef4444',
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
                          strokeColor={item.score >= 80 ? '#22c55e' : item.score >= 60 ? '#f59e0b' : '#ef4444'}
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
