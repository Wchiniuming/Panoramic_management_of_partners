import React from 'react'
import { RouteObject, Navigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import MainLayout from '@/components/Layout/MainLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import NotFound from '@/pages/NotFound'
import { useAuthStore } from '@/stores/authStore'

const UserManagement = React.lazy(() => import('@/pages/users/UserManagement'))
const DeveloperManagement = React.lazy(() => import('@/pages/developers/DeveloperManagement'))
const TaskRegistration = React.lazy(() => import('@/pages/tasks/TaskRegistration'))
const VendorAssessment = React.lazy(() => import('@/pages/assessment/VendorAssessment'))
const PositiveImprovement = React.lazy(() => import('@/pages/improvement/PositiveImprovement'))
const RiskLibrary = React.lazy(() => import('@/pages/risks/RiskLibrary'))

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

interface AuthRouteProps {
  children: React.ReactNode
}

const AuthRoute: React.FC<AuthRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

const LoadingFallback: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
    <Spin size="large" />
  </div>
)

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: (
      <AuthRoute>
        <Login />
      </AuthRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      {
        path: 'users',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <UserManagement />
          </React.Suspense>
        ),
      },
      {
        path: 'developers',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <DeveloperManagement />
          </React.Suspense>
        ),
      },
      {
        path: 'tasks',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <TaskRegistration />
          </React.Suspense>
        ),
      },
      {
        path: 'assessment',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <VendorAssessment />
          </React.Suspense>
        ),
      },
      {
        path: 'improvement',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <PositiveImprovement />
          </React.Suspense>
        ),
      },
      {
        path: 'risks',
        element: (
          <React.Suspense fallback={<LoadingFallback />}>
            <RiskLibrary />
          </React.Suspense>
        ),
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]
