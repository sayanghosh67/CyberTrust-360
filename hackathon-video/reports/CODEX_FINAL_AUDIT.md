# CyberTrust 360 — Independent Final Audit

**Team:** TECHNIX PRO  
**Audit date:** 7 November 2026 (Asia/Kolkata)  
**Inspected branch / HEAD:** `phase6-finalization` / `db7d60d`  
**Hackathon verdict: CONDITIONAL GO for a supervised, localhost demonstration. Public deployment: NO-GO.**

## Executive summary

All six modules exist and the primary local workflow functions. Independently rerun tests: **45 backend tests passed, 13 Solidity tests passed, zero failed or skipped**. The frontend TypeScript/production build and lint completed successfully, with warnings described below. Real JSON-RPC transactions, receipt confirmation, unchanged verification and controlled score tampering are exercised by the backend tests against a separately deployed local Hardhat registry. These are not mocked blockchain results.

Passing tests do not establish the security claims in the README. Confirmed high-priority defects include a reproducible DNS rebinding SSRF bypass, incomplete report fingerprint coverage, unauthenticated data/signing endpoints, unbounded HTTP response loading and missing chain enforcement. The current serializer is deterministic for its ordinary payloads but is **not an RFC 8785 implementation**. The indicator metric includes synthetic data. No real LLM or keyed threat-feed credentials were configured; all 209 existing scam records used deterministic fallback. URLhaus returned HTTP 401 during the fresh example.com investigation.

**No CRITICAL severity finding was confirmed within this local scope.** The HIGH findings prevent describing the project as production ready. A technically honest demo can show the functioning subset, including score-change detection, while explicitly disclosing local EVM, heuristic analysis, synthetic inputs and incomplete hash coverage. No source fixes were made.

## Scope, provenance and safety

Read README.md, PROJECT_CONTEXT.md, docs/ARCHITECTURE.md, docs/PRESENTATION.md, docs/DEMO_VIDEO_STORYBOARD.md and start_demo.sh; inspected frontend routes/components/services, backend APIs/models/services/schemas, migration, database configuration, contract, deployment/configuration and tests. Inspected all 10 pitch-deck slide texts through the PPTX archive, not PowerPoint. Original screenshots are reference material, not independent proof of an action.

Nine pre-existing modified tracked files each had one inserted line: dashboard API/schema/test, architecture, storyboard, presentation, deck generator, frontend dashboard types and startup script. They were preserved. `reports/source-baseline.json` records tracked-file hashes and the original SQLite hash. Relevant history contains phase 1, phase 2, security/scoring changes, graph, blockchain and phase 6 commits; presence of a commit title alone is not phase verification. No branch switch, commit, merge, push or installation occurred.

All new test DBs and assets live under `hackathon-video/`. Tests force PostgreSQL port 1 and an explicit isolated SQLite path. Hardhat runs on 127.0.0.1:18545; demo backend/frontend use 18000/15173. The existing services and original database were not targets of writes. SSRF reproduction connected only to an auditor-created loopback HTTP server using a controlled DNS resolver. No intrusive external scans were performed. API key values and private signing keys are excluded from deliverables.

## Phase verification

