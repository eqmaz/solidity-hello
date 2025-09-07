// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TokenUtils
 * @notice Small utility library used by ExampleCoin.
 */
library TokenUtils {
    /// @notice Reverts if the provided address is the zero address.
    /// @param account The address to validate.
    function enforceNonZero(address account) internal pure {
        require(account != address(0), "ZERO_ADDRESS");
    }

    /// @notice Calculates a basis-point percentage of an amount.
    /// @dev 10_000 bps = 100%.
    function percentBps(uint256 amount, uint256 bps) internal pure returns (uint256) {
        return (amount * bps) / 10_000;
    }
}