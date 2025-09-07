// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Solidity test file - defines a minimal HelloWorld contract inline and tests it
// using Hardhat's built-in Solidity test runner. The purpose is to verify two things:
//   1) The constructor correctly initializes the greeting state.
//   2) The setGreeting function updates the state, and greet() reflects the change.

// Notes:
// - We compare strings by hashing with keccak256 because direct string equality
//   isn't available in Solidity. Converting to bytes ensures a consistent hash input.
// - These tests run on Hardhat Network in-process, providing fast feedback.

import "hardhat/console.sol"; // optional, for logs during debugging

// Minimal contract under test. It mirrors the version in contracts/HelloWorld.sol
// but is declared inline to make the Solidity test self-contained.
contract HelloWorld {
    string private greeting;

    // Constructor sets the initial greeting string.
    constructor(string memory _greeting) {
        greeting = _greeting;
    }

    // Read-only function returning the current greeting.
    function greet() external view returns (string memory) {
        return greeting;
    }

    // State-changing function to update the greeting.
    function setGreeting(string calldata _greeting) external {
        greeting = _greeting;
    }
}

contract HelloWorldTest {
    // Test case 1: Initial state should match constructor parameter.
    // Why: Ensures the constructor logic correctly sets storage, which is foundational
    // for any subsequent interactions with the contract.
    function testInitialGreeting() public {
        HelloWorld h = new HelloWorld("Hi");
        // Compare strings by hashing their bytes. If hashes match, the strings match.
        require(
            keccak256(bytes(h.greet())) == keccak256(bytes("Hi")),
            "bad initial greeting"
        );
    }

    // Test case 2: After calling setGreeting, greet() should return the new value.
    // Why: Validates that state changes via public functions persist as expected.
    function testSetGreeting() public {
        HelloWorld h = new HelloWorld("Hi");
        h.setGreeting("Hola");
        require(
            keccak256(bytes(h.greet())) == keccak256(bytes("Hola")),
            "bad updated greeting"
        );
    }
}
