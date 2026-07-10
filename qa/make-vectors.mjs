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

function pilotTick(e) {
  const horizon = 118000;
  const nearest = [1e9, 1e9, 1e9];
  const threats = [[], [], []];
  for (const o of e.objects) {
    if (o.hit || o.type === 'guardian_gate') continue;
    if (!HAZ.includes(o.type)) continue;
    if (o.x < PR - 2000 || o.x > horizon) continue;
    const eta = o.warnT > 0 ? o.x + o.warnT * 500 : o.x;   // frozen threats arrive later
    if (eta < nearest[o.lane]) nearest[o.lane] = eta;
    threats[o.lane].push(o);
  }
  // lane choice: greedy toward the emptiest corridor, one step per ~9 ticks
  if (e.tick % 9 === 0) {
    let best = e.lane;
    for (const l of [0, 1, 2]) if (nearest[l] > nearest[best] + 6000) best = l;
    if (best !== e.lane) e.action(best < e.lane ? 'left' : 'right');
  }
  // imminent same-lane threat
  const soon = threats[e.lane].filter(o => !(o.warnT > 0) && o.x < 36000 && o.x > PR - 1000);
  for (const o of soon) {
    if (o.type === 'artifact_spike' && e.jumpT === 0 && e.duckT === 0) { e.action('jump'); break; }
    if (o.type === 'unsafe_stim' && e.duckT === 0 && e.jumpT === 0) { e.action('duck'); break; }
    if (o.type === 'raw_leak' && e.vaultKeys > 0 && e.shieldT === 0) { e.action('seal'); break; }
    if ((o.type === 'stale_consent' || o.type === 'memory_phisher') && e.auditCd === 0 && (e.sector === 0 || e.swarm !== 'none')) { e.action('audit'); break; }
    if (o.type === 'unauthorized_app' && e.quarCharges > 0 && e.quarantineT === 0) { e.action('quarantine'); break; }
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
