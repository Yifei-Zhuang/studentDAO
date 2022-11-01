import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  networks: {
    ganache: {
      // rpc url, change it according to your ganache configuration
      url: 'http://127.0.0.1:8545',
      // the private key of signers, change it according to your ganache user
      accounts: [
        '64a2a12f2d5838cf03d39b859a70e91581f95177064e448c21a183fc196e0760',
        '62447f66b4ac88fc79dff6e4fae8b6ecf2bf5a312c99ac2f900152f3086627ef',
    ]},
  },
   paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};

export default config;
