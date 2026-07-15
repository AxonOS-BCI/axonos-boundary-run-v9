// qa/make-vectors.mjs — regenerates the golden replay vectors for the current
// release. A deterministic heuristic pilot flies each seed; the resulting
// proofs are committed as qa/vectors/*.json and re-verified in CI by full
// re-simulation. Run:  node qa/make-vectors.mjs
import { createRequire } from 'module';
import { writeFileSync, mkdirSync } from 'fs';
const require = createRequire(import.meta.url);
const api = require('../app.js');

const HAZ = ['raw_leak', 'stale_consent', 'artifact_spike', 'unsafe_stim', 'unauthorized_app', 'memory_phisher'];
const PR = Math.floor(160 / 1280 * 1280 * 100); // player right edge, centi-px

export function pilotTick(e) {
  // v9.4 reference pilot — the S-capable brain. Perfect information is fair
  // here: it sees exactly the objects a player sees on screen; the point is to
  // prove the FIELD is beatable at the top grade, every release, in CI.
  const GL = Math.floor(44 / 1280 * 1280 * 100);
  const GR = Math.floor(160 / 1280 * 1280 * 100);
  const laneAt = (o, dt) => {                       // where a sweeping beam will BE, not where it is
    if (!o.sweep) return o.lane;
    let lane = o.lane, s = o.sweep, at = o.sweepAt | 0;
    for (let t2 = 0; t2 < dt; t2++) {
      at++;
      if (at >= o.sweepEvery) { at = 0; const nl = lane + s; if (nl < 0 || nl > 2) s = -s; lane = Math.max(0, Math.min(2, lane + s)); }
    }
    return lane;
  };
  const dangerIn = (lane, horizon) => {             // hazards that will cross the band in `horizon` ticks in `lane`
    const out = [];
    for (const o of e.objects) {
      if (o.hit || !HAZ.includes(o.type)) continue;
      if (o.warnT > 0) {
        const eta = o.warnT + Math.ceil(Math.max(0, o.x - GR) / o.speed);
        if (eta <= horizon && laneAt(o, eta) === lane) out.push({ o, eta });
        continue;
      }
      const etaEnter = Math.ceil(Math.max(0, o.x - GR) / o.speed);
      const etaExit = Math.ceil(Math.max(0, o.x - GL) / o.speed);
      if (etaEnter <= horizon && etaExit >= 0 && laneAt(o, etaEnter) === lane) out.push({ o, eta: etaEnter });
    }
    return out.sort((a, b) => a.eta - b.eta);
  };
  const counterFor = o => {
    if (o.type === 'artifact_spike' && e.jumpT === 0 && e.duckT === 0) return 'jump';
    if (o.type === 'unsafe_stim' && e.jumpT === 0 && e.duckT === 0) return 'duck';
    if (o.type === 'raw_leak' && e.vaultKeys > 0 && e.shieldT === 0) return 'seal';
    if ((o.type === 'stale_consent' || o.type === 'memory_phisher') && e.auditCd === 0) return 'audit';
    if (o.type === 'unauthorized_app' && e.quarCharges > 0 && e.quarantineT === 0) return 'quarantine';
    return null;
  };
  // 1) swarm opener: a pulse fired INTO the active swarm locks for its whole pass
  if (e.swarm === 'active' && e.auditCd === 0 && e.auditPulseT < 100) e.action('audit');
  // 2) gate prep: the clean-passage condition is auditPulse OR consent >= 60
  const gate = e.objects.find(o => o.type === 'guardian_gate' && !o.hit);
  if (gate && e.consent < 60 && e.auditCd === 0 && gate.x < 260000) e.action('audit');
  if (e.consent < 55 && e.revokeCd === 0 && !e.contracts.includes('C-01')) e.action('revoke');
  if (e.drainT > 0 && e.revokeCd === 0 && !e.contracts.includes('C-01')) e.action('revoke');
  // 3) lane choice: score all three by nearest incoming danger, small pickup bonus
  const H = 130;
  const pickupBonus = l => e.objects.some(o => !o.hit && laneAt(o, 40) === l &&
    ['vault_key', 'consent_token', 'shard'].includes(o.type) &&
    o.x > GR && o.x < GR + 40 * o.speed) ? 9 : 0;
  const scores = [0, 1, 2].map(l => {
    const d = dangerIn(l, H);
    let s = d.length ? d[0].eta : H + 50;
    s += pickupBonus(l);
    s -= Math.abs(l - e.lane) * 6;
    return s;
  });
  let best = e.lane;
  for (const l of [0, 1, 2]) if (scores[l] > scores[best] + 8) best = l;
  if (best !== e.lane) e.action(best < e.lane ? 'left' : 'right');
  // 4) what still reaches us gets countered; Audit is HELD for the swarm
  //    unless the hit is imminent or a contract demands the pulse
  const now = dangerIn(e.lane, 34);
  if (now.length) {
    const c = counterFor(now[0].o);
    const mustPulse = e.contracts.includes('C-04') && now[0].o.type === 'stale_consent';
    if (c === 'audit' && !mustPulse && e.swarm === 'none' && e.sector >= 1) {
      if (now[0].eta < 12) e.action('audit');
    } else if (c) e.action(c);
  }
}

async function fly(seed, contracts) {
  const e = new api.Engine(seed, contracts);
  let guard = 0;
  while (!e.finished && guard++ < 60000) { pilotTick(e); e.tickStep(); }
  return e.proof();
}

const PLAN = [
  ['golden-alpha', []],
  ['golden-audit', ['C-04']],
  ['golden-sealed', ['C-05']],
  ['golden-flow', []],
];

if (process.env.BRUN_LIB) { /* imported as a library — skip generation */ }
else {
mkdirSync(new URL('./vectors/', import.meta.url), { recursive: true });
let successes = 0;
for (let i = 0; i < PLAN.length; i++) {
  const [seed, contracts] = PLAN[i];
  const p = await fly(seed, contracts);
  const v = await api.verifyProof(p);
  if (!v.ok) throw new Error(`vector ${seed} failed self-verify: ${v.reason}`);
  if (p.result.score > 0 && p.result.integrity_bp > 0) successes++;
  writeFileSync(new URL(`./vectors/v${i + 1}-${seed}.json`, import.meta.url), JSON.stringify(p, null, 2) + '\n');
  console.log(`v${i + 1} ${seed}  grade=${p.result.grade} score=${p.result.score} ` +
    `combo=${p.result.combo_max} grazes=${p.result.grazes} sector=${p.result.sector_reached} ` +
    `swarm=${p.result.swarm} gate=${p.result.gate} success=${p.result.integrity_bp > 0}`);
}
if (successes < 2) throw new Error(`pilot too weak: only ${successes}/4 survivable — tune before committing vectors`);
console.log('golden vectors written: qa/vectors/*.json');
}
