import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";

export default {
  solidity: "0.8.24",
  plugins: [hardhatEthers, hardhatToolboxMochaEthers],
};
