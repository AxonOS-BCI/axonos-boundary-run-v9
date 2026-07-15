# Release Notes — Boundary Run v9

## v9.4.0 — "Mastery"

The golden proofs now demonstrate mastery, and mastery is a CI invariant.

- **Golden vectors regenerated at S/A grade.** The committed replay proofs used
  to be four grade-D runs (two of them hit). The reference pilot now predicts
  sweeping-beam lanes at arrival time, holds its Audit Pulse for the phisher
  swarm, keeps consent above the Gate threshold, and counters what it cannot
  dodge: the new golden set is **S, S, A, A — every swarm cleared, every Gate
  passed clean**, top score 11,978, top combo 68.
- **Fairness is now a gate.** `qa/verify-vectors.mjs` requires at least one
  S-grade proof, two cleared swarms, a clean Gate, and three surviving runs in
  the golden set. If a balance change ever makes the top grade unreachable for
  the reference pilot, CI fails before it ships.
- **Engine untouched.** Byte-identical to 9.3.1 — all existing replays and
  proofs stay valid; the vectors are re-pinned to 9.4.0 as always.
- Grande-standard README: the full field manual — hazards and their counters,
  the ability economy, grading, contracts, the five acts, and the replay-proof
  architecture, each mapped to the BCI-safety concept it teaches.

## v9.3.1 — "Playable"

Phone-feel hotfix, driven by live-device autopsy of "the game is
uncontrollable":

- **Zoom was eating your taps.** The viewport allowed double-tap /
  pinch zoom, so rapid lane taps zoomed the page mid-run. Now
  `maximum-scale=1, user-scalable=no`, `touch-action: manipulation` on
  every button, and text selection disabled on the stage.
- **Abilities fire on PRESS.** The five ability buttons moved from
  click (release) to pointerdown — panic taps land the instant your
  finger does.
- **Wider tap forgiveness.** Lane taps accept up to 18 px of finger
  roll and 350 ms; side zones widened to 42 %.
- **Page locked while playing.** html/body scroll and overscroll are
  disabled during a run; pads respect the safe-area inset.
- Contract chips now rebuild per run and show correct tooltips
  (array-lookup bug); the procedural portrait is injected without
  innerHTML (family zero-innerHTML standard restored).

## v9.3.0 — "Human Pace"

Played-honest release: v9.2.0 was tuned against a 1-tick-reaction pilot bot,
not a person. The math said so — a 9.3-second full run, 167 ms spike windows,
a formation every 0.3–0.5 s. v9.3.0 re-times the whole world for humans and
fixes every fairness flaw the instrumented autopsies surfaced.

- **Pacing:** run 9 s → 60–75 s (five ~14 s acts); world speed ÷1.9; jump
  150 → 417 ms with tail re-trigger (bunny-hop); ability windows rescaled;
  weather/latency pressures re-priced per RUN (Boundary Erosion alone was
  silently costing 77 integrity on the longer track).
- **Fairness by construction:** corridor invariant (formation gaps chosen
  from actual occupancy; saturated window degrades to a breather token),
  near-uniform speeds (variance ±24 — corridors stay open downstream), one
  sweeping beam at a time, swarm as a pure learnable rhythm wave.
- **Set-piece truths:** an Audit fired INTO a swarm locks on for the whole
  wave (520 ticks) — "save your Audit for the swarm" is now literal; the
  Guardian Gate is the true final boss — beyond it, a shard-rain victory lap.
- **Kibo's Last Spark:** one clutch auto-shield per run at integrity ≤ 15.
- **Recovery windows:** integrity trickles back after 1.5 s clean flight;
  leakage disperses slowly; hit costs re-priced for a marathon.
- **Controls, third pass:** swipes fire on threshold and always beat
  side-taps; taps resolve on release; pads enlarged; visual lane response
  snappier; hit-stop + chromatic flash on damage.
- **Graphics:** parallax data columns, running lane chevrons with an
  under-Ari glow, banking/landing squash/flow ghosts, combo aura, sector
  vignette groundwork.
