'use client'

import React, { PropsWithChildren } from 'react'
import { wagmiAdapter } from 'utils/wallet'
import { createAppKit } from '@reown/appkit/react'
import { mainnet } from '@reown/appkit/networks'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'
import { APP_CONFIG } from 'utils/config'

createAppKit({
  adapters: [wagmiAdapter],
  projectId: APP_CONFIG.WC_PROJECT_ID,
  networks: [mainnet],
  defaultNetwork: mainnet,
  metadata: {
    name: 'Devcon App',
    description: 'Customize your Devcon experience.',
    url: 'https://app.devcon.org',
    icons: ['https://avatars.githubusercontent.com/u/40744488'],
  },
  features: {
    swaps: false,
    onramp: false,
    analytics: true,
    history: false,
    socials: [],
  },
})

interface Props extends PropsWithChildren {
  cookies?: string
}

export function Web3Provider(props: Props) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, props.cookies)

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      {props.children}
    </WagmiProvider>
  )
}
