import { BrowserRouter, Routes, Route } from "react-router-dom"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { wagmiConfig } from "./wagmi"
import { AuthProvider } from "./auth"
import { HomePage } from "./pages/Home"
import { DashboardPage } from "./pages/Dashboard"
import { CreateGoalPage } from "./pages/CreateGoal"
import { GoalDetailPage } from "./pages/GoalDetail"

const queryClient = new QueryClient()

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/create" element={<CreateGoalPage />} />
              <Route path="/goal/:id" element={<GoalDetailPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
