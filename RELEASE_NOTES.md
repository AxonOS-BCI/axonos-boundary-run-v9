# Release Notes — Boundary Run v9.1.0

## Summary

v9.1.0 is a presentation overhaul. The simulation engine and `verifyProof` are
byte-identical to v9.0.2 — every improvement lives in the presentation layer — so
replay proofs verify across v9.0.2 and v9.1.0 in both directions.

- **Fixed-timestep loop.** The sim advances at 120 ticks per second of wall time with
  render interpolation. The game now plays identically on 60, 90, 120 and 144 Hz
  displays; previously game speed scaled with the display refresh rate.
- **Player moral choice.** Safe / Fast / Audit is now an on-screen mid-run decision.
  If the player doesn't choose, the deterministic seed pick from v9.0.x remains as the
  fallback. Both paths record the choice into the replay proof exactly as before.
- **Rebuilt renderer.** Parallax starfields, nebulae, perspective floor, energy-conduit
  lanes, redesigned Ari and Kibo, telegraphed hazards (beam columns = duck, floor
  spikes = jump), particle bursts, screen shake, hit flash, dodge-streak toasts.
- **Procedural WebAudio.** Ambient pad and event sounds synthesized locally, zero
  assets, mute toggle (M). No network use.
- **UX.** Pause (P/Esc/button, auto-pause on tab switch), HUD stat bars with pulses,
  contextual ability hints, weather chips, redesigned menu and report. Session best is
  kept in memory only — nothing is written to the device.

## Release posture

- Educational simulation only.
- Not a medical device.
- No real neural data.
- No telemetry.
- No backend.
- No service worker in v9.1.0.
- Replay-compatible with v9.0.2 proofs (engine byte-identical).

## Verification

```bash
bash scripts/build_web.sh dist
python3 tools/boundary_run_audit.py
node qa/boundary-run-static-smoke.mjs
```

---

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
