# Boundary Run v9.0.0 — The Little Signal

<p align="center">
  <a href="https://axonos-bci.github.io/axonos-boundary-run-v9/?v=900">
    <strong>▶ RUN GAME — PLAY NOW</strong>
  </a>
</p>

<p align="center">
  One click. No install. No backend. No telemetry.
</p>

---

## What it is

**Boundary Run v9** is an AxonOS Education browser serious game about cognitive privacy, safe intent, consent, deterministic replay proof, and privacy-by-design tradeoffs.

You guide **Ari**, a small safe-intent courier, through a neural boundary field. Kibo, the guardian companion, warns you about raw signal leaks, stale consent gates, artifact spikes, and unsafe stimulation beams.

Ari is not carrying a thought. Ari is carrying a choice.

> Protect the choice. Protect the person.

## v9.0.0 Foundation Features

- Seeded deterministic level generation.
- Delivery Contracts: Zero Trust, Minimal Surface, No Throttle, Full Audit, Sealed Envelope.
- Neural Weather indicators.
- Moral branch choices: Fast Lane, Safe Lane, Audit Lane.
- Enhanced Replay Proof v2.
- Deterministic procedural final portrait.
- Copy proof button.
- Static browser build.
- No telemetry.
- No backend.
- No service worker in v9.0.0.

## Play

**[▶ RUN GAME — PLAY NOW](https://axonos-bci.github.io/axonos-boundary-run-v9/?v=900)**

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

Open:

```text
http://127.0.0.1:8080
```

## Verify

```bash
bash scripts/build_web.sh dist
python3 tools/boundary_run_audit.py
node qa/boundary-run-static-smoke.mjs
```

## Privacy and safety

Educational simulation only. Not a medical device. No real neural data is collected. No analytics. No telemetry. No backend.

## Support / Donations

If you want to support AxonOS Education development:

```text
Dogecoin: DMwHAhqVNWf7dyEznukxCufNS5rjuP5MTp
```

Donations are optional and do not unlock gameplay advantages.

## License

Apache-2.0 OR MIT unless otherwise stated. See `LICENSE`, `LICENSES/`, `COMMERCIAL_LICENSE.md`, and `THIRD_PARTY_NOTICES.md`.
