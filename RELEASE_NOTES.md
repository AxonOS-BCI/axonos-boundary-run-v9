# Release Notes — Boundary Run v9.0.2

## Summary

v9.0.2 fixes a replay-verification false negative. Movement commands (`left` / `right`)
were recorded twice per key press, so re-simulation moved the lane one step too far and
diverged from the live run — `verifyProof` then rejected even legitimate proofs with
"replay mismatch". Movement is now recorded exactly once in `action()`; `setLane` only
mutates state. Verification now passes for legitimate runs and still rejects forged
results via re-simulation.

Builds on v9.0.1 (SHA-256 `proof_hash` via Web Crypto with a Node fallback, stable key
ordering for hashing, and replay-based `verifyProof`).

## Release posture

- Educational simulation only.
- Not a medical device.
- No real neural data.
- No telemetry.
- No backend.
- No service worker in v9.0.2.

## Verification

```bash
bash scripts/build_web.sh dist
python3 tools/boundary_run_audit.py
node qa/boundary-run-static-smoke.mjs
```
