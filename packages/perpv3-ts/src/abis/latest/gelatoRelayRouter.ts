export const CURRENT_GELATO_RELAY_ROUTER_ABI = [
    {
        type: 'constructor',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'trustedForwarder',
            },
        ],
    },
    {
        name: 'InvalidSubAccount',
        type: 'error',
        inputs: [],
    },
    {
        name: 'InvalidCaller',
        type: 'error',
        inputs: [],
    },
    {
        name: 'SubAccountAlreadyExists',
        type: 'error',
        inputs: [],
    },
    {
        name: 'NotSubAccountOwner',
        type: 'error',
        inputs: [],
    },
    {
        name: 'InvalidSignature',
        type: 'error',
        inputs: [],
    },
    {
        name: 'ExpiredSignature',
        type: 'error',
        inputs: [],
    },
    {
        name: 'InvalidAction',
        type: 'error',
        inputs: [],
    },
    {
        name: 'batch',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            {
                type: 'address',
                name: 'subAccount',
            },
            {
                type: 'address',
                name: 'user',
            },
            {
                type: 'address',
                name: 'targetContract',
            },
            {
                type: 'bytes',
                name: 'data',
            },
            {
                type: 'bool',
                name: 'userPaid',
            },
        ],
        outputs: [],
    },
    {
        name: 'batchMulticall',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            {
                type: 'address',
                name: 'subAccount',
            },
            {
                type: 'address',
                name: 'user',
            },
            {
                type: 'address[]',
                name: 'targetContracts',
            },
            {
                type: 'bytes[]',
                name: 'dataArray',
            },
            {
                type: 'bool',
                name: 'userPaid',
            },
        ],
        outputs: [],
    },
    {
        name: 'executeSubAccountManagement',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'user',
            },
            {
                type: 'uint8',
                name: 'action',
            },
            {
                type: 'address',
                name: 'subAccount',
            },
            {
                type: 'uint256',
                name: 'deadline',
            },
            {
                type: 'uint8',
                name: 'v',
            },
            {
                type: 'bytes32',
                name: 'r',
            },
            {
                type: 'bytes32',
                name: 's',
            },
        ],
        outputs: [],
    },
    {
        name: 'getDomainSeparator',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'bytes32',
            },
        ],
    },
    {
        name: 'getNonce',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'user',
            },
        ],
        outputs: [
            {
                type: 'uint256',
            },
        ],
    },
    {
        name: 'getSubAccount',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'user',
            },
        ],
        outputs: [
            {
                type: 'address',
            },
        ],
    },
    {
        name: 'initialize',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'trustedForwarder',
            },
        ],
        outputs: [],
    },
    {
        name: 'removeSubAccount',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'setSubAccount',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'subAccount',
            },
        ],
        outputs: [],
    },
    {
        name: 'userToSubAccount',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
            },
        ],
        outputs: [
            {
                type: 'address',
            },
        ],
    },
    {
        name: 'nonces',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
            },
        ],
        outputs: [
            {
                type: 'uint256',
            },
        ],
    },
    {
        name: 'DOMAIN_TYPEHASH',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'bytes32',
            },
        ],
    },
    {
        name: 'SUBACCOUNT_MANAGEMENT_TYPEHASH',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'bytes32',
            },
        ],
    },
    {
        name: 'SubAccountSet',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'user',
                indexed: true,
            },
            {
                type: 'address',
                name: 'subAccount',
                indexed: true,
            },
        ],
    },
    {
        name: 'SubAccountRemoved',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'user',
                indexed: true,
            },
            {
                type: 'address',
                name: 'subAccount',
                indexed: true,
            },
        ],
    },
    {
        name: 'BatchExecuted',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'subAccount',
                indexed: true,
            },
            {
                type: 'address',
                name: 'user',
                indexed: true,
            },
            {
                type: 'address',
                name: 'targetContract',
                indexed: true,
            },
            {
                type: 'bytes',
                name: 'data',
            },
            {
                type: 'bool',
                name: 'userPaid',
            },
        ],
    },
    {
        name: 'SubAccountManagementExecuted',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'user',
                indexed: true,
            },
            {
                type: 'uint8',
                name: 'action',
                indexed: true,
            },
            {
                type: 'address',
                name: 'subAccount',
                indexed: true,
            },
        ],
    },
    {
        name: 'BatchMulticallExecuted',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'subAccount',
                indexed: true,
            },
            {
                type: 'address',
                name: 'user',
                indexed: true,
            },
            {
                type: 'address[]',
                name: 'targetContracts',
            },
            {
                type: 'bool',
                name: 'userPaid',
            },
        ],
    },
    {
        name: 'AdminChanged',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'previousAdmin',
            },
            {
                type: 'address',
                name: 'newAdmin',
            },
        ],
    },
    {
        name: 'BeaconUpgraded',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'beacon',
                indexed: true,
            },
        ],
    },
    {
        name: 'Upgraded',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'implementation',
                indexed: true,
            },
        ],
    },
] as const;
