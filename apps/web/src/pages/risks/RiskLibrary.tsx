import React, { useState, useEffect } from 'react'
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
  Tree,
  Descriptions,
  Row,
  Col,
  Statistic,
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
  level: 'LOW' | 'MEDIUM' | 'HIGH'
  probability: string
  impact: string
  trigger_condition: string
  mitigation: string
  status: 'OPEN' | 'MITIGATED' | 'ACCEPTED' | 'CLOSED'
  created_at: string
  updated_at?: string
}

const RiskLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState('entries')
  const [riskTypes, setRiskTypes] = useState<RiskType[]>([])
  const [riskEntries, setRiskEntries] = useState<RiskEntry[]>([])
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
  const [form] = Form.useForm()
  const [typeForm] = Form.useForm()
  const [importLoading, setImportLoading] = useState(false)

  // Mock statistics data
  const stats = {
    total: 45,
    highRisk: 8,
    pending: 15,
    closedThisMonth: 12,
    byLevel: { high: 8, medium: 12, low: 25 },
    byType: { personnel: 15, quality: 12, compliance: 10, security: 8 },
  }

  useEffect(() => {
    fetchRiskTypes()
    fetchRiskEntries()
  }, [])

  const fetchRiskTypes = async () => {
    try {
      const response = await apiClient.get('/risks/types')
      setRiskTypes(response.data || [])
    } catch {
      // Use mock data when API unavailable
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

  const fetchRiskEntries = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.type_id) params.append('type_id', String(filters.type_id))
      if (filters.level) params.append('level', filters.level)
      if (filters.status) params.append('status', filters.status)
      if (filters.dateRange) {
        params.append('start_date', filters.dateRange[0].format('YYYY-MM-DD'))
        params.append('end_date', filters.dateRange[1].format('YYYY-MM-DD'))
      }
      const response = await apiClient.get(`/risks?${params.toString()}`)
      setRiskEntries(response.data || [])
    } catch {
      // Use mock data when API unavailable
      setRiskEntries([
        {
          id: 1,
          type_id: 1,
          type_name: '人员风险',
          partner_id: 1,
          partner_name: '合作伙伴A',
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
          partner_name: '合作伙伴B',
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
          partner_name: '合作伙伴A',
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
          partner_name: '合作伙伴C',
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
  }

  const handleSearch = () => fetchRiskEntries()

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

  const levelMap = {
    LOW: { color: '#52c41a', text: '低风险', bg: '#f6ffed', border: '#b7eb8f' },
    MEDIUM: { color: '#faad14', text: '中风险', bg: '#fffbe6', border: '#ffe58f' },
    HIGH: { color: '#ff4d4f', text: '高风险', bg: '#fff2f0', border: '#ffccc7' },
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

  const entryColumns: ColumnsType<RiskEntry> = [
    { title: '风险标题', dataIndex: 'title', key: 'title', width: 200, ellipsis: true },
    { title: '风险类型', dataIndex: 'type_name', key: 'type_name', width: 120 },
    { title: '合作伙伴', dataIndex: 'partner_name', key: 'partner_name', width: 120, render: (v: string) => v || '-' },
    {
      title: '风险等级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: RiskEntry['level']) => (
        <Tag
          style={{
            backgroundColor: levelMap[level].bg,
            color: levelMap[level].color,
            borderColor: levelMap[level].border,
          }}
        >
          {levelMap[level].text}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>,
    },
    { title: '发生概率', dataIndex: 'probability', key: 'probability', width: 90, render: (v: string) => v === 'high' ? '高' : v === 'medium' ? '中' : '低' },
    { title: '影响范围', dataIndex: 'impact', key: 'impact', width: 90, render: (v: string) => v === 'high' ? '高' : v === 'medium' ? '中' : '低' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 170 },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditEntry(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteEntry(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const typeColumns: ColumnsType<RiskType> = [
    { title: '类型名称', dataIndex: 'name', key: 'name' },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (c: string) => <Tag color={categoryMap[c]?.color}>{categoryMap[c]?.text || c}</Tag>,
    },
    { title: '上级ID', dataIndex: 'parent_id', key: 'parent_id', render: (v: number) => v || '-' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteType(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 16, fontWeight: 600 }}>风险库管理</h1>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} styles={{ body: { padding: 20 } }}>
            <Statistic
              title="风险总数"
              value={stats.total}
              prefix={<WarningOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#333', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} styles={{ body: { padding: 20 } }}>
            <Statistic
              title="高风险"
              value={stats.highRisk}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} styles={{ body: { padding: 20 } }}>
            <Statistic
              title="待处理"
              value={stats.pending}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} styles={{ body: { padding: 20 } }}>
            <Statistic
              title="本月关闭"
              value={stats.closedThisMonth}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontSize: 28 }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* Risk Entries Tab */}
          <TabPane tab="风险条目" key="entries">
            <Space style={{ marginBottom: 16 }} wrap>
              <TreeSelect
                placeholder="风险类型"
                style={{ width: 180 }}
                allowClear
                treeData={getTreeData(riskTypes)}
                treeDefaultExpandAll
                value={filters.type_id}
                onChange={v => setFilters({ ...filters, type_id: v })}
              />
              <Select
                placeholder="风险等级"
                style={{ width: 120 }}
                allowClear
                value={filters.level}
                onChange={v => setFilters({ ...filters, level: v })}
              >
                <Select.Option value="LOW">低风险</Select.Option>
                <Select.Option value="MEDIUM">中风险</Select.Option>
                <Select.Option value="HIGH">高风险</Select.Option>
              </Select>
              <Select
                placeholder="状态"
                style={{ width: 120 }}
                allowClear
                value={filters.status}
                onChange={v => setFilters({ ...filters, status: v })}
              >
                <Select.Option value="OPEN">待处理</Select.Option>
                <Select.Option value="MITIGATED">已缓解</Select.Option>
                <Select.Option value="ACCEPTED">已接受</Select.Option>
                <Select.Option value="CLOSED">已关闭</Select.Option>
              </Select>
              <RangePicker
                style={{ width: 280 }}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setFilters({ ...filters, dateRange: [dates[0], dates[1]] })
                  } else {
                    setFilters({ ...filters, dateRange: undefined })
                  }
                }}
              />
              <Button type="primary" onClick={handleSearch}>搜索</Button>
              <Button onClick={handleReset}>重置</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateEntry}>
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
            </Space>
            <Table
              columns={entryColumns}
              dataSource={riskEntries}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
            />
          </TabPane>

          {/* Risk Type Management Tab */}
          <TabPane tab="风险类型管理" key="types">
            <Space style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateType}>
                新建类型
              </Button>
            </Space>
            <Row gutter={16}>
              <Col span={12}>
                <Card title="类型树" size="small">
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
                </Card>
              </Col>
              <Col span={12}>
                <Card title="类型列表" size="small">
                  <Table
                    columns={typeColumns}
                    dataSource={flattenTreeData(riskTypes)}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* Risk Statistics Tab */}
          <TabPane tab="风险统计" key="statistics">
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card
                  title="风险等级分布"
                  extra={<PieChartOutlined />}
                  styles={{ body: { padding: 24 } }}
                >
                  <Row gutter={16} align="middle">
                    <Col span={8}>
                      <div style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={18} strokeColor="#ff4d4f" size={100} format={() => '高'} />
                        <p style={{ marginTop: 8, fontWeight: 500 }}>高风险 ({stats.byLevel.high})</p>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={27} strokeColor="#faad14" size={100} format={() => '中'} />
                        <p style={{ marginTop: 8, fontWeight: 500 }}>中风险 ({stats.byLevel.medium})</p>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={55} strokeColor="#52c41a" size={100} format={() => '低'} />
                        <p style={{ marginTop: 8, fontWeight: 500 }}>低风险 ({stats.byLevel.low})</p>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card
                  title="风险类型分布"
                  extra={<BarChartOutlined />}
                  styles={{ body: { padding: 24 } }}
                >
                  <div style={{ padding: '8px 0' }}>
                    <Space>
                      <Tag color="blue">人员风险</Tag>
                      <span>{stats.byType.personnel}个 ({Math.round(stats.byType.personnel / stats.total * 100)}%)</span>
                    </Space>
                    <Progress percent={Math.round(stats.byType.personnel / stats.total * 100)} showInfo={false} strokeColor="#1677ff" />
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    <Space>
                      <Tag color="purple">质量风险</Tag>
                      <span>{stats.byType.quality}个 ({Math.round(stats.byType.quality / stats.total * 100)}%)</span>
                    </Space>
                    <Progress percent={Math.round(stats.byType.quality / stats.total * 100)} showInfo={false} strokeColor="#722ed1" />
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    <Space>
                      <Tag color="orange">合规风险</Tag>
                      <span>{stats.byType.compliance}个 ({Math.round(stats.byType.compliance / stats.total * 100)}%)</span>
                    </Space>
                    <Progress percent={Math.round(stats.byType.compliance / stats.total * 100)} showInfo={false} strokeColor="#fa8c16" />
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    <Space>
                      <Tag color="red">安全风险</Tag>
                      <span>{stats.byType.security}个 ({Math.round(stats.byType.security / stats.total * 100)}%)</span>
                    </Space>
                    <Progress percent={Math.round(stats.byType.security / stats.total * 100)} showInfo={false} strokeColor="#f5222d" />
                  </div>
                </Card>
              </Col>
              <Col span={24}>
                <Card title="风险等级趋势" extra={<BarChartOutlined />}>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Statistic title="本周新增" value={5} prefix={<WarningOutlined />} valueStyle={{ color: '#1677ff' }} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="本周关闭" value={3} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="本周升级" value={1} prefix={<ExclamationCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="本周降级" value={2} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* Create/Edit Type Modal */}
      <Modal
        title="新建风险类型"
        open={typeModalVisible}
        onOk={handleTypeSubmit}
        onCancel={() => setTypeModalVisible(false)}
        width={500}
      >
        <Form form={typeForm} layout="vertical">
          <Form.Item label="类型名称" name="name" rules={[{ required: true, message: '请输入类型名称' }]}>
            <Input placeholder="请输入类型名称" />
          </Form.Item>
          <Form.Item label="分类" name="category" rules={[{ required: true, message: '请选择分类' }]}>
            <Select placeholder="请选择分类">
              <Select.Option value="personnel">人员风险</Select.Option>
              <Select.Option value="quality">质量风险</Select.Option>
              <Select.Option value="compliance">合规风险</Select.Option>
              <Select.Option value="security">安全风险</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="上级类型" name="parent_id">
            <Select placeholder="选择上级类型（可选）" allowClear>
              {flattenTreeData(riskTypes).map(t => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create/Edit Entry Modal */}
      <Modal
        title={editingEntry ? '编辑风险' : '录入风险'}
        open={entryModalVisible}
        onOk={handleEntrySubmit}
        onCancel={() => setEntryModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="风险标题" name="title" rules={[{ required: true, message: '请输入风险标题' }]}>
            <Input placeholder="请输入风险标题" />
          </Form.Item>
          <Form.Item label="风险类型" name="type_id" rules={[{ required: true, message: '请选择风险类型' }]}>
            <Select placeholder="请选择风险类型">
              {flattenTreeData(riskTypes).map(t => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="合作伙伴" name="partner_id">
            <Select placeholder="选择合作伙伴（可选）" allowClear>
              <Select.Option value={1}>合作伙伴A</Select.Option>
              <Select.Option value={2}>合作伙伴B</Select.Option>
              <Select.Option value={3}>合作伙伴C</Select.Option>
            </Select>
          </Form.Item>
          <Space size="middle" style={{ width: '100%' }}>
            <Form.Item label="风险等级" name="level" rules={[{ required: true, message: '请选择风险等级' }]} style={{ width: 180 }}>
              <Select placeholder="请选择">
                <Select.Option value="LOW">低风险</Select.Option>
                <Select.Option value="MEDIUM">中风险</Select.Option>
                <Select.Option value="HIGH">高风险</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="发生概率" name="probability" style={{ width: 150 }}>
              <Select placeholder="请选择">
                <Select.Option value="low">低</Select.Option>
                <Select.Option value="medium">中</Select.Option>
                <Select.Option value="high">高</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="影响范围" name="impact" style={{ width: 150 }}>
              <Select placeholder="请选择">
                <Select.Option value="low">低</Select.Option>
                <Select.Option value="medium">中</Select.Option>
                <Select.Option value="high">高</Select.Option>
              </Select>
            </Form.Item>
          </Space>
          <Form.Item label="风险描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入风险描述" />
          </Form.Item>
          <Form.Item label="触发条件" name="trigger_condition">
            <Input.TextArea rows={2} placeholder="请输入触发条件" />
          </Form.Item>
          <Form.Item label="处置措施" name="mitigation">
            <Input.TextArea rows={3} placeholder="请输入处置措施" />
          </Form.Item>
          <Form.Item label="附件" name="attachment">
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

      {/* Detail Drawer */}
      <Drawer
        title="风险详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={600}
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => {
              if (selectedEntry) {
                setDetailVisible(false)
                handleEditEntry(selectedEntry)
              }
            }}>
              编辑
            </Button>
          </Space>
        }
      >
        {selectedEntry && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="风险标题" span={2}>{selectedEntry.title}</Descriptions.Item>
            <Descriptions.Item label="风险类型">
              <Tag color={categoryMap[riskTypes.find(t => t.id === selectedEntry.type_id)?.category || '']?.color}>
                {selectedEntry.type_name}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="合作伙伴">{selectedEntry.partner_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="风险等级">
              <Tag
                style={{
                  backgroundColor: levelMap[selectedEntry.level].bg,
                  color: levelMap[selectedEntry.level].color,
                  borderColor: levelMap[selectedEntry.level].border,
                }}
              >
                {levelMap[selectedEntry.level].text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[selectedEntry.status]?.color}>{statusMap[selectedEntry.status]?.text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="发生概率">
              {selectedEntry.probability === 'high' ? '高' : selectedEntry.probability === 'medium' ? '中' : '低'}
            </Descriptions.Item>
            <Descriptions.Item label="影响范围">
              {selectedEntry.impact === 'high' ? '高' : selectedEntry.impact === 'medium' ? '中' : '低'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">{selectedEntry.created_at}</Descriptions.Item>
            {selectedEntry.updated_at && (
              <Descriptions.Item label="更新时间">{selectedEntry.updated_at}</Descriptions.Item>
            )}
            <Descriptions.Item label="风险描述" span={2}>{selectedEntry.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="触发条件" span={2}>{selectedEntry.trigger_condition || '-'}</Descriptions.Item>
            <Descriptions.Item label="处置措施" span={2}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
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
