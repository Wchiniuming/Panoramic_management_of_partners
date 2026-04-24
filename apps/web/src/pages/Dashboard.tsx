import React, { useEffect, useRef, useState } from 'react'
import { Card, Row, Col, Spin } from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  TeamOutlined,
  FileTextOutlined,
  AuditOutlined,
  WarningOutlined,
  UserAddOutlined,
  FormOutlined,
  CheckCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { Chart, registerables } from 'chart.js'
import apiClient from '@/api/axios'

Chart.register(...registerables)

interface DashboardStats {
  developers: { total: number; trend: number; trendDirection: 'up' | 'down' }
  tasks: { inProgress: number; delayed: number; trend: number }
  assessments: { completed: number; trendDirection: 'up' | 'down' }
  risks: { total: number; critical: number }
}

interface TaskTrendData {
  labels: string[]
  completed: number[]
  delayed: number[]
}

interface AssessmentDistribution {
  labels: string[]
  data: number[]
}

interface RecentTask {
  id: number
  title: string
  assignee: string
  status: 'pending' | 'in_progress' | 'completed' | 'delayed'
  deadline?: string
}

interface Partner {
  id: number
  name: string
  type: string
  score: number
  status: 'online' | 'offline' | 'busy'
}

interface RiskOverview {
  critical: number
  high: number
  medium: number
  low: number
}

interface SkillDistribution {
  name: string
  percentage: number
  color: string
}

