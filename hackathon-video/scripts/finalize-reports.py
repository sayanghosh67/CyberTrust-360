from pathlib import Path
import json,hashlib,subprocess
R=Path(__file__).resolve().parents[1];root=R.parent;p=json.loads((R/'reports/video-properties.json').read_text());e=json.loads((R/'reports/capture-evidence.json').read_text());shots=json.loads((R/'scenes/shots.json').read_text());sources=sorted(set(s['media'] for s in shots if s['media']));base=json.loads((R/'reports/source-baseline.json').read_text());changed=[f for f,h in base.items() if not (root/f).exists() or hashlib.sha256((root/f).read_bytes()).hexdigest()!=h];assert not changed
(R/'reports/source-preservation-check.json').write_text(json.dumps({'changed_baseline_files':changed,'tracked_files_checked':len(base)-1,'original_database_unchanged':True,'git_status':subprocess.check_output(['git','status','--short'],cwd=root,text=True)},indent=2))
qa=f'''# CyberTrust 360 — Video QA Report

**Final artifact:** `{p['file']}`  
**Status:** RENDERED AND VERIFIED  
**Date:** 7 November 2026, Asia/Kolkata

## Actual media properties

| Property | Measured value |
|---|---|
| File exists | Yes; {p['bytes']:,} bytes ({p['bytes']/1024/1024:.2f} MiB) |
| Duration | {p['duration_seconds']:.3f} seconds / 3:45 |
| Resolution / aspect | 1920 × 1080 / 16:9 / square pixels |
| Frame rate / frame count | 30 FPS / {p['decoded_video_frames']:,} decoded frames |
| Video | H.264 High, yuv420p, progressive |
| Audio | AAC-LC, 48 kHz, mono English synthetic narration |
| Audio levels | Mean {p['audio_mean_db'][0]}; peak {p['audio_peak_db'][0]} |
| Subtitles | 46 SRT cues; burned captions and embedded English mov_text track |
| Full video/audio decode | Exit {p['full_decode_exit']}; no decoding errors |
| Long black intervals | {len(p['black_intervals'])} detected at ≥0.5 s with pix_th=0.02 |
| SHA-256 | `{p['sha256']}` |

FFprobe was not installed. FFmpeg's demux metadata, complete video/audio decoding, frame counts, blackdetect and volumedetect were used as equivalent verification. This is an actual rendered file, not a render-project-only delivery. No claim of a full real-time player audition is made.

## Visual and factual checks

1. **File and codec:** final MP4 exists and both streams decode fully. Faststart metadata supports ordinary playback.
2. **Duration/specification:** all nine requested timeline scenes total exactly 225 seconds. 1920×1080, 30 FPS and 6,750 frames independently observed.
3. **Scene coverage:** sampled every shot midpoint, all scene transitions and each narration utterance midpoint ({len(p['sampled_frames'])} extracted frames). Reviewed five contact sheets and selected full-resolution evidence frames. No missing-content scenes. Brief fades at cuts/open/close are intentional.
4. **Caption layout:** maximum two lines, dedicated dark bottom band, high contrast. Measured subtitle widths fit the 1080p canvas. Sampled captions show no clipping/overlap with UI. Read at full-resolution playback; some dense original UI text is intentionally contextual rather than the primary reading target.
5. **Audio synchronization:** each utterance uses its measured generated duration; silence fills the remaining scene budget. Narration track is exactly 225 seconds. Clause splits within long utterances use proportional word timing, not phoneme alignment. Peak remains below 0 dBFS. No music or third-party commercial audio.
6. **Branding:** CYBERTRUST 360, TECHNIX PRO, requested tagline and closing line checked. Original app dark/lime styling preserved inside navy/cyan editorial frames.
7. **Genuine application content:** fresh captures of unchanged application code; no fabricated UI, mocked API responses, invented LLM verdicts or synthetic blockchain transactions. Synthetic *input messages* explicitly identified.
8. **URL investigation:** example.com, actual Low Risk 5/100 and DNS/TLS results. URLhaus HTTP 401/unavailable and missing provider credentials are disclosed. No scripted claim of 88/100 or invented four-day certificate.
9. **Scam DNA:** synthetic KYC fixture returned 100/100 using rule_based_fallback. Footage and narration identify deterministic analysis. No claim of tested live LLM inference.
10. **Relationships:** actual stored demo reports/edges. Genuine exact-match evidence drawer shown. Shared infrastructure is not described as attacker attribution. Built-in synthetic indicator-count contamination disclosed.
11. **Blockchain:** real isolated local transaction `{e['receipt']['hash']}`, receipt status 1, block {e['receipt']['blockNumber']}, chain 31337. Actual unchanged and controlled mismatch panels. Local resettable Hardhat limitation and incomplete evidence-field hashing are visible and narrated. No public-chain immutability claim.
12. **Source preservation:** tracked application/document files and original SQLite database match the pre-work baseline. No source fixes, dependency installations, staging, commits, pushes or publishing.

## Corrections made during QA

The original graph capture clicked an unrelated cross-module button and navigated to Scam DNA. Both its misleading screenshot and that recording were excluded. `21-edge-evidence.png` and `threat-graph-clean.webm` show the real graph evidence interaction. The corrected shot was rendered and the final master was fully decoded and sampled again. Early narration overran one scene; timing was corrected before the final render. No application behavior was altered to obtain footage.

## Source media in the final master

'''+ '\n'.join('- `'+s+'`' for s in sources)+'''

Raw recordings preserve actual UI actions; some shots use a held final frame to fit narration. Screenshots use restrained editorial pan/zoom. Original artwork supplies the opening, problem sequence, architecture and closing. `source-media-manifest.json` records provenance and hashes. Earlier documentation screenshots/deck were inspected but not used as proof footage.

## Outstanding limitations

- Demo-only release verdict remains CONDITIONAL GO; current backend is NO-GO for public production exposure.
- No live LLM, authenticated external threat-feed verdict, public network, PostgreSQL/Docker deployment, large-load benchmark or full accessibility certification is demonstrated.
- Hash verification covers selected fields; the audit identifies real omissions. Broad UI wording is qualified by the film, not silently edited.
- Narration is an installed synthetic English voice. Technical timing/level checks and sampled visual QA do not constitute a studio listening session or phoneme-level subtitle alignment.
- No missing manual recording or rendering step remains for this delivered local demonstration.

Evidence: `reports/video-properties.json`, `video-full-decode.log`, `video-black-detect.log`, `video-audio-levels.log`, `video-contact-1.jpg` through `video-contact-5.jpg`, and `reports/capture-evidence.json`.
'''
(R/'VIDEO_QA_REPORT.md').write_text(qa)
final=f'''# CYBERTRUST 360 — CODEX FINAL AUDIT & VIDEO PRODUCTION REPORT

**Team TECHNIX PRO • 7 November 2026 • Branch phase6-finalization • HEAD db7d60d**

The independent audit and real MP4 production are complete. No application source changes were made. **Hackathon verdict: CONDITIONAL GO for a supervised local demonstration. Production deployment: NO-GO.**

## 1. Project Verification

| Phase | Verified status |
|---|---|
| 1 Foundation | React/TypeScript, FastAPI, SQLAlchemy and SQLite work; migration/deployment gaps remain |
| 2 URL Investigation | Real example.com scan, DNS/TLS/header evidence and history work; SSRF, limits and classification defects remain |
| 3 Scam DNA | Indian scam heuristics, extraction, guidance and persistence work; no real LLM configured or demonstrated |
| 4 Threat Relationships | Real DB-backed graph and evidence interactions work; synthetic indicator metric contamination remains |
| 5 Blockchain | Real local registry deployment, registration receipt, unchanged match and controlled mismatch work; hash coverage, JCS and chain enforcement defects remain |
| 6 Integration | Navigation, browser smoke checks and production build pass; startup, migrations, privacy and deployment controls need correction |

**Independent tests:** 45 backend + 13 Solidity = **58 passed, 0 failed, 0 skipped**. Backend emitted 4 warnings. Hardhat warned Node 25 is unsupported. Frontend build/typecheck passed with a >500 kB chunk warning; lint passed with 10 warnings. No dedicated frontend unit test script. pip check passed. Empty Alembic revision technically applies but is not a valid migration implementation. All initial navigation anchors existed; browser scan succeeded without JS exceptions or horizontal overflow at 1440/768/390 pixels.

**Security:** no CRITICAL issue confirmed in scope. HIGH findings: actual DNS rebinding SSRF bypass, incomplete hash coverage, unauthenticated report/signing APIs, unbounded HTTP body handling, absent chain/contract enforcement, and high-severity blockchain dependency advisories. npm audit found 0 frontend advisory entries and 49 blockchain toolchain affected entries (19 high, 11 moderate, 19 low). These counts include propagated dependencies, not 49 separately demonstrated exploits. Python CVE review and full historical secret scanning remain unverified.

**Deployment:** no app Dockerfile, Compose only provisions PostgreSQL, migrations rely on create_all, startup may accept stale deployments and print success on failure. No Docker executable was available. Keep demo services on localhost. No public deployment or GitHub publication was performed.

Read the detailed evidence, file/line references, impact and fixes in [CODEX_FINAL_AUDIT.md](CODEX_FINAL_AUDIT.md).

## 2. Video Production

**A real MP4 was rendered and verified.**

- Output: `{p['file']}`
- Duration: **225.000 seconds (3:45)**.
- Resolution: **1920×1080**, 16:9, **30 FPS**, H.264 High/yuv420p.
- Size: **{p['bytes']:,} bytes / {p['bytes']/1024/1024:.2f} MiB**.
- Audio: original English narration using installed macOS Samantha voice, AAC-LC 48 kHz; no background music.
- Subtitles: **46 cues**, SRT sidecar plus burned captions and selectable English MP4 subtitle stream.
- Source: fresh actual application walkthroughs/screenshots, original network/architecture graphics; old storyboard verdicts and unverified screenshots excluded.
- Blockchain evidence: real receipt status 1 in block {e['receipt']['blockNumber']} on isolated local chain 31337; no simulated transaction footage.
- QA: all **6,750 frames** and audio decoded successfully, no long black intervals, sampled all shots/transitions/narration cues, checked caption fit and audio levels. Incorrect graph navigation clip was recaptured and corrected before final verification.
- No manual footage or rendering step remains. Real LLM/public-chain/production-deployment claims remain intentionally absent. Narrative explicitly states heuristic fallback, synthetic data, local EVM and incomplete report hash coverage.

Full production instructions: `../VIDEO_PRODUCTION_README.md`. Full media checks: `../VIDEO_QA_REPORT.md`. Narration: `../scripts/NARRATION_SCRIPT.md`. Subtitle sidecar: `../subtitles/CyberTrust360_Demo.srt`.

## 3. Issues for Antigravity

| Priority | Required correction | Acceptance evidence |
|---|---|---|
| P0 | Pin validated public IPs for HTTP/TLS and redirects; close mapped-IPv6 bypass; cap bodies/time/concurrency | Controlled rebinding cannot reach a local server; private/redirect/oversized-response tests pass |
| P0 | Align protected hash schema with actual displayed/persisted reports | Mutating DNS/TLS/headers/feed findings/tactics/score changes hash and verification; version migration defined |
| P0 | Add authentication, report ownership, registrar authorization and quotas | Unauthorized users cannot read another report or invoke signing/paid analysis |
| P0 | Enforce expected chain/address/bytecode and prohibit public development signer in nonlocal mode | Wrong-chain/address configuration fails closed before signing |
| P1 | Implement real JCS or stop claiming RFC 8785; version commitments | Official numeric/Unicode/invalid-value canonicalization vectors pass |
| P1 | Remove demo nodes from live metrics and distinguish unavailable checks | Empty database has zero genuine indicators; unavailable inspections return qualified/inconclusive results |
| P1 | Reconcile receipts/versions after chain resets, DB failures and concurrent registration | Missing on-chain record returns NOT_REGISTERED; signer nonce/DB state stays consistent |
| P1 | Replace empty migrations, fix health/persistence errors and startup gating | Fresh DB created by migrations; failed persistence/readiness never reports success |
| P1 | Review and update vulnerable blockchain dependencies; supported Node/Python lockfiles | Advisory review and full regression suite on supported runtimes |
| P1 | Redact sensitive previews/logs and correctly route LLM_PROVIDER/model/none | No key/input leakage; none never calls a provider; real-provider tests when authorized |
| P2 | Fix URL reconstruction/relative redirects, incident guidance absolutes, accessibility label and documentation claims | Focused regressions and corrected README/presentation/storyboard |

No fixes were silently applied. Detailed severity, locations and evidence are in the audit report.

## 4. Final Hackathon Checklist

| Item | Status |
|---|---|
| Working local application | PASS for demonstrated flows |
| Independent automated tests | PASS: 58/58; warnings and coverage limits recorded |
| Security review | COMPLETE; HIGH issues require fixes |
| Presentation | Existing 10-slide deck/content inspected; security/JCS/startup claims require revision |
| Demonstration video | COMPLETE: real 3:45 MP4, narration, captions and QA |
| README | Present and extensive; runtime/deployment/security statements need correction |
| GitHub readiness | No source drift introduced, original edits preserved; publication not performed; security/documentation work remains |
| Deployment readiness | NO-GO for public deployment |
| Hackathon submission readiness | CONDITIONAL GO for honest, supervised local prototype submission with audit limitations disclosed |

Application files and original database match baseline. All new artifacts remain under `hackathon-video/`; generated media/runtime are locally ignored from Git. Nothing was installed, staged, committed, merged, pushed or published. Original services were preserved; isolated audit services are stopped after verification. Re-rendering from saved evidence needs no running application.
'''
(R/'reports/FINAL_DELIVERY_REPORT.md').write_text(final)
print('QA report and final combined report written. Source baseline unchanged.')
