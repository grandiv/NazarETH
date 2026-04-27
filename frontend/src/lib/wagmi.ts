import { createConfig, createStorage, http, cookieStorage } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected, baseAccount } from 'wagmi/connectors'

export const config = createConfig({
  chains: [baseSepolia],
  multiInjectedProviderDiscovery: false,
  connectors: [
    baseAccount({
      appName: 'NazarETH',
    }),
    injected(),
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