| Phase | Result | Evidence and limitations |
|---|---|---|
| 1 Foundation | Implemented; deployment incomplete | React 19/TypeScript/Vite, FastAPI, SQLAlchemy models and SQLite persistence work. PostgreSQL connection/fallback code exists. Alembic upgrade exits 0 but sole revision is empty; tables come from create_all. Docker Compose provisions only PostgreSQL. Docker unavailable here; PostgreSQL/container startup not verified. |
| 2 URL investigation | Working with HIGH security defects | Fresh example.com request through actual UI: Low Risk 5/100, DNS resolved, valid TLS 1.3, header evidence saved. Basic private/loopback checks pass. Actual outbound HTTP is not pinned to validated IPs. TLS uses a fresh hostname resolution. Normalization drops port/query. DNS failure unit tests correctly avoid a missing-encryption penalty; unavailable DNS can still yield misleading Low Risk text. |
| 3 Scam DNA | Heuristics verified; real LLM unverified | KYC, UPI, OTP, job, electricity, benign and persistence tests pass. Delivery regex exists; no dedicated detection-quality test. Indicators/tactics/recommendations persist. Real Gemini/OpenAI adapters exist, but no credentials and no live LLM inference demonstrated. Injection test exercises fallback, not an LLM. |
| 4 Relationships | Implemented with data-separation defect | DB-backed report/indicator nodes, exact-match versus inferred edges, filters/search and React Flow layout exist. Evidence and attribution limitation are included. Synthetic graph nodes are labeled, but recurring indicators unconditionally include demo nodes; empty DB dashboard shows three indicators. No large-scale performance benchmark. |
| 5 Integrity | Genuine local integration, incomplete integrity scope | Authorized registrar contract checks, duplicate same-version prevention, increasing versions and prior hash history work. Real deployment/registration/receipt/verify/tamper tests pass on chain 31337. No public blockchain claim is justified. JSON canonicalization and protected-field mapping need correction. |
| 6 Integration | Local workflow works; release claims overstated | Real DB queries for scan/scam/high-risk/registration counts; graph-derived indicator metric contaminated. All hash-navigation targets present, primary scan works, no browser JS errors. No horizontal document overflow at 1440, 768 and 390 pixels. Build/lint pass with warnings. Startup script and docs are not production acceptance gates. |

## Actual checks and test results

| Check | Observed outcome |
|---|---|
| Existing Hardhat suite | 13 passed, 433 ms, no failed/skipped; Node 25.1.0 unsupported-version warning |
| Existing backend suite | 45 passed, 4 warnings, 10.04 s, no failed/skipped |
| Frontend production build | Exit 0; TypeScript build included; 2,102 modules; JS chunk 560.37 kB (164.51 kB gzip) |
| Frontend lint | Exit 0; 10 react set-state-in-effect warnings |
| Dedicated frontend unit tests | None configured in package.json |
| pip check | No broken requirements; cache permission warning |
| Alembic upgrade on isolated DB | Exit 0; empty revision applied, create_all masks missing migration DDL |
| bash -n start_demo.sh | Passed; script not executed because it can install dependencies, write deployment metadata and reuse original services |
| Browser QA | Fresh scan rendered; zero page exceptions; anchor targets found; widths 1440/768/390 equal document width; no unnamed buttons in initial tested state |
| npm audit frontend | 0 advisory findings at audit time |
| npm audit blockchain | 49 affected package entries: 19 HIGH, 11 MODERATE, 19 LOW, 0 CRITICAL; mostly development toolchain and propagated dependencies, not 49 distinct exploitable application bugs |
| Python vulnerability advisory scan | Not performed: no installed advisory scanner established. pip check checks compatibility, not CVEs. Requirements have lower bounds only and no reproducible Python lockfile. |

Logs: `hardhat-tests.log`, `backend-tests.log`, `frontend-build.log`, `frontend-lint.log`, `python-dependency-check.log`, `alembic.log`, `browser-qa.json`, dependency-audit JSON files. `audit-probes.py` is an independent reproduction script, not part of the reported 58 tests.

Backend warning categories: Starlette TestClient/httpx deprecation, two 422-status deprecations, tldextract registered_domain deprecation. Existing tests mix pure logic, mocks (scan lifecycle DNS/TLS/headers and LLM failure), TestClient/SQLite integration, real DNS/HTTP and live local EVM. Blockchain tests require an already deployed registry. They do not prove live LLM quality, transport-level SSRF safety, full canonicalization, full report coverage, accessibility compliance or production scalability.

## Confirmed findings and recommended fixes

### H1 — HIGH: DNS validation does not constrain actual connections (SSRF)

**Files:** backend/app/utils/security.py:55,110; backend/app/services/headers_checker.py:47,57; backend/app/services/ssl_checker.py:19.  
**Evidence:** controlled resolver returned a public IP during the per-hop guard and 127.0.0.1 during httpx connection. Auditor's local HTTP server received `/audit-only`; checker returned HTTP 200 with `suspicious_redirect=false`. Two resolver calls recorded in audit-probes.json. TLS independently calls create_connection with hostname and user-controlled port, without pinning the prior validated IP.  
**Impact:** an untrusted domain can cause requests to internal services, including after a redirect, despite the advertised guard.  
**Fix:** resolve once per connection/hop, reject every non-global result, connect to an approved IP with correct Host/SNI, verify peer address, disable untrusted proxy resolution and revalidate redirects. Add actual transport regression tests.

