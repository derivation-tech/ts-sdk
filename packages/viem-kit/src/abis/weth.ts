import { parseAbi } from 'viem';

/**
 * WETH ABI extends ERC20 with deposit/withdraw functions
 */
export const WETH_ABI = parseAbi([
    // ERC20 functions
    'function balanceOf(address account) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'function totalSupply() view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)',

    // WETH-specific functions
    'function deposit() payable',
    'function withdraw(uint256 wad)',

    // Events
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
    'event Deposit(address indexed dst, uint256 wad)',
    'event Withdrawal(address indexed src, uint256 wad)',
]);
