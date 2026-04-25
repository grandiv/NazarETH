import { type ReactNode, createContext, useContext, useState, useCallback } from "react"
import { BACKEND_URL } from "./config"

interface AuthState {
  token: string | null
  wallet: string | null
}

interface AuthContextType extends AuthState {
  login: (wallet: string, signMessage: (msg: string) => Promise<string>) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const t = localStorage.getItem("nazareth_token")
    const w = localStorage.getItem("nazareth_wallet")
    return { token: t, wallet: w }
  })

  const login = useCallback(async (wallet: string, signMessage: (msg: string) => Promise<string>) => {
    const nonceRes = await fetch(`${BACKEND_URL}/auth/nonce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    })
    const { message } = await nonceRes.json()
    const signature = await signMessage(message)

    const verifyRes = await fetch(`${BACKEND_URL}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    })
    const data = await verifyRes.json()
    if (!data.token) throw new Error("Login failed")

    localStorage.setItem("nazareth_token", data.token)
    localStorage.setItem("nazareth_wallet", wallet)
    setState({ token: data.token, wallet })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("nazareth_token")
    localStorage.removeItem("nazareth_wallet")
    setState({ token: null, wallet: null })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isAuthenticated: !!state.token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be inside AuthProvider")
  return ctx
}
