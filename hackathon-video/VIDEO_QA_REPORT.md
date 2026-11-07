# CyberTrust 360 — Video QA Report

**Final artifact:** `/Users/sayanghosh/Desktop/HACKMATRIX/hackathon-video/output/CyberTrust360_Final_Hackathon_Demo.mp4`  
**Status:** RENDERED AND VERIFIED  
**Date:** 7 November 2026, Asia/Kolkata

## Actual media properties

| Property | Measured value |
|---|---|
| File exists | Yes; 21,830,100 bytes (20.82 MiB) |
| Duration | 225.000 seconds / 3:45 |
| Resolution / aspect | 1920 × 1080 / 16:9 / square pixels |
| Frame rate / frame count | 30 FPS / 6,750 decoded frames |
| Video | H.264 High, yuv420p, progressive |
| Audio | AAC-LC, 48 kHz, mono English synthetic narration |
| Audio levels | Mean -16.5 dB; peak -1.5 dB |
| Subtitles | 46 SRT cues; burned captions and embedded English mov_text track |
| Full video/audio decode | Exit 0; no decoding errors |
| Long black intervals | 0 detected at ≥0.5 s with pix_th=0.02 |
| SHA-256 | `7d32344320b54ab3847118a401979a32ec8ae04c4d59c5f84aa489e050e58668` |

FFprobe was not installed. FFmpeg's demux metadata, complete video/audio decoding, frame counts, blackdetect and volumedetect were used as equivalent verification. This is an actual rendered file, not a render-project-only delivery. No claim of a full real-time player audition is made.

## Visual and factual checks

1. **File and codec:** final MP4 exists and both streams decode fully. Faststart metadata supports ordinary playback.
2. **Duration/specification:** all nine requested timeline scenes total exactly 225 seconds. 1920×1080, 30 FPS and 6,750 frames independently observed.
3. **Scene coverage:** sampled every shot midpoint, all scene transitions and each narration utterance midpoint (70 extracted frames). Reviewed five contact sheets and selected full-resolution evidence frames. No missing-content scenes. Brief fades at cuts/open/close are intentional.
4. **Caption layout:** maximum two lines, dedicated dark bottom band, high contrast. Measured subtitle widths fit the 1080p canvas. Sampled captions show no clipping/overlap with UI. Read at full-resolution playback; some dense original UI text is intentionally contextual rather than the primary reading target.
5. **Audio synchronization:** each utterance uses its measured generated duration; silence fills the remaining scene budget. Narration track is exactly 225 seconds. Clause splits within long utterances use proportional word timing, not phoneme alignment. Peak remains below 0 dBFS. No music or third-party commercial audio.
6. **Branding:** CYBERTRUST 360, TECHNIX PRO, requested tagline and closing line checked. Original app dark/lime styling preserved inside navy/cyan editorial frames.
7. **Genuine application content:** fresh captures of unchanged application code; no fabricated UI, mocked API responses, invented LLM verdicts or synthetic blockchain transactions. Synthetic *input messages* explicitly identified.
8. **URL investigation:** example.com, actual Low Risk 5/100 and DNS/TLS results. URLhaus HTTP 401/unavailable and missing provider credentials are disclosed. No scripted claim of 88/100 or invented four-day certificate.
9. **Scam DNA:** synthetic KYC fixture returned 100/100 using rule_based_fallback. Footage and narration identify deterministic analysis. No claim of tested live LLM inference.
10. **Relationships:** actual stored demo reports/edges. Genuine exact-match evidence drawer shown. Shared infrastructure is not described as attacker attribution. Built-in synthetic indicator-count contamination disclosed.
11. **Blockchain:** real isolated local transaction `0x91028b54b7dfb883f86fab794c15e0b9e958bec00787da65d49858b094f18558`, receipt status 1, block 6, chain 31337. Actual unchanged and controlled mismatch panels. Local resettable Hardhat limitation and incomplete evidence-field hashing are visible and narrated. No public-chain immutability claim.
12. **Source preservation:** tracked application/document files and original SQLite database match the pre-work baseline. No source fixes, dependency installations, staging, commits, pushes or publishing.

## Corrections made during QA

The original graph capture clicked an unrelated cross-module button and navigated to Scam DNA. Both its misleading screenshot and that recording were excluded. `21-edge-evidence.png` and `threat-graph-clean.webm` show the real graph evidence interaction. The corrected shot was rendered and the final master was fully decoded and sampled again. Early narration overran one scene; timing was corrected before the final render. No application behavior was altered to obtain footage.

## Source media in the final master

- `../recordings/blockchain-verification.webm`
- `../recordings/scam-analysis.webm`
- `../recordings/threat-graph-clean.webm`
- `../recordings/url-investigation.webm`
- `01-hero.png`
- `03-url-input.png`
- `06-url-tls.png`
- `07-url-dns.png`
- `08-scam-input.png`
- `09-scam-result.png`
- `11-incident-guidance.png`
- `16-blockchain-registered.png`
- `19-dashboard-final.png`
- `20-graph-close.png`
- `21-edge-evidence.png`
- `22-verified-detail.png`
- `23-tamper-detail.png`

Raw recordings preserve actual UI actions; some shots use a held final frame to fit narration. Screenshots use restrained editorial pan/zoom. Original artwork supplies the opening, problem sequence, architecture and closing. `source-media-manifest.json` records provenance and hashes. Earlier documentation screenshots/deck were inspected but not used as proof footage.

## Outstanding limitations

- Demo-only release verdict remains CONDITIONAL GO; current backend is NO-GO for public production exposure.
- No live LLM, authenticated external threat-feed verdict, public network, PostgreSQL/Docker deployment, large-load benchmark or full accessibility certification is demonstrated.
- Hash verification covers selected fields; the audit identifies real omissions. Broad UI wording is qualified by the film, not silently edited.
- Narration is an installed synthetic English voice. Technical timing/level checks and sampled visual QA do not constitute a studio listening session or phoneme-level subtitle alignment.
- No missing manual recording or rendering step remains for this delivered local demonstration.

Evidence: `reports/video-properties.json`, `video-full-decode.log`, `video-black-detect.log`, `video-audio-levels.log`, `video-contact-1.jpg` through `video-contact-5.jpg`, and `reports/capture-evidence.json`.

## Post-remediation preservation check

The original MP4 SHA-256 remains `7d32344320b54ab3847118a401979a32ec8ae04c4d59c5f84aa489e050e58668` (21,830,100 bytes). Media was not re-rendered in the code-remediation pass. Its prior playback/codec QA remains evidence for that unchanged file; its feature claims describe the old build. See `reports/VIDEO_REMEDIATION_STATUS.md` before submission.
