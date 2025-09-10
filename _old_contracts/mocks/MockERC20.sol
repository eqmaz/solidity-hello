// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Simple mintable ERC20 used for testing rescue functionality.
 */
contract MockERC20 is ERC20 {
    constructor(string memory name_, string memory symbol_, address to, uint256 amount) ERC20(name_, symbol_) {
        _mint(to, amount);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}