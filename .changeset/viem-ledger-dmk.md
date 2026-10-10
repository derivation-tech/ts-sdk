---
'@derivation-tech/viem-ledger': major
---

Migrate from LedgerJS to the Device Management Kit, Ethereum Signer Kit and Node HID transport. Requires Node.js 22 or newer.

Migration:

- Replace the `transport` option with a caller-owned `session: { dmk, sessionId }`, or keep default USB discovery. Call `disconnectLedger()` to close the helper-owned connection; injected sessions stay caller-owned.
- Accounts are no longer cached; reuse an account object to keep its address confirmation. Address confirmation rejects a changed device account before signing.
- Signing runs as bounded, serialized device actions without automatic retry. EIP-712 sends the full structured data; domain chain IDs outside the safe integer range are rejected. Personal signing treats Hex input as raw bytes.
- Path components and `LEDGER_INDEX` reject malformed, fractional and out-of-range values instead of falling back to account zero.
- The `session` option needs modern TypeScript module resolution for the Ledger SDK package exports.
