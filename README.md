<div align="center">

# Boundary Run v9 — The Little Signal

### A browser game about cognitive privacy — where every run ends in a cryptographic proof.

**Ari is not carrying a thought. Ari is carrying a choice.**
*Protect the choice. Protect the person.*

[![play](https://img.shields.io/badge/▶_RUN_GAME-now-6af6ff?style=flat-square)](https://axonos-bci.github.io/axonos-boundary-run-v9/?v=950)
[![release](https://img.shields.io/badge/release-v9.5.0_·_In_Hand-6af6ff?style=flat-square)](RELEASE_NOTES.md)
[![replay](https://img.shields.io/badge/Replay_Proof-SHA--256_·_re--simulated_in_CI-2ea44f?style=flat-square)](#-replay-proof--every-run-is-a-verifiable-artifact)
[![fairness](https://img.shields.io/badge/fairness-S_grade_reachable_·_CI_invariant-2ea44f?style=flat-square)](#-fair-by-construction--and-provably-so)
[![telemetry](https://img.shields.io/badge/telemetry-none-2ea44f?style=flat-square)](#-privacy-and-safety)
[![deps](https://img.shields.io/badge/runtime_deps-0-2ea44f?style=flat-square)](#-architecture)
[![license](https://img.shields.io/badge/license-Apache--2.0_OR_MIT-blue?style=flat-square)](#-license)

One click. No install. No backend. No account. **No telemetry.**

</div>

---

## 🧠 What this is

**Boundary Run v9** is an AxonOS Education *serious game*: a three-lane boundary runner where every hazard is a real brain–computer-interface failure mode, every ability is a real defense, and every finished run emits a **deterministic, SHA-256-sealed replay proof** that anyone can re-simulate byte-for-byte. It is one HTML page of vanilla JavaScript — zero runtime dependencies, a strict Content-Security-Policy, and an engine that is pure integer math.

You guide **Ari**, a small safe-intent courier, through a neural boundary field. **Kibo**, the guardian companion, calls out what's coming: raw signal leaks, stale consent gates, artifact spikes, unsafe stimulation beams, memory phishers. A full run is a **2–3½ minute, five-act arc** (track length and weather derive from the seed; your branch choice changes the pace). One life. One proof at the end.

> **Serious-game claim, honestly scoped:** this teaches *vocabulary and intuitions* — consent revocation, least surface, audit pulses, sealed envelopes — through mechanics that mirror the concepts. It is a game, **not a medical device**, and not a neurotech simulator.

---

## 🎮 The five acts

Pressure rises act by act — spawn cadence tightens, hazards accelerate. All of it derives from the seed: the same seed is the same run, forever.

| Act | Sector | Spawn cadence | Hazard speed | What changes |
|:--:|:--|:--:|:--:|:--|
| 1 | **PERIMETER** | every 128t | base | Singles and gentle formations — learn the counters |
| 2 | **CACHE ALLEY** | 116t | +25 | Formations arrive; vault keys appear behind risk |
| 3 | **PHISHER NETS** | 104t | +50 | **The Swarm** set-piece triggers here |
| 4 | **STIM FIELDS** | 94t | +75 | Sweeping beams and fences dominate |
| 5 | **GATE APPROACH** | 84t | +100 | Density peaks; the **Guardian Gate** rises at 88% |

*(t = engine ticks; 60 ticks ≈ 1 second. An object crosses the screen in roughly 4–7 s depending on act and branch.)*

---

## ⚔️ Threats and their counters — the field manual

Every hazard is a BCI failure mode. Every counter is the matching defense. Dodging is always legal; countering pays.

| Hazard | The failure mode it plays | Counter | On counter | On hit | The lesson |
|:--|:--|:--|:--|:--|:--|
| 🔴 **Raw Leak** | Unencrypted neural data leaving the boundary | **Seal** (vault key → 2.2 s shield) | +5 shards, combo +2 | −14 integrity, +13 leakage | Private data must stay sealed |
| 🟠 **Stale Consent** | A permission that outlived its grant | **Audit Pulse** | +2 consent, combo +1 | −8 integ, −11 consent, starts a 7 s **consent drain** | Consent expires; check it |
| ⬜ **Artifact Spike** | Noise masquerading as intent | **Jump** (0.83 s) | +2 shards, combo +2 | −8 integrity | Not every signal is intent |
| 🟣 **Unsafe Stim** | An out-of-envelope stimulation beam | **Duck** (0.92 s) | +2 integrity, combo +2 | −12 integrity | Stay inside the safety envelope |
| 🟡 **Unauthorized App** | A process that never had access rights | **Quarantine** (2 cells/run) | +4 shards, combo +2 | −8 integrity | Isolate what you didn't authorize |
| 🕳️ **Memory Phisher** | An extraction probe fishing for recall | **Audit Pulse** | +2 shards, combo +1 | −8 integrity | Expose the probe before it reads you |

Sweeping beams **telegraph** their lane for a second, then hunt across lanes on a fixed rhythm — the announcement is the tell. Only one sweep exists at a time, by construction.

---

## 🔋 The ability economy

Abilities are windows and cooldowns, not forever-flags. A call during cooldown is a deterministic no-op and is **not recorded** — proofs carry only effective inputs.

| Ability | Effect | Window | Cooldown / charges |
|:--|:--|:--:|:--:|
| **Audit Pulse** | Inspects every gate in reach; counters stale consent & phishers | 5 s — **8.7 s if fired into an active swarm** | 10 s |
| **Revoke** | +9 consent; kills an active consent drain at the source | instant | 5 s |
| **Throttle** | Slows all hazards to 60% — the boundary pauses to be checked | 4.3 s | 12 s |
| **Seal Vault** | 2.2 s shield that turns a raw leak into +5 shards | 2.2 s | costs a **vault key** (start with 2; more on the field) |
| **Quarantine** | Arms a cell that isolates an unauthorized app | 4.7 s | **2 cells per run** |
| **Jump / Duck** | Clears spikes / compresses under beams | 0.83 s / 0.92 s | tail re-trigger = bunny-hop skill |

**Kibo's Last Spark** — once per run, at the edge of collapse (integrity ≤ 15), Kibo burns everything into **one second of shield**. The clutch moment is a feature: make it count.

---

## 🌀 Flow, grazes, and the systems that pay skill

- **Flow combo** — countering hazards and shaving past them one lane away feeds a combo; at ×5 it starts paying bonus shards. One hit resets it to zero. Risk *is* the reward.
- **Grazes** — a live hazard crossing your band one lane away counts; each pays score and feeds the combo.
- **Recovery windows** — 3 s of clean flight starts a slow integrity trickle (+1/s). Tension breathes out, then back in.
- **The Branch** (at 46% of the track): **Safe Lane** (+8 integrity, slower), **Fast Lane** (+12 shards, −4 integrity, faster), **Audit Lane** (+1 audit credit). Speed, pressure, and score multiply differently down each.
- **The Swarm** (Act 3+) — eight memory phishers in a rhythm wave with a moving gap one step behind the pattern. Weave it, or fire an Audit Pulse *into* it for a full-pass lock. Clearing pays **+30 shards** and combo; getting hit marks the run.
- **The Guardian Gate** (at 88%) — the true final boss is a *consent scan*, not a wall. Arrive with an active Audit Pulse **or consent ≥ 60** → clean passage, +25 shards, and the boundary opens into a **victory lap** of shard rain to the finish. Arrive unprepared → the gate is forced: −10 integrity, +8 leakage, combo reset.

---

## 🏅 Grading — what an S actually requires

| Grade | Requirements |
|:--:|:--|
| **S** | integrity ≥ 96 · leakage < 6 · max combo ≥ 12 · Gate **not** forced · Swarm **not** hit · zero contract violations |
| **A** | integrity > 88 · leakage < 12 · zero contract violations |
| **B** | integrity > 70 · leakage < 35 |
| **C** | integrity > 45 |
| **D** | you finished. Kibo still believes in you |

**Score** = `shards×20 + integrity×8 + consent×4 + trust×3 + comboMax×15 + grazes×4 − leakage×12 − latency×2`, multiplied by your contract multipliers — and **cut to 62%** if you violated any contract you signed.

---

## 📜 Consent contracts — sign for multipliers, play by the rule

Optional self-imposed constraints, chosen before the run. Each is a real privacy-engineering discipline; each pays a multiplier; violating any one costs more than all of them pay.

| ID | Contract | The rule you sign | Mult | The discipline it teaches |
|:--:|:--|:--|:--:|:--|
| C-01 | **Zero Trust** | Never Revoke | ×1.4 | Once consent cannot be revoked, risk rises |
| C-02 | **Minimal Surface** | ≤ 3 center-lane crossings | ×1.3 | Less attack surface, fewer crossings |
| C-03 | **No Throttle** | Never Throttle | ×1.5 | No intervention: speed high, risk higher |
| C-04 | **Full Audit** | Audit every stale gate | ×1.6 | Every access request should be checked |
| C-05 | **Sealed Envelope** | Seal every raw leak | ×1.5 | Private data must stay sealed |

All five signed and honored: a **×6.55** score multiplier. Signed and broken: ×0.62 on everything.

---

## 🌦️ Weather — the seed's ambient pressure

One or two conditions per run, derived from the seed, priced per run:

| Weather | Effect |
|:--|:--|
| **Stable Boundary** | No ambient pressure — a clean read of the field |
| **Phishing Storm** | Phisher-heavy spawn table |
| **Boundary Erosion** | Slow ambient integrity decay |
| **Resonance Feedback** | Throttling leaks — intervention has a cost |
| **Stale Consent** | Periodic consent decay — keep revoking |
| **Data Gravity** | Shards pay ×3 — greed weather |

---

## 🎛️ Controls

| Input | Keyboard | Touch |
|:--|:--|:--|
| Move lane | ← / → or A / D | swipe left / right (fires the instant the threshold crosses; beats side-taps) |
| Jump / Duck | ↑ / ↓ or W / S | swipe up / down |
| Audit Pulse | **1** | on-screen pad |
| Revoke | **2** | pad |
| Throttle | **3** | pad |
| Seal Vault | **4** | pad |
| Quarantine | **5** | pad |
| Pause | P / Esc | ⏸ |
| Mute | M | 🔇 |

**Tap center of the field = Jump** — full one-thumb play. **Pressed slightly early?** Jump/Duck are buffered ~200 ms and fire the instant their window opens. **Ability buttons carry their own state** — a cooldown veil drains in real time; Seal/Quarantine show live charges.

Phone-first: pads *and the ability toolbar* fire on **press** (not release), pinch/double-tap zoom is disabled during play, page scroll is locked while running, pads are safe-area-aware, keyboard ignores autorepeat.

---

## 🔐 Replay Proof — every run is a verifiable artifact

When a run ends, the engine emits a **proof v3**: seed, contracts, the effective input log, and the full result — canonically serialized (sorted keys, integer state only) and sealed with **SHA-256**. Verification is *full re-simulation*: the verifier replays your inputs on a fresh engine and demands a byte-identical result.

```text
proof v3 = { version, release, seed, contracts, inputs[], result{…}, proof_hash = SHA-256(canonical) }
verify   = re-simulate(seed, contracts, inputs) → stableStringify(result) → hash must match
```

**Verify a proof yourself** (browser: paste into the *Verify* box; or headless):

```bash
git clone https://github.com/AxonOS-BCI/axonos-boundary-run-v9 && cd axonos-boundary-run-v9
node qa/verify-vectors.mjs        # re-simulates every committed golden proof
node qa/boundary-run-static-smoke.mjs
```

### The golden set — proofs of mastery, pinned in CI

Four reference runs are committed and **re-simulated byte-identically on every CI run**. Since v9.4.0 they demonstrate mastery, not survival:

| Vector | Contracts | Grade | Score | Combo | Swarm | Gate |
|:--|:--|:--:|:--:|:--:|:--:|:--:|
| `golden-alpha` | — | **A** | 7,689 | 28 | cleared | clean |
| `golden-audit` | C-04 Full Audit | **A** | 9,025 | 46 | cleared | clean |
| `golden-sealed` | C-05 Sealed Envelope | **S** | 8,883 | 39 | cleared | clean |
| `golden-flow` | — | **S** | **11,978** | **68** | cleared | clean |

---

## ⚖️ Fair by construction — and provably so

The field **cannot** assemble an unwinnable moment, and CI enforces it:

- **Corridor invariant** — every formation's gap is chosen from *actual lane occupancy* in the incoming window; a saturated window spawns a breather token instead of a wall.
- **Near-uniform flow** — hazard speed variance is ±24, so a gap that is open at spawn stays open downstream.
- **One sweep at a time** — sweeping beams are exclusive and always telegraphed.
- **The Gate always arrives** — its speed is derived from the remaining track, on every seed and branch; Throttle slows hazards, never the scan.
- **S is a CI invariant** — the reference pilot must reach grade **S** in the committed golden set. If a balance change ever makes the top grade unreachable, `qa/verify-vectors.mjs` fails *before it ships*. Fairness is not a promise; it's a gate.

---

## 🏗️ Architecture

| Property | How |
|:--|:--|
| **Deterministic engine** | Integer-only state; FNV-1a seeded streams; no `Math.random`, no wall-clock in sim |
| **Zero dependencies** | One page of vanilla JS; no framework, no build step, no service worker |
| **Strict CSP** | `Content-Security-Policy` pins scripts to self; no external requests at runtime |
| **Fixed timestep** | 60 ticks/s simulation under a decoupled render loop |
| **CI gates** | syntax → dist build → release audit → static smoke → **golden-vector re-simulation** |
| **Reproducible dist** | `scripts/build_web.sh` assembles `dist/` and greps it for stale markers |

```text
index.html · app.js · styles.css        the whole game
qa/make-vectors.mjs                     the S-capable reference pilot → golden proofs
qa/verify-vectors.mjs                   CI: byte-identical re-simulation + fairness gate
qa/boundary-run-static-smoke.mjs        CI: engine invariants, proof round-trip, legacy rejection
tools/boundary_run_audit.py             CI: security & claim audit
```

---

## ▶️ Play

**[RUN GAME →](https://axonos-bci.github.io/axonos-boundary-run-v9/?v=950)** — or locally:

```bash
git clone https://github.com/AxonOS-BCI/axonos-boundary-run-v9
cd axonos-boundary-run-v9 && python3 -m http.server 8080
# open http://localhost:8080
```

Daily seed = today's date: everyone flies the same boundary. Custom seeds (≤64 chars) make private leagues trivial — same seed, same field, compare proofs.

---

## 🛡️ Privacy and safety

**No telemetry.** No analytics, no cookies, no accounts, no network calls at runtime — the CSP forbids them. Proofs exist only where you save them. This is an educational game about cognitive privacy that practices it. **Not a medical device**; no real neural signals are read, simulated, or implied.

---

## 🧬 Within AxonOS

Boundary Run is the education edge of [**AxonOS**](https://github.com/AxonOS-org) — an open, consent-first, real-time neural operating system — and a playable companion to the [**AxonOS Radar**](https://axonos-bci.github.io/axonos-community-radar/), the scored map of the open BCI ecosystem. The game's vocabulary *is* the OS's vocabulary: consent revocation with bounded latency, audit, quarantine, sealed transport, least surface.

---

## 💛 Support

Free, open, no paywalls. If the little signal made you think, a voluntary **Dogecoin** tip fuels the work:

<div align="center">

`DMwHAhqVNWf7dyEznukxCufNS5rjuP5MTp` · [verify on-chain](https://dogechain.info/address/DMwHAhqVNWf7dyEznukxCufNS5rjuP5MTp)

</div>

Voluntary contributions — not purchases, not investments, no entitlements ([terms](CRYPTO_PAYMENT_TERMS.md)).

## 📄 License

Code: **Apache-2.0 OR MIT** ([LICENSE](LICENSE)) · Commercial licensing: [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md) · [Security policy](SECURITY.md) · [Privacy notice](PRIVACY_NOTICE.md)

<div align="center">
<sub>© The AxonOS Project / Denis Yermakou · <a href="https://axonos.org">axonos.org</a> · <a href="https://medium.com/@AxonOS">medium.com/@AxonOS</a> · connect@axonos.org</sub>
</div>
