// test/HelloWorld.test.js

// Mocha + Chai test for HelloWorld contract using Hardhat 3's Ethers integration.
// The goal of this test is to demonstrate a full
// deployment + interaction flow from JavaScript and assert that:
//   1) The initial greeting returned by greet() equals the constructor argument ("Hi").
//   2) After calling setGreeting("Hola"), greet() returns the updated value.

// Why these tests are important:
// - They verify the public interface behaves as designed when invoked from an
//   off-chain client (ethers.js), which mirrors real-world usage.
// - They ensure deployment and asynchronous transaction flows are handled correctly
//   (waiting for deployment and mining of state-changing transactions before assertions).

import { expect } from "chai";
import { network } from "hardhat";

describe("HelloWorld", function () {
  it("returns and updates greeting", async function () {
    // In Hardhat 3, Ethers is accessed via a connected network object.
    // This returns an ethers instance bound to the selected network (the in-memory
    // Hardhat Network by default), enabling deployments and calls.
    const { ethers } = await network.connect();

    // Get a ContractFactory for our HelloWorld contract.
    // We use the fully qualified name (FQN) "contracts/HelloWorld.sol:HelloWorld"
    // to remove any ambiguity if multiple contracts with the same name exist.
    const HelloWorld = await ethers.getContractFactory("contracts/HelloWorld.sol:HelloWorld");

    // Deploy the contract passing the initial greeting to the constructor.
    const hello = await HelloWorld.deploy("Hi");

    // Ensure the deployment transaction is mined and the contract is ready before interacting.
    await hello.waitForDeployment();

    // Test case 1: Verify the initial state matches the constructor input.
    // Why: Confirms constructor logic correctly sets the private storage variable.
    expect(await hello.greet()).to.equal("Hi");

    // Perform a state-changing transaction to update the greeting.
    const tx = await hello.setGreeting("Hola");

    // Wait for the transaction to be mined before asserting the new state.
    // Why: State changes are only reflected after the tx is included in a block.
    await tx.wait();

    // Test case 2: Verify the greeting was updated as expected.
    // Why: Confirms the setter function correctly mutates contract state.
    expect(await hello.greet()).to.equal("Hola");
  });
});

