const fs=require('fs');
const {ethers}=require('../../blockchain/node_modules/ethers');
(async()=>{
const provider=new ethers.JsonRpcProvider('http://127.0.0.1:18545');
if(Number((await provider.getNetwork()).chainId)!==31337) throw Error('Unexpected chain');
const signer=await provider.getSigner(0);
const artifact=require('../runtime/blockchain/artifacts/contracts/CyberTrustReportRegistry.sol/CyberTrustReportRegistry.json');
const contract=await new ethers.ContractFactory(artifact.abi,artifact.bytecode,signer).deploy();
await contract.waitForDeployment();
const receipt=await contract.deploymentTransaction().wait();
const evidence={address:await contract.getAddress(),chainId:31337,transactionHash:receipt.hash,blockNumber:receipt.blockNumber,status:receipt.status};
fs.writeFileSync('hackathon-video/reports/isolated-deployment.json',JSON.stringify(evidence,null,2));
console.log(evidence);
})();
