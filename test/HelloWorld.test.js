// test/HelloWorld.test.js
import { expect } from "chai";
import { network } from "hardhat";

describe("HelloWorld", function () {
  it("returns and updates greeting", async function () {
    const { ethers } = await network.connect();

    const HelloWorld = await ethers.getContractFactory("contracts/HelloWorld.sol:HelloWorld");
    const hello = await HelloWorld.deploy("Hi");
    await hello.waitForDeployment();

    expect(await hello.greet()).to.equal("Hi");

    const tx = await hello.setGreeting("Hola");
    await tx.wait();

    expect(await hello.greet()).to.equal("Hola");
  });
});

