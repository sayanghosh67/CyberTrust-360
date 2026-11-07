# CyberTrust 360 — video production workspace

Team TECHNIX PRO. Target: 225 seconds, 1920 × 1080, 30 fps, H.264 MP4 with AAC English narration.

The independent audit was saved before video capture. Read `reports/CODEX_FINAL_AUDIT.md` before presenting the project. This is a local prototype demo, not a production-security certification.

## Deliverables

- `output/CyberTrust360_Final_Hackathon_Demo.mp4`: rendered master, once confirmed in VIDEO_QA_REPORT.md.
- `subtitles/CyberTrust360_Demo.srt`: English subtitle sidecar; also burned into the master and embedded as selectable subtitles.
- `scripts/NARRATION_SCRIPT.md`: original scene-aligned English voiceover.
- `scenes/timeline.json`: nine requested scenes, exact 0:00–3:45 schedule.
- `scenes/shots.json`: editorial shot list and durations.
- `reports/capture-evidence.json`: actual API responses, registration and independently fetched receipt.
- `reports/source-media-manifest.json`: source media hashes and provenance.
- `reports/CODEX_FINAL_AUDIT.md`: findings and Antigravity handoff.

## Tools and dependencies

No packages were installed. Used existing backend Python 3.11/Pillow, frontend Puppeteer/Chromium, Hardhat/Ethers and installed macOS Samantha speech synthesis. FFmpeg 7.1.1 was discovered at:

`/Applications/BlueStacks.app/Contents/MacOS/ffmpeg`

The Smart Converter binary could not produce a usable version response; it was not used. FFprobe was not found. QA uses FFmpeg demux/decode metadata and full-stream decode as its equivalent inspection workflow. Do not redistribute bundled executables. The render script supports an alternative installed binary through `FFMPEG`.

The application sources, original database and pre-existing edits were preserved. Existing production builds may update ignored compiler caches; all output builds, audit databases, captures and rendering files are isolated here. A VP9 encoder statistics file emitted in the repository root during capture was moved into `runtime/capture-encoder-statistics.stt`.

## Re-render from captured evidence

From `/Users/sayanghosh/Desktop/HACKMATRIX`:

```bash
backend/.venv/bin/python hackathon-video/scripts/render-video.py
```

This recreates original editorial graphics, renders 26 shots, concatenates them, burns captions, normalizes narration and muxes AAC plus an English subtitle track. It requires existing source captures and `assets/narration.wav`. It does not modify the application or require network access.

To regenerate speech on this Mac:

```bash
backend/.venv/bin/python hackathon-video/scripts/narrate.py
```

macOS speech services require local host permission in sandboxed environments. Audio contains only original narration, with no music or real-person impersonation. Narration is timed from generated audio lengths; long subtitle clauses divide time by word count within a measured utterance. Subtitle timings are not phoneme-level alignment.

## Capture environment and reproducibility

The actual unchanged application was built using VITE_API_BASE_URL=http://127.0.0.1:18000 into `runtime/demo-dist`. It ran on localhost:15173 with backend localhost:18000, separate SQLite `runtime/demo.db`, and separately deployed Hardhat localhost:18545 (chain 31337). Existing services on 5173/8000/8545 were not modified. The demo did not use an external LLM; optional provider credentials were absent and deliberately not introduced. Safe example.com was the only UI URL investigation target. Scam messages explicitly start with SYNTHETIC DEMO and use example.com as an illustrative text indicator, not a claim that example.com is malicious.

`start-audit-api.py`, `deploy-isolated.cjs`, `capture-demo.cjs`, `capture-details.cjs`, `capture-graph-clean.cjs`, and `browser-qa.cjs` preserve the workflow. They assume the isolated local node has been started and the frontend served. `runtime/blockchain` copies the original config/contracts/artifacts/tests and links already installed dependencies. Never run the original deploy script merely to re-render: it writes application ABI metadata. Never point audit tests at the original database.

Real registration captured: block 6, receipt status 1, transaction hash in `reports/capture-evidence.json`. Local Hardhat state disappears on restart; the recording and evidence remain valid historical captures, but replaying verification requires a new deployment and registrations. Do not claim the old local transaction is on a public explorer.

## Editorial scope

The master uses actual walkthrough videos plus genuine screenshots with restrained pan/zoom and original navy/cyan network graphics. Screenshots preserve the application's existing dark/lime identity. UI contents were not retouched or replaced. Portrait-shaped verified/tamper panels are actual cropped panel captures. Editorial captions qualify broad UI wording: selected fields only, some evidence fields unprotected, local resettable EVM, deterministic fallback, synthetic records, and remaining security fixes.

Original docs screenshots and the 10-slide deck were inspected. Old screenshots and hardcoded storyboard verdicts were excluded from the final footage because their actions could not be independently established. Fresh capture supersedes them. `14-relationship-evidence.png` captured an unintended navigation result and is excluded; `21-edge-evidence.png` is the genuine edge evidence drawer. The first graph recording also navigated away; final media uses threat-graph-clean.webm.

No missing manual recording is required for the delivered local demo. Real LLM output, public-chain deployment, Docker/PostgreSQL certification and fixes to audit findings remain outside the demonstrated evidence. Do not relabel those as completed.

## Git and storage

Nothing has been staged, committed, pushed or published. This directory's `.gitignore` excludes generated output, runtime, recordings and assets. Review reports/scripts before optionally committing; obtain approval before adding large generated media. Keep the captured evidence and raw recordings with the final MP4 for reproducibility.

## Source remediation notice

The original MP4 is preserved as pre-remediation evidence. See `reports/VIDEO_REMEDIATION_STATUS.md` for affected scenes and current evidence. Use the corrected live demo and `docs/CyberTrust360_PitchDeck_Remediated.pptx` for the current implementation. Do not overwrite the original master when recapturing a newer build.
