const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("Merkle Airdrop", function () {
    let Merkle, merkleContract, Token, token;
    let root, tree;
    let owner, addr1, addr2, addr3;

    const airdropAmount = ethers.utils.parseEther("100");

    const getLeaf = (address, amount) =>
        Buffer.from(ethers.utils.solidityKeccak256(["address", "uint256"], [address, amount]).slice(2), "hex");

    beforeEach(async function () {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        // Build Merkle Tree
        const leaves = [
            getLeaf(addr1.address, airdropAmount),
            getLeaf(addr2.address, airdropAmount),
        ];
        tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        root = tree.getHexRoot();

        // Deploy mock ERC20 token
        Token = await ethers.getContractFactory("MockERC20");
        token = await Token.deploy("TestToken", "TST", ethers.utils.parseEther("1000000"));
        await token.deployed();

        // Send airdrop tokens to contract
        Merkle = await ethers.getContractFactory("Merkle");
        merkleContract = await Merkle.deploy(root, token.address);
        await token.transfer(merkleContract.address, ethers.utils.parseEther("1000"));
    });

    it("should deploy with correct root and token", async () => {
        expect(await merkleContract.root()).to.equal(root);
        expect(await merkleContract.tokenToAirdrop()).to.equal(token.address);
    });

    it("should allow a valid claim", async () => {
        const proof = tree.getHexProof(getLeaf(addr1.address, airdropAmount));

        const tx = await merkleContract.connect(addr1).claimAirdrop(addr1.address, airdropAmount, proof);
        await expect(tx).to.emit(merkleContract, "AirdropClaimed").withArgs(addr1.address, airdropAmount);

        expect(await token.balanceOf(addr1.address)).to.equal(airdropAmount);
        expect(await merkleContract.hasClaimed(addr1.address)).to.be.true;
    });

    it("should reject duplicate claim", async () => {
        const proof = tree.getHexProof(getLeaf(addr1.address, airdropAmount));

        await merkleContract.connect(addr1).claimAirdrop(addr1.address, airdropAmount, proof);

        await expect(
            merkleContract.connect(addr1).claimAirdrop(addr1.address, airdropAmount, proof)
        ).to.be.revertedWith("Already claimed");
    });

    it("should reject invalid proof", async () => {
        const fakeProof = tree.getHexProof(getLeaf(addr3.address, airdropAmount));

        await expect(
            merkleContract.connect(addr3).claimAirdrop(addr3.address, airdropAmount, fakeProof)
        ).to.be.revertedWith("Invalid proof");

        expect(await token.balanceOf(addr3.address)).to.equal(0);
        expect(await merkleContract.hasClaimed(addr3.address)).to.be.false;
    });

    it("should reject if token transfer fails", async () => {
        // Deploy a new Merkle contract with an empty token balance
        const newMerkle = await Merkle.deploy(root, token.address);

        const proof = tree.getHexProof(getLeaf(addr1.address, airdropAmount));

        await expect(
            newMerkle.connect(addr1).claimAirdrop(addr1.address, airdropAmount, proof)
        ).to.be.revertedWith("Token transfer failed");
    });
});
