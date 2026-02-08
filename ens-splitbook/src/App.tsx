import { type FormEvent, useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useEnsAvatar,
  useEnsName,
  useEnsAddress,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { isAddress } from 'viem'
import { normalize } from 'viem/ens'
import { mainnet, sepolia } from 'wagmi/chains'
import { SPLITBOOK_ADDRESS } from './lib/contract'
import { splitbookAbi } from './lib/splitbookAbi'
import { RecipientLine } from './components/RecipientLine'
import { TextRecordsLookup } from './components/TextRecordsLookup'
import { CopyButton } from './components/CopyButton'

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
  const { switchChain, isPending: isSwitching, error: switchError } =
    useSwitchChain()

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
  const [ensRecipientInput, setEnsRecipientInput] = useState('')
  const [ensRecipientError, setEnsRecipientError] = useState<string | null>(null)

  const normalizedEnsRecipient = useMemo(() => {
    if (!ensRecipientInput.trim()) return ''
    try {
      return normalize(ensRecipientInput.trim())
    } catch {
      return ''
    }
  }, [ensRecipientInput])

  const ensRecipientResolved = useEnsAddress({
    name: normalizedEnsRecipient || undefined,
    chainId: mainnet.id,
    query: { enabled: !!normalizedEnsRecipient },
  })

  const parsedSplit = useMemo(() => {
    if (!splitRead.data) return [] as SplitRow[]
    const [recipients, bps] = splitRead.data
    return recipients.map((addr, i) => ({ address: addr, bps: Number(bps[i]) }))
  }, [splitRead.data])

  const hasInjectedProvider =
    typeof window !== 'undefined' && !!window.ethereum
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

  function appendRecipientAddress(next: string) {
    const current = parseLines(recipientsInput)
    if (current.includes(next)) {
      setEnsRecipientError('Recipient already added.')
      return
    }
    const updated = [...current, next].join('\n')
    setRecipientsInput(updated)
    setEnsRecipientInput('')
    setEnsRecipientError(null)
  }

  function onAddEnsRecipient() {
    setEnsRecipientError(null)

    if (!ensRecipientInput.trim()) {
      setEnsRecipientError('Enter an ENS name.')
      return
    }

    if (!normalizedEnsRecipient) {
      setEnsRecipientError('Invalid ENS name.')
      return
    }

    if (ensRecipientResolved.isLoading) {
      setEnsRecipientError('Resolving ENS name...')
      return
    }

    if (!ensRecipientResolved.data) {
      setEnsRecipientError('No address found for this ENS name.')
      return
    }

    if (!isAddress(ensRecipientResolved.data)) {
      setEnsRecipientError('Resolved address is invalid.')
      return
    }

    appendRecipientAddress(ensRecipientResolved.data)
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
    <div className="container">
      <header className="header">
        <div>
          <div className="title">SplitBook + ENS</div>
          <div className="subtitle">
            ENS on mainnet • SplitBook on Sepolia
          </div>
        </div>
        <div className="row">
          <span className="badge">ENS: Mainnet</span>
          <span className="badge">Contract: Sepolia</span>
          {isConnected && chainId !== sepolia.id && (
            <button
              className="btn"
              onClick={() => switchChain({ chainId: sepolia.id })}
              disabled={isSwitching}
            >
              {isSwitching ? 'Switching…' : 'Switch to Sepolia'}
            </button>
          )}
        </div>
      </header>

      <div className="grid">
        <div className="stack">
          <section className="card">
            <div className="row">
              <div className="section-title">Wallet + ENS Profile</div>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                {isConnected ? (
                  <button className="btn secondary" onClick={() => disconnect()}>
                    Disconnect
                  </button>
                ) : (
                  <button
                    className="btn"
                    onClick={() =>
                      injectedConnector &&
                      connect({ connector: injectedConnector })
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
            </div>

            {connectError && (
              <div className="notice error">{connectError.message}</div>
            )}
            {switchError && (
              <div className="notice error">{switchError.message}</div>
            )}
            {!hasInjectedProvider && (
              <div className="notice error">
                No injected wallet detected. Install or enable MetaMask, then
                reload.
              </div>
            )}

            {isConnected && address ? (
              <div className="row">
                <div className="avatar">
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
                <div className="stack" style={{ gap: 6 }}>
                  <div style={{ fontWeight: 600 }}>
                    {ensName.data ?? 'No ENS name set'}
                  </div>
                  <div className="row" style={{ justifyContent: 'flex-start' }}>
                    <div className="mono wrap">{address}</div>
                    <CopyButton value={address} label="Copy" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="muted">Not connected.</div>
            )}
          </section>

          <TextRecordsLookup />
        </div>

        <div className="stack">
          <section className="card">
            <div className="section-title">Current Split (Sepolia)</div>
            {address ? (
              splitRead.isLoading ? (
                <div className="notice pending">Loading…</div>
              ) : splitRead.error ? (
                <div className="notice error">
                  Failed to load: {splitRead.error.message}
                </div>
              ) : parsedSplit.length === 0 ? (
                <div className="muted">No split found.</div>
              ) : (
                <div className="stack">
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
              <div className="muted">Connect to read your split.</div>
            )}
          </section>

          <section className="card">
            <div className="section-title">Set Split</div>
            <form className="stack" onSubmit={onSubmit}>
              <label className="stack">
                <span className="muted">Recipients (one per line)</span>
                <textarea
                  className="textarea"
                  value={recipientsInput}
                  onChange={(e) => setRecipientsInput(e.target.value)}
                  placeholder="0xabc...\n0xdef..."
                  rows={4}
                />
              </label>
              <div className="stack">
                <span className="muted">Add recipient by ENS name</span>
                <div className="row" style={{ justifyContent: 'flex-start' }}>
                  <input
                    className="input"
                    value={ensRecipientInput}
                    onChange={(e) => setEnsRecipientInput(e.target.value)}
                    placeholder="name.eth"
                  />
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={onAddEnsRecipient}
                    disabled={!ensRecipientInput.trim()}
                  >
                    Add
                  </button>
                </div>
                {ensRecipientError && (
                  <div className="notice error">{ensRecipientError}</div>
                )}
              </div>
              <label className="stack">
                <span className="muted">Bps (one per line, sum to 10000)</span>
                <textarea
                  className="textarea"
                  value={bpsInput}
                  onChange={(e) => setBpsInput(e.target.value)}
                  placeholder="5000\n5000"
                  rows={4}
                />
              </label>
              {validationError && (
                <div className="notice error">{validationError}</div>
              )}
              {writeError && (
                <div className="notice error">{writeError.message}</div>
              )}
              <button className="btn" type="submit" disabled={isWriting}>
                {isWriting ? 'Submitting…' : 'Submit Split'}
              </button>
            </form>

            {submittedHash && (
              <div className="stack">
                <div className="row" style={{ justifyContent: 'flex-start' }}>
                  <div className="mono wrap">{submittedHash}</div>
                  <CopyButton value={submittedHash} label="Copy" />
                </div>
                <div className="notice pending">
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
        </div>
      </div>
    </div>
  )
}

export default App
