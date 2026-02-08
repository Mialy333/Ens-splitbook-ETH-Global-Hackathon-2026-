import { useEnsAddress, useEnsName } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { shortenAddress } from '../lib/ui'
import { CopyButton } from './CopyButton'

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
    <div className="row">
      <div className="mono">{label}</div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <div className="mono">{bps} bps</div>
        <CopyButton value={address} label="Copy" />
      </div>
    </div>
  )
}
