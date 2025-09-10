import { expect } from "chai";
import hre from "hardhat";
import { ethers as ethersLib } from "ethers";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

let hhEthers;
const getLeaf = (address, amount) =>
    Buffer.from(ethersLib.solidityPackedKeccak256(["address", "uint256"], [address, amount]).slice(2), "hex");

describe("Merkle Airdrop", function () {
    let Merkle, merkleContract, Token, token;
    let root, tree;
    let owner, addr1, addr2, addr3;
    let airdropAmount;

    beforeEach(async function () {
        const connection = await hre.network.connect();
        hhEthers = connection.ethers;
        airdropAmount = ethersLib.parseEther("100");
        [owner, addr1, addr2, addr3] = await hhEthers.getSigners();

        // Build Merkle Tree
        const leaves = [
            getLeaf(addr1.address, airdropAmount),
            getLeaf(addr2.address, airdropAmount),
        ];
        tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        root = tree.getHexRoot();

        // Deploy mock ERC20 token
        Token = await hhEthers.getContractFactory("MockERC20");
        token = await Token.deploy("TestToken", "TST", ethersLib.parseEther("1000000"));
        await token.waitForDeployment();

        // Send airdrop tokens to contract
        Merkle = await hhEthers.getContractFactory("Merkle");
        merkleContract = await Merkle.deploy(root, await token.getAddress());
        await merkleContract.waitForDeployment();

        await token.transfer(await merkleContract.getAddress(), ethersLib.parseEther("1000"));
    });

    it("should deploy with correct root and token", async () => {
        expect(await merkleContract.root()).to.equal(root);
        expect(await merkleContract.tokenToAirdrop()).to.equal(await token.getAddress());
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

        expect(await token.balanceOf(addr3.address)).to.equal(0n);
        expect(await merkleContract.hasClaimed(addr3.address)).to.be.false;
    });

    it("should reject if token transfer fails", async () => {
        // Deploy a new Merkle contract with an empty token balance
        const newMerkle = await Merkle.deploy(root, await token.getAddress());
        await newMerkle.waitForDeployment();

        const proof = tree.getHexProof(getLeaf(addr1.address, airdropAmount));

        await expect(
            newMerkle.connect(addr1).claimAirdrop(addr1.address, airdropAmount, proof)
        ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
});


// Additional edge-case coverage for Merkle Airdrop

describe("Merkle Airdrop - edge cases", function () {
    let Merkle, merkleContract, Token, token;
    let root, tree;
    let owner, addr1, addr2, addr3;
    let airdropAmount;

    beforeEach(async function () {
        const connection = await hre.network.connect();
        const localEthers = connection.ethers;
        airdropAmount = ethersLib.parseEther("100");
        [owner, addr1, addr2, addr3] = await localEthers.getSigners();

        const leaves = [
            getLeaf(addr1.address, airdropAmount),
            getLeaf(addr2.address, airdropAmount),
        ];
        tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        root = tree.getHexRoot();

        Token = await localEthers.getContractFactory("MockERC20");
        token = await Token.deploy("TestToken", "TST", ethersLib.parseEther("1000000"));
        await token.waitForDeployment();

        Merkle = await localEthers.getContractFactory("Merkle");
        merkleContract = await Merkle.deploy(root, await token.getAddress());
        await merkleContract.waitForDeployment();
        await token.transfer(await merkleContract.getAddress(), ethersLib.parseEther("1000"));
    });

    it("allows claim when arr != msg.sender using someone else's leaf", async () => {
        const proofForAddr2 = tree.getHexProof(getLeaf(addr2.address, airdropAmount));

        const tx = await merkleContract
            .connect(addr1)
            .claimAirdrop(addr2.address, airdropAmount, proofForAddr2);
        await expect(tx)
            .to.emit(merkleContract, "AirdropClaimed")
            .withArgs(addr1.address, airdropAmount);

        expect(await token.balanceOf(addr1.address)).to.equal(airdropAmount);
        expect(await merkleContract.hasClaimed(addr1.address)).to.be.true;
        expect(await merkleContract.hasClaimed(addr2.address)).to.be.false;

        const tx2 = await merkleContract
            .connect(addr2)
            .claimAirdrop(addr2.address, airdropAmount, proofForAddr2);
        await expect(tx2)
            .to.emit(merkleContract, "AirdropClaimed")
            .withArgs(addr2.address, airdropAmount);
        expect(await token.balanceOf(addr2.address)).to.equal(airdropAmount);
    });

    it("reverts when amount doesn't match the leaf (wrong amount)", async () => {
        const proof = tree.getHexProof(getLeaf(addr1.address, airdropAmount));
        const wrongAmount = airdropAmount + 1n;
        await expect(
            merkleContract.connect(addr1).claimAirdrop(addr1.address, wrongAmount, proof)
        ).to.be.revertedWith("Invalid proof");
        expect(await token.balanceOf(addr1.address)).to.equal(0n);
    });

    it("single-leaf tree works with empty proof", async () => {
        const singleLeaf = getLeaf(addr3.address, airdropAmount);
        const singleTree = new MerkleTree([singleLeaf], keccak256, { sortPairs: true });
        const singleRoot = singleTree.getHexRoot();

        // Deploy a fresh Merkle on the same network connection
        const newMerkle = await Merkle.deploy(singleRoot, await token.getAddress());
        await newMerkle.waitForDeployment();
        await token.transfer(await newMerkle.getAddress(), ethersLib.parseEther("1000"));

        const emptyProof = singleTree.getHexProof(singleLeaf); // []
        expect(emptyProof.length).to.equal(0);

        const tx = await newMerkle
            .connect(addr3)
            .claimAirdrop(addr3.address, airdropAmount, emptyProof);
        await expect(tx)
            .to.emit(newMerkle, "AirdropClaimed")
            .withArgs(addr3.address, airdropAmount);
        expect(await token.balanceOf(addr3.address)).to.be.greaterThanOrEqual(airdropAmount);
    });

    it("reverts with tampered proof order", async () => {
        // Use a 3-leaf tree so the proof has multiple elements
        const leaves3 = [
            getLeaf(addr1.address, airdropAmount),
            getLeaf(addr2.address, airdropAmount),
            getLeaf(addr3.address, airdropAmount),
        ];
        const tree3 = new MerkleTree(leaves3, keccak256, { sortPairs: true });
        const root3 = tree3.getHexRoot();

        // Deploy a new Merkle with this 3-leaf root and fund it
        const newMerkle = await Merkle.deploy(root3, await token.getAddress());
        await newMerkle.waitForDeployment();
        await token.transfer(await newMerkle.getAddress(), ethersLib.parseEther("1000"));

        const proof = tree3.getHexProof(getLeaf(addr1.address, airdropAmount));
        expect(proof.length).to.be.greaterThan(1);
        const reversed = [...proof].reverse();
        await expect(
            newMerkle.connect(addr1).claimAirdrop(addr1.address, airdropAmount, reversed)
        ).to.be.revertedWith("Invalid proof");
    });

    it("same sender cannot claim twice even with different arr", async () => {
        const proofForAddr2 = tree.getHexProof(getLeaf(addr2.address, airdropAmount));
        await merkleContract
            .connect(addr1)
            .claimAirdrop(addr2.address, airdropAmount, proofForAddr2);

        const proofForAddr1 = tree.getHexProof(getLeaf(addr1.address, airdropAmount));
        await expect(
            merkleContract.connect(addr1).claimAirdrop(addr1.address, airdropAmount, proofForAddr1)
        ).to.be.revertedWith("Already claimed");
    });
});