- **Interest:** named sectors, live contract chips in the HUD, branch
  banners that explain their trade, death cause + tactical tip and
  "S missed: …" reasons on the report.
- **Integrity:** golden vectors regenerated for the new timings (2 full
  survivals incl. swarm-cleared + gate-clean; 2 deterministic deaths as
  negative coverage); the smoke harness now runs to completion (its old
  1 880-tick window silently assumed sprint-length runs).

## v9.2.0 — "Flow & The Gate"

The gameplay-depth release. The engine changes, so **replay proofs move to
version 3**; proofs recorded on ≤ 9.1.0 no longer verify (the verifier says
so explicitly). Four golden vectors are committed under `qa/vectors/` and a
new CI gate re-simulates them byte-identically on every push.

**New in the simulation (all integer-deterministic):**
- Five-sector difficulty script: spawn interval 56→34 ticks, hazard speed
  +0→+160 centi-px/tick across the run.
- Pattern spawner: spike fences, leak walls with a token in the gap,
  key-behind-spike risk/reward, shard arcs, telegraphed sweeping beams
  (48–60-tick warning, then lane-hunting).
- Flow combo & grazes: adjacent-lane passes and skill-saves feed a combo;
  combo ≥ 5 pays bonus shards; a hit resets it; `combo_max × 15` and
  `grazes × 4` join the score.
- Ability economy: Audit → 2 s pulse / 5 s cooldown; Revoke → 2.5 s
  cooldown, cleanses consent drain; Throttle → 1.5 s slow-window / 6 s
  cooldown at +8 latency; Quarantine → 2 charges arming a catch window;
  Seal window 90 ticks. Cooldown no-ops are not recorded into proofs.
- Set-pieces: **Phisher Swarm** (weave or Audit-pulse; cleared = +30
  shards) and the **Guardian Gate** consent scan at 88 % (clean with
  consent ≥ 60 or a live pulse; forced otherwise). The gate's speed is
  derived from the remaining track so it arrives on every seed and
  branch, and it ignores Throttle — the Guardian's scan is not yours to
  slow.
- Consent drain after a stale-consent hit (−1/30 ticks until Revoked);
  grade **S** above A for flawless flow.
- Result gains `combo_max`, `grazes`, `sector_reached`, `swarm`, `gate`.

**Presentation:** telegraph strips with ⚠ before off-screen threats, the
Gate portal with scan lines, an on-canvas ×FLOW meter, sector / swarm /
gate banners, arpeggio + hats music layers driven by combo and sector,
cooldown overlays and charge badges, S-grade medallion, set-piece lines
in the report.

**Integrity:** CI pins actions by full SHA and gains the golden-vector
re-simulation gate; a Release workflow now publishes a GitHub Release
from every pushed `v*` tag.

---

## v9.1.0 — presentation overhaul (previous release)

### Summary

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

### Release posture

- Educational simulation only.
- Not a medical device.
- No real neural data.
- No telemetry.
- No backend.
- No service worker in v9.1.0.
- Replay-compatible with v9.0.2 proofs (engine byte-identical).

### Verification

```bash
bash scripts/build_web.sh dist
python3 tools/boundary_run_audit.py
node qa/boundary-run-static-smoke.mjs
```

---

# Release Notes — Boundary Run v9.0.2

### Summary

v9.0.2 fixes a replay-verification false negative. Movement commands (`left` / `right`)
were recorded twice per key press, so re-simulation moved the lane one step too far and
diverged from the live run — `verifyProof` then rejected even legitimate proofs with
"replay mismatch". Movement is now recorded exactly once in `action()`; `setLane` only
mutates state. Verification now passes for legitimate runs and still rejects forged
results via re-simulation.

Builds on v9.0.1 (SHA-256 `proof_hash` via Web Crypto with a Node fallback, stable key
ordering for hashing, and replay-based `verifyProof`).

### Release posture

- Educational simulation only.
- Not a medical device.
- No real neural data.
- No telemetry.
- No backend.
- No service worker in v9.0.2.

### Verification

```bash
bash scripts/build_web.sh dist
python3 tools/boundary_run_audit.py
node qa/boundary-run-static-smoke.mjs
```
