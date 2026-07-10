// qa/verify-vectors.mjs — CI gate: every committed golden vector must
// re-simulate to a byte-identical result on the current engine. A drifting
// engine fails here before it can ship. Run:  node qa/verify-vectors.mjs
import { createRequire } from 'module';
import { readdirSync, readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const api = require('../app.js');

const dir = new URL('./vectors/', import.meta.url);
const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
if (files.length < 4) throw new Error(`expected >=4 golden vectors, found ${files.length}`);

let gatesResolved = 0, swarmCleared = 0, successes = 0;
for (const f of files) {
  const p = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  if (p.version !== 3) throw new Error(`${f}: proof version ${p.version}, expected 3`);
  if (p.release !== api.VERSION)
    throw new Error(`${f}: vector pinned to ${p.release}, engine is ${api.VERSION} — regenerate with qa/make-vectors.mjs`);
  const v = await api.verifyProof(p);
  if (!v.ok) throw new Error(`${f}: re-simulation mismatch — ${v.reason}`);
  if (p.result.gate !== 'none') gatesResolved++;
  if (p.result.swarm === 'cleared') swarmCleared++;
  if (p.result.integrity_bp > 0) successes++;
  console.log(`ok ${f}  grade=${p.result.grade} score=${p.result.score} swarm=${p.result.swarm} gate=${p.result.gate}`);
}
if (successes < 2) throw new Error('golden set must contain at least 2 surviving runs');
if (gatesResolved < 1) throw new Error('golden set must exercise the Guardian Gate');
if (swarmCleared < 1) throw new Error('golden set must contain a cleared swarm');
console.log(`Vectors OK: ${files.length} golden proofs re-simulated byte-identically on v${api.VERSION}`);
