import os,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
os.environ.update(POSTGRES_PORT='1',SQLITE_DB_PATH=str(root/'hackathon-video/runtime/demo.db'),DEBUG='False',BLOCKCHAIN_RPC_URL='http://127.0.0.1:18545',GEMINI_API_KEY='',OPENAI_API_KEY='',GOOGLE_SAFE_BROWSING_API_KEY='',VIRUSTOTAL_API_KEY='',PHISHTANK_API_KEY='',BACKEND_CORS_ORIGINS='["http://127.0.0.1:15173"]',TLDEXTRACT_CACHE=str(root/'hackathon-video/runtime/tld-cache'))
import uvicorn
uvicorn.run('backend.app.main:app',host='127.0.0.1',port=18000,log_level='warning')
