export const SPLITBOOK_ADDRESS =
  '0xb98C1c36be289fe7eDBe6F0bFbFaB963b238401A' as const

export const splitbookAbi = [
  {
    type: 'function',
    name: 'getSplit',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [
      { name: 'recipients', type: 'address[]' },
      { name: 'bps', type: 'uint16[]' },
    ],
  },
  {
    type: 'function',
    name: 'setSplit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipients', type: 'address[]' },
      { name: 'bps', type: 'uint16[]' },
    ],
    outputs: [],
  },
] as const
