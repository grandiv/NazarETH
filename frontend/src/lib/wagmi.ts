import { createConfig, createStorage, http, cookieStorage } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected, walletConnect, baseAccount } from 'wagmi/connectors'

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    walletConnect({
      projectId: '46c669fffeb87c054a8fecb9eec8e5e4',
      metadata: {
        name: 'NazarETH',
        description: 'Stake. Train. Compete. Earn.',
        url: 'https://nazareth.izcy.tech',
        icons: ['https://nazareth.izcy.tech/logo_nazareth.png'],
      },
      showQrModal: true,
    }),
    baseAccount({
      appName: 'NazarETH',
    }),
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