### H2 — HIGH: Report hash omits real evidence fields

**Files:** backend/app/services/canonical_hasher.py:80,86,93,110,128; backend/app/schemas/scan.py; backend/app/api/scam.py:69.  
**Evidence:** extractor expects `findings`, `threat_intelligence`, `security_headers`, `dns.resolution_status`, while actual reports contain `indicators`, `threat_intel`, `headers_analysis`, `dns_analysis`, `ssl_analysis`. Scam extractor reads `deceptive_tactics`, while output stores `tactics`. Independent probes changed DNS/TLS/headers/indicators/feed data and a scam tactic explanation; fingerprints remained identical.  
**Impact:** VERIFIED does not mean the full visible report is unchanged. Column values are hashed while detail APIs render report_data, so even duplicated score fields can diverge.  
**Fix:** define a versioned protected schema aligned with actual persisted reports; hash the same authoritative values rendered to users. Cover every promised field with mutation tests. Migrate/version existing commitments; do not silently alter canonical v1.

### H3 — HIGH: Unauthenticated data access and backend signing

**Files:** backend/app/api/scans.py:23,57,85; backend/app/api/scam.py:24,109,142; backend/app/api/blockchain.py:44; backend/app/main.py:29.  
**Evidence:** API endpoints use DB dependencies only; no authentication, ownership or rate-limit middleware. TestClient and demo browser create/read/register reports without credentials. Contract access control authenticates the backend wallet, not the API caller.  
**Impact:** exposed deployments permit reading potentially sensitive previews/reports, generating scans/LLM costs, database growth and use of the backend signer. CORS is not authorization.  
**Fix:** user authentication, report ownership checks, registrar API role, quotas/rate limits and bounded concurrency. Keep current demo bound to localhost.

### H4 — HIGH: HTTP bodies are unbounded

**File:** backend/app/services/headers_checker.py:31,57.  
**Evidence:** buffered `client.get` reads the entire body despite only needing headers; no byte/decompression cap. Five-second httpx timeout is an operation timeout, not an overall response budget.  
**Impact:** oversized or slowly streamed responses can exhaust memory/workers; missing rate limits amplify exposure. No denial-of-service load was run.  
**Fix:** HEAD with bounded streamed GET fallback, maximum bytes, redirect/time budget and concurrency limits; move blocking initial DNS off the event loop.

### H5 — HIGH: Signing lacks network and contract identity enforcement

**Files:** backend/app/services/blockchain_service.py:51,63,229; backend/app/core/config.py:63-70.  
**Evidence:** ABI metadata address overrides configured address. Transactions use `w3.eth.chain_id` without comparing it to configured 31337. Connection status can be true when contract calls fail. Default signer is the publicly known Hardhat development key; this report does not reproduce it.  
**Impact:** accidental use of the wrong RPC/address or deploying with a public development key can invalidate trust and compromise funded signer control. No public-network transaction was attempted.  
**Fix:** fail closed on expected chain, deployed bytecode and registrar permission; honor explicit address configuration; prohibit development signer outside local environment; manage production keys separately.

### H6 — HIGH: Dependency advisory findings in blockchain toolchain

**Files:** blockchain/package-lock.json, blockchain/package.json.  
**Evidence:** saved npm advisory response reports 19 high-severity affected entries, including undici, ws, serialize-javascript, lodash, adm-zip and tmp, with propagated Hardhat/toolbox dependencies.  
**Impact:** build/development exposure depends on reachable code paths; package presence is not proof of exploitation of this application.  
**Fix:** review advisory URLs/ranges in saved JSON, update compatible toolchain in a separate change, rerun contract/deployment tests. Do not apply blind force-upgrades. Node 25 is also unsupported by this Hardhat installation.

### M1 — MEDIUM: RFC 8785 claim is false

