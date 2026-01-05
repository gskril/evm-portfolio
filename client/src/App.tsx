import { Route, Routes } from 'react-router-dom'

import { AccountCard } from './components/AccountCard'
import { BalanceCard } from './components/BalanceCard'
import { ChainCard } from './components/ChainCard'
import { Layout } from './components/Layout'
import { PortfolioCard } from './components/PortfolioCard'
import { ProtectedRoute } from './components/ProtectedRoute'
import { TokenCard } from './components/TokenCard'
import { Home } from './screens/Home'
import { Login } from './screens/Login'
import { Setup } from './screens/Setup'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/setup" element={<Setup />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/portfolio" element={<PortfolioCard />} />
                <Route path="/chains" element={<ChainCard />} />
                <Route path="/accounts" element={<AccountCard />} />
                <Route path="/tokens" element={<TokenCard />} />
                <Route path="/balances" element={<BalanceCard />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
