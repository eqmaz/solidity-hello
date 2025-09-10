// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Merkle Airdrop Contract
/// @notice Allows eligible users to claim ERC20 token airdrops using Merkle proofs.
/// @dev The contract uses a Merkle root to verify eligibility. Each address can claim only once.
contract Merkle {

    /// @notice The Merkle root of the airdrop eligibility tree.
    bytes32 public root; // 0x000 by default (see constructor)

    /// @notice The address of the ERC20 token to be distributed via the airdrop.
    address public tokenToAirdrop;

    // This would store who has already claimed.
    mapping(address => bool) public hasClaimed;

    /// @notice Initializes the contract with a Merkle root and token address.
    /// @param _root The Merkle root representing eligible claims.
    /// @param _token The address of the ERC20 token to airdrop.
    constructor(bytes32 _root, address _token) {
        tokenToAirdrop = _token;
        root = _root;
    }

    /// @notice Emitted when a user successfully claims their airdrop.
    /// @param claimerAddress The address of the user who claimed the airdrop.
    /// @param amount The amount of tokens claimed.
    event AirdropClaimed(address indexed claimerAddress, uint256 amount);


    /// @notice Verifies whether a claim is valid based on a Merkle proof.
    /// @dev This function computes the Merkle proof hash from the leaf node up to the root.
    /// @param arr The address of the claimant.
    /// @param amount The amount of tokens the claimant is claiming.
    /// @param proof An array of hashes representing the Merkle proof.
    /// @return isValid True if the computed hash from the proof matches the stored Merkle root.
    function verifyClaim(address arr, uint256 amount, bytes32[] calldata proof) internal view returns (bool) {
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

    /// @notice Allows a user to claim their airdropped tokens using a valid Merkle proof.
    /// @dev The function verifies proof validity, ensures the user hasn’t already claimed, and transfers tokens.
    /// Emits an {AirdropClaimed} event upon successful claim.
    /// @param arr The address of the claimant (should match msg.sender in most valid use cases).
    /// @param amount The amount of tokens to claim.
    /// @param proof A Merkle proof validating the claim.
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