**File:** backend/app/services/canonical_hasher.py:36-44.  
**Evidence:** Python json.dumps emits `1.0`, `-0.0`, accepts `NaN`, and sorts Unicode keys by code point rather than UTF-16 units. Independent vectors saved. JCS requires ECMAScript number serialization, nonfinite rejection and UTF-16 property ordering. [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785).  
**Impact:** independent implementations can disagree; current simple integer/string payloads may remain repeatable locally.  
**Fix:** use a validated JCS implementation and official conformance vectors, or accurately label the custom algorithm and version it.

### M2 — MEDIUM: Synthetic indicators presented as database telemetry

**Files:** backend/app/services/relationship_engine.py:156,832,912; backend/app/api/dashboard.py:57.  
**Evidence:** get_top_recurring_indicators forces `include_demo=True`. Fresh empty DB returned zero scans/scams/registrations but **three indicators**. Counts capped to 100 indicators from a 200-report graph are not global counts.  
**Impact:** misleading dashboard/recurrence statistics and synthetic drilldown contamination.  
**Fix:** exclude demo nodes by default, expose provenance, separate fixture mode, compute true aggregate counts. Original DB held 81 scans/209 scam reports/12 registrations at read time; 17 scan domains matched test fixtures and all 209 scam analyses were fallback. These are not verified real-world incident volumes.

### M3 — MEDIUM: Unavailable checks can produce false reassurance

**File:** backend/app/services/risk_engine.py:279-289.  
**Evidence:** DNS `unavailable` plus unavailable TLS/HTTP produced `Low Risk`, score 0, and summary claiming valid certificates. DNS `failed` tests correctly produce Inconclusive for otherwise benign URLs; those tests do not cover unavailable checks.  
**Fix:** distinguish unknown/unavailable from negative evidence and valid TLS; downgrade confidence and use Inconclusive when checks cannot support a verdict.

### M4 — MEDIUM: Normalization and redirects inspect a different target

**Files:** backend/app/utils/security.py:123-126; backend/app/services/headers_checker.py:70-83.  
**Evidence:** `https://example.com:8443/path?token=demo` becomes `https://example.com/path`, while TLS still uses port 8443. IPv6 brackets are lost. Relative redirects use string concatenation rather than urljoin; protocol-relative and path-relative targets are mishandled; domain comparison uses substring containment. Invalid textual port returns HTTP 500.  
**Fix:** reconstruct validated URL with port/query/brackets, explicit scheme/credential policy, standard redirect resolution and exact domain rules; validation errors should be 4xx.

### M5 — MEDIUM: IPv6 filtering is incomplete

**File:** backend/app/utils/security.py:35-41.  
**Evidence:** is_ip_blocked returns false for `::ffff:127.0.0.1`, `::` and `ff02::1`. Direct IPv6 HTTP URLs have a separate normalization defect; hostnames resolving to these values still bypass the filter.  
**Fix:** normalize IPv4-mapped IPv6, reject non-global addresses across both families and test mixed DNS answers.

### M6 — MEDIUM: Persistence and health failures are hidden

**Files:** backend/app/services/investigation_orchestrator.py:140; backend/app/api/scam.py:103; backend/app/api/dashboard.py:77; backend/app/core/database.py:87.  
**Evidence:** failed commits are rolled back and discarded while returning 201; list errors return empty arrays, dashboard errors return zeros, and health reports SQLite connected without querying SQLite.  
**Impact:** users can believe evidence was saved or service healthy when it was not.  
**Fix:** explicit persistence/error state, fail readiness when DB unusable, durable retry policy, probe active engine, avoid treating errors as empty telemetry.

### M7 — MEDIUM: Incomplete migrations and unreliable startup

**Files:** backend/alembic/versions/669746d85f68_create_scam_analysis_records.py:21; backend/app/core/database.py:53; start_demo.sh:39,50,60,89-100; docker-compose.yml.  
**Evidence:** empty migration; create_all builds tables outside migration history. Script skips deployment whenever a stale deployment.json exists, does not verify code/chain/registrar, uses curl without HTTP failure checking, prints success unconditionally and may install packages. Compose only runs DB, with published port/default demo password; no application Dockerfile exists.  
**Fix:** complete migrations, explicit dependency/bootstrap commands, bounded readiness polling and nonzero failure exit, verify live contract, full deployment configuration and private DB binding. No production/container certification from this audit.

