// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Merkle {

    // This stores the root of the merkle tree (hash)
    bytes32 public root; // 0x000
    address public tokenToAirdrop;

    // This would store who has already claimed.
    mapping(address => bool) public hasClaimed;

    // Someone else could reuse this contract, so someone else could use their own merkle root as the root
    // Gives you the option to set the root when you deploy the contract
    constructor(bytes32 _root, address _token) {
        tokenToAirdrop = _token;
        root = _root;
    }

    event AirdropClaimed(address indexed claimerAddress, uint256 amount);

    /**
     *
     */
    function verifyClaim(address arr, uint256 amount, bytes32[] calldata proof) internal returns (bool) {
        // We're creating a hash of the address and the amount using the inbuilt keccak256 function
        bytes32 leaf = keccak256(abi.encodePacked(arr, amount));

        // We're going to hash with the proof all the way up the tree, so we'll need this placeholder
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            // This is because we need to hash in alphabetical order
            if (computedHash < proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        // If root is the same as our final computed hash, then we know the proof is valid
        return computedHash == root;
    }

    /**
     *
     */
    function claimAirdrop(address arr, uint256 amount, bytes32[] calldata proof) public {
        // we check that the message sender doesn't exist in our list of already claimed addresses
        require(!hasClaimed[msg.sender], "Already claimed");

        require(verifyClaim(arr, amount, proof), "Invalid proof");
        // Append the list of addresses that have already claimed
        hasClaimed[msg.sender] = true;

        require(
            // We need to cast into a ERC20 token, so we can call the transfer function
            IERC20(tokenToAirdrop).transfer(
                msg.sender,
                amount
            ), // returns a boolean (true if it worked)
            "Token transfer failed"
        );

        // if we get here, the airdrop was successful

        // Log this out so we can see it on the blockchain
        emit AirdropClaimed(msg.sender, amount);
    }
}

