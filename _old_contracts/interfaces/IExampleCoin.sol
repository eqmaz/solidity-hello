// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IExampleCoin
 * @notice Minimal external interface for ExampleCoin/TestCoin ERC20 token.
 * @dev Exposes only the functions used by external integrations and tests.
 */
interface IExampleCoin {
    // --- ERC20 ---
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);

    // --- Extensions ---
    function pause() external;
    function unpause() external;
    function mint(address to, uint256 amount) external;
    function burn(uint256 value) external;

    // --- Permit (EIP-2612) ---
    function nonces(address owner) external view returns (uint256);
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    // --- Introspection ---
    function hasRole(bytes32 role, address account) external view returns (bool);
    function cap() external view returns (uint256);
}