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
  Steps,
  Tree,
  Input,
  InputNumber,
  Descriptions,
  Row,
  Col,
  Statistic,
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

// ============ Types ============
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
          <span>{ind.name}</span>
          <Tag color="blue" style={{ fontSize: 11 }}>权重{ind.weight}%</Tag>
          <Tag color={ind.scoring_type === 'quantitative' ? 'green' : 'orange'} style={{ fontSize: 11 }}>
            {ind.scoring_type === 'quantitative' ? '量化' : '等级'}
          </Tag>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={e => { e.stopPropagation(); handleEditIndicator(ind) }}
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
          <span style={{ color: score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f', fontWeight: 600 }}>
            {score}
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewPlanDetail(record)} title="查看详情" />
          {record.status === 'DRAFT' && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setSelectedPlan(record); setWizardStep(2); setWizardData(record); setWizardVisible(true) }} title="编辑" />
              <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleStartExecution(record)} title="开始评估" />
            </>
          )}
          {record.status === 'PENDING_AUDIT' && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleAudit(record, 'APPROVED')} title="审批通过" />
              <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleAudit(record, 'REJECTED')} title="审批拒绝" />
            </>
          )}
          {record.status === 'APPROVED' && (
            <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleStartExecution(record)} title="开始评估" />
          )}
          {record.status === 'IN_PROGRESS' && (
            <Button type="link" size="small" icon={<SyncOutlined spin />} onClick={() => handleStartExecution(record)} title="继续评估" />
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
            color: score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f',
            fontWeight: 'bold',
            fontSize: 16,
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
          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => handleViewReportDetail(record)} title="查看报告" />
          {record.status === 'PENDING_AUDIT' && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleReportAudit(record, 'APPROVED')} title="审核通过" />
              <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleReportAudit(record, 'REJECTED')} title="审核拒绝" />
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
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, marginBottom: 16, fontWeight: 600 }}>厂商支撑能力评估</h1>

        {/* Stats Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" styles={{ body: { padding: 16 } }}>
              <Statistic
                title="评估指标总数"
                value={stats.totalIndicators}
                prefix={<RadarChartOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#333', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" styles={{ body: { padding: 16 } }}>
              <Statistic
                title="进行中的计划"
                value={stats.activePlans}
                prefix={<AuditOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#333', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" styles={{ body: { padding: 16 } }}>
              <Statistic
                title="评估报告总数"
                value={stats.monthlyReports}
                prefix={<FileTextOutlined style={{ color: '#1677ff' }} />}
                valueStyle={{ color: '#333', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" styles={{ body: { padding: 16 } }}>
              <Statistic
                title="平均得分"
                value={stats.avgScore}
                suffix="分"
                prefix={<BarChartOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: stats.avgScore >= 80 ? '#52c41a' : stats.avgScore >= 60 ? '#faad14' : '#ff4d4f', fontSize: 24 }}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            {/* Tab 1: 评估指标 */}
            <TabPane tab={<span><RadarChartOutlined /> 评估指标</span>} key="indicators">
              <Space style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateIndicator}>
                  新建指标
                </Button>
                <Upload beforeUpload={handleImportIndicators} showUploadList={false} accept=".xlsx,.xls,.csv">
                  <Button icon={<UploadOutlined />}>导入指标</Button>
                </Upload>
                <Button icon={<DownloadOutlined />} onClick={handleDownloadIndicatorTemplate}>
                  导出指标
                </Button>
              </Space>
              {indicators.length > 0 ? (
                <Tree
                  showLine={{ showLeafIcon: false }}
                  selectable={false}
                  treeData={getTreeData(indicators)}
                  defaultExpandAll
                />
              ) : (
                <Empty description="暂无评估指标" />
              )}
            </TabPane>

            {/* Tab 2: 评估计划 */}
            <TabPane tab={<span><AuditOutlined /> 评估计划</span>} key="plans">
              <Space style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleStartWizard}>
                  新建评估计划
                </Button>
              </Space>
              <Table
                columns={planColumns}
                dataSource={plans}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 } as TablePaginationConfig}
                scroll={{ x: 1100 }}
                size="middle"
              />
            </TabPane>

            {/* Tab 3: 评估报告 */}
            <TabPane tab={<span><FileTextOutlined /> 评估报告</span>} key="reports">
              <Space style={{ marginBottom: 16 }}>
                <Button icon={<HistoryOutlined />}>历史对比</Button>
                <Button icon={<DownloadOutlined />}>导出报告</Button>
              </Space>
              <Table
                columns={reportColumns}
                dataSource={reports}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 } as TablePaginationConfig}
                size="middle"
              />

              {/* Historical Comparison Radar Chart Placeholder */}
              <Card
                title={<><RadarChartOutlined /> 得分趋势对比 - 合作伙伴A</>}
                style={{ marginTop: 16 }}
                extra={<Button type="link" size="small">选择合作伙伴</Button>}
              >
                <div style={{ textAlign: 'center', padding: 40, color: '#888', background: '#fafafa', borderRadius: 8 }}>
                  <RadarChartOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 12 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>雷达图展示区域</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12 }}>可视化展示各指标维度得分对比（Q1 vs Q2）</p>
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 24 }}>
                    <Space><span style={{ display: 'inline-block', width: 12, height: 12, background: '#1677ff', borderRadius: 2 }}></span>Q1得分</Space>
                    <Space><span style={{ display: 'inline-block', width: 12, height: 12, background: '#52c41a', borderRadius: 2 }}></span>Q2得分</Space>
                  </div>
                </div>
              </Card>
            </TabPane>
          </Tabs>
        </Card>

        {/* Create/Edit Indicator Modal */}
        <Modal
          title={editingIndicator ? '编辑评估指标' : '新建评估指标'}
          open={indicatorModalVisible}
          onOk={handleIndicatorSubmit}
          onCancel={() => setIndicatorModalVisible(false)}
          width={500}
          okText={editingIndicator ? '保存' : '创建'}
          cancelText="取消"
        >
          <Form form={form} layout="vertical" requiredMark="optional">
            <Form.Item label="指标名称" name="name" rules={[{ required: true, message: '请输入指标名称' }]}>
              <Input placeholder="请输入指标名称" maxLength={100} />
            </Form.Item>
            <Form.Item label="上级指标" name="parent_id">
              <Select placeholder="选择上级指标（可选）" allowClear>
                {getFlatIndicators(indicators)
                  .filter(ind => !editingIndicator || ind.id !== editingIndicator.id)
                  .map(ind => (
                    <Select.Option key={ind.id} value={ind.id}>{ind.name}</Select.Option>
                  ))}
              </Select>
            </Form.Item>
            <Form.Item
              label="权重(%)"
              name="weight"
              rules={[
                { required: true, message: '请输入权重' },
                { type: 'number', min: 0, max: 100, message: '权重需在0-100之间' },
              ]}
            >
              <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0-100" />
            </Form.Item>
            <Form.Item label="评分类型" name="scoring_type" rules={[{ required: true, message: '请选择评分类型' }]}>
              <Select placeholder="选择评分类型">
                <Select.Option value="quantitative">量化评分（0-100分）</Select.Option>
                <Select.Option value="grade">等级评分（A/B/C/D）</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="描述" name="description">
              <Input.TextArea rows={3} placeholder="请输入指标描述" maxLength={500} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Assessment Plan Wizard Modal */}
        <Modal
          title="新建评估计划"
          open={wizardVisible}
          onCancel={() => setWizardVisible(false)}
          footer={
            <Space>
              {wizardStep > 0 && (
                <Button onClick={() => setWizardStep(wizardStep - 1)}>上一步</Button>
              )}
              {wizardStep < 2 && (
                <Button type="primary" onClick={handleWizardNext}>下一步</Button>
              )}
              {wizardStep === 2 && (
                <Button type="primary" onClick={handleWizardFinish}>完成</Button>
              )}
            </Space>
          }
          width={700}
          destroyOnClose
        >
          <Steps current={wizardStep} style={{ marginBottom: 24 }} size="small">
            <Steps.Step title="选择合作伙伴" />
            <Steps.Step title="选择评估指标" />
            <Steps.Step title="配置评估计划" />
          </Steps>

          {wizardStep === 0 && (
            <Form layout="vertical">
              <Form.Item label="合作伙伴" required rules={[{ required: true, message: '请选择合作伙伴' }]}>
                <Select
                  placeholder="请选择合作伙伴"
                  onChange={v => setWizardData(prev => ({ ...prev, partner_id: v }))}
                  value={wizardData.partner_id}
                  showSearch
                  optionFilterProp="children"
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
              <Form.Item label="选择评估指标" required>
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
              </Form.Item>
              <div style={{ color: '#888', fontSize: 12 }}>
                已选 {wizardData.indicator_ids?.length || 0} 个指标
              </div>
            </Form>
          )}

          {wizardStep === 2 && (
            <Form layout="vertical">
              <Form.Item label="计划名称" required rules={[{ required: true, message: '请输入计划名称' }]}>
                <Input
                  placeholder="如：2024年Q2季度评估"
                  value={wizardData.name || ''}
                  onChange={e => setWizardData(prev => ({ ...prev, name: e.target.value }))}
                  maxLength={200}
                />
              </Form.Item>
              <Form.Item label="评估周期" required>
                <Select
                  placeholder="选择评估周期"
                  value={wizardData.period_type}
                  onChange={v => setWizardData(prev => ({ ...prev, period_type: v }))}
                >
                  <Select.Option value="quarterly">季度评估</Select.Option>
                  <Select.Option value="annual">年度评估</Select.Option>
                  <Select.Option value="onetime">一次性评估</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item label="评估时间范围" required>
                <RangePicker
                  style={{ width: '100%' }}
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
        </Modal>

        {/* Plan Detail Drawer */}
        <Drawer
          title="评估计划详情"
          open={planDetailVisible}
          onClose={() => setPlanDetailVisible(false)}
          width={640}
          extra={
            selectedPlan && selectedPlan.status !== 'COMPLETED' && (
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => { setPlanDetailVisible(false); handleStartExecution(selectedPlan) }}>
                {selectedPlan.status === 'DRAFT' || selectedPlan.status === 'APPROVED' ? '开始评估' : '继续评估'}
              </Button>
            )
          }
        >
          {selectedPlan && (
            <>
              <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="计划名称" span={2}>{selectedPlan.name}</Descriptions.Item>
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
                    <span style={{ color: selectedPlan.total_score >= 80 ? '#52c41a' : '#faad14', fontWeight: 'bold' }}>
                      {selectedPlan.total_score}
                    </span>
                  ) : '待评估'}
                </Descriptions.Item>
              </Descriptions>

              {selectedPlan.status === 'PENDING_AUDIT' && (
                <>
                  <Divider />
                  <Space>
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleAudit(selectedPlan, 'APPROVED')}>
                      审批通过
                    </Button>
                    <Button danger icon={<CloseCircleOutlined />} onClick={() => handleAudit(selectedPlan, 'REJECTED')}>
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
          title={executionPlan ? `执行评估 - ${executionPlan.name}` : '执行评估'}
          open={executionVisible}
          onClose={() => setExecutionVisible(false)}
          width={720}
          extra={
            <Space>
              <Button onClick={() => setExecutionVisible(false)}>取消</Button>
              <Button type="primary" onClick={handleExecutionSubmit}>提交评估</Button>
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

              <Divider>指标评分</Divider>

              {indicators.map(ind => (
                <div key={ind.id} style={{ marginBottom: 24 }}>
                  <Space>
                    <strong style={{ fontSize: 15 }}>{ind.name}</strong>
                    <Tag color="blue">权重 {ind.weight}%</Tag>
                  </Space>

                  {ind.children?.map(child => (
                    <Card key={child.id} size="small" style={{ marginTop: 8, marginBottom: 8 }} styles={{ body: { padding: '12px 16px' } }}>
                      <Row gutter={16} align="middle">
                        <Col span={12}>
                          <Space>
                            <span>{child.name}</span>
                            <Tag color="purple">权重 {child.weight}%</Tag>
                            <Tag color={child.scoring_type === 'quantitative' ? 'green' : 'orange'}>
                              {child.scoring_type === 'quantitative' ? '量化(0-100)' : '等级'}
                            </Tag>
                          </Space>
                        </Col>
                        <Col span={12}>
                          <Space size="large" style={{ width: '100%' }}>
                            <Space>
                              <span style={{ fontSize: 12, color: '#888' }}>评分：</span>
                              {child.scoring_type === 'quantitative' ? (
                                <InputNumber
                                  min={0}
                                  max={100}
                                  value={executionScores[child.id]}
                                  onChange={v => setExecutionScores(prev => ({ ...prev, [child.id]: v ?? 0 }))}
                                  style={{ width: 100 }}
                                  placeholder="0-100"
                                />
                              ) : (
                                <Select
                                  placeholder="选择等级"
                                  value={executionScores[child.id]}
                                  onChange={v => setExecutionScores(prev => ({ ...prev, [child.id]: v }))}
                                  style={{ width: 120 }}
                                >
                                  <Select.Option value={100}>A (90-100)</Select.Option>
                                  <Select.Option value={80}>B (70-89)</Select.Option>
                                  <Select.Option value={60}>C (60-69)</Select.Option>
                                  <Select.Option value={40}>D (0-59)</Select.Option>
                                </Select>
                              )}
                            </Space>
                          </Space>
                        </Col>
                      </Row>
                      <Row style={{ marginTop: 8 }}>
                        <Col span={24}>
                          <Input.TextArea
                            placeholder="评分说明（可选）"
                            rows={1}
                            value={executionComments[child.id] || ''}
                            onChange={e => setExecutionComments(prev => ({ ...prev, [child.id]: e.target.value }))}
                          />
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </div>
              ))}
            </>
          )}
        </Drawer>

        {/* Report Detail Drawer */}
        <Drawer
          title="评估报告"
          open={reportDetailVisible}
          onClose={() => setReportDetailVisible(false)}
          width={720}
          extra={
            selectedReport && selectedReport.status === 'PENDING_AUDIT' && (
              <Space>
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => { handleReportAudit(selectedReport, 'APPROVED'); setReportDetailVisible(false) }}>
                  审核通过
                </Button>
                <Button danger icon={<CloseCircleOutlined />} onClick={() => { handleReportAudit(selectedReport, 'REJECTED'); setReportDetailVisible(false) }}>
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
                    color: selectedReport.total_score >= 80 ? '#52c41a' : selectedReport.total_score >= 60 ? '#faad14' : '#ff4d4f',
                    fontWeight: 'bold',
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

              {/* 优势 */}
              <Card size="small" title="优势" style={{ marginBottom: 16 }}>
                <p style={{ color: '#52c41a', margin: 0 }}>{selectedReport.strengths || '暂无数据'}</p>
              </Card>

              {/* 不足 */}
              <Card size="small" title="不足" style={{ marginBottom: 16 }}>
                <p style={{ color: '#ff4d4f', margin: 0 }}>{selectedReport.weaknesses || '暂无数据'}</p>
              </Card>

              {/* 建议 */}
              <Card size="small" title="改进建议" style={{ marginBottom: 16 }}>
                <p style={{ color: '#1677ff', margin: 0 }}>{selectedReport.suggestions || '暂无数据'}</p>
              </Card>

              {/* 得分明细 */}
              <Card size="small" title="得分明细">
                {selectedReport.scores && selectedReport.scores.length > 0 ? (
                  <List
                    size="small"
                    dataSource={selectedReport.scores}
                    renderItem={item => (
                      <List.Item>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Space>
                            <span>{item.indicator_name}</span>
                            <Tag color="blue">权重 {item.weight}%</Tag>
                          </Space>
                          <Space>
                            <span style={{
                              color: item.score >= 80 ? '#52c41a' : item.score >= 60 ? '#faad14' : '#ff4d4f',
                              fontWeight: 'bold',
                            }}>
                              {item.score}
                            </span>
                            <Progress
                              percent={item.score}
                              size="small"
                              style={{ width: 120 }}
                              strokeColor={item.score >= 80 ? '#52c41a' : item.score >= 60 ? '#faad14' : '#ff4d4f'}
                              showInfo={false}
                            />
                          </Space>
                        </Space>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="暂无得分明细" />
                )}
              </Card>
            </>
          )}
        </Drawer>
      </div>
    </ConfigProvider>
  )
}

export default VendorAssessment
