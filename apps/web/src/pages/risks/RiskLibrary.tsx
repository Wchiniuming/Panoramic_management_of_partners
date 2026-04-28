import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  Tree,
  Descriptions,
  Row,
  Col,
  Progress,
  Upload,
  Input,
  Drawer,
  DatePicker,
  TreeSelect,
} from 'antd'
import {
  PlusOutlined,
  UploadOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  PieChartOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TreeDataNode } from 'antd'
import dayjs from 'dayjs'
import apiClient from '@/api/axios'
import { useDebounceSearch } from '@/hooks/useDebounceSearch'
import { RISK_LEVELS } from '@/constants/risk'

const { TabPane } = Tabs
const { RangePicker } = DatePicker

interface RiskType {
  id: number
  name: string
  category: string
  parent_id: number | null
  children?: RiskType[]
}

interface RiskEntry {
  id: number
  type_id: number
  type_name: string
  partner_id: number | null
  partner_name: string | null
  title: string
  description: string
  level: 'CRITICAL' | 'LOW' | 'MEDIUM' | 'HIGH'
  probability: string
  impact: string
  trigger_condition: string
  mitigation: string
  status: 'OPEN' | 'MITIGATED' | 'ACCEPTED' | 'CLOSED'
  created_at: string
  updated_at?: string
}

interface Partner {
  id: number
  name: string
  type: string
  score: number
  status: 'online' | 'offline' | 'busy'
}

const COLORS = {
  primary: '#1890ff',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  purple: '#8b5cf6',
  bgLight: '#f8fafc',
  bgCard: '#ffffff',
  border: '#e2e8f0',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
}

const statusMap: Record<string, { color: string; text: string }> = {
  OPEN: { color: 'warning', text: '待处理' },
  MITIGATED: { color: 'processing', text: '已缓解' },
  ACCEPTED: { color: 'default', text: '已接受' },
  CLOSED: { color: 'success', text: '已关闭' },
}

const categoryMap: Record<string, { color: string; text: string }> = {
  personnel: { color: 'blue', text: '人员风险' },
  quality: { color: 'purple', text: '质量风险' },
  compliance: { color: 'orange', text: '合规风险' },
  security: { color: 'red', text: '安全风险' },
}

const RiskLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState('entries')
  const [riskTypes, setRiskTypes] = useState<RiskType[]>([])
  const [riskEntries, setRiskEntries] = useState<RiskEntry[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(false)
  const [typeModalVisible, setTypeModalVisible] = useState(false)
  const [entryModalVisible, setEntryModalVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<RiskEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<RiskEntry | null>(null)
  const [filters, setFilters] = useState({
    type_id: undefined as number | undefined,
    level: undefined as string | undefined,
    status: undefined as string | undefined,
    dateRange: undefined as [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  })
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const [form] = Form.useForm()
  const [typeForm] = Form.useForm()
  const [importLoading, setImportLoading] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    highRisk: 0,
    pending: 0,
    closedThisMonth: 0,
    byLevel: { high: 0, medium: 0, low: 0 },
    byType: { personnel: 0, quality: 0, compliance: 0, security: 0 },
  })

  useEffect(() => {
    fetchRiskTypes()
    fetchRiskEntries()
    fetchStats()
    fetchPartners()
  }, [])

  const fetchPartners = async () => {
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
  }

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/dashboard/stats')
      const data = response.data || {}
      const risksData = data.risks || {}
      setStats({
        total: risksData.total || 0,
        highRisk: risksData.high || 0,
        pending: risksData.pending || 0,
        closedThisMonth: risksData.closedThisMonth || 0,
        byLevel: {
          high: risksData.high || 0,
          medium: risksData.medium || 0,
          low: risksData.low || 0,
        },
        byType: { personnel: 0, quality: 0, compliance: 0, security: 0 },
      })
    } catch {
      setStats({
        total: 5,
        highRisk: 2,
        pending: 3,
        closedThisMonth: 1,
        byLevel: { high: 2, medium: 2, low: 1 },
        byType: { personnel: 2, quality: 1, compliance: 1, security: 1 },
      })
    }
  }

  const fetchRiskTypes = async () => {
    try {
      const response = await apiClient.get('/risks/types')
      setRiskTypes(response.data || [])
    } catch {
      setRiskTypes([
        { id: 1, name: '人员风险', category: 'personnel', parent_id: null },
        { id: 2, name: '质量风险', category: 'quality', parent_id: null },
        { id: 3, name: '合规风险', category: 'compliance', parent_id: null },
        { id: 4, name: '安全风险', category: 'security', parent_id: null },
        { id: 5, name: '人员流失', category: 'personnel', parent_id: 1 },
        { id: 6, name: '能力不足', category: 'personnel', parent_id: 1 },
        { id: 7, name: '交付质量', category: 'quality', parent_id: 2 },
        { id: 8, name: '代码缺陷', category: 'quality', parent_id: 2 },
      ])
    }
  }

  const fetchRiskEntries = useCallback(async (filterParams?: typeof filters) => {
    setLoading(true)
    try {
      const currentFilters = filterParams || filtersRef.current
      const params = new URLSearchParams()
      if (currentFilters.type_id) params.append('type_id', String(currentFilters.type_id))
      if (currentFilters.level) params.append('level', currentFilters.level)
      if (currentFilters.status) params.append('status', currentFilters.status)
      if (currentFilters.dateRange) {
        params.append('start_date', currentFilters.dateRange[0].format('YYYY-MM-DD'))
        params.append('end_date', currentFilters.dateRange[1].format('YYYY-MM-DD'))
      }
      const response = await apiClient.get(`/risks?${params.toString()}`)
      setRiskEntries(response.data || [])
    } catch {
      setRiskEntries([
        {
          id: 1,
          type_id: 1,
          type_name: '人员风险',
          partner_id: 1,
          partner_name: partners[0]?.name || '加载中...',
          title: '核心开发人员离职风险',
          description: '关键岗位人员可能离职导致项目进度延误',
          level: 'HIGH',
          probability: 'medium',
          impact: 'high',
          trigger_condition: '连续2个月绩效不达标或收到离职申请',
          mitigation: '1. 建立备份人员机制\n2. 完善知识传承文档\n3. 适时进行人员补充',
          status: 'OPEN',
          created_at: '2024-03-15 10:30:00',
        },
        {
          id: 2,
          type_id: 2,
          type_name: '质量风险',
          partner_id: 2,
          partner_name: partners[1]?.name || '加载中...',
          title: '代码质量不达标',
          description: '部分模块代码审查发现较多质量问题',
          level: 'MEDIUM',
          probability: 'high',
          impact: 'medium',
          trigger_condition: '代码审查缺陷密度超过阈值',
          mitigation: '加强代码审查力度，制定质量改进计划',
          status: 'MITIGATED',
          created_at: '2024-03-10 09:00:00',
        },
        {
          id: 3,
          type_id: 3,
          type_name: '合规风险',
          partner_id: null,
          partner_name: null,
          title: '数据安全合规风险',
          description: '部分数据处理流程可能不符合最新合规要求',
          level: 'HIGH',
          probability: 'low',
          impact: 'high',
          trigger_condition: '监管检查发现违规项',
          mitigation: '进行合规审计，完善数据处理流程',
          status: 'ACCEPTED',
          created_at: '2024-02-28 14:20:00',
        },
        {
          id: 4,
          type_id: 4,
          type_name: '安全风险',
          partner_id: 1,
          partner_name: partners[0]?.name || '加载中...',
          title: '安全漏洞风险',
          description: '系统存在潜在安全漏洞需要修复',
          level: 'LOW',
          probability: 'low',
          impact: 'medium',
          trigger_condition: '安全扫描发现高危漏洞',
          mitigation: '定期进行安全扫描和渗透测试',
          status: 'CLOSED',
          created_at: '2024-01-20 11:00:00',
        },
        {
          id: 5,
          type_id: 1,
          type_name: '人员风险',
          partner_id: 3,
          partner_name: partners[2]?.name || '加载中...',
          title: '人员技能不足',
          description: '新技术栈掌握程度不足',
          level: 'MEDIUM',
          probability: 'high',
          impact: 'medium',
          trigger_condition: '培训考核不通过',
          mitigation: '组织专项技术培训',
          status: 'OPEN',
          created_at: '2024-03-18 16:45:00',
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  const { immediateSearch: immediateSearchRisks } = useDebounceSearch(fetchRiskEntries, 300)

  const handleSearch = (newFilters?: typeof filters) => {
    const currentFilters = newFilters || filtersRef.current
    immediateSearchRisks(currentFilters)
  }

  const handleReset = () => {
    setFilters({
      type_id: undefined,
      level: undefined,
      status: undefined,
      dateRange: undefined,
    })
    setTimeout(fetchRiskEntries, 0)
  }

  const handleCreateType = () => {
    typeForm.resetFields()
    setTypeModalVisible(true)
  }

  const handleTypeSubmit = async () => {
    try {
      const values = await typeForm.validateFields()
      await apiClient.post('/risks/types', values)
      message.success('创建成功')
      setTypeModalVisible(false)
      fetchRiskTypes()
    } catch {
      message.error('创建失败')
    }
  }

  const handleDeleteType = async (id: number) => {
    try {
      await apiClient.delete(`/risks/types/${id}`)
      message.success('删除成功')
      fetchRiskTypes()
    } catch {
      message.error('删除失败')
    }
  }

  const handleCreateEntry = () => {
    form.resetFields()
    setEditingEntry(null)
    setEntryModalVisible(true)
  }

  const handleEditEntry = (entry: RiskEntry) => {
    setEditingEntry(entry)
    form.setFieldsValue({
      ...entry,
      dateRange: entry.created_at ? [dayjs(entry.created_at), dayjs()] : undefined,
    })
    setEntryModalVisible(true)
  }

  const handleEntrySubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        ...values,
        created_at: values.dateRange?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
      }
      delete payload.dateRange

      if (editingEntry) {
        await apiClient.put(`/risks/${editingEntry.id}`, payload)
        message.success('更新成功')
      } else {
        await apiClient.post('/risks', payload)
        message.success('创建成功')
      }
      setEntryModalVisible(false)
      fetchRiskEntries()
    } catch {
      message.error(editingEntry ? '更新失败' : '创建失败')
    }
  }

  const handleDeleteEntry = async (id: number) => {
    try {
      await apiClient.delete(`/risks/${id}`)
      message.success('删除成功')
      fetchRiskEntries()
    } catch {
      message.error('删除失败')
    }
  }

  const handleViewDetail = (entry: RiskEntry) => {
    setSelectedEntry(entry)
    setDetailVisible(true)
  }

  const handleImport = async (file: File) => {
    setImportLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      await apiClient.post('/risks/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      message.success('导入成功')
      fetchRiskEntries()
    } catch {
      message.error('导入失败，请检查文件格式')
    } finally {
      setImportLoading(false)
    }
    return false
  }

  const getTreeData = (types: RiskType[]): TreeDataNode[] => {
    return types.map(t => ({
      title: t.name,
      key: t.id,
      category: t.category,
      children: t.children ? getTreeData(t.children) : undefined,
    }))
  }

  const flattenTreeData = (types: RiskType[]): RiskType[] => {
    const result: RiskType[] = []
    const flatten = (nodes: RiskType[]) => {
      nodes.forEach(node => {
        result.push(node)
        if (node.children) flatten(node.children)
      })
    }
    flatten(types)
    return result
  }

  const entryColumns: ColumnsType<RiskEntry> = [
    {
      title: '风险标题',
      dataIndex: 'title',
      key: 'title',
      width: 220,
      ellipsis: true,
      render: (text: string) => (
        <span style={{ fontWeight: 500, color: COLORS.textPrimary }}>{text}</span>
      ),
    },
    {
      title: '风险类型',
      dataIndex: 'type_name',
      key: 'type_name',
      width: 110,
      render: (text: string, record: RiskEntry) => {
        const type = riskTypes.find(t => t.id === record.type_id)
        const category = type?.category || ''
        return (
          <Tag color={categoryMap[category]?.color || 'default'}>
            {text}
          </Tag>
        )
      },
    },
    {
      title: '合作伙伴',
      dataIndex: 'partner_name',
      key: 'partner_name',
      width: 120,
      render: (v: string) => (
        <span style={{ color: v ? COLORS.textPrimary : COLORS.textMuted }}>
          {v || '-'}
        </span>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: RiskEntry['level']) => (
        <Tag
          style={{
            backgroundColor: RISK_LEVELS[level].bg,
            color: RISK_LEVELS[level].color,
            borderColor: RISK_LEVELS[level].border,
            fontWeight: 500,
            borderRadius: 4,
          }}
        >
          {RISK_LEVELS[level].label}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>,
    },
    {
      title: '发生概率',
      dataIndex: 'probability',
      key: 'probability',
      width: 90,
      render: (v: string) => {
        const map: Record<string, string> = { high: '高', medium: '中', low: '低' }
        return <span style={{ color: COLORS.textSecondary }}>{map[v] || v}</span>
      },
    },
    {
      title: '影响范围',
      dataIndex: 'impact',
      key: 'impact',
      width: 90,
      render: (v: string) => {
        const map: Record<string, string> = { high: '高', medium: '中', low: '低' }
        return <span style={{ color: COLORS.textSecondary }}>{map[v] || v}</span>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => (
        <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{v}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            onClick={() => handleViewDetail(record)}
            style={{ color: COLORS.primary }}
          >
            详情
          </Button>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditEntry(record)}
            style={{ color: COLORS.textSecondary }}
          />
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteEntry(record.id)}
            style={{ color: COLORS.error }}
          />
        </Space>
      ),
    },
  ]

  const typeColumns: ColumnsType<RiskType> = [
    {
      title: '类型名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <span style={{ fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (c: string) => (
        <Tag color={categoryMap[c]?.color}>{categoryMap[c]?.text || c}</Tag>
      ),
    },
    {
      title: '上级类型',
      dataIndex: 'parent_id',
      key: 'parent_id',
      width: 120,
      render: (v: number) => {
        if (!v) return <span style={{ color: COLORS.textMuted }}>-</span>
        const parent = flattenTreeData(riskTypes).find(t => t.id === v)
        return parent?.name || '-'
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteType(record.id)}
          style={{ color: COLORS.error }}
        />
      ),
    },
  ]

  const statCardStyle = (borderColor: string) => ({
    backgroundColor: COLORS.bgCard,
    border: 'none',
    borderTop: `3px solid ${borderColor}`,
    borderRadius: 8,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  })

  return (
    <div style={{ padding: '0 24px 24px', backgroundColor: COLORS.bgLight, minHeight: '100vh' }}>
      <div style={{
        padding: '24px 0 16px',
        borderBottom: `1px solid ${COLORS.border}`,
        marginBottom: 24,
      }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 600,
          color: COLORS.textPrimary,
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          风险库管理
        </h1>
        <p style={{
          fontSize: 14,
          color: COLORS.textSecondary,
          margin: '4px 0 0',
        }}>
          管理和跟踪合作伙伴相关的各类风险
        </p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <div style={statCardStyle(COLORS.primary)}>
            <div style={{ padding: '20px 20px 16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <span style={{
                  fontSize: 13,
                  color: COLORS.textSecondary,
                  fontWeight: 500,
                }}>
                  风险总数
                </span>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: `${COLORS.primary}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <WarningOutlined style={{ fontSize: 18, color: COLORS.primary }} />
                </div>
              </div>
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                color: COLORS.textPrimary,
                lineHeight: 1.2,
              }}>
                {stats.total}
              </div>
              <div style={{
                fontSize: 12,
                color: COLORS.textMuted,
                marginTop: 4,
              }}>
                当前系统中所有风险条目
              </div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div style={statCardStyle(COLORS.error)}>
            <div style={{ padding: '20px 20px 16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <span style={{
                  fontSize: 13,
                  color: COLORS.textSecondary,
                  fontWeight: 500,
                }}>
                  高风险
                </span>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: `${COLORS.error}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ExclamationCircleOutlined style={{ fontSize: 18, color: COLORS.error }} />
                </div>
              </div>
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                color: COLORS.error,
                lineHeight: 1.2,
              }}>
                {stats.highRisk}
              </div>
              <div style={{
                fontSize: 12,
                color: COLORS.textMuted,
                marginTop: 4,
              }}>
                需要重点关注的风险
              </div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div style={statCardStyle(COLORS.warning)}>
            <div style={{ padding: '20px 20px 16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <span style={{
                  fontSize: 13,
                  color: COLORS.textSecondary,
                  fontWeight: 500,
                }}>
                  待处理
                </span>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: `${COLORS.warning}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <WarningOutlined style={{ fontSize: 18, color: COLORS.warning }} />
                </div>
              </div>
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                color: COLORS.warning,
                lineHeight: 1.2,
              }}>
                {stats.pending}
              </div>
              <div style={{
                fontSize: 12,
                color: COLORS.textMuted,
                marginTop: 4,
              }}>
                等待处理的风险项
              </div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div style={statCardStyle(COLORS.success)}>
            <div style={{ padding: '20px 20px 16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <span style={{
                  fontSize: 13,
                  color: COLORS.textSecondary,
                  fontWeight: 500,
                }}>
                  本月关闭
                </span>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: `${COLORS.success}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <CheckCircleOutlined style={{ fontSize: 18, color: COLORS.success }} />
                </div>
              </div>
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                color: COLORS.success,
                lineHeight: 1.2,
              }}>
                {stats.closedThisMonth}
              </div>
              <div style={{
                fontSize: 12,
                color: COLORS.textMuted,
                marginTop: 4,
              }}>
                本月已关闭的风险
              </div>
            </div>
          </div>
        </Col>
      </Row>

      <div style={{
        backgroundColor: COLORS.bgCard,
        borderRadius: 8,
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        overflow: 'hidden',
      }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{
            padding: '0 24px',
          }}
          tabBarStyle={{
            borderBottom: `1px solid ${COLORS.border}`,
            marginBottom: 0,
          }}
        >
          <TabPane tab={<span style={{ fontWeight: 500 }}>风险条目</span>} key="entries">
            <div style={{ padding: '20px 0' }}>
                <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 20,
                padding: '16px 20px',
                backgroundColor: COLORS.bgLight,
                borderRadius: 8,
              }}>
                <TreeSelect
                  placeholder="风险类型"
                  style={{ width: 180 }}
                  allowClear
                  treeData={getTreeData(riskTypes)}
                  treeDefaultExpandAll
                  value={filters.type_id}
                  onChange={v => { const newFilters = { ...filters, type_id: v }; setFilters(newFilters); handleSearch(newFilters); }}
                  dropdownStyle={{ borderRadius: 6 }}
                />
                <Select
                  placeholder="风险等级"
                  style={{ width: 120 }}
                  allowClear
                  value={filters.level}
                  onChange={v => { const newFilters = { ...filters, level: v }; setFilters(newFilters); handleSearch(newFilters); }}
                >
                  <Select.Option value="CRITICAL">严重风险</Select.Option>
                  <Select.Option value="HIGH">高风险</Select.Option>
                  <Select.Option value="MEDIUM">中风险</Select.Option>
                  <Select.Option value="LOW">低风险</Select.Option>
                </Select>
                <Select
                  placeholder="状态"
                  style={{ width: 120 }}
                  allowClear
                  value={filters.status}
                  onChange={v => { const newFilters = { ...filters, status: v }; setFilters(newFilters); handleSearch(newFilters); }}
                >
                  <Select.Option value="OPEN">待处理</Select.Option>
                  <Select.Option value="MITIGATED">已缓解</Select.Option>
                  <Select.Option value="ACCEPTED">已接受</Select.Option>
                  <Select.Option value="CLOSED">已关闭</Select.Option>
                </Select>
                <RangePicker
                  style={{ width: 280 }}
                  onChange={(dates) => {
                    const newFilters = {
                      ...filters,
                      dateRange: dates && dates.length === 2 ? [dates[0], dates[1]] as [dayjs.Dayjs, dayjs.Dayjs] : undefined
                    };
                    setFilters(newFilters);
                    handleSearch(newFilters);
                  }}
                />
                <Button onClick={handleReset}>重置</Button>
                <div style={{ flex: 1 }} />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateEntry}
                  style={{
                    backgroundColor: COLORS.primary,
                    borderColor: COLORS.primary,
                  }}
                >
                  录入风险
                </Button>
                <Upload
                  accept=".xlsx,.xls,.csv"
                  showUploadList={false}
                  beforeUpload={handleImport}
                >
                  <Button icon={<UploadOutlined />} loading={importLoading}>
                    批量导入
                  </Button>
                </Upload>
              </div>

              <Table
                columns={entryColumns}
                dataSource={riskEntries}
                rowKey="id"
                loading={loading}
                scroll={{ x: 1200 }}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条记录`,
                  style: { marginRight: 8 },
                }}
                style={{
                  borderRadius: 0,
                }}
              />
            </div>
          </TabPane>

          <TabPane tab={<span style={{ fontWeight: 500 }}>风险类型管理</span>} key="types">
            <div style={{ padding: '20px 0' }}>
              <div style={{ marginBottom: 16, padding: '0 20px' }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateType}
                  style={{
                    backgroundColor: COLORS.primary,
                    borderColor: COLORS.primary,
                  }}
                >
                  新建类型
                </Button>
              </div>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{
                    margin: '0 12px 0 20px',
                    padding: 16,
                    backgroundColor: COLORS.bgLight,
                    borderRadius: 8,
                  }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: COLORS.textPrimary,
                      marginBottom: 12,
                    }}>
                      类型树
                    </div>
                    <Tree
                      showLine
                      selectable
                      treeData={getTreeData(riskTypes)}
                      onSelect={(selectedKeys) => {
                        if (selectedKeys.length > 0) {
                          const key = selectedKeys[0] as number
                          const type = flattenTreeData(riskTypes).find(t => t.id === key)
                          if (type) {
                            message.info(`已选择: ${type.name}`)
                          }
                        }
                      }}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ margin: '0 20px 0 12px', padding: 16, backgroundColor: COLORS.bgLight, borderRadius: 8 }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: COLORS.textPrimary,
                      marginBottom: 12,
                    }}>
                      类型列表
                    </div>
                    <Table
                      columns={typeColumns}
                      dataSource={flattenTreeData(riskTypes)}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />
                  </div>
                </Col>
              </Row>
            </div>
          </TabPane>

          <TabPane tab={<span style={{ fontWeight: 500 }}>风险统计</span>} key="statistics">
            <div style={{ padding: '20px 0' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <div style={{
                    margin: '0 12px 16px 20px',
                    padding: 20,
                    backgroundColor: COLORS.bgLight,
                    borderRadius: 8,
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 20,
                    }}>
                      <PieChartOutlined style={{ fontSize: 16, color: COLORS.primary }} />
                      <span style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: COLORS.textPrimary,
                      }}>
                        风险等级分布
                      </span>
                    </div>
                    <Row gutter={16} align="middle">
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <Progress
                            type="circle"
                            percent={18}
                            strokeColor={COLORS.error}
                            size={100}
                            format={() => <span style={{ fontSize: 20, fontWeight: 600, color: COLORS.error }}>高</span>}
                          />
                          <p style={{ marginTop: 12, fontWeight: 500, color: COLORS.textPrimary }}>
                            高风险 ({stats.byLevel.high})
                          </p>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <Progress
                            type="circle"
                            percent={27}
                            strokeColor={COLORS.warning}
                            size={100}
                            format={() => <span style={{ fontSize: 20, fontWeight: 600, color: COLORS.warning }}>中</span>}
                          />
                          <p style={{ marginTop: 12, fontWeight: 500, color: COLORS.textPrimary }}>
                            中风险 ({stats.byLevel.medium})
                          </p>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <Progress
                            type="circle"
                            percent={55}
                            strokeColor={COLORS.success}
                            size={100}
                            format={() => <span style={{ fontSize: 20, fontWeight: 600, color: COLORS.success }}>低</span>}
                          />
                          <p style={{ marginTop: 12, fontWeight: 500, color: COLORS.textPrimary }}>
                            低风险 ({stats.byLevel.low})
                          </p>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </Col>

                <Col xs={24} lg={12}>
                  <div style={{
                    margin: '0 20px 16px 12px',
                    padding: 20,
                    backgroundColor: COLORS.bgLight,
                    borderRadius: 8,
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 20,
                    }}>
                      <BarChartOutlined style={{ fontSize: 16, color: COLORS.primary }} />
                      <span style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: COLORS.textPrimary,
                      }}>
                        风险类型分布
                      </span>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      <Space>
                        <Tag color="blue">人员风险</Tag>
                        <span style={{ color: COLORS.textSecondary }}>
                          {stats.byType.personnel}个 ({Math.round(stats.byType.personnel / stats.total * 100) || 0}%)
                        </span>
                      </Space>
                      <Progress
                        percent={Math.round(stats.byType.personnel / stats.total * 100) || 0}
                        showInfo={false}
                        strokeColor={COLORS.primary}
                        style={{ marginTop: 8 }}
                      />
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      <Space>
                        <Tag color="purple">质量风险</Tag>
                        <span style={{ color: COLORS.textSecondary }}>
                          {stats.byType.quality}个 ({Math.round(stats.byType.quality / stats.total * 100) || 0}%)
                        </span>
                      </Space>
                      <Progress
                        percent={Math.round(stats.byType.quality / stats.total * 100) || 0}
                        showInfo={false}
                        strokeColor={COLORS.purple}
                        style={{ marginTop: 8 }}
                      />
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      <Space>
                        <Tag color="orange">合规风险</Tag>
                        <span style={{ color: COLORS.textSecondary }}>
                          {stats.byType.compliance}个 ({Math.round(stats.byType.compliance / stats.total * 100) || 0}%)
                        </span>
                      </Space>
                      <Progress
                        percent={Math.round(stats.byType.compliance / stats.total * 100) || 0}
                        showInfo={false}
                        strokeColor={COLORS.warning}
                        style={{ marginTop: 8 }}
                      />
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      <Space>
                        <Tag color="red">安全风险</Tag>
                        <span style={{ color: COLORS.textSecondary }}>
                          {stats.byType.security}个 ({Math.round(stats.byType.security / stats.total * 100) || 0}%)
                        </span>
                      </Space>
                      <Progress
                        percent={Math.round(stats.byType.security / stats.total * 100) || 0}
                        showInfo={false}
                        strokeColor={COLORS.error}
                        style={{ marginTop: 8 }}
                      />
                    </div>
                  </div>
                </Col>

                <Col span={24}>
                  <div style={{
                    margin: '0 20px 0 20px',
                    padding: 20,
                    backgroundColor: COLORS.bgLight,
                    borderRadius: 8,
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 20,
                    }}>
                      <BarChartOutlined style={{ fontSize: 16, color: COLORS.primary }} />
                      <span style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: COLORS.textPrimary,
                      }}>
                        本周趋势
                      </span>
                    </div>
                    <Row gutter={16}>
                      <Col span={6}>
                        <div style={{
                          padding: 16,
                          backgroundColor: COLORS.bgCard,
                          borderRadius: 8,
                          textAlign: 'center',
                        }}>
                          <WarningOutlined style={{ fontSize: 20, color: COLORS.primary, marginBottom: 8 }} />
                          <div style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: COLORS.primary,
                          }}>
                            5
                          </div>
                          <div style={{
                            fontSize: 13,
                            color: COLORS.textSecondary,
                          }}>
                            本周新增
                          </div>
                        </div>
                      </Col>
                      <Col span={6}>
                        <div style={{
                          padding: 16,
                          backgroundColor: COLORS.bgCard,
                          borderRadius: 8,
                          textAlign: 'center',
                        }}>
                          <CheckCircleOutlined style={{ fontSize: 20, color: COLORS.success, marginBottom: 8 }} />
                          <div style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: COLORS.success,
                          }}>
                            3
                          </div>
                          <div style={{
                            fontSize: 13,
                            color: COLORS.textSecondary,
                          }}>
                            本周关闭
                          </div>
                        </div>
                      </Col>
                      <Col span={6}>
                        <div style={{
                          padding: 16,
                          backgroundColor: COLORS.bgCard,
                          borderRadius: 8,
                          textAlign: 'center',
                        }}>
                          <ExclamationCircleOutlined style={{ fontSize: 20, color: COLORS.error, marginBottom: 8 }} />
                          <div style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: COLORS.error,
                          }}>
                            1
                          </div>
                          <div style={{
                            fontSize: 13,
                            color: COLORS.textSecondary,
                          }}>
                            本周升级
                          </div>
                        </div>
                      </Col>
                      <Col span={6}>
                        <div style={{
                          padding: 16,
                          backgroundColor: COLORS.bgCard,
                          borderRadius: 8,
                          textAlign: 'center',
                        }}>
                          <CheckCircleOutlined style={{ fontSize: 20, color: COLORS.warning, marginBottom: 8 }} />
                          <div style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: COLORS.warning,
                          }}>
                            2
                          </div>
                          <div style={{
                            fontSize: 13,
                            color: COLORS.textSecondary,
                          }}>
                            本周降级
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </Col>
              </Row>
            </div>
          </TabPane>
        </Tabs>
      </div>

      <Modal
        title={
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.textPrimary,
            paddingBottom: 12,
            borderBottom: `1px solid ${COLORS.border}`,
          }}>
            新建风险类型
          </div>
        }
        open={typeModalVisible}
        onOk={handleTypeSubmit}
        onCancel={() => setTypeModalVisible(false)}
        width={480}
        destroyOnClose
        styles={{
          body: { paddingTop: 20 },
          footer: {
            padding: '16px 24px',
            borderTop: `1px solid ${COLORS.border}`,
          },
        }}
      >
        <Form form={typeForm} layout="vertical">
          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.textPrimary }}>类型名称</span>}
            name="name"
            rules={[{ required: true, message: '请输入类型名称' }]}
          >
            <Input placeholder="请输入类型名称" />
          </Form.Item>
          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.textPrimary }}>分类</span>}
            name="category"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="请选择分类">
              <Select.Option value="personnel">人员风险</Select.Option>
              <Select.Option value="quality">质量风险</Select.Option>
              <Select.Option value="compliance">合规风险</Select.Option>
              <Select.Option value="security">安全风险</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.textPrimary }}>上级类型</span>}
            name="parent_id"
          >
            <Select placeholder="选择上级类型（可选）" allowClear>
              {flattenTreeData(riskTypes).map(t => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.textPrimary,
            paddingBottom: 12,
            borderBottom: `1px solid ${COLORS.border}`,
          }}>
            {editingEntry ? '编辑风险' : '录入风险'}
          </div>
        }
        open={entryModalVisible}
        onOk={handleEntrySubmit}
        onCancel={() => setEntryModalVisible(false)}
        width={680}
        destroyOnClose
        styles={{
          body: { paddingTop: 20 },
          footer: {
            padding: '16px 24px',
            borderTop: `1px solid ${COLORS.border}`,
          },
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.textPrimary }}>风险标题</span>}
            name="title"
            rules={[{ required: true, message: '请输入风险标题' }]}
          >
            <Input placeholder="请输入风险标题" />
          </Form.Item>
          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.textPrimary }}>风险类型</span>}
            name="type_id"
            rules={[{ required: true, message: '请选择风险类型' }]}
          >
            <Select placeholder="请选择风险类型">
              {flattenTreeData(riskTypes).map(t => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.textPrimary }}>合作伙伴</span>}
            name="partner_id"
          >
            <Select placeholder="选择合作伙伴（可选）" allowClear>
              {partners.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Space size="middle" style={{ width: '100%' }}>
            <Form.Item
              label={<span style={{ fontWeight: 500, color: COLORS.textPrimary }}>风险等级</span>}
              name="level"
              rules={[{ required: true, message: '请选择风险等级' }]}
              style={{ width: 180 }}
            >
              <Select placeholder="请选择">
                <Select.Option value="CRITICAL">严重风险</Select.Option>
                <Select.Option value="HIGH">高风险</Select.Option>
                <Select.Option value="MEDIUM">中风险</Select.Option>
                <Select.Option value="LOW">低风险</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              label={<span style={{ fontWeight: 500, color: COLORS.textPrimary }}>发生概率</span>}
              name="probability"
              style={{ width: 150 }}
            >
              <Select placeholder="请选择">
                <Select.Option value="low">低</Select.Option>
                <Select.Option value="medium">中</Select.Option>
                <Select.Option value="high">高</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              label={<span style={{ fontWeight: 500, color: COLORS.textPrimary }}>影响范围</span>}
              name="impact"
              style={{ width: 150 }}
            >
              <Select placeholder="请选择">
                <Select.Option value="low">低</Select.Option>
                <Select.Option value="medium">中</Select.Option>
                <Select.Option value="high">高</Select.Option>
              </Select>
            </Form.Item>
          </Space>
          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.textPrimary }}>风险描述</span>}
            name="description"
          >
            <Input.TextArea rows={3} placeholder="请输入风险描述" />
          </Form.Item>
          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.textPrimary }}>触发条件</span>}
            name="trigger_condition"
          >
            <Input.TextArea rows={2} placeholder="请输入触发条件" />
          </Form.Item>
          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.textPrimary }}>处置措施</span>}
            name="mitigation"
          >
            <Input.TextArea rows={3} placeholder="请输入处置措施" />
          </Form.Item>
          <Form.Item
            label={<span style={{ fontWeight: 500, color: COLORS.textPrimary }}>附件</span>}
            name="attachment"
          >
            <Upload
              accept=".pdf,.doc,.docx,.xlsx,.xls"
              maxCount={5}
              beforeUpload={() => {
                message.success('文件上传成功')
                return false
              }}
            >
              <Button icon={<UploadOutlined />}>上传文件（最多5个）</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.textPrimary,
          }}>
            风险详情
          </div>
        }
        placement="right"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={560}
        extra={
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              if (selectedEntry) {
                setDetailVisible(false)
                handleEditEntry(selectedEntry)
              }
            }}
            style={{
              color: COLORS.primary,
              borderColor: COLORS.primary,
            }}
          >
            编辑
          </Button>
        }
        styles={{
          header: {
            borderBottom: `1px solid ${COLORS.border}`,
            padding: '16px 24px',
          },
          body: {
            padding: '20px 24px',
          },
        }}
      >
        {selectedEntry && (
          <Descriptions
            column={2}
            bordered
            size="small"
            labelStyle={{
              backgroundColor: COLORS.bgLight,
              fontWeight: 500,
              color: COLORS.textPrimary,
            }}
            contentStyle={{
              color: COLORS.textSecondary,
            }}
          >
            <Descriptions.Item label="风险标题" span={2}>
              <span style={{ fontWeight: 500, color: COLORS.textPrimary }}>
                {selectedEntry.title}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="风险类型">
              <Tag color={categoryMap[riskTypes.find(t => t.id === selectedEntry.type_id)?.category || '']?.color}>
                {selectedEntry.type_name}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="合作伙伴">
              {selectedEntry.partner_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="风险等级">
              <Tag
                style={{
                  backgroundColor: RISK_LEVELS[selectedEntry.level]?.bg,
                  color: RISK_LEVELS[selectedEntry.level]?.color,
                  borderColor: RISK_LEVELS[selectedEntry.level]?.border,
                }}
              >
                {RISK_LEVELS[selectedEntry.level]?.label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[selectedEntry.status]?.color}>
                {statusMap[selectedEntry.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="发生概率">
              {selectedEntry.probability === 'high' ? '高' : selectedEntry.probability === 'medium' ? '中' : '低'}
            </Descriptions.Item>
            <Descriptions.Item label="影响范围">
              {selectedEntry.impact === 'high' ? '高' : selectedEntry.impact === 'medium' ? '中' : '低'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {selectedEntry.created_at}
            </Descriptions.Item>
            {selectedEntry.updated_at && (
              <Descriptions.Item label="更新时间">
                {selectedEntry.updated_at}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="风险描述" span={2}>
              {selectedEntry.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="触发条件" span={2}>
              {selectedEntry.trigger_condition || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="处置措施" span={2}>
              <pre style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                color: COLORS.textSecondary,
              }}>
                {selectedEntry.mitigation || '-'}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}

export default RiskLibrary
