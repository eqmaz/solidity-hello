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
        ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
});
