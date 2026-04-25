export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`
export const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS as `0x${string}`
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID) || 84532
