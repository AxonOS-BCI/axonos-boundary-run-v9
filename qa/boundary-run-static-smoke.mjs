import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const api = require('../app.js');

async function assertRun(seed, contracts = [], actions = []) {
  const e = new api.Engine(seed, contracts);
  for (let i = 0; i < 80; i++) e.tickStep();
  for (const a of actions) e.action(a);
  for (let i = 0; i < 1800 && !e.finished; i++) e.tickStep();
  const proof = await e.proof();
  if (proof.version !== 2) throw new Error('proof v2 missing');
  if (!/^[0-9a-f]{64}$/.test(proof.proof_hash)) throw new Error('proof hash is not sha256 hex');
  const v = await api.verifyProof(proof);
  if (!v.ok) throw new Error('proof verification failed: ' + (v.reason || 'unknown'));
  if (typeof proof.result.score !== 'number') throw new Error('bad score');
  return proof;
}

if (api.VERSION !== '9.0.1') throw new Error('bad version');
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

const cases = [
  ['smoke-seed', ['C-04'], ['seal','audit','right']],
  ['stable-search-12', [], ['left','jump','audit']],
  ['fast-risk', ['C-01','C-05'], ['seal','right','throttle']],
  ['audit-lane', ['C-02'], ['audit','audit','quarantine']],
  ['safe-lane', ['C-03'], ['duck','seal']]
];
for (const c of cases) await assertRun(c[0], c[1], c[2]);

console.log('Smoke OK: v9.0.1 proof replay, contracts, seed validation, weather reachability');
