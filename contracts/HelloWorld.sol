// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title HelloWorld
 * @notice A minimal example contract that stores and returns a greeting message.
 * @dev Demonstrates basic Solidity patterns:
 *      - Constructor-based state initialization
 *      - Private storage variable encapsulation
 *      - External view function for read-only access
 *      - External function that mutates contract state
 */
contract HelloWorld {
    /// @notice The greeting message currently stored in contract state.
    /// @dev Kept private to enforce access via public/external functions.
    string private greeting;

    /**
     * @notice Deploy the contract with an initial greeting.
     * @param _greeting The initial greeting string to store.
     */
    constructor(string memory _greeting) {
        greeting = _greeting;
    }

    /**
     * @notice Read the current greeting.
     * @return The string value of the stored greeting.
     */
    function greet() external view returns (string memory) {
        return greeting;
    }

    /**
     * @notice Update the stored greeting.
     * @dev This changes contract state and will cost gas when executed on-chain.
     * @param _greeting The new greeting string to set.
     */
    function setGreeting(string calldata _greeting) external {
        greeting = _greeting;
    }
}
