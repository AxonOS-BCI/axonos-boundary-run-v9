# Release Notes — Boundary Run v9.0.1

## Summary

Boundary Run v9.0.1 is the security and determinism hardening release for the new `axonos-boundary-run-v9` repository.

It fixes the v9.0.0 release blockers found in audit:

- SHA-256 proof hash via Web Crypto API / Node crypto fallback.
- Replay-based proof verification, not only static hash comparison.
- Stable Boundary weather is reachable.
- Integer-only gameplay progression for deterministic distance and spawn logic.
- Explicit seed validation.
- Explicit maximum of two delivery contracts.
- Jump and duck are mutually exclusive.
- Collision window is normalized to logical canvas width.
- Mobile touch handlers prevent page scrolling.
- CSP added to `index.html`.
- CI/CD release gates added and expanded.
- Accessibility baseline: canvas label, ARIA live status, region labels, screen-reader status node.

## Release posture

- Educational simulation only.
- Not a medical device.
- No real neural data.
- No telemetry.
- No backend.
- No service worker in v9.0.1.

## Verification

```bash
bash scripts/build_web.sh dist
python3 tools/boundary_run_audit.py
node qa/boundary-run-static-smoke.mjs
```

Expected output:

```text
Build OK: Boundary Run v9.0.1 -> dist
Audit OK: v9.0.1 security, deterministic hardening, CI/CD and no stale markers
Smoke OK: v9.0.1 proof replay, contracts, seed validation, weather reachability
```
