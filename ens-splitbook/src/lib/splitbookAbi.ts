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
