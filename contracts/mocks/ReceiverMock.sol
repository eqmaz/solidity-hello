// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ReceiverMock
 * @notice Minimal contract that can receive ETH and emit an event.
 */
contract ReceiverMock {
    event Received(address indexed from, uint256 amount, bytes data);

    receive() external payable {
        emit Received(msg.sender, msg.value, "");
    }

    fallback() external payable {
        emit Received(msg.sender, msg.value, msg.data);
    }
}