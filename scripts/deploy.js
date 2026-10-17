const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);

  const MediaGuard = await hre.ethers.getContractFactory("MediaGuard");
  const contract = await MediaGuard.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const network = await hre.ethers.provider.getNetwork();

  const artifact = await hre.artifacts.readArtifact("MediaGuard");
  const deployment = {
    address,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    abi: artifact.abi,
    deployedAt: new Date().toISOString()
  };

  const outputDir = path.join(__dirname, "..", "backend", "app");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "contract_deployment.json"), JSON.stringify(deployment, null, 2));
  console.log(`MediaGuard deployed at: ${address}`);
  console.log(`Deployment manifest: ${path.join(outputDir, "contract_deployment.json")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
