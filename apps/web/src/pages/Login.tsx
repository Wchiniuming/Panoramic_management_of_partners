import React, { useState } from 'react'
import { Form, Input, Button, Checkbox, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const onFinish = async (values: { username: string; password: string; remember?: boolean }) => {
    setLoading(true)
    try {
      await login(values.username, values.password)
      message.success('登录成功')
      navigate('/dashboard')
    } catch {
      message.error('用户名或密码错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.leftPanel}>
        <div style={styles.bgShape1} />
        <div style={styles.bgShape2} />
        <div style={styles.bgShape3} />

        <div style={styles.leftContent}>
          <div style={styles.brandBadge}>
            <span style={styles.brandBadgeDot} />
            <span>企业级管理平台</span>
          </div>

          <h1 style={styles.illustrationTitle}>
            合作伙伴支撑能力<br />
            <span style={styles.titleGradient}>全景管理平台</span>
          </h1>

          <p style={styles.illustrationDesc}>
            整合开发人员管理、任务调度、厂商评估与风险控制，构建高效的合作伙伴支撑体系
          </p>

          <div style={styles.statsRow}>
            <div style={styles.statItem}>
              <div style={styles.statValue}>500+</div>
              <div style={styles.statLabel}>合作开发人员</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>98%</div>
              <div style={styles.statLabel}>任务完成率</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>50+</div>
              <div style={styles.statLabel}>合作伙伴</div>
            </div>
          </div>
        </div>

        <div style={{ ...styles.floatingCard, ...styles.floatingCard1 }}>
          <div style={{ ...styles.cardIcon, background: 'rgba(24, 144, 255, 0.1)', color: '#1890ff' }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div style={styles.cardTitle}>开发人员</div>
          <div style={styles.cardValue}>128</div>
        </div>

        <div style={{ ...styles.floatingCard, ...styles.floatingCard2 }}>
          <div style={{ ...styles.cardIcon, background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div style={styles.cardTitle}>已完成任务</div>
          <div style={styles.cardValue}>1,284</div>
        </div>

        <div style={{ ...styles.floatingCard, ...styles.floatingCard3 }}>
          <div style={{ ...styles.cardIcon, background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div style={styles.cardTitle}>评估得分</div>
          <div style={styles.cardValue}>92.5</div>
        </div>
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.formHeader}>
          <div style={styles.formLogo}>H</div>
          <h2 style={styles.formTitle}>欢迎回来</h2>
          <p style={styles.formDesc}>请登录您的账号以继续</p>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
            style={styles.formGroup}
          >
            <Input
              size="large"
              placeholder="请输入用户名"
              prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
              style={styles.inputWithIcon}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
            style={styles.formGroup}
          >
            <Input.Password
              size="large"
              placeholder="请输入密码"
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              style={styles.inputWithIcon}
            />
          </Form.Item>

          <div style={styles.formOptions}>
            <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Checkbox>记住我</Checkbox>
            </Form.Item>
            <a href="#" style={styles.forgotLink}>忘记密码？</a>
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={styles.submitBtn}
            >
              登 录
            </Button>
          </Form.Item>

          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>或</span>
            <span style={styles.dividerLine} />
          </div>

          <div style={styles.oauthButtons}>
            <button type="button" style={styles.oauthBtn} title="企业微信">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22, color: '#64748b' }}>
                <path d="M8.5 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm5 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.936 1.526 5.55 3.926 7.227l-.926 2.781 3.252-1.627c.857.213 1.8.33 2.748.33 5.523 0 10-4.145 10-9.243S17.523 2 12 2z" />
              </svg>
            </button>
            <button type="button" style={styles.oauthBtn} title="钉钉">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22, color: '#64748b' }}>
                <path d="M12 2C6.48 2 2 6.03 2 10.99c0 2.55 1.25 4.83 3.21 6.48l-.78 2.44 2.78-1.62c.8.22 1.64.34 2.5.34 3.03 0 5.79-1.14 7.76-3.02 1.97 1.88 4.73 3.02 7.76 3.02.86 0 1.7-.12 2.5-.34l2.78 1.62-.78-2.44c1.96-1.65 3.21-3.93 3.21-6.48C22 6.03 17.52 2 12 2z" />
              </svg>
            </button>
            <button type="button" style={styles.oauthBtn} title="飞书">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22, color: '#64748b' }}>
                <path d="M5 5h14v14H5V5zm2 2v10h10V7H7zm2 2h6v2H9V9zm0 4h6v2H9v-2z" />
              </svg>
            </button>
          </div>
        </Form>

        <div style={styles.formFooter}>
          <p>遇到问题？联系管理员获取帮助</p>
          <span>默认账号: admin / admin123</span>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: '#f8fafc',
  },
  leftPanel: {
    flex: 1.2,
    background: 'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%)',
    padding: '80px 64px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  bgShape1: {
    position: 'absolute',
    width: 500,
    height: 500,
    background: 'rgba(24, 144, 255, 0.15)',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: 0.6,
    top: -200,
    right: -100,
  },
  bgShape2: {
    position: 'absolute',
    width: 400,
    height: 400,
    background: 'rgba(56, 239, 125, 0.1)',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: 0.6,
    bottom: -150,
    left: -100,
  },
  bgShape3: {
    position: 'absolute',
    width: 300,
    height: 300,
    background: 'rgba(168, 85, 247, 0.08)',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: 0.6,
    top: '50%',
    left: '30%',
  },
  leftContent: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    maxWidth: 560,
  },
  brandBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    background: '#fff',
    borderRadius: 100,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
    fontSize: 14,
    fontWeight: 500,
    color: '#64748b',
    marginBottom: 32,
    width: 'fit-content',
  },
  brandBadgeDot: {
    width: 8,
    height: 8,
    background: '#22c55e',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },
  illustrationTitle: {
    fontSize: 48,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
    marginBottom: 24,
  },
  titleGradient: {
    background: 'linear-gradient(135deg, #1890ff 0%, #36c1fc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  illustrationDesc: {
    fontSize: 18,
    color: '#64748b',
    lineHeight: 1.7,
    marginBottom: 48,
    maxWidth: 440,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 32,
  },
  statItem: {
    textAlign: 'left',
  },
  statValue: {
    fontSize: 36,
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  statLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  floatingCard: {
    position: 'absolute',
    background: '#fff',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
    animation: 'float 6s ease-in-out infinite',
  },
  floatingCard1: {
    top: '20%',
    right: '15%',
    animationDelay: '0s',
  },
  floatingCard2: {
    bottom: '25%',
    right: '10%',
    animationDelay: '-2s',
  },
  floatingCard3: {
    top: '40%',
    right: '5%',
    animationDelay: '-4s',
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0f172a',
  },
  rightPanel: {
    width: 520,
    padding: '80px 64px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    background: '#fff',
  },
  formHeader: {
    marginBottom: 40,
  },
  formLogo: {
    width: 48,
    height: 48,
    background: 'linear-gradient(135deg, #1890ff 0%, #36c1fc 100%)',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 24,
    boxShadow: '0 8px 24px rgba(24, 144, 255, 0.3)',
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 8,
    letterSpacing: '-0.02em',
  },
  formDesc: {
    fontSize: 15,
    color: '#64748b',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#0f172a',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputWithIcon: {
    height: 52,
  },
  formOptions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  forgotLink: {
    fontSize: 14,
    color: '#1890ff',
    textDecoration: 'none',
    fontWeight: 500,
  },
  submitBtn: {
    height: 52,
    background: 'linear-gradient(135deg, #1890ff 0%, #36c1fc 100%)',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    boxShadow: '0 4px 16px rgba(24, 144, 255, 0.3)',
    letterSpacing: 0.5,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    margin: '28px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#e2e8f0',
  },
  dividerText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  oauthButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  },
  oauthBtn: {
    height: 48,
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    background: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  formFooter: {
    marginTop: 32,
    paddingTop: 24,
    borderTop: '1px solid #e2e8f0',
    textAlign: 'center',
  },
}

export default Login