interface Activity {
  id: number
  user: string
  action: string
  target: string
  time: string
  type: 'success' | 'info' | 'warning' | 'error'
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    developers: { total: 0, trend: 0, trendDirection: 'up' },
    tasks: { inProgress: 0, delayed: 0, trend: 0 },
    assessments: { completed: 0, trendDirection: 'up' },
    risks: { total: 0, critical: 0 },
  })
  const [taskTrendData, setTaskTrendData] = useState<TaskTrendData>({ labels: [], completed: [], delayed: [] })
  const [assessmentData, setAssessmentData] = useState<AssessmentDistribution>({ labels: [], data: [] })
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [riskOverview, setRiskOverview] = useState<RiskOverview>({ critical: 0, high: 0, medium: 0, low: 0 })
  const [activities, setActivities] = useState<Activity[]>([])

  const taskTrendRef = useRef<HTMLCanvasElement>(null)
  const assessmentRef = useRef<HTMLCanvasElement>(null)
  const taskTrendChartRef = useRef<Chart | null>(null)
  const assessmentChartRef = useRef<Chart | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (taskTrendRef.current && taskTrendData.labels.length > 0) {
      if (taskTrendChartRef.current) {
        taskTrendChartRef.current.destroy()
      }
      const ctx = taskTrendRef.current.getContext('2d')
      if (ctx) {
        taskTrendChartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: taskTrendData.labels,
            datasets: [
              {
                label: '完成任务',
                data: taskTrendData.completed,
                borderColor: '#1890ff',
                backgroundColor: 'rgba(24, 144, 255, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#1890ff',
              },
              {
                label: '延期任务',
                data: taskTrendData.delayed,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#f59e0b',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
              y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
            },
          },
        })
      }
    }
  }, [taskTrendData])

  useEffect(() => {
    if (assessmentRef.current && assessmentData.labels.length > 0) {
      if (assessmentChartRef.current) {
        assessmentChartRef.current.destroy()
      }
      const ctx = assessmentRef.current.getContext('2d')
      if (ctx) {
        assessmentChartRef.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: assessmentData.labels,
            datasets: [{
              data: assessmentData.data,
              backgroundColor: ['#22c55e', '#1890ff', '#f59e0b', '#ef4444'],
              borderWidth: 0,
              spacing: 4,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: { font: { size: 12 }, color: '#64748b', padding: 16, usePointStyle: true },
              },
            },
          },
        })
      }
    }
  }, [assessmentData])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [statsRes, tasksRes, partnersRes, assessmentsRes] = await Promise.allSettled([
        apiClient.get('/dashboard/stats'),
        apiClient.get('/tasks?page=1&page_size=10'),
        apiClient.get('/partners?page=1&page_size=10'),
        apiClient.get('/assessment/reports?page=1&page_size=100'),
      ])

      const stats = statsRes.status === 'fulfilled' ? (statsRes as any).value.data : null
      const tasksData = tasksRes.status === 'fulfilled' ? (tasksRes as any).value.data : []
      const partnersData = partnersRes.status === 'fulfilled' ? (partnersRes as any).value.data : []
      const assessments = assessmentsRes.status === 'fulfilled' ? (assessmentsRes as any).value.data : []

      if (stats) {
        setStats({
          developers: {
            total: stats.developers?.total || 0,
            trend: 0,
            trendDirection: 'up'
          },
          tasks: {
            inProgress: stats.tasks?.inProgress || 0,
            delayed: stats.tasks?.delayed || 0,
            trend: 0
          },
          assessments: {
            completed: stats.assessments?.published || 0,
            trendDirection: 'up'
          },
          risks: {
            total: stats.risks?.total || 0,
            critical: stats.risks?.critical || 0
          },
        })
      }

      setTaskTrendData({
        labels: ['1日', '5日', '10日', '15日', '20日', '25日', '30日'],
        completed: [12, 19, 15, 22, 18, 25, 28],
        delayed: [2, 3, 1, 4, 3, 2, 5],
      })

      const excellentCount = assessments.filter((a: any) => a.totalScore >= 90).length
      const goodCount = assessments.filter((a: any) => a.totalScore >= 75 && a.totalScore < 90).length
      const qualifiedCount = assessments.filter((a: any) => a.totalScore >= 60 && a.totalScore < 75).length
      const needsWorkCount = assessments.filter((a: any) => a.totalScore < 60).length

      setAssessmentData({
        labels: ['优秀', '良好', '合格', '待改进'],
        data: [excellentCount, goodCount, qualifiedCount, needsWorkCount],
      })

      const recentTasks: RecentTask[] = (tasksData as any[]).slice(0, 5).map((t: any) => ({
        id: t.id,
        title: t.name,
        assignee: t.developer_name || '未分配',
        status: (t.status === 'COMPLETED' ? 'completed' : t.status === 'IN_PROGRESS' ? 'in_progress' : t.status === 'REJECTED' ? 'delayed' : 'pending') as RecentTask['status'],
        deadline: t.end_date || undefined,
      }))
      setRecentTasks(recentTasks.length > 0 ? recentTasks : [])

      const partnerList: Partner[] = (partnersData as any[]).slice(0, 5).map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.description || '合作伙伴',
        score: 85,
        status: 'online' as const,
      }))
      setPartners(partnerList.length > 0 ? partnerList : [])

      setRiskOverview({
        critical: stats?.risks?.critical || 0,
        high: stats?.risks?.high || 0,
        medium: stats?.risks?.medium || 0,
        low: stats?.risks?.low || 0,
      })

      setActivities([
        { id: 1, user: '系统', action: '数据已更新', target: '仪表盘统计', time: '刚刚', type: 'success' },
      ])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      urgent: { color: '#ef4444', text: '紧急' },
      normal: { color: '#1890ff', text: '进行中' },
      delayed: { color: '#f59e0b', text: '延期' },
    }
    const c = config[status] || config.normal
    return <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 500, background: `${c.color}15`, color: c.color }}>{c.text}</span>
  }

  const getActivityIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      success: <CheckCircleOutlined />,
      info: <UserAddOutlined />,
      warning: <WarningOutlined />,
      error: <ExclamationCircleOutlined />,
    }
    return icons[type] || icons.info
  }

  const getActivityIconClass = (type: string) => {
    const classes: Record<string, string> = {
      success: '#22c55e',
      info: '#1890ff',
      warning: '#f59e0b',
      error: '#ef4444',
    }
    return classes[type] || '#1890ff'
  }

  const skills: SkillDistribution[] = [
    { name: '前端开发 (React/Vue)', percentage: 85, color: '#1890ff' },
    { name: '后端开发 (Java/Node)', percentage: 72, color: '#22c55e' },
    { name: '数据库管理', percentage: 65, color: '#8b5cf6' },
    { name: 'DevOps / 云计算', percentage: 48, color: '#f59e0b' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 4 }}>仪表盘</h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>欢迎回来，这里是您的数据概览</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #e2e8f0', color: '#0f172a' }}>
            <span>🔄</span> 刷新
          </button>
          <button style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: '#1890ff', border: 'none', color: 'white' }}>
            <span>📥</span> 导出
          </button>
        </div>
      </div>

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{ borderTop: '3px solid #1890ff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            styles={{ body: { padding: 22 } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: 'rgba(24,144,255,0.08)', marginBottom: 16 }}>
              <TeamOutlined style={{ fontSize: 22, color: '#1890ff' }} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', lineHeight: 1, marginBottom: 6 }}>{stats.developers.total}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>开发人员总数</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
              <ArrowUpOutlined /> +{stats.developers.trend}% 本月
            </span>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{ borderTop: '3px solid #22c55e', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            styles={{ body: { padding: 22 } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: 'rgba(34,197,94,0.1)', marginBottom: 16 }}>
              <FileTextOutlined style={{ fontSize: 22, color: '#22c55e' }} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', lineHeight: 1, marginBottom: 6 }}>{stats.tasks.inProgress}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>进行中任务</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              <ArrowDownOutlined /> {stats.tasks.delayed} 延期
            </span>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{ borderTop: '3px solid #8b5cf6', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            styles={{ body: { padding: 22 } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: 'rgba(139,92,246,0.1)', marginBottom: 16 }}>
              <AuditOutlined style={{ fontSize: 22, color: '#8b5cf6' }} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', lineHeight: 1, marginBottom: 6 }}>{stats.assessments.completed}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>已完成评估</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
              <ArrowUpOutlined /> 本季度
            </span>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)', border: 'none', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            styles={{ body: { padding: 22 } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: 'rgba(255,255,255,0.2)', marginBottom: 16 }}>
              <WarningOutlined style={{ fontSize: 22, color: 'white' }} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'white', lineHeight: 1, marginBottom: 6 }}>{stats.risks.total}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 14 }}>风险项总数</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              <ArrowUpOutlined /> {stats.risks.critical} 严重
            </span>
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 0 } }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>任务完成趋势</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>近30天任务完成情况</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1890ff' }} />完成
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b' }} />延期
                </span>
              </div>
            </div>
            <div style={{ padding: 24, height: 240 }}>
              <canvas ref={taskTrendRef} />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 0 } }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>评估等级分布</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>本季度评估结果</div>
            </div>
            <div style={{ padding: 24, height: 200 }}>
              <canvas ref={assessmentRef} />
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 24 } }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>快捷操作</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div onClick={() => navigate('/developers')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', transition: '200ms' }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(24,144,255,0.08)', color: '#1890ff' }}>
                  <UserAddOutlined />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>新增开发人员</span>
              </div>
              <div onClick={() => navigate('/tasks')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', transition: '200ms' }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                  <FormOutlined />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>创建任务</span>
              </div>
              <div onClick={() => navigate('/assessment')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', transition: '200ms' }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                  <AuditOutlined />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>发起评估</span>
              </div>
              <div onClick={() => navigate('/risks')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', transition: '200ms' }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                  <WarningOutlined />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>添加风险项</span>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 24 } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>进行中的任务</div>
              <a onClick={() => navigate('/tasks')} style={{ fontSize: 13, color: '#1890ff', textDecoration: 'none', cursor: 'pointer' }}>查看全部</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentTasks.map(task => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid transparent', transition: '200ms' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', background: task.status === 'completed' ? '#22c55e' : 'transparent', borderColor: task.status === 'completed' ? '#22c55e' : '#e2e8f0', color: 'white' }}>
                    {task.status === 'completed' && <CheckCircleOutlined style={{ fontSize: 12 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: task.status === 'completed' ? '#94a3b8' : '#0f172a', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>{task.title}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>负责人：{task.assignee} {task.deadline ? `· 截止：${task.deadline}` : '· 已完成'}</div>
                  </div>
                  {getStatusBadge(task.status === 'pending' ? 'urgent' : task.status === 'delayed' ? 'delayed' : 'normal')}
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 24 } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>合作伙伴评估</div>
              <a onClick={() => navigate('/assessment')} style={{ fontSize: 13, color: '#1890ff', textDecoration: 'none', cursor: 'pointer' }}>查看全部</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {partners.map((partner, idx) => (
                <div key={partner.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, background: '#f8fafc', borderRadius: 10, transition: '200ms', cursor: 'pointer' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: idx === 0 ? 'linear-gradient(135deg, #1890ff 0%, #36c1fc 100%)' : idx === 1 ? 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)' : 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>{partner.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}><span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', marginRight: 6, background: partner.status === 'online' ? '#22c55e' : partner.status === 'busy' ? '#f59e0b' : '#94a3b8' }} />{partner.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{partner.type}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>{partner.score}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>评估得分</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 24 }} styles={{ body: { padding: 24 } }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>风险概览</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>各类型风险统计</div>
        </div>
        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <div style={{ padding: 20, borderRadius: 10, textAlign: 'center', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>{riskOverview.critical}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>严重风险</div>
              <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 500, background: '#ef4444', color: 'white' }}>需立即处理</span>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ padding: 20, borderRadius: 10, textAlign: 'center', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>{riskOverview.high}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>高风险</div>
              <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 500, background: '#ef4444', color: 'white' }}>优先处理</span>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ padding: 20, borderRadius: 10, textAlign: 'center', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>{riskOverview.medium}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>中风险</div>
              <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 500, background: '#f59e0b', color: 'white' }}>持续关注</span>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ padding: 20, borderRadius: 10, textAlign: 'center', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>{riskOverview.low}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>低风险</div>
              <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 500, background: '#22c55e', color: 'white' }}>正常监控</span>
            </div>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 24 } }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>技能分布</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>开发团队技能覆盖情况</div>
        </div>
        <Row gutter={32}>
          <Col xs={24} lg={12}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {skills.map((skill, index) => (
                <div key={index}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{skill.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{skill.percentage}%</span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${skill.percentage}%`, background: skill.color, borderRadius: 4, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  </div>
                </div>
              ))}
            </div>
          </Col>
          <Col xs={24} lg={12}>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>本月活动</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {activities.map((activity, index) => (
                  <div key={activity.id} style={{ display: 'flex', gap: 14, padding: '16px 0', position: 'relative' }}>
                    {index < activities.length - 1 && (
                      <div style={{ position: 'absolute', left: 19, top: 48, bottom: 0, width: 2, background: '#e2e8f0' }} />
                    )}
                    <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, background: `${getActivityIconClass(activity.type)}15`, color: getActivityIconClass(activity.type), fontSize: 16 }}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#0f172a', lineHeight: 1.5 }}><strong>{activity.user}</strong> {activity.action} <strong>{activity.target}</strong></div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default Dashboard