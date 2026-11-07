import os,subprocess,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
env=os.environ.copy(); env.update(PYTHONPATH=str(root),PYTHONDONTWRITEBYTECODE='1',POSTGRES_PORT='1',SQLITE_DB_PATH=str(root/'hackathon-video/runtime/audit-tests.db'),BLOCKCHAIN_RPC_URL='http://127.0.0.1:18545',DEBUG='False',LLM_PROVIDER='none',GEMINI_API_KEY='',OPENAI_API_KEY='',GOOGLE_SAFE_BROWSING_API_KEY='',VIRUSTOTAL_API_KEY='',PHISHTANK_API_KEY='',TLDEXTRACT_CACHE=str(root/'hackathon-video/runtime/tld-cache'))
with (root/'hackathon-video/reports/backend-tests.log').open('w') as log:
 p=subprocess.run([str(root/'backend/.venv/bin/pytest'),'backend/tests','-v','-o',f'cache_dir={root}/hackathon-video/runtime/pytest-cache'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
print('Backend pytest exit:',p.returncode)
