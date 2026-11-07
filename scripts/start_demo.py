#!/usr/bin/env python3
"""Supervised localhost-only demo. Installs nothing and never resets a running chain."""
import argparse
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time
import urllib.request

ROOT=Path(__file__).resolve().parents[1]

def fetch_json(url, token=None):
    request=urllib.request.Request(url,headers={'Authorization':'Bearer '+token} if token else {})
    with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(request,timeout=2) as response:
        return json.load(response)

def healthy(payload):
    return payload.get('status')=='healthy' and payload.get('database',{}).get('status')=='connected'

def port_free(port):
    with socket.socket() as sock:
        try:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(('127.0.0.1', port))
            return True
        except OSError:
            return False

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--api-port',type=int,default=8000)
    parser.add_argument('--web-port',type=int,default=5173)
    parser.add_argument('--chain-port',type=int,default=8545)
    parser.add_argument('--reuse-chain',action='store_true',help='Validate and reuse an existing local chain without resetting it')
    parser.add_argument('--runtime',type=Path,default=ROOT/'.runtime')
    parser.add_argument('--check-only',action='store_true')
    args=parser.parse_args()
    os.chdir(ROOT);os.umask(0o077)
    needed=['backend/.venv/bin/python','blockchain/node_modules/hardhat/internal/cli/cli.js','frontend/node_modules/vite/bin/vite.js','blockchain/artifacts/contracts/CyberTrustReportRegistry.sol/CyberTrustReportRegistry.json']
    for path in needed:
        if not (ROOT/path).is_file():raise RuntimeError(f'Missing {path}; install/compile explicitly before startup')
    import shutil
    if not shutil.which('node'):raise RuntimeError('Node is required; use an LTS release supported by Hardhat')
    if args.check_only:
        print('Existing dependency and artifact prerequisites found. No services started.');return
    for port in [args.api_port,args.web_port]+([] if args.reuse_chain else [args.chain_port]):
        if not port_free(port):raise RuntimeError(f'Port {port} is occupied; choose another port or stop that service yourself')
    args.runtime.mkdir(parents=True,exist_ok=True)
    env=os.environ.copy()
    # Local demo database is persistent but isolated from the user's main database.
    env.update(DATABASE_URL='sqlite:///'+str((args.runtime/'demo.db').resolve()),USE_SQLITE_FALLBACK='False',DEBUG='False',BLOCKCHAIN_RPC_URL=f'http://127.0.0.1:{args.chain_port}',BLOCKCHAIN_CHAIN_ID='31337',BACKEND_CORS_ORIGINS=json.dumps([f'http://127.0.0.1:{args.web_port}',f'http://localhost:{args.web_port}']))
    env.setdefault('LLM_PROVIDER','none')
    env['VISITOR_SESSIONS_ENABLED']='True'
    env['LOCAL_DEMO_GUEST_SIGNING']='True'
    env['ENVIRONMENT']='development'
    from eth_account import Account
    from web3 import Web3
    import secrets
    tokenfile=args.runtime/'demo-token.txt'
    if not tokenfile.exists():tokenfile.write_text(secrets.token_urlsafe(32))
    tokenfile.chmod(0o600);token=tokenfile.read_text().strip()
    env['API_AUTH_TOKENS']=json.dumps({token:{'id':'local-demo','role':'admin'}})
    # Publicly known development account is generated only for this localhost demo.
    Account.enable_unaudited_hdwallet_features()
    env['BLOCKCHAIN_SIGNER_PRIVATE_KEY']=Account.from_mnemonic('test test test test test test test test test test test junk').key.hex()
    processes=[];logs=[]
    def launch(command,cwd,name):
        logfile=open(args.runtime/(name+'.log'),'w');logs.append(logfile)
        process=subprocess.Popen(command,cwd=cwd,env=env,stdout=logfile,stderr=subprocess.STDOUT,start_new_session=True)
        processes.append(process);return process
    def wait_for(check,label,seconds=40):
        deadline=time.monotonic()+seconds
        while time.monotonic()<deadline:
            if any(p.poll() is not None for p in processes):raise RuntimeError(f'A demo process exited during {label}; inspect private runtime logs')
            try:
                if check():return
            except Exception:pass
            time.sleep(.4)
        raise RuntimeError(f'{label} readiness timed out')
    def stop(*unused):raise KeyboardInterrupt
    signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
    try:
        if not args.reuse_chain:
            launch(['node','node_modules/hardhat/internal/cli/cli.js','node','--hostname','127.0.0.1','--port',str(args.chain_port)],ROOT/'blockchain','hardhat')
        w3=Web3(Web3.HTTPProvider(env['BLOCKCHAIN_RPC_URL'],request_kwargs={'timeout':2}))
        wait_for(lambda:w3.is_connected(),'RPC')
        if w3.eth.chain_id!=31337 or 'hardhat' not in w3.client_version.lower():raise RuntimeError('Expected a local Hardhat chain 31337')
        metadata=json.loads((ROOT/'backend/app/blockchain/contract_abi.json').read_text())
        address=metadata['contractAddress'];code=w3.eth.get_code(address)
        if code:
            if Web3.to_hex(Web3.keccak(code))!=metadata['runtimeBytecodeHash']:raise RuntimeError('Existing contract bytecode mismatch; no automatic overwrite')
        else:
            artifact=json.loads((ROOT/needed[-1]).read_text())
            factory=w3.eth.contract(abi=artifact['abi'],bytecode=artifact['bytecode'])
            receipt=w3.eth.wait_for_transaction_receipt(factory.constructor().transact({'from':w3.eth.accounts[0]}),timeout=20)
            if receipt.status!=1:raise RuntimeError('Deployment transaction failed')
            address=receipt.contractAddress
        env['BLOCKCHAIN_CONTRACT_ADDRESS']=address
        (args.runtime/'deployment.json').write_text(json.dumps({'chain_id':31337,'contract_address':address}))
        launch([str(ROOT/'backend/.venv/bin/python'),'-m','uvicorn','backend.app.main:app','--host','127.0.0.1','--port',str(args.api_port),'--no-access-log'],ROOT,'backend')
        base=f'http://127.0.0.1:{args.api_port}'
        wait_for(lambda:healthy(fetch_json(base+'/api/health')),'database/API')
        wait_for(lambda:fetch_json(base+'/api/v1/blockchain/status',token).get('connected') is True,'registry')
        env['VITE_API_BASE_URL']=base
        launch(['node','node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',str(args.web_port),'--strictPort'],ROOT/'frontend','frontend')
        def web_ready():
            with urllib.request.urlopen(f'http://127.0.0.1:{args.web_port}',timeout=2) as response:return response.status==200
        wait_for(web_ready,'frontend')
        print(f'READY: http://127.0.0.1:{args.web_port}',flush=True)
        print('The website opens directly with a private visitor session. Operator credentials remain private in the runtime directory.',flush=True)
        print('Local Hardhat demonstration only. Ctrl-C stops only processes started by this command.',flush=True)
        while all(p.poll() is None for p in processes):time.sleep(1)
        raise RuntimeError('A demo service exited unexpectedly')
    finally:
        for process in reversed(processes):
            if process.poll() is None:os.killpg(process.pid,signal.SIGTERM)
        for process in processes:
            try:process.wait(timeout=5)
            except subprocess.TimeoutExpired:os.killpg(process.pid,signal.SIGKILL)
        for logfile in logs:logfile.close()

if __name__=='__main__':
    try:main()
    except KeyboardInterrupt:pass
    except Exception as exc:
        print(f'Demo startup failed: {type(exc).__name__}: {exc}',file=sys.stderr)
        sys.exit(1)
