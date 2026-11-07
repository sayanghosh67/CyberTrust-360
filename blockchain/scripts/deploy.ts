import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("=================================================");
  console.log("TECHNIX PRO — CyberTrust 360 Smart Contract Deploy");
  console.log("=================================================");
  console.log("Deployer Address:", deployer.address);
  console.log("Network Name:    ", network.name);
  console.log("Chain ID:        ", network.chainId.toString());
  console.log("Deployer Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const Factory = await ethers.getContractFactory("CyberTrustReportRegistry");
  const registry = await Factory.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log("-------------------------------------------------");
  console.log("CyberTrustReportRegistry DEPLOYED SUCCESSFULLY!");
  console.log("Contract Address:", contractAddress);
  console.log("-------------------------------------------------");

  // Save deployment metadata
  const deploymentInfo = {
    contractName: "CyberTrustReportRegistry",
    contractAddress: contractAddress,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    network: network.name,
  };

  const deploymentPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment metadata written to:", deploymentPath);

  // Export ABI for Backend integration
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/CyberTrustReportRegistry.sol/CyberTrustReportRegistry.json"
  );
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    const abiExport = {
      contractAddress: contractAddress,
      chainId: Number(network.chainId),
      abi: artifact.abi,
    };
    const backendAbiDir = path.join(__dirname, "../../backend/app/blockchain");
    if (!fs.existsSync(backendAbiDir)) {
      fs.mkdirSync(backendAbiDir, { recursive: true });
    }
    const backendAbiPath = path.join(backendAbiDir, "contract_abi.json");
    fs.writeFileSync(backendAbiPath, JSON.stringify(abiExport, null, 2));
    console.log("Contract ABI exported for backend to:", backendAbiPath);
  }
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});