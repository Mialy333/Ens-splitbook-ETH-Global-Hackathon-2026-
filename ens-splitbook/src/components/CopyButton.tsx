import { useState } from 'react'

type Props = {
  value: string
  label?: string
  size?: 'sm' | 'md'
}

export function CopyButton({ value, label = 'Copy', size = 'sm' }: Props) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      className={`copy-btn ${size === 'md' ? 'copy-btn--md' : ''}`}
      onClick={onCopy}
      disabled={!value}
      aria-label="Copy to clipboard"
      title={copied ? 'Copied' : 'Copy'}
      type="button"
    >
      {copied ? 'Copied' : label}
    </button>
  )
}
