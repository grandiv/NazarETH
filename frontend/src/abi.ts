export const GOAL_VAULT_ABI = [
  {
    type: "function",
    name: "createGoal",
    inputs: [
      { name: "_goalType", type: "uint8" },
      { name: "_targetValue", type: "uint256" },
      { name: "_deadline", type: "uint256" },
    ],
    outputs: [{ name: "goalId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deposit",
    inputs: [
      { name: "_goalId", type: "uint256" },
      { name: "_amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "settleGoal",
    inputs: [
      { name: "_goalId", type: "uint256" },
      { name: "_actualValue", type: "uint256" },
      { name: "_timestamp", type: "uint256" },
      { name: "_signature", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimBack",
    inputs: [{ name: "_goalId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getGoal",
    inputs: [{ name: "_goalId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "user", type: "address" },
          { name: "goalType", type: "uint8" },
          { name: "targetValue", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "stakeAmount", type: "uint256" },
          { name: "actualValue", type: "uint256" },
          { name: "depositedAt", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "settled", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextGoalId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "GoalCreated",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "goalType", type: "uint8", indexed: false },
      { name: "targetValue", type: "uint256", indexed: false },
      { name: "deadline", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GoalSettled",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "achieved", type: "bool", indexed: false },
      { name: "actualValue", type: "uint256", indexed: false },
      { name: "slashAmount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const
