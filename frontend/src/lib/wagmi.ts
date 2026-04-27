import { createConfig, http } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected, coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: 'NazarETH',
      preference: 'smartWalletOnly',
    }),
  ],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
