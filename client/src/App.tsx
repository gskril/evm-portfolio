import { Link, Route, Routes } from 'react-router-dom'

import { AccountCard } from './components/AccountCard'
import { BalanceCard } from './components/BalanceCard'
import { ChainCard } from './components/ChainCard'
import { Layout } from './components/Layout'
import { PortfolioCard } from './components/PortfolioCard'
import { TokenCard } from './components/TokenCard'
import { Home } from './screens/Home'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/portfolio" element={<PortfolioCard />} />
        <Route path="/chains" element={<ChainCard />} />
        <Route path="/accounts" element={<AccountCard />} />
        <Route path="/tokens" element={<TokenCard />} />
        <Route path="/balances" element={<BalanceCard />} />
        <Route
          path="*"
          element={
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold">Page not found</h1>
              <p className="text-muted-foreground">
                The page you requested does not exist.
              </p>
              <Link className="w-fit underline" to="/">
                Return home
              </Link>
            </div>
          }
        />
      </Routes>
    </Layout>
  )
}

export default App
