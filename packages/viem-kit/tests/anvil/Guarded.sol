// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract Guarded {
    error Unauthorized(address caller);
    event ValueSet(address indexed caller, uint256 value);

    address public immutable owner;
    uint256 public value;

    constructor() {
        owner = msg.sender;
    }

    function setValue(uint256 next) external {
        if (msg.sender != owner) revert Unauthorized(msg.sender);
        value = next;
        emit ValueSet(msg.sender, next);
    }
}
