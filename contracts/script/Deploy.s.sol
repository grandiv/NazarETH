// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {GoalVault} from "../src/GoalVault.sol";

contract DeployGoalVault is Script {
    function run() external returns (GoalVault) {
        address usdc = vm.envAddress("USDC_CONTRACT_ADDRESS");
        address signer = vm.envAddress("BACKEND_SIGNER_ADDRESS");
        address deployer = vm.envAddress("BACKEND_SIGNER_ADDRESS");

        vm.startBroadcast(deployer);
        GoalVault vault = new GoalVault(usdc, signer, deployer);
        vm.stopBroadcast();

        return vault;
    }
}
