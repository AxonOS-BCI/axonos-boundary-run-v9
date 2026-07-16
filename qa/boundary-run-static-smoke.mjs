import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const api = require('../app.js');

async function assertRun(seed, contracts = [], actions = []) {
  const e = new api.Engine(seed, contracts);
  for (let i = 0; i < 80; i++) e.tickStep();
  for (const a of actions) e.action(a);
  for (let i = 0; i < 120000 && !e.finished; i++) e.tickStep();   // v9.3.0 marathon: run to completion
  const proof = await e.proof();
  if (proof.version !== 3) throw new Error('proof v3 missing');
  if (!/^[0-9a-f]{64}$/.test(proof.proof_hash)) throw new Error('proof hash is not sha256 hex');
  const v = await api.verifyProof(proof);
  if (!v.ok) throw new Error('proof verification failed: ' + (v.reason || 'unknown'));
  if (typeof proof.result.score !== 'number') throw new Error('bad score');
  return proof;
}

if (api.VERSION !== '9.5.0') throw new Error('bad version');
if (!api.WEATHER.includes('Stable Boundary')) throw new Error('Stable Boundary missing');

// Stable Boundary must be reachable for at least one deterministic seed.
let stableSeen = false;
for (let i = 0; i < 128; i++) {
  const e = new api.Engine('weather-' + i, []);
  if (e.weather.includes('Stable Boundary')) { stableSeen = true; break; }
}
if (!stableSeen) throw new Error('Stable Boundary unreachable');

// Contract validation edge cases.
try { new api.Engine('x', ['C-01','C-02','C-03']); throw new Error('too many contracts accepted'); } catch (e) { if (!String(e.message).includes('Maximum 2')) throw e; }
try { new api.Engine('x'.repeat(65), []); throw new Error('long seed accepted'); } catch (e) { if (!String(e.message).includes('Seed too long')) throw e; }

// Jump/duck mutual exclusion.
const motion = new api.Engine('motion', []);
motion.action('jump');
motion.action('duck');
if (motion.jumpT <= 0 || motion.duckT !== 0) throw new Error('jump+duck mutual exclusion failed');
const rj = motion.inputs.length;
motion.action('jump');                                  // air-jump must be a silent no-op
if (motion.inputs.length !== rj) throw new Error('air-jump was recorded');

const cases = [
  ['smoke-seed', ['C-04'], ['seal','audit','right']],
  ['stable-search-12', [], ['left','jump','audit']],
  ['fast-risk', ['C-01','C-05'], ['seal','right','throttle']],
  ['audit-lane', ['C-02'], ['audit','audit','quarantine']],
  ['safe-lane', ['C-03'], ['duck','seal']]
];
for (const c of cases) await assertRun(c[0], c[1], c[2]);

// Regression (v9.0.2): movement must be recorded once, so replay matches the live run.
{
  const e = new api.Engine('replay-move', []);
  const sc = { 20: ['right'], 40: ['left'], 60: ['right'], 80: ['left'], 120: ['left'], 122: ['right'] };
  let g = 0;
  while (!e.finished && g++ < 5000) { const cs = sc[e.tick]; if (cs) for (const a of cs) e.action(a); e.tickStep(); }
  const pr = await e.proof();
  const vv = await api.verifyProof(pr);
  if (!vv.ok) throw new Error('replay-after-movement failed: ' + vv.reason);
  const mv = pr.inputs.filter(i => i.a === 'left' || i.a === 'right');
  for (let i = 1; i < mv.length; i++) if (mv[i].t === mv[i - 1].t && mv[i].a === mv[i - 1].a) throw new Error('duplicate movement input recorded at tick ' + mv[i].t);
}

// v9.2.0 invariants: ability economy + flow + set-piece fields
{
  const e = new api.Engine('econ', []);
  e.action('audit'); const rec = e.inputs.length;
  e.action('audit');                                   // on cooldown
  if (e.inputs.length !== rec) throw new Error('cooldown no-op was recorded');
  e.action('quarantine'); e.action('quarantine');
  if (e.quarCharges !== 0) throw new Error('quarantine charges not consumed');
  const before = e.inputs.length; e.action('quarantine');
  if (e.inputs.length !== before) throw new Error('empty quarantine was recorded');
}
{
  const e = new api.Engine('fields', []);
  let g = 0; while (!e.finished && g++ < 60000) e.tickStep();
  const r = e.result();
  for (const k of ['combo_max', 'grazes', 'sector_reached', 'swarm', 'gate'])
    if (!(k in r)) throw new Error('result missing ' + k);
  if (r.sector_reached < 1 || r.sector_reached > 5) throw new Error('sector out of range');
}
{
  const rej = await api.verifyProof({ version: 2 });
  if (rej.ok || !String(rej.reason).includes('9.1.0')) throw new Error('v2 proof must be rejected with guidance');
}

// v9.5 "In Hand" — the input buffer contract: a jump/duck pressed in the
// lockout TAIL is queued and fires the moment its window opens (recorded at
// the FIRE tick); a press too early expires and records NOTHING.
{
  const e = new api.Engine('buffer', []);
  e.action('jump');
  for (let i = 0; i < 40; i++) e.tickStep();
  const rec = e.inputs.length;
  e.action('jump');                                       // blocked -> queued
  if (e.inputs.length !== rec) throw new Error('buffered press recorded at press time');
  for (let i = 0; i < 8; i++) e.tickStep();               // window opens -> fires
  if (e.inputs.filter(x => x.a === 'jump').length !== 2) throw new Error('buffered jump did not fire');
  if (e.jumpT < 40) throw new Error('buffered jump did not restart the arc');
  const e2 = new api.Engine('buffer-exp', []);
  e2.action('jump'); e2.tickStep();
  e2.action('jump');                                      // too early: expires silently
  for (let i = 0; i < 25; i++) e2.tickStep();
  if (e2.inputs.filter(x => x.a === 'jump').length !== 1) throw new Error('expired buffer was recorded');
  let g = 0;                                              // proofs verify only FINISHED runs
  while (!e.finished && g++ < 120000) e.tickStep();
  const pr = await e.proof(); const vv = await api.verifyProof(pr);
  if (!vv.ok) throw new Error('buffered-run replay failed: ' + vv.reason);
}

console.log('Smoke OK: v9.5.0 proof v3 replay, ability economy, flow fields, set-pieces, legacy rejection');
