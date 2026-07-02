<div align="center">

# Boundary Run v9 — The Little Signal

**An AxonOS Education browser game about cognitive privacy, consent, and deterministic replay proof.**

[![play](https://img.shields.io/badge/play-now-6af6ff)](https://axonos-bci.github.io/axonos-boundary-run-v9/?v=910)
[![release](https://img.shields.io/badge/release-v9.1.0-6af6ff)](https://github.com/AxonOS-BCI/axonos-boundary-run-v9/releases)
[![license](https://img.shields.io/badge/license-Apache--2.0_OR_MIT-blue)](#license)
[![replay](https://img.shields.io/badge/replay_proof-SHA--256_verified-2ea44f)](#verify)
[![telemetry](https://img.shields.io/badge/telemetry-none-2ea44f)](#privacy-and-safety)
[![deps](https://img.shields.io/badge/runtime_deps-0-2ea44f)](#what-it-is)

One click. No install. No backend. No telemetry.

</div>

---

## What it is

**Boundary Run v9** is an AxonOS Education browser serious game about cognitive privacy, safe intent, consent, deterministic replay proof, and privacy-by-design tradeoffs. It is plain vanilla JavaScript with zero runtime dependencies.

You guide **Ari**, a small safe-intent courier, through a neural boundary field. Kibo, the guardian companion, warns you about raw signal leaks, stale consent gates, artifact spikes, and unsafe stimulation beams.

Ari is not carrying a thought. Ari is carrying a choice.

> Protect the choice. Protect the person.

## Features

- Seeded deterministic level generation.
- Delivery Contracts: Zero Trust, Minimal Surface, No Throttle, Full Audit, Sealed Envelope.
- Neural Weather indicators.
- Moral branch lanes — Safe, Fast, and Audit — chosen by the player mid-run (v9.1.0); if no choice is made, the run seed decides deterministically. Either way the choice is recorded into the replay proof.
- Enhanced Replay Proof v2: a SHA-256 proof verified by re-simulation — re-running the recorded seed and inputs reproduces the exact result, so a score cannot be claimed unless its inputs actually produce it.
- Deterministic procedural final portrait.
- Copy-proof button.
- Static browser build — no telemetry, no backend, no service worker in v9.1.0.

## What's new in 9.1.0

- **Fixed-timestep simulation loop.** The sim now always advances at 120 ticks per second of wall time with render interpolation, so the game plays identically on 60, 90, 120 and 144 Hz displays. Previously the speed scaled with the display refresh rate.
- **Player moral choice.** The Safe / Fast / Audit branch is now a real mid-run decision with an on-screen prompt; the deterministic seed pick remains as the fallback if you don't choose.
- **Rebuilt renderer.** Parallax starfields, drifting nebulae, perspective floor grid, energy-conduit lanes, redesigned Ari (Intent Spark, scarf, trail, shield bubble) and Kibo, distinct telegraphed hazard designs (beams say duck, spikes say jump), particles, screen shake, hit flash, dodge-streak toasts.
- **Procedural audio.** A WebAudio synth (zero assets, generated locally) adds an ambient pad and event sounds, with a mute toggle (M).
- **Premium UX.** Pause (P/Esc, auto-pause on tab switch), stat bars with damage/heal pulses, contextual ability hints, weather chips, redesigned menu and report screens with session best (kept in memory only — nothing is stored).
- **Replay-compatible with 9.0.2.** The simulation engine and `verifyProof` are byte-identical to v9.0.2, so proofs verify across both versions in both directions.

## Play

**[▶ RUN GAME — PLAY NOW](https://axonos-bci.github.io/axonos-boundary-run-v9/?v=910)**

## Controls

| Action | Keyboard | Mobile |
|---|---|---|
| Move left/right | ← / → or A / D | Swipe left/right |
| Jump | ↑ or W | Swipe up |
| Duck | ↓ or S | Swipe down |
| Audit | 1 | Button |
| Revoke | 2 | Button |
| Throttle | 3 | Button |
| Seal Vault | 4 | Button |
| Quarantine | 5 | Button |

## Local run

```bash
bash scripts/build_web.sh dist
python3 -m http.server 8080 -d dist
```

Open `http://127.0.0.1:8080`.

## Verify

```bash
bash scripts/build_web.sh dist
python3 tools/boundary_run_audit.py
node qa/boundary-run-static-smoke.mjs
```

The static smoke check re-simulates a recorded proof and confirms that a tampered result is rejected.

## Privacy and safety

Educational simulation only. Not a medical device. No real neural data is collected. No analytics. No telemetry. No backend.

## Support / Donations

If you want to support AxonOS Education development:

```text
Dogecoin: DMwHAhqVNWf7dyEznukxCufNS5rjuP5MTp
```

Donations are optional and do not unlock gameplay advantages.

## License

Copyright © 2026 The AxonOS Project / Denis Yermakou.

Apache-2.0 OR MIT unless otherwise stated. See `LICENSE`, `LICENSES/`, `COMMERCIAL_LICENSE.md`, and `THIRD_PARTY_NOTICES.md`.

axonos.org · connect@axonos.org · security@axonos.org
