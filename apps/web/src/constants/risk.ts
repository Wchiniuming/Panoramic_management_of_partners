export const RISK_LEVELS = {
  CRITICAL: {
    value: 'CRITICAL',
    label: '严重风险',
    color: '#dc2626',
    bg: 'rgba(220, 38, 38, 0.08)',
    border: 'rgba(220, 38, 38, 0.2)',
    priority: 1,
  },
  HIGH: {
    value: 'HIGH',
    label: '高风险',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.2)',
    priority: 2,
  },
  MEDIUM: {
    value: 'MEDIUM',
    label: '中风险',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.2)',
    priority: 3,
  },
  LOW: {
    value: 'LOW',
    label: '低风险',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.08)',
    border: 'rgba(34, 197, 94, 0.2)',
    priority: 4,
  },
} as const

export type RiskLevel = keyof typeof RISK_LEVELS

export const RISK_LEVEL_OPTIONS = Object.values(RISK_LEVELS)
