import { useEnsAddress, useEnsName } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { shortenAddress } from '../lib/ui'

type Props = {
  address: `0x${string}`
  bps: number
}

export function RecipientLine({ address, bps }: Props) {
  const reverse = useEnsName({ address, chainId: mainnet.id })
  const forward = useEnsAddress({
    name: reverse.data ?? undefined,
    chainId: mainnet.id,
    query: { enabled: !!reverse.data },
  })

  const isVerified =
    !!reverse.data &&
    !!forward.data &&
    forward.data.toLowerCase() === address.toLowerCase()

  const label = isVerified ? reverse.data! : shortenAddress(address)

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <div>{label}</div>
      <div style={{ fontVariantNumeric: 'tabular-nums' }}>{bps} bps</div>
    </div>
  )
}
