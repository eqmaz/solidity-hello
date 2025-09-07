// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

// import {IExampleCoin} from "./interfaces/IExampleCoin.sol";
import {TokenUtils} from "./libraries/TokenUtils.sol";

/**
 * @title TestCoin (TST)
 * @notice Production-grade yet simple ERC-20 token example using OpenZeppelin v5.
 *         Features:
 *           - Hard supply cap
 *           - Burnable tokens
 *           - Pausable transfers (circuit breaker)
 *           - EIP-2612 Permit (gasless approvals)
 *           - Role-based access control (admin/minter/pauser/rescuer)
 *           - Rescue functions (ERC20 and ETH)
 *
 * Tokenomics (example, adjustable at deployment):
 * - Max supply (cap): 1,000,000,000 TST (1e9 * 1e18)
 * - Initial mint at deployment: 600,000,000 TST distributed to:
 *     - Treasury:   300,000,000 (50% of initial)
 *     - Ecosystem:  150,000,000 (25% of initial)
 *     - Liquidity:   90,000,000 (15% of initial)
 *     - Airdrop:     30,000,000 (5% of initial)
 *     - TeamVesting: 30,000,000 (5% of initial)
 * - Emissions reserve: 400,000,000 TST can be minted over time by MINTER_ROLE up to the hard cap.
 *   In production, gate MINTER_ROLE behind a timelock + governance.
 */
contract TestCoin is
    ERC20,
    ERC20Burnable,
    ERC20Capped,
    ERC20Pausable,
    ERC20Permit,
    AccessControl
{
    using TokenUtils for address;

    // --- Roles ---
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant RESCUER_ROLE = keccak256("RESCUER_ROLE");

    // --- Constants ---
    uint256 public constant MAX_SUPPLY_CAP = 1_000_000_000 ether; // 1B tokens, 18 decimals

    // --- Events ---
    event Rescued(address indexed token, address indexed to, uint256 amount);
    event RescuedETH(address indexed to, uint256 amount);

    /**
     * @notice Construct the TestCoin token and perform initial distribution.
     * @param admin Address to receive DEFAULT_ADMIN_ROLE and operational roles initially.
     * @param treasury Treasury allocation address.
     * @param ecosystem Ecosystem/Growth allocation address.
     * @param teamVesting Team vesting address (ideally a vesting contract).
     * @param liquidity Liquidity provisioning address.
     * @param airdrop Airdrop distributor address.
     *
     * Admin receives DEFAULT_ADMIN_ROLE and is granted MINTER/PAUSER/RESCUER roles.
     * For production, consider transferring admin to a timelock/governance.
     */
    constructor(
        address admin,
        address treasury,
        address ecosystem,
        address teamVesting,
        address liquidity,
        address airdrop
    )
        ERC20("TestCoin", "TST")
        ERC20Capped(MAX_SUPPLY_CAP)
        ERC20Permit("TestCoin")
    {
        TokenUtils.enforceNonZero(admin);
        TokenUtils.enforceNonZero(treasury);
        TokenUtils.enforceNonZero(ecosystem);
        TokenUtils.enforceNonZero(teamVesting);
        TokenUtils.enforceNonZero(liquidity);
        TokenUtils.enforceNonZero(airdrop);

        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(RESCUER_ROLE, admin);

        // Initial distribution (600,000,000 TST)
        _mint(treasury, 300_000_000 ether);   // 50%
        _mint(ecosystem, 150_000_000 ether);  // 25%
        _mint(liquidity, 90_000_000 ether);   // 15%
        _mint(airdrop, 30_000_000 ether);     // 5%
        _mint(teamVesting, 30_000_000 ether); // 5%

        assert(totalSupply() == 600_000_000 ether);
        assert(cap() == MAX_SUPPLY_CAP);
    }

    // --- Admin-controlled functions ---

    /// @notice Pause all token transfers.
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause token transfers.
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Mint new tokens up to the hard cap. Gate with timelock/governance in production.
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /// @notice Rescue arbitrary ERC20 tokens accidentally sent to this contract.
    function rescueERC20(address token, address to, uint256 amount)
        external
        onlyRole(RESCUER_ROLE)
    {
        TokenUtils.enforceNonZero(to);
        require(token != address(this), "NO_SELF_RESCUE");
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "RESCUE_FAIL");
        emit Rescued(token, to, amount);
    }

    /// @notice Rescue native ETH accidentally sent to this contract.
    function rescueETH(address payable to, uint256 amount)
        external
        onlyRole(RESCUER_ROLE)
    {
        TokenUtils.enforceNonZero(to);
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "RESCUE_ETH_FAIL");
        emit RescuedETH(to, amount);
    }

    // --- Overrides for OZ v5 multiple inheritance ---

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable, ERC20Capped)
    {
        super._update(from, to, value);
    }

    /// @notice ERC20 default decimals (18). Override if you need a different number.
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /// @notice Accept ETH (in case someone sends it by mistake); no action taken.
    receive() external payable {}
}