### M8 — MEDIUM: Blockchain reconciliation gaps

**File:** backend/app/services/blockchain_service.py:176,217,328,386-431.  
**Evidence:** cached matching DB registration returns confirmed without querying chain. Verification relies on off-chain registration and treats a zero on-chain record as MISMATCH instead of NOT_REGISTERED. Chain resets/redeployments can therefore produce misleading statuses. Nonce selection and DB commit are not a coordinated transaction; concurrency can collide and chain success plus DB failure can lose provenance.  
**Fix:** reconcile chain identity/existence/receipts, inspect returned zero timestamp/version, query on-chain versions, serialize signer nonce allocation and persist transaction state before/after submission. Concurrent failure behavior is a source-level concern, not a load-tested exploit.

### M9 — MEDIUM: Sensitive input and provider URLs can enter logs/storage

**Files:** backend/app/main.py:54; backend/app/api/scam.py:54; backend/app/services/llm_analyzer.py:67,80; backend/app/services/threat_intel.py:122.  
**Evidence:** validation logs serialize errors including input; previews merely truncate/flatten rather than redact OTPs or account details. Gemini API key is embedded in request URL; httpx info/error logging can include the URL, especially in DEBUG mode. No real provider key was present or leaked in this audit.  
**Fix:** redact inputs/credential query parameters, minimize transcripts, retention/deletion controls, safe structured errors/logging. Hashing is not encryption or an absolute privacy guarantee for guessable data.

### M10 — MEDIUM: LLM configuration and prompt defenses overstated

**File:** backend/app/services/llm_analyzer.py:52-74,82-104.  
**Evidence:** provider selection ignores LLM_PROVIDER, prefers any Gemini key even if provider='none', and uses one default Gemini model name for the OpenAI path. Fallback model text says no key configured even on timeout. Gemini combines instructions and unescaped user tags in a single text payload.  
**Impact:** unintended provider calls/expense or broken OpenAI configuration; delimiters are not a security sandbox. Actual prompt injection susceptibility remains untested because no live model was configured.  
**Fix:** honor provider/none and model per provider, separate instruction roles, validate entire response, preserve deterministic safety guidance, adversarial evaluation with authorized provider access.

### M11 — MEDIUM: Incident guidance has unsupported absolute language

