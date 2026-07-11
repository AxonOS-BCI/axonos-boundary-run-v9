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
  const horizon = 118000;
  const nearest = [1e9, 1e9, 1e9];
  const threats = [[], [], []];
  for (const o of e.objects) {
    if (o.hit || o.type === 'guardian_gate') continue;
    if (!HAZ.includes(o.type)) continue;
    if (o.x < PR - 2000 || o.x > horizon) continue;
    const eta = o.warnT > 0 ? o.x + o.warnT * 350 : o.x;   // frozen threats arrive later (v9.3 speeds)
    if (eta < nearest[o.lane]) nearest[o.lane] = eta;
    threats[o.lane].push(o);
  }
  // v9.3 pilot: never step into an occupied corridor. etaOf() projects sweeps
  // into their next lane; laneSafe() vetoes any lane with arrival < 26 ticks.
  const etaTicks = o => (o.x - PR) / Math.max(1, o.speed);
  const laneThreatEta = l => {
    let m = 1e9;
    for (const o of e.objects) {
      if (o.hit || !HAZ.includes(o.type)) continue;
      const lanes = [o.lane];
      if (o.sweep) {                                   // beam will hop: occupy next lane too
        const nl = o.lane + o.sweep;
        lanes.push(nl < 0 || nl > 2 ? o.lane - o.sweep : nl);
      }
      if (!lanes.includes(l)) continue;
      const eta = o.warnT > 0 ? etaTicks(o) + o.warnT : etaTicks(o);
      if (eta > -4 && eta < m) m = eta;
    }
    return m;
  };
  const inSwarm = e.swarm === 'active';
  const laneSafe = l => laneThreatEta(l) >= (inSwarm ? 14 : 26);
  if (inSwarm && e.tick % 5 === 0) {
    // follow the moving gap: the lane of the phisher that just PASSED is the
    // wake of the wave — the safest corridor for the next beats
    let wake = -1, wx = -1e9;
    for (const o of e.objects) if (o.swarmMark && !o.hit && o.x < PR - 3500 && o.x > wx) { wx = o.x; wake = o.lane; }
    const target = wake >= 0 ? wake : e.lane;
    if (target !== e.lane && laneSafe(target)) e.action(target < e.lane ? 'left' : 'right');
  } else if (e.tick % 6 === 0) {
    let best = e.lane, bestEta = laneThreatEta(e.lane);
    const pickupBonus = l => e.objects.some(o => !o.hit && o.lane === l &&
      ['vault_key', 'consent_token', 'shard'].includes(o.type) && etaTicks(o) > 4 && etaTicks(o) < 90) ? 10 : 0;
    for (const l of [0, 1, 2]) {
      const le = laneThreatEta(l) + pickupBonus(l) * 1000;
      if (le > bestEta + 6 && laneSafe(l)) { best = l; bestEta = le; }
    }
    if (best !== e.lane) e.action(best < e.lane ? 'left' : 'right');
  }
  // emergency sidestep, off-cadence: current lane doomed by a type we cannot
  // out-maneuver in time — hop to any safe neighbour NOW
  {
    const curEta = laneThreatEta(e.lane);
    if (curEta < 12 && e.jumpT === 0 && e.duckT === 0) {
      // compare evils: standing still is guaranteed damage — step into the
      // lane with the LATEST threat, veto or not, and replan next tick
      let best = -1, bestEta = curEta + 8;
      for (const l of [e.lane - 1, e.lane + 1]) {
        if (l < 0 || l > 2) continue;
        const le = laneThreatEta(l);
        if (le > bestEta) { bestEta = le; best = l; }
      }
      if (best >= 0) e.action(best < e.lane ? 'left' : 'right');
    }
  }
  // imminent same-lane threat — ETA-based so it holds at any world speed
  const thr = e.throttleT > 0;
  const soon = threats[e.lane]
    .filter(o => !(o.warnT > 0) && o.x > PR - 1000)
    .map(o => ({ o, eta: (o.x - PR) / Math.max(1, thr && o.type !== 'guardian_gate' ? Math.floor(o.speed * 3 / 5) : o.speed) }))
    .filter(t => t.eta < 70)
    .sort((a, b) => a.eta - b.eta);
  for (const { o, eta } of soon) {
    if (o.type === 'artifact_spike' && eta < 42 && e.jumpT === 0 && e.duckT === 0) { e.action('jump'); break; }
    if (o.type === 'unsafe_stim' && eta < 46 && e.duckT === 0 && e.jumpT === 0) { e.action('duck'); break; }
    if (o.type === 'raw_leak' && eta < 55 && e.vaultKeys > 0 && e.shieldT === 0) { e.action('seal'); break; }
    if ((o.type === 'stale_consent' || o.type === 'memory_phisher') && eta < 60 && e.auditCd === 0 && (e.sector === 0 || e.swarm !== 'none')) { e.action('audit'); break; }
    if (o.type === 'unauthorized_app' && eta < 55 && e.quarCharges > 0 && e.quarantineT === 0) { e.action('quarantine'); break; }
  }
  if (e.swarm === 'active' && e.auditCd === 0) e.action('audit');
  if (e.gateSpawned && e.gate === 'none' && e.consent < 60 && e.auditCd === 0) e.action('audit');
  if (e.drainT > 0 && e.revokeCd === 0) e.action('revoke');
  if (e.sector >= 3 && e.objects.length > 8 && e.throttleCd === 0) e.action('throttle');
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
