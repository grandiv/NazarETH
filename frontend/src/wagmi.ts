import { baseSepolia } from "viem/chains"
import { http, createConfig } from "wagmi"
import { coinbaseWallet, injected } from "wagmi/connectors"

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "NazarETH",
      preference: "smartWalletOnly",
    }),
  ],
  transports: {
    [baseSepolia.id]: http(),
  },
  ssr: false,
})

export { baseSepolia }

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig
  }
}
