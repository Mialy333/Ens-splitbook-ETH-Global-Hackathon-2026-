import { useMemo, useState } from 'react'
import { normalize } from 'viem/ens'
import { mainnet } from 'wagmi/chains'
import { useEnsAvatar, useEnsText } from 'wagmi'
import { CopyButton } from './CopyButton'

type RecordRow = { key: string; value: string | null | undefined }

export function TextRecordsLookup() {
  const [input, setInput] = useState('')
  const [customKey, setCustomKey] = useState('')
  const normalizedName = useMemo(() => {
    if (!input.trim()) return ''
    try {
      return normalize(input.trim())
    } catch {
      return ''
    }
  }, [input])

  const avatar = useEnsAvatar({
    name: normalizedName || undefined,
    chainId: mainnet.id,
    query: { enabled: !!normalizedName },
  })

  const urlRecord = useEnsText({
    name: normalizedName || undefined,
    key: 'url',
    chainId: mainnet.id,
    query: { enabled: !!normalizedName },
  })
  const twitterRecord = useEnsText({
    name: normalizedName || undefined,
    key: 'com.twitter',
    chainId: mainnet.id,
    query: { enabled: !!normalizedName },
  })
  const githubRecord = useEnsText({
    name: normalizedName || undefined,
    key: 'com.github',
    chainId: mainnet.id,
    query: { enabled: !!normalizedName },
  })
  const descriptionRecord = useEnsText({
    name: normalizedName || undefined,
    key: 'description',
    chainId: mainnet.id,
    query: { enabled: !!normalizedName },
  })
  const customRecord = useEnsText({
    name: normalizedName || undefined,
    key: customKey || 'custom',
    chainId: mainnet.id,
    query: { enabled: !!normalizedName && !!customKey },
  })

  const rows: RecordRow[] = [
    { key: 'url', value: urlRecord.data },
    { key: 'com.twitter', value: twitterRecord.data },
    { key: 'com.github', value: githubRecord.data },
    { key: 'description', value: descriptionRecord.data },
    ...(customKey
      ? [{ key: customKey, value: customRecord.data }]
      : []),
  ]

  return (
    <section className="card">
      <div className="section-title">ENS Text Records</div>
      <div className="muted">
        Text records are optional ENS metadata and may be empty.
      </div>
      <label className="stack">
        <span className="muted">ENS name</span>
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="vitalik.eth"
        />
      </label>
      {input && !normalizedName && (
        <div className="notice error">Invalid ENS name.</div>
      )}
      <label className="stack">
        <span className="muted">Custom text record key (optional)</span>
        <input
          className="input"
          value={customKey}
          onChange={(e) => setCustomKey(e.target.value.trim())}
          placeholder="com.discord"
        />
      </label>
      <div className="row">
        <div className="avatar">
          {avatar.data ? (
            <img
              src={avatar.data}
              alt="ENS avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            'No avatar'
          )}
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <div className="muted">
            {normalizedName || 'Enter a valid ENS name to load records.'}
          </div>
          {normalizedName && (
            <div className="row" style={{ justifyContent: 'flex-start' }}>
              <div className="mono">{normalizedName}</div>
              <CopyButton value={normalizedName} label="Copy" />
            </div>
          )}
        </div>
      </div>
      <div className="table">
        <div className="table-row table-head">
          <div className="table-cell">Key</div>
          <div className="table-cell">Value</div>
        </div>
        {rows.map((row) => (
          <div key={row.key} className="table-row">
            <div className="table-cell">{row.key}</div>
            <div
              className="table-cell"
              style={{ color: row.value ? '#e6f1ff' : '#a2acc3' }}
            >
              {row.value ?? '—'}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
