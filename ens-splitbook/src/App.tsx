import { type FormEvent, useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useEnsAvatar,
  useEnsName,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { isAddress } from 'viem'
import { mainnet, sepolia } from 'wagmi/chains'
import { SPLITBOOK_ADDRESS } from './lib/contract'
import { splitbookAbi } from './lib/splitbookAbi'
import { RecipientLine } from './components/RecipientLine'
import { TextRecordsLookup } from './components/TextRecordsLookup'

declare global {
  interface Window {
    ethereum?: unknown
  }
}

type SplitRow = { address: `0x${string}`; bps: number }

function App() {
  const { address, isConnected } = useAccount()
  const {
    connect,
    connectors,
    isPending: isConnecting,
    error: connectError,
  } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const {
    switchChain,
    isPending: isSwitching,
    error: switchError,
  } = useSwitchChain()

  const ensName = useEnsName({ address, chainId: mainnet.id })
  const ensAvatar = useEnsAvatar({
    name: ensName.data ?? undefined,
    chainId: mainnet.id,
    query: { enabled: !!ensName.data },
  })

  const splitRead = useReadContract({
    address: SPLITBOOK_ADDRESS,
    abi: splitbookAbi,
    functionName: 'getSplit',
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!address },
  })

  const {
    writeContractAsync,
    isPending: isWriting,
    error: writeError,
  } = useWriteContract()
  const [submittedHash, setSubmittedHash] = useState<`0x${string}` | null>(null)
  const txReceipt = useWaitForTransactionReceipt({
    hash: submittedHash ?? undefined,
    chainId: sepolia.id,
    query: { enabled: !!submittedHash },
  })

  useEffect(() => {
    if (txReceipt.isSuccess) {
      splitRead.refetch()
    }
  }, [txReceipt.isSuccess, splitRead])

  const [recipientsInput, setRecipientsInput] = useState('')
  const [bpsInput, setBpsInput] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const parsedSplit = useMemo(() => {
    if (!splitRead.data) return [] as SplitRow[]
    const [recipients, bps] = splitRead.data
    return recipients.map((addr, i) => ({ address: addr, bps: Number(bps[i]) }))
  }, [splitRead.data])

  const hasInjectedProvider = typeof window !== 'undefined' && !!window.ethereum
  const canConnect = connectors.length > 0 && hasInjectedProvider
  const injectedConnector =
    connectors.find((c) => c.id === 'metaMask') ??
    connectors.find((c) => c.id === 'injected') ??
    connectors[0]

  function parseLines(value: string) {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setValidationError(null)

    if (!address) {
      setValidationError('Connect a wallet first.')
      return
    }

    const recipients = parseLines(recipientsInput)
    const bpsValues = parseLines(bpsInput).map((line) => Number(line))

    if (recipients.length === 0 || bpsValues.length === 0) {
      setValidationError('Provide at least one recipient and bps value.')
      return
    }

    if (recipients.length !== bpsValues.length) {
      setValidationError('Recipients and bps must have the same length.')
      return
    }

    const invalidAddress = recipients.find((r) => !isAddress(r))
    if (invalidAddress) {
      setValidationError(`Invalid address: ${invalidAddress}`)
      return
    }

    const invalidBps = bpsValues.find((v) => !Number.isInteger(v) || v <= 0)
    if (invalidBps !== undefined) {
      setValidationError('All bps must be positive integers.')
      return
    }

    const total = bpsValues.reduce((sum, v) => sum + v, 0)
    if (total !== 10000) {
      setValidationError(`Bps must sum to 10000. Current sum: ${total}.`)
      return
    }

    try {
      const hash = await writeContractAsync({
        address: SPLITBOOK_ADDRESS,
        abi: splitbookAbi,
        functionName: 'setSplit',
        args: [recipients as `0x${string}`[], bpsValues],
        chainId: sepolia.id,
      })
      setSubmittedHash(hash)
    } catch (err) {
      if (err instanceof Error) {
        setValidationError(err.message)
      } else {
        setValidationError('Transaction failed to submit.')
      }
    }
  }

  return (
    <div
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '32px 16px 64px',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>SplitBook + ENS</div>
          <div style={{ color: '#666', marginTop: 4 }}>
            ENS on mainnet • SplitBook on Sepolia
          </div>
        </div>
        <div>
          {isConnected ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {chainId !== sepolia.id && (
                <button
                  onClick={() => switchChain({ chainId: sepolia.id })}
                  disabled={isSwitching}
                >
                  {isSwitching ? 'Switching…' : 'Switch to Sepolia'}
                </button>
              )}
              <button onClick={() => disconnect()}>Disconnect</button>
            </div>
          ) : (
            <button
              onClick={() =>
                injectedConnector && connect({ connector: injectedConnector })
              }
              disabled={!canConnect || isConnecting || !injectedConnector}
            >
              {!hasInjectedProvider
                ? 'Install MetaMask'
                : isConnecting
                  ? 'Connecting…'
                  : 'Connect MetaMask'}
            </button>
          )}
        </div>
      </header>

      {connectError && (
        <div style={{ color: '#b00020' }}>{connectError.message}</div>
      )}
      {switchError && (
        <div style={{ color: '#b00020' }}>{switchError.message}</div>
      )}
      {!hasInjectedProvider && (
        <div style={{ color: '#b00020' }}>
          No injected wallet detected. Install or enable MetaMask, then reload.
        </div>
      )}

      <section
        style={{
          border: '1px solid #e4e4e7',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          Wallet + ENS Profile
        </div>
        {isConnected && address ? (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#f3f4f6',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: '#666',
              }}
            >
              {ensAvatar.data ? (
                <img
                  src={ensAvatar.data}
                  alt="ENS avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                'No avatar'
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>
                {ensName.data ?? 'No ENS name set'}
              </div>
              <div style={{ color: '#666' }}>{address}</div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#666' }}>Not connected.</div>
        )}
      </section>

      <section
        style={{
          border: '1px solid #e4e4e7',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 600 }}>Current Split (Sepolia)</div>
        {address ? (
          splitRead.isLoading ? (
            <div>Loading…</div>
          ) : splitRead.error ? (
            <div style={{ color: '#b00020' }}>
              Failed to load: {splitRead.error.message}
            </div>
          ) : parsedSplit.length === 0 ? (
            <div style={{ color: '#666' }}>No split found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parsedSplit.map((row, i) => (
                <RecipientLine
                  key={`${row.address}-${i}`}
                  address={row.address}
                  bps={row.bps}
                />
              ))}
            </div>
          )
        ) : (
          <div style={{ color: '#666' }}>Connect to read your split.</div>
        )}
      </section>

      <section
        style={{
          border: '1px solid #e4e4e7',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 600 }}>Set Split</div>
        <form
          onSubmit={onSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Recipients (one per line)</span>
            <textarea
              value={recipientsInput}
              onChange={(e) => setRecipientsInput(e.target.value)}
              placeholder="0xabc...\n0xdef..."
              rows={4}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Bps (one per line, sum to 10000)</span>
            <textarea
              value={bpsInput}
              onChange={(e) => setBpsInput(e.target.value)}
              placeholder="5000\n5000"
              rows={4}
            />
          </label>
          {validationError && (
            <div style={{ color: '#b00020' }}>{validationError}</div>
          )}
          {writeError && (
            <div style={{ color: '#b00020' }}>{writeError.message}</div>
          )}
          <button type="submit" disabled={isWriting}>
            {isWriting ? 'Submitting…' : 'Submit Split'}
          </button>
        </form>

        {submittedHash && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              Tx hash:{' '}
              <span style={{ fontFamily: 'monospace' }}>{submittedHash}</span>
            </div>
            <div>
              Status:{' '}
              {txReceipt.isLoading
                ? 'Confirming…'
                : txReceipt.isSuccess
                  ? 'Confirmed'
                  : txReceipt.isError
                    ? 'Failed'
                    : 'Pending'}
            </div>
          </div>
        )}
      </section>

      <TextRecordsLookup />
    </div>
  )
}

export default App
