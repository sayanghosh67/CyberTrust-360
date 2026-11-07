"""Deploy/check the registry on the dedicated localhost:18545 test chain only."""
import json
from pathlib import Path
from web3 import Web3
root=Path(__file__).resolve().parents[1]
w3=Web3(Web3.HTTPProvider('http://127.0.0.1:18545',request_kwargs={'timeout':3}))
if not w3.is_connected() or w3.eth.chain_id!=31337 or 'hardhat' not in w3.client_version.lower():
    raise SystemExit('Start the separate local Hardhat test node on port 18545 first.')
metadata=json.loads((root/'backend/app/blockchain/contract_abi.json').read_text())
address=metadata['contractAddress'];code=w3.eth.get_code(address)
if not code:
    artifact=json.loads((root/'blockchain/artifacts/contracts/CyberTrustReportRegistry.sol/CyberTrustReportRegistry.json').read_text())
    factory=w3.eth.contract(abi=artifact['abi'],bytecode=artifact['bytecode'])
    receipt=w3.eth.wait_for_transaction_receipt(factory.constructor().transact({'from':w3.eth.accounts[0]}),timeout=20)
    if receipt.status!=1 or receipt.contractAddress.lower()!=address.lower():
        raise SystemExit('Test deployment address differs; use a fresh isolated test chain. No source metadata was overwritten.')
    code=w3.eth.get_code(address)
if Web3.to_hex(Web3.keccak(code))!=metadata['runtimeBytecodeHash']:
    raise SystemExit('Unexpected test registry bytecode; refusing to overwrite it.')
print('Verified isolated test registry on chain 31337 at '+address)
