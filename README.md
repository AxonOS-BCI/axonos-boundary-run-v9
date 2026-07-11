<div align="center">

# Boundary Run v9 — The Little Signal

**An AxonOS Education browser game about cognitive privacy, consent, and deterministic replay proof.**

[![play](https://img.shields.io/badge/play-now-6af6ff)](https://axonos-bci.github.io/axonos-boundary-run-v9/?v=931)
[![release](https://img.shields.io/badge/release-v9.3.1-6af6ff)](https://github.com/AxonOS-BCI/axonos-boundary-run-v9/releases)
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

- **Playable on phones.** Pinch/double-tap zoom is disabled during play, every ability fires on *press* (not release), tap windows widened, page scroll locked while running, and safe-area-aware pads.
- **Human pacing.** A full run is now a ~60–75 s five-act arc (was a 9-second blur): objects cross the screen in 1.7–2.4 s, a jump lasts 417 ms, and integrity slowly regenerates in clean-flight windows. Weather and ambient pressures are priced per run, not per tick.
- **A field that never lies.** The spawner enforces a corridor invariant — every formation's gap is chosen from actual lane occupancy, speeds are near-uniform so gaps stay open downstream, and only one sweeping beam exists at a time. If the window saturates, you get a breather token instead of a wall.
- **Kibo's Last Spark.** Once per run, at the edge of collapse, Kibo burns everything into one second of shield. Make the clutch count.
- **Beyond the Gate: the victory lap.** The Guardian Gate is the true final boss — pass its consent scan and the boundary opens: shards and tokens rain to the finish.
- **Controls, third pass.** Swipes fire the instant a threshold is crossed and always beat side-taps; taps resolve on release; bigger on-screen pads; keyboard ignores autorepeat.
- **Five sectors of rising pressure.** Spawn density and hazard speed escalate act by act, all derived from the seed — every run is a full arc, not a flat corridor.
- **Authored hazard formations.** Spike fences with one gap, leak walls hiding a consent token in the safe lane, a vault key guarded by a spike, shard arcs that reward weaving — and **telegraphed sweeping beams** that announce their lane before they launch, then hunt across lanes.
- **Flow combo & grazes.** Shaving past a hazard one lane away, or beating it with a jump/duck/seal, feeds a ×flow combo that pays real score and bonus shards. One hit resets it. Risk is the reward.
- **Ability economy.** Audit is now a timed *pulse* on a cooldown, Quarantine carries two charges, Throttle opens a slow-time window at a latency price, Revoke cleanses consent drain. Tactics, not checkboxes — and cooldown no-ops are never written into the proof.
- **Two set-pieces.** A mid-run **Phisher Swarm** you weave through or Audit-pulse open, and a finale **Guardian Gate** consent scan: arrive with consent in order (or a live pulse) and pass clean; arrive without it and the gate is forced.
- Seeded deterministic level generation with a daily seed.
- Delivery Contracts: Zero Trust, Minimal Surface, No Throttle, Full Audit, Sealed Envelope.
- Neural Weather indicators.
- Moral branch lanes — Safe, Fast, and Audit — chosen by the player mid-run; if no choice is made, the run seed decides deterministically. Either way the choice is recorded into the replay proof.
- **Replay Proof v3**: a SHA-256 proof verified by full re-simulation — re-running the recorded seed and inputs reproduces the exact result, so a score cannot be claimed unless its inputs actually produce it. Four **golden vectors** are committed and re-simulated byte-identically in CI on every push. (Proof v2 from ≤ 9.1.0 is politely rejected with guidance.)
- Deterministic procedural final portrait, S-grade tier for flawless flow, layered procedural soundtrack that intensifies with your combo.
- Static browser build — no telemetry, no backend, no service worker.

## What's new in 9.1.0

- **Fixed-timestep simulation loop.** The sim now always advances at 120 ticks per second of wall time with render interpolation, so the game plays identically on 60, 90, 120 and 144 Hz displays. Previously the speed scaled with the display refresh rate.
- **Player moral choice.** The Safe / Fast / Audit branch is now a real mid-run decision with an on-screen prompt; the deterministic seed pick remains as the fallback if you don't choose.
- **Rebuilt renderer.** Parallax starfields, drifting nebulae, perspective floor grid, energy-conduit lanes, redesigned Ari (Intent Spark, scarf, trail, shield bubble) and Kibo, distinct telegraphed hazard designs (beams say duck, spikes say jump), particles, screen shake, hit flash, dodge-streak toasts.
- **Procedural audio.** A WebAudio synth (zero assets, generated locally) adds an ambient pad and event sounds, with a mute toggle (M).
- **Premium UX.** Pause (P/Esc, auto-pause on tab switch), stat bars with damage/heal pulses, contextual ability hints, weather chips, redesigned menu and report screens with session best (kept in memory only — nothing is stored).
- **Replay-compatible with 9.0.2.** The simulation engine and `verifyProof` are byte-identical to v9.0.2, so proofs verify across both versions in both directions.

## Play

**[▶ RUN GAME — PLAY NOW](https://axonos-bci.github.io/axonos-boundary-run-v9/?v=931)**

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
