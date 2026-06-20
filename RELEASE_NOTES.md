# Release Notes — Boundary Run v9.0.0

## Summary

Boundary Run v9.0.0 is a clean full release for the new `axonos-boundary-run-v9` repository. It implements the first v9 foundation layer: deterministic seed levels, delivery contracts, moral branch choices, neural weather indicators, enhanced replay proof v2, and procedural proof portrait.

## Release posture

- Educational simulation only.
- Not a medical device.
- No real neural data.
- No telemetry.
- No backend.
- No service worker in v9.0.0.

## Verification

```bash
bash scripts/build_web.sh dist
python3 tools/boundary_run_audit.py
node qa/boundary-run-static-smoke.mjs
```
