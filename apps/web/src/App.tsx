import { useRoutes } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { routes } from './routes'

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      {useRoutes(routes)}
    </ConfigProvider>
  )
}

export default App
