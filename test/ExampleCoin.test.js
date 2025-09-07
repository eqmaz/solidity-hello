import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Helper to build a permit signature (EIP-2612) with ethers v6
async function buildPermit({ token, owner, spender, value, deadline }) {
  const name = await token.name();
  const version = "1"; // ERC20Permit default
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const verifyingContract = await token.getAddress();

  const domain = {
    name,
    version,
    chainId,
    verifyingContract,
  };

  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const nonce = await token.nonces(owner.address);
  const message = {
    owner: owner.address,
    spender,
    value,
    nonce,
    deadline,
  };

  const signature = await owner.signTypedData(domain, types, message);
  const sig = ethers.Signature.from(signature);
  return { v: sig.v, r: sig.r, s: sig.s };
}

describe("TestCoin (ExampleCoin.sol)", function () {
  async function deployFixture() {
    const [admin, treasury, ecosystem, teamVesting, liquidity, airdrop, user, other] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TestCoin");
    const token = await Token.deploy(
      admin.address,
      treasury.address,
      ecosystem.address,
      teamVesting.address,
      liquidity.address,
      airdrop.address
    );
    await token.waitForDeployment();

    return { token, admin, treasury, ecosystem, teamVesting, liquidity, airdrop, user, other };
  }

  it("deploys with correct metadata and cap", async () => {
    const { token } = await deployFixture();
    expect(await token.name()).to.equal("TestCoin");
    expect(await token.symbol()).to.equal("TST");
    expect(await token.decimals()).to.equal(18);
    expect(await token.cap()).to.equal(ethers.parseEther("1000000000")); // 1e9
  });

  it("mints initial distribution correctly", async () => {
    const { token, treasury, ecosystem, liquidity, airdrop, teamVesting } = await deployFixture();
    expect(await token.totalSupply()).to.equal(ethers.parseEther("600000000"));
    expect(await token.balanceOf(treasury.address)).to.equal(ethers.parseEther("300000000"));
    expect(await token.balanceOf(ecosystem.address)).to.equal(ethers.parseEther("150000000"));
    expect(await token.balanceOf(liquidity.address)).to.equal(ethers.parseEther("90000000"));
    expect(await token.balanceOf(airdrop.address)).to.equal(ethers.parseEther("30000000"));
    expect(await token.balanceOf(teamVesting.address)).to.equal(ethers.parseEther("30000000"));
  });

  it("assigns roles to admin", async () => {
    const { token, admin } = await deployFixture();
    const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await token.MINTER_ROLE();
    const PAUSER_ROLE = await token.PAUSER_ROLE();
    const RESCUER_ROLE = await token.RESCUER_ROLE();

    expect(await token.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(true);
    expect(await token.hasRole(MINTER_ROLE, admin.address)).to.equal(true);
    expect(await token.hasRole(PAUSER_ROLE, admin.address)).to.equal(true);
    expect(await token.hasRole(RESCUER_ROLE, admin.address)).to.equal(true);
  });

  it("pauses and unpauses transfers", async () => {
    const { token, admin, treasury, user } = await deployFixture();

    // Transfer some tokens to user first (by admin doesn't own tokens; use treasury holder)
    await token.connect(treasury).transfer(user.address, ethers.parseEther("1"));

    await expect(token.connect(user).transfer(treasury.address, ethers.parseEther("0.1"))).to.not.be.reverted;

    await token.connect(admin).pause();
    await expect(token.connect(user).transfer(treasury.address, ethers.parseEther("0.1"))).to.be.reverted;

    await token.connect(admin).unpause();
    await expect(token.connect(user).transfer(treasury.address, ethers.parseEther("0.1"))).to.not.be.reverted;
  });

  it("mints within cap and rejects over-cap", async () => {
    const { token, admin, user } = await deployFixture();
    const cap = await token.cap();
    const ts = await token.totalSupply();
    const remaining = cap - ts;

    // Mint within remaining cap
    await expect(token.connect(admin).mint(user.address, remaining)).to.not.be.reverted;

    // Any further mint should revert
    await expect(token.connect(admin).mint(user.address, 1n)).to.be.reverted;
  });

  it("rejects minting from non-minter", async () => {
    const { token, user, other } = await deployFixture();
    await expect(token.connect(other).mint(user.address, 1n)).to.be.reverted; // AccessControl revert
  });

  it("burns correctly", async () => {
    const { token, treasury } = await deployFixture();
    const start = await token.balanceOf(treasury.address);
    await token.connect(treasury).burn(ethers.parseEther("1"));
    expect(await token.balanceOf(treasury.address)).to.equal(start - ethers.parseEther("1"));
    expect(await token.totalSupply()).to.equal(ethers.parseEther("600000000") - ethers.parseEther("1"));
  });

  it("supports permit for approvals", async () => {
    const { token, treasury, user } = await deployFixture();
    // move some tokens to user so they can approve via permit
    await token.connect(treasury).transfer(user.address, ethers.parseEther("5"));

    const value = ethers.parseEther("3");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const { v, r, s } = await buildPermit({ token, owner: user, spender: treasury.address, value, deadline });

    await token.permit(user.address, treasury.address, value, deadline, v, r, s);
    expect(await token.allowance(user.address, treasury.address)).to.equal(value);

    await token.connect(treasury).transferFrom(user.address, treasury.address, value);
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("2"));
  });

  it("rescues ERC20 tokens", async () => {
    const { token, admin, other } = await deployFixture();

    const Mock = await ethers.getContractFactory("MockERC20");
    const mock = await Mock.deploy("Mock", "MOCK", await token.getAddress(), ethers.parseEther("100"));
    await mock.waitForDeployment();

    expect(await mock.balanceOf(await token.getAddress())).to.equal(ethers.parseEther("100"));

    await expect(token.connect(admin).rescueERC20(await mock.getAddress(), other.address, ethers.parseEther("40"))).to.not.be.reverted;
    expect(await mock.balanceOf(other.address)).to.equal(ethers.parseEther("40"));
    expect(await mock.balanceOf(await token.getAddress())).to.equal(ethers.parseEther("60"));
  });

  it("rescues ETH", async () => {
    const { token, admin, other } = await deployFixture();

    // Send 1 ETH to the token contract
    await admin.sendTransaction({ to: await token.getAddress(), value: ethers.parseEther("1") });
    const before = await ethers.provider.getBalance(other.address);

    await expect(token.connect(admin).rescueETH(other.address, ethers.parseEther("0.5"))).to.not.be.reverted;

    const after = await ethers.provider.getBalance(other.address);
    expect(after - before).to.equal(ethers.parseEther("0.5"));
  });
});
