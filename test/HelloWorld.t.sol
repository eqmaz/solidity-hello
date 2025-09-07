// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "hardhat/console.sol"; // optional, for logs

contract HelloWorld {
    string private greeting;
    constructor(string memory _greeting) { greeting = _greeting; }
    function greet() external view returns (string memory) { return greeting; }
    function setGreeting(string calldata _greeting) external { greeting = _greeting; }
}

contract HelloWorldTest {
    function testInitialGreeting() public {
        HelloWorld h = new HelloWorld("Hi");
        require(keccak256(bytes(h.greet())) == keccak256(bytes("Hi")), "bad initial greeting");
    }

    function testSetGreeting() public {
        HelloWorld h = new HelloWorld("Hi");
        h.setGreeting("Hola");
        require(keccak256(bytes(h.greet())) == keccak256(bytes("Hola")), "bad updated greeting");
    }
}
