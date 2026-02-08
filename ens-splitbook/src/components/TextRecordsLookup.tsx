import { useMemo, useState } from 'react'
import { normalize } from 'viem/ens'
import { mainnet } from 'wagmi/chains'
import { useEnsAvatar, useEnsText } from 'wagmi'

type RecordRow = { key: string; value: string | null | undefined }

export function TextRecordsLookup() {
  const [input, setInput] = useState('')
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

  const rows: RecordRow[] = [
    { key: 'url', value: urlRecord.data },
    { key: 'com.twitter', value: twitterRecord.data },
    { key: 'com.github', value: githubRecord.data },
    { key: 'description', value: descriptionRecord.data },
  ]

  return (
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
      <div style={{ fontWeight: 600 }}>ENS Text Records</div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span>ENS name</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="vitalik.eth"
        />
      </label>
      {input && !normalizedName && (
        <div style={{ color: '#b00020' }}>Invalid ENS name.</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
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
        <div style={{ color: '#666' }}>
          {normalizedName || 'Enter a valid ENS name to load records.'}
        </div>
      </div>
      <div
        style={{
          border: '1px solid #e4e4e7',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr',
            background: '#f8f8f8',
            fontWeight: 600,
          }}
        >
          <div style={{ padding: '8px 10px' }}>Key</div>
          <div style={{ padding: '8px 10px' }}>Value</div>
        </div>
        {rows.map((row) => (
          <div
            key={row.key}
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr',
              borderTop: '1px solid #e4e4e7',
            }}
          >
            <div style={{ padding: '8px 10px' }}>{row.key}</div>
            <div
              style={{
                padding: '8px 10px',
                color: row.value ? '#111' : '#666',
              }}
            >
              {row.value ?? '—'}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