**File:** backend/app/services/safety_guidance.py:51,55,131.  
**Evidence:** invented 'local thresholds' qualifier for police reporting, absolute 'no compromise has occurred', and 'UPI PIN ALWAYS debits' wording. PINs also authenticate balance queries, as described by [IDBI's own banking instructions](https://www.idbi.bank.in/idbi-bank-mobile-banking-ussd.aspx).  
**Fix:** remove absolute reassurance and threshold qualifier; explain that receiving money does not require approving a payment or sharing a PIN. Keep immediate bank/payment-provider contact, 1930 and cybercrime.gov.in, with no recovery promise. The [MHA reporting portal](https://mrm-ncrp.mha.gov.in/restoration/) confirms these reporting channels. Core urgent reporting and no-guarantee language already exist.

### L1 — LOW: Integration stubs and documentation overclaims

**Files:** backend/app/services/threat_intel.py:163-177; README.md; docs/PRESENTATION.md; docs/DEMO_VIDEO_STORYBOARD.md:33-35; docs/ARCHITECTURE.md:92.  
**Evidence:** PhishTank and VirusTotal return unavailable without performing lookups; VirusTotal details misleadingly say integration active. Provider status is not falsely clean. Storyboard hardcodes 88/100 and a four-day certificate without current evidence; deck calls XML tags sandboxing and startup verified in under three seconds. No literal 'Production Ready' button was found in frontend source, but enterprise/strict-security claims are unsupported.  
**Fix:** label stubs and update docs from observed results. Avoid promising a predetermined scan verdict; repair local file:// links, Node version guidance and claimed missing Dockerfile/license artifacts.

### L2 — LOW: Accessibility and contract administration polish

**Files:** frontend/src/components/BlockchainTrustCenter.tsx:264-275; blockchain/contracts/CyberTrustReportRegistry.sol:305-311.  
**Evidence:** UUID label not programmatically associated with its input. Initial browser checks found no unnamed buttons, but this is not WCAG testing. Ownership transfer leaves old owner authorized as registrar by design of the mapping. Same hash can be registered again at a greater version; first version may be zero; history stores hashes only, with full changes in events.  
**Fix:** accessible input name and keyboard/focus checks; document ownership-versus-registrar semantics and optionally revoke old registrar atomically; define version/duplicate policy and test it. No unauthorized direct contract registration or reentrancy path was found in inspected code.

## AI, security and deployment conclusions

SQLAlchemy parameter binding/select expressions are used; no confirmed SQL injection found. React renders submitted values as text; no dangerouslySetInnerHTML/eval sink found. This is not an exhaustive XSS proof; validate outbound provider reference URLs. Default CORS has explicit localhost origins, not wildcard origins; permissive methods/credentials do not fix missing API authorization. Root DEBUG defaults true and error endpoints can expose exception strings. No private environment file is tracked in the inspected index; the known public local signer and default DB password are development defaults, not secure production credentials. A full historical secret scan was not performed.

Financial-fraud messages contain personal data and must not become public telemetry. Local sample data has no production consent/retention model. The original SQLite DB is ignored by Git, but tests normally use it unless environment overrides are supplied; isolate tests permanently. Existing UI buttons inspected have handlers/navigation; primary scanner and tested navigation work. Full assistive-technology, all error-state, long-duration load and mobile interaction testing remain outstanding.

Local Hardhat is a resettable, single-host EVM demonstration network. SHA-256 commitments prove equality of selected fields to a recorded fingerprint, not truth, authenticity of original claims, attacker attribution or public decentralized immutability. Receipts are checked for status 1, but network/contract identity and report coverage need fixes. A production build is a compilation result, not production readiness.

## Prioritized handoff to Antigravity

1. **Before exposure:** fix and regression-test H1/H4/H5; introduce API authentication, authorization and quotas (H3). Do not publish current backend.
2. **Before broad integrity claims:** fix protected-field schema and source-of-truth mismatch (H2), then canonicalization/versioning (M1) and chain reconciliation (M8).
3. **Before judge-facing claims:** separate demo metrics (M2), classify unavailable checks honestly (M3), correct provider labels and scripted scan numbers (L1).
4. **Before deployment:** real migrations/startup validation (M7), persistence/health errors (M6), advisory review (H6), privacy/logging (M9), stable supported runtimes and lockfiles.
5. **Before enabling live AI:** correct provider routing/models, assess prompt injection and privacy, verify credentials without logging them (M10).
6. Correct URL/IPv6 behavior, guidance absolutes and accessibility items. Add tests that fail on each independent reproduction, including real socket destination checks and every protected-field mutation.

## Hackathon decision

**CONDITIONAL GO** only for a local, supervised demonstration using safe inputs and explicit limitations. Show real URL evidence, deterministic Scam DNA, graph correlations without attribution, and actual score-change hash mismatch on local Hardhat. Disclose that the current hash omits some report evidence; do not call this full-report integrity protection. Show no invented AI/feed verdicts or guaranteed threat detection. **NO-GO for public production deployment** until the HIGH issues and release controls are addressed.

Audit saved before starting video asset capture/production. Subsequent media evidence and QA are documented separately in VIDEO_QA_REPORT.md and FINAL_DELIVERY_REPORT.md.

## Post-audit evidence notes

The cached Hardhat build-info was subsequently checked: Solidity `0.8.24+commit.e11b9ed9` input exactly matches the current CyberTrustReportRegistry.sol source (`compiled-source-check.json`). Tests used `--no-compile` to reuse that verified artifact without dependency downloads. Installed Vite declares Node `^20.19.0 || >=22.12.0`; README Node 18 guidance is incompatible.

Fresh capture subsequently verified graph edge selection/evidence, Scam DNA score 100 on a labeled synthetic KYC input, incident guidance interaction, registration, unchanged verification, and controlled tamper mismatch. The demo registration receipt was independently fetched: status 1, block 6, chain 31337. See capture-evidence.json and capture-details.log. No real-world scam-detection accuracy is inferred from this fixture.
