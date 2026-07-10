(function (root) {
  "use strict";

  const VERSION = "9.2.0";
  // v9.2.0 sector script: five acts of rising pressure. All integers, all
  // derived from tick/seed — the simulation stays byte-deterministic.
  const SECTORS = 5;
  const SECTOR_INTERVAL = [56, 50, 44, 39, 34];   // base ticks between pattern spawns
  const SECTOR_SPEED    = [0, 40, 80, 120, 160];  // centi-px/tick added to hazards
  const COOLDOWN = { audit: 600, revoke: 300, throttle: 720 };
  const PULSE_T = 240, THROTTLE_T = 180, QUAR_T = 200, DRAIN_T = 300, SHIELD_T = 90;
  const MAX_SEED_LEN = 64;
  const LOGICAL_W = 1280;
  const COLLISION_LEFT_RATIO = 44 / LOGICAL_W;
  const COLLISION_RIGHT_RATIO = 160 / LOGICAL_W;
  const CONTRACTS = [
    { id: "C-01", name: "Zero Trust", rule: "No Revoke", mult: 1.4, lesson: "Once consent cannot be revoked, risk rises." },
    { id: "C-02", name: "Minimal Surface", rule: "≤3 center crossings", mult: 1.3, lesson: "Less attack surface means fewer crossings." },
    { id: "C-03", name: "No Throttle", rule: "No Throttle", mult: 1.5, lesson: "No intervention keeps speed high but risk higher." },
    { id: "C-04", name: "Full Audit", rule: "Audit every gate", mult: 1.6, lesson: "Every access request should be checked." },
    { id: "C-05", name: "Sealed Envelope", rule: "Seal every leak", mult: 1.5, lesson: "Private data must stay sealed." }
  ];
  const CONTRACT_IDS = CONTRACTS.map(c => c.id);
  const WEATHER = ["Stable Boundary", "Phishing Storm", "Boundary Erosion", "Resonance Feedback", "Stale Consent", "Data Gravity"];
  const HAZARD_TYPES = ["raw_leak", "stale_consent", "artifact_spike", "unsafe_stim", "unauthorized_app", "memory_phisher"];
  const ACTIONS = { audit: 1, revoke: 2, throttle: 3, seal: 4, quarantine: 5, left: 10, right: 11, jump: 12, duck: 13, branch_safe: 20, branch_fast: 21, branch_audit: 22 };

  function hash32(str) {
    const s = String(str || "");
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function hex32(n) { return (n >>> 0).toString(16).padStart(8, "0"); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function dailySeed() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}-axonos-boundary`;
  }
  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
  }
  function bytesToHex(bytes) { return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(""); }
  async function sha256Hex(input) {
    const s = String(input);
    if (root.crypto && root.crypto.subtle && root.TextEncoder) {
      const buf = new TextEncoder().encode(s);
      const hash = await root.crypto.subtle.digest("SHA-256", buf);
      return bytesToHex(new Uint8Array(hash));
    }
    if (typeof require === "function") {
      const crypto = require("crypto");
      return crypto.createHash("sha256").update(s, "utf8").digest("hex");
    }
    throw new Error("SHA-256 unavailable");
  }
  async function hashProof(obj) {
    return sha256Hex(stableStringify(obj));
  }
  function validateSeed(seedText) {
    const s = String(seedText || "daily").trim() || "daily";
    if (s.length > MAX_SEED_LEN) throw new Error(`Seed too long (max ${MAX_SEED_LEN})`);
    return s;
  }
  function validateContracts(contracts) {
    const list = Array.isArray(contracts) ? contracts.slice() : [];
    if (list.length > 2) throw new Error("Maximum 2 contracts allowed");
    for (const id of list) {
      if (!CONTRACT_IDS.includes(id)) throw new Error("Unknown contract: " + id);
    }
    return list;
  }

  class Engine {
    constructor(seedText, contracts) {
      const validatedSeed = validateSeed(seedText);
      this.seedText = validatedSeed !== "daily" ? validatedSeed : dailySeed();
      this.seed = hash32(this.seedText);
      this.contracts = validateContracts(contracts);
      this.weather = this.pickWeather();
      this.length = (2600 + (this.seed % 8) * 320) * 100; // centi-distance units
      this.tick = 0;
      this.distance = 0; // centi-distance units, integer only
      this.lane = 1;
      this.branch = "Boundary Layer";
      this.branchEvent = null;
      this.integrity = 100;
      this.leakage = 0;
      this.consent = 100;
      this.latency = 0;
      this.trust = 75;
      this.shards = 0;
      this.vaultKeys = 2;
      this.centerCrossings = 0;
      this.auditCount = 0;
      this.missedAudits = 0;
      this.sealMisses = 0;
      this.throttles = 0;
      this.revokes = 0;
      this.quarantines = 0;
      this.corruption = 0;
      this.inputs = [];
      this.objects = [];
      this.finished = false;
      this.success = false;
      this.message = "Kibo is watching the boundary.";
      this.lastSpawn = 0;
      this.jumpT = 0;
      this.duckT = 0;
      this.shieldT = 0;
      // v9.2.0 depth: flow combo, ability economy, set-pieces
      this.combo = 0;
      this.comboMax = 0;
      this.grazes = 0;
      this.sector = 0;
      this.auditPulseT = 0;
      this.auditCd = 0;
      this.revokeCd = 0;
      this.throttleT = 0;
      this.throttleCd = 0;
      this.quarantineT = 0;
      this.quarCharges = 2;
      this.drainT = 0;
      this.swarm = "none";     // none | active | cleared | hit
      this.swarmEndTick = 0;
      this.gate = "none";      // none | clean | forced
      this.gateSpawned = false;
    }
    pickWeather() {
      const first = WEATHER[this.seed % WEATHER.length];
      const second = WEATHER[(this.seed >>> 8) % WEATHER.length];
      return first === second ? [first] : [first, second].slice(0, 2);
    }
    record(action, data) {
      if (!ACTIONS[action] && action !== "branch_choice") return;
      if (this.inputs.length < 4096) this.inputs.push({ t: this.tick, a: action, data: data || null });
    }
    setLane(next) {
      const old = this.lane;
      this.lane = clamp(next, 0, 2);
      // movement is recorded once in action(); setLane only mutates state
      if (old !== this.lane && (this.lane === 1 || old === 1)) this.centerCrossings++;
    }
    branchChoice(kind) {
      if (this.branchEvent) return;
      const map = { safe: "Safe Lane", fast: "Fast Lane", audit: "Audit Lane" };
      this.branch = map[kind] || "Boundary Layer";
      this.branchEvent = { distance: this.distance, choice: this.branch };
      this.record("branch_choice", this.branch);
      if (this.branch === "Fast Lane") { this.shards += 12; this.integrity = clamp(this.integrity - 4, 0, 100); this.message = "Fast Lane chosen: speed over privacy."; }
      if (this.branch === "Safe Lane") { this.integrity = clamp(this.integrity + 8, 0, 100); this.message = "Safe Lane chosen: privacy-by-design."; }
      if (this.branch === "Audit Lane") { this.auditCount++; this.message = "Audit Lane chosen: every gate matters."; }
    }
    action(name) {
      if (this.finished) return;
      if (!ACTIONS[name]) return;
      if (name === "jump") {
        if (this.duckT > 0 || this.jumpT > 0) return;   // no air-jump, no autorepeat spam
        this.record(name, null);
        this.jumpT = 18;
        this.message = "Ari jumped over the spike.";
        return;
      }
      if (name === "duck") {
        if (this.jumpT > 0 || this.duckT > 0) return;
        this.record(name, null);
        this.duckT = 20;
        this.message = "Ari compressed the signal path.";
        return;
      }
      // Ability economy (v9.2.0): windows + cooldowns instead of forever-flags.
      // A call during cooldown is a deterministic no-op and is NOT recorded,
      // so proofs carry only effective inputs.
      if (name === "audit") {
        if (this.auditCd > 0) { this.message = "Audit recharging."; return; }
        this.record(name, null);
        this.auditCount++;
        this.auditPulseT = PULSE_T; this.auditCd = COOLDOWN.audit;
        this.latency = clamp(this.latency + 3, 0, 100); this.trust = clamp(this.trust + 3, 0, 100);
        this.message = "Audit Pulse: every gate in reach is inspected."; return;
      }
      if (name === "revoke") {
        if (this.revokeCd > 0) { this.message = "Revocation channel busy."; return; }
        this.record(name, null);
        this.revokes++; this.revokeCd = COOLDOWN.revoke;
        this.consent = clamp(this.consent + 9, 0, 100); this.latency = clamp(this.latency + 2, 0, 100);
        if (this.drainT > 0) { this.drainT = 0; this.message = "Consent drain revoked at the source."; }
        else this.message = "Consent must stay revocable."; return;
      }
      if (name === "throttle") {
        if (this.throttleCd > 0) { this.message = "Throttle recovering."; return; }
        this.record(name, null);
        this.throttles++; this.throttleT = THROTTLE_T; this.throttleCd = COOLDOWN.throttle;
        this.latency = clamp(this.latency + 8, 0, 100); this.integrity = clamp(this.integrity + 3, 0, 100);
        this.message = "Throttle window: the boundary slows to be checked."; return;
      }
      if (name === "seal") {
        this.record(name, null);
        if (this.vaultKeys > 0) { this.vaultKeys--; this.shieldT = SHIELD_T; this.trust = clamp(this.trust + 7, 0, 100); this.message = "Seal Vault protects Ari's Intent Spark."; }
        else { this.message = "No Vault Keys left. Dodge the leak."; this.trust = clamp(this.trust - 4, 0, 100); }
        return;
      }
      if (name === "quarantine") {
        if (this.quarCharges <= 0) { this.message = "No quarantine cells left."; return; }
        this.record(name, null);
        this.quarCharges--; this.quarantines++; this.quarantineT = QUAR_T;
        this.integrity = clamp(this.integrity + 4, 0, 100); this.latency = clamp(this.latency + 4, 0, 100);
        this.message = "Quarantine cell armed."; return;
      }
      this.record(name, null);
      if (name === "left") return this.setLane(this.lane - 1);
      if (name === "right") return this.setLane(this.lane + 1);
    }
    bumpCombo(n) {
      this.combo += n;
      if (this.combo >= 5 && n > 0) this.shards += 1;   // flow bonus, recorded in proof naturally
      if (this.combo > this.comboMax) this.comboMax = this.combo;
    }
    add(type, lane, xOff, speed, extra) {
      const o = { id: hex32(hash32(this.seedText + ":" + this.tick + ":" + type + ":" + lane + ":" + (xOff | 0))),
                  type, lane: clamp(lane, 0, 2), x: 132000 + (xOff | 0) * 100, speed, hit: false, passed: false };
      if (extra) for (const k in extra) o[k] = extra[k];
      this.objects.push(o);
    }
    baseSpeed(h) {
      return 500 + ((h >>> 16) % 22) * 10 + SECTOR_SPEED[this.sector] + (this.branch === "Fast Lane" ? 120 : 0);
    }
    /* v9.2.0 pattern scheduler: hazards arrive as authored formations, not
       lone objects. All rolls come from the seeded hash stream — deterministic. */
    spawn() {
      if (this.swarm === "active") return;                    // set-piece owns the field
      const branchAdj = this.branch === "Fast Lane" ? -8 : this.branch === "Safe Lane" ? 8 : 0;
      const interval = SECTOR_INTERVAL[this.sector] + branchAdj;
      if (this.tick - this.lastSpawn < interval) return;
      this.lastSpawn = this.tick;
      const h = hash32(`${this.seedText}:${this.tick}:${this.distance}`);
      const lane = h % 3;
      const roll = (h >>> 5) % 100;
      const sp = this.baseSpeed(h);
      // pattern weights shift with the sector: later acts are formation-heavy
      const fenceAt = 62 + this.sector * -4;    // fences appear more often later
      const sweepAt = 78 + this.sector * -5;
      if (roll >= 92) {                                        // shard arc: pure flow reward
        const dir = (h >>> 9) & 1 ? 1 : -1;
        for (let i = 0; i < 5; i++) this.add("shard", 1 + dir * ((i % 4 < 2 ? i % 2 : 1 - (i % 2)) ? 1 : -1) * (i % 2), i * 70, sp);
        return;
      }
      if (roll >= sweepAt) {                                   // telegraphed sweeping beam
        const dir = (h >>> 9) & 1 ? 1 : -1;
        this.add("unsafe_stim", lane, 0, sp, { warnT: 60, sweep: dir, sweepEvery: 44, sweepAt: 0 });
        return;
      }
      if (roll >= fenceAt) {                                   // formations
        const kind = (h >>> 11) % 3;
        if (kind === 0) {                                      // spike fence, one gap
          for (let l = 0; l < 3; l++) if (l !== lane) this.add("artifact_spike", l, 0, sp, { warnT: 36 });
        } else if (kind === 1) {                               // leak wall + token in the gap
          for (let l = 0; l < 3; l++) if (l !== lane) this.add("raw_leak", l, 0, sp);
          this.add("consent_token", lane, 0, sp);
        } else {                                               // key behind a spike: risk/reward
          this.add("artifact_spike", lane, -60, sp, { warnT: 30 });
          this.add("vault_key", lane, 30, sp);
        }
        return;
      }
      let type = "shard";                                      // legacy single roll
      if (roll < 16) type = "raw_leak";
      else if (roll < 28) type = "stale_consent";
      else if (roll < 39) type = "artifact_spike";
      else if (roll < 47) type = "unsafe_stim";
      else if (roll < 54) type = "unauthorized_app";
      else if (roll < 61) type = "memory_phisher";
      else if (roll < 68) type = "vault_key";
      else if (roll < 76) type = "consent_token";
      this.add(type, lane, 0, sp, type === "unsafe_stim" ? { warnT: 48 } : null);
    }
    spawnSwarm() {
      this.swarm = "active";
      this.swarmEndTick = this.tick + 780;
      const h = hash32(this.seedText + ":swarm");
      const sp = this.baseSpeed(h) + 40;
      for (let i = 0; i < 8; i++) {
        const l = (h >>> (i * 3)) % 3;
        this.add("memory_phisher", l, 60 + i * 62, sp, i % 2 ? { swarmMark: true, sweep: (i & 2) ? 1 : -1, sweepEvery: 52, sweepAt: 0 } : { swarmMark: true });
      }
      this.message = "Phisher swarm ahead. Weave, or Audit-pulse them open.";
    }
    applyCollision(o) {
      const left = Math.floor(COLLISION_LEFT_RATIO * LOGICAL_W * 100);
      const right = Math.floor(COLLISION_RIGHT_RATIO * LOGICAL_W * 100);
      if (o.hit || o.lane !== this.lane || o.x > right || o.x < left) return;
      o.hit = true;
      if (o.type === "shard") { this.shards += this.weather.includes("Data Gravity") ? 9 : 3; this.trust = clamp(this.trust + 1, 0, 100); this.bumpCombo(1); this.message = "Proof Shard collected."; return; }
      if (o.type === "vault_key") { this.vaultKeys++; this.message = "Vault Key recovered."; return; }
      if (o.type === "consent_token") { this.consent = clamp(this.consent + 5, 0, 100); this.message = "Consent Token stabilized the gate."; return; }
      if (o.type === "artifact_spike" && this.jumpT > 0) { this.shards += 2; this.bumpCombo(2); this.message = "Spike avoided. Not every signal is intent."; return; }
      if (o.type === "unsafe_stim" && this.duckT > 0) { this.integrity = clamp(this.integrity + 2, 0, 100); this.bumpCombo(2); this.message = "Unsafe beam compressed safely."; return; }
      if (o.type === "raw_leak" && this.shieldT > 0) { this.shards += 5; this.bumpCombo(2); this.message = "Raw leak sealed. Private data stayed private."; return; }
      if (o.type === "stale_consent" && this.auditPulseT > 0) { this.consent = clamp(this.consent + 2, 0, 100); this.bumpCombo(1); this.message = "Stale consent caught in the Audit Pulse."; return; }
      if (o.type === "unauthorized_app" && this.quarantineT > 0) { this.quarantineT = 0; this.shards += 4; this.bumpCombo(2); this.message = "Unauthorized app isolated in the cell."; return; }
      if (o.type === "memory_phisher" && this.auditPulseT > 0) { this.shards += 2; this.bumpCombo(1); this.message = "Phisher exposed by the Audit Pulse."; return; }
      const damage = o.type === "raw_leak" ? 20 : o.type === "unsafe_stim" ? 18 : 10;
      this.integrity = clamp(this.integrity - damage, 0, 100);
      this.leakage = clamp(this.leakage + (o.type === "raw_leak" ? 18 : 7), 0, 100);
      this.consent = clamp(this.consent - (o.type === "stale_consent" ? 14 : 2), 0, 100);
      this.trust = clamp(this.trust - 8, 0, 100);
      this.corruption = clamp(this.corruption + 1, 0, 3);
      this.combo = 0;
      if (this.swarm === "active") this.swarm = "hit";
      if (o.type === "raw_leak") this.sealMisses++;
      if (o.type === "stale_consent") { this.missedAudits++; this.drainT = DRAIN_T; }
      this.message = "Boundary exposed. Kibo is pulling Ari back.";
    }
    tickStep() {
      if (this.finished) return;
      this.tick++;
      this.distance += this.branch === "Fast Lane" ? 350 : this.branch === "Safe Lane" ? 240 : 290;
      if (!this.branchEvent && this.distance > Math.floor(this.length * 46 / 100)) this.branchChoice(["safe", "fast", "audit"][(this.seed >>> 12) % 3]);
      if (this.weather.includes("Boundary Erosion") && this.tick % 100 === 0) this.integrity = clamp(this.integrity - 1, 0, 100);
      if (this.weather.includes("Stale Consent") && this.tick % 360 === 0) this.consent = clamp(this.consent - 7, 0, 100);
      if (this.weather.includes("Resonance Feedback") && this.throttles > 0 && this.tick % 90 === 0) this.leakage = clamp(this.leakage + 2, 0, 100);
      if (this.tick % 50 === 0) this.latency = clamp(this.latency + 1, 0, 100);
      // sector = act index derived purely from distance
      this.sector = clamp(Math.floor(this.distance * SECTORS / this.length), 0, SECTORS - 1);
      // v9.2.0 timers
      this.jumpT = Math.max(0, this.jumpT - 1);
      this.duckT = Math.max(0, this.duckT - 1);
      this.shieldT = Math.max(0, this.shieldT - 1);
      this.auditPulseT = Math.max(0, this.auditPulseT - 1);
      this.auditCd = Math.max(0, this.auditCd - 1);
      this.revokeCd = Math.max(0, this.revokeCd - 1);
      this.throttleT = Math.max(0, this.throttleT - 1);
      this.throttleCd = Math.max(0, this.throttleCd - 1);
      this.quarantineT = Math.max(0, this.quarantineT - 1);
      if (this.drainT > 0) { this.drainT--; if (this.drainT % 30 === 0) this.consent = clamp(this.consent - 1, 0, 100); }
      // set-pieces
      if (this.swarm === "none" && this.sector >= 2) this.spawnSwarm();
      if (this.swarm === "active" && this.tick > this.swarmEndTick - 700 &&
          !this.objects.some(o => o.swarmMark && !o.hit && !o.passed)) {
        this.swarm = "cleared"; this.shards += 30; this.trust = clamp(this.trust + 6, 0, 100);
        this.bumpCombo(3); this.message = "Swarm weathered. The boundary held.";
      }
      if (!this.gateSpawned && this.distance >= Math.floor(this.length * 88 / 100)) {
        this.gateSpawned = true;
        // Gate speed is derived from the remaining track so the scan ALWAYS
        // arrives before the finish, on every seed and branch. Integer math.
        const per = this.branch === "Fast Lane" ? 350 : this.branch === "Safe Lane" ? 240 : 290;
        const remain = Math.max(1, this.length - this.distance);
        const need = Math.floor(122000 * per / remain) + 60;
        this.add("guardian_gate", 1, 40, Math.max(this.baseSpeed(hash32(this.seedText + ":gate")) + 300, need));
      }
      this.spawn();
      const gL = Math.floor(COLLISION_LEFT_RATIO * LOGICAL_W * 100);
      const gR = Math.floor(COLLISION_RIGHT_RATIO * LOGICAL_W * 100);
      for (const o of this.objects) {
        if (o.warnT > 0) { o.warnT--; continue; }             // telegraph: frozen, harmless
        if (o.sweep) {                                        // sweeping beam drifts across lanes
          o.sweepAt = (o.sweepAt | 0) + 1;
          if (o.sweepAt >= o.sweepEvery) {
            o.sweepAt = 0;
            const nl = o.lane + o.sweep;
            if (nl < 0 || nl > 2) o.sweep = -o.sweep;
            o.lane = clamp(o.lane + o.sweep, 0, 2);
          }
        }
        // The Guardian scan is not yours to slow: throttle affects hazards,
        // never the gate — its arrival stays guaranteed.
        const dx = (this.throttleT > 0 && o.type !== "guardian_gate") ? Math.floor(o.speed * 3 / 5) : o.speed;
        o.x -= dx;
        if (o.type === "guardian_gate") {                     // spans all lanes; resolves once
          if (!o.hit && o.x <= gR) {
            o.hit = true;
            if (this.auditPulseT > 0 || this.consent >= 60) {
              this.gate = "clean"; this.shards += 25; this.trust = clamp(this.trust + 8, 0, 100);
              this.bumpCombo(3); this.message = "Guardian Gate: consent verified. Clean passage.";
            } else {
              this.gate = "forced"; this.integrity = clamp(this.integrity - 10, 0, 100);
              this.leakage = clamp(this.leakage + 8, 0, 100); this.combo = 0;
              this.message = "Gate forced. Consent was not in order.";
            }
          }
          continue;
        }
        this.applyCollision(o);
        // graze: a live hazard crossing the player band one lane away
        if (!o.hit && !o.passed && o.x < gL) {
          o.passed = true;
          if (HAZARD_TYPES.includes(o.type) && Math.abs(o.lane - this.lane) === 1) {
            this.grazes++; this.bumpCombo(1);
          }
        }
      }
      this.objects = this.objects.filter(o => o.x > -8000 && !o.hit);
      if (this.integrity <= 0 || this.leakage >= 100) this.end(false);
      if (this.distance >= this.length) this.end(true);
    }
    contractViolations() {
      const v = [];
      if (this.contracts.includes("C-01") && this.revokes > 0) v.push("C-01");
      if (this.contracts.includes("C-02") && this.centerCrossings > 3) v.push("C-02");
      if (this.contracts.includes("C-03") && this.throttles > 0) v.push("C-03");
      if (this.contracts.includes("C-04") && this.missedAudits > 0) v.push("C-04");
      if (this.contracts.includes("C-05") && this.sealMisses > 0) v.push("C-05");
      return v;
    }
    score() {
      const base = Math.floor(this.shards * 20 + this.integrity * 8 + this.consent * 4 + this.trust * 3
                            + this.comboMax * 15 + this.grazes * 4 - this.leakage * 12 - this.latency * 2);
      const mult = this.contracts.reduce((m, id) => m * ((CONTRACTS.find(c => c.id === id) || { mult: 1 }).mult), 1);
      const penalty = this.contractViolations().length ? 0.62 : 1;
      return Math.max(0, Math.floor(base * mult * penalty));
    }
    grade() {
      if (this.integrity >= 96 && this.leakage < 6 && this.comboMax >= 12 &&
          this.gate !== "forced" && this.swarm !== "hit" && this.contractViolations().length === 0) return "S";
      if (this.integrity > 88 && this.leakage < 12 && this.contractViolations().length === 0) return "A";
      if (this.integrity > 70 && this.leakage < 35) return "B";
      if (this.integrity > 45) return "C";
      return "D";
    }
    result() {
      return {
        shards: this.shards,
        integrity_bp: this.integrity,
        leakage_bp: this.leakage,
        consent_bp: this.consent,
        trust_bp: this.trust,
        score: this.score(),
        grade: this.grade(),
        time_ms: this.tick * 16666 / 1000,
        ticks: this.tick,
        distance_cm: this.distance,
        corruption_level: this.corruption,
        branch: this.branch,
        combo_max: this.comboMax,
        grazes: this.grazes,
        sector_reached: this.sector + 1,
        swarm: this.swarm,
        gate: this.gate,
        violations: this.contractViolations()
      };
    }
    proofBody() {
      return { version: 3, game: "Boundary Run v9", release: VERSION, seed: this.seedText, config: { contracts: this.contracts, weather: this.weather }, inputs: this.inputs, branch_event: this.branchEvent, result: this.result() };
    }
    async proof() {
      const body = this.proofBody();
      body.proof_hash = await hashProof(body);
      return body;
    }
    end(ok) { this.finished = true; this.success = ok && this.integrity > 0; }
  }

  async function verifyProof(proof) {
    if (proof && proof.version === 2) return { ok: false, reason: "proof v2 belongs to Boundary Run <= 9.1.0; v9.2.0 verifies proof v3" };
    if (!proof || proof.version !== 3) return { ok: false, reason: "unsupported proof" };
    const copy = JSON.parse(JSON.stringify(proof));
    const old = copy.proof_hash;
    delete copy.proof_hash;
    const expected = await hashProof(copy);
    if (old !== expected) return { ok: false, reason: "hash mismatch", expected, found: old };

    const engine = new Engine(copy.seed, copy.config && copy.config.contracts ? copy.config.contracts : []);
    const inputs = Array.isArray(copy.inputs) ? copy.inputs.slice() : [];
    let ptr = 0;
    while (!engine.finished && engine.tick <= (copy.result && copy.result.ticks ? copy.result.ticks + 4 : 6000)) {
      while (ptr < inputs.length && inputs[ptr].t === engine.tick) {
        if (inputs[ptr].a === "branch_choice") {
          const choice = String(inputs[ptr].data || "").toLowerCase();
          if (choice.includes("safe")) engine.branchChoice("safe");
          else if (choice.includes("fast")) engine.branchChoice("fast");
          else if (choice.includes("audit")) engine.branchChoice("audit");
        } else {
          engine.action(inputs[ptr].a);
        }
        ptr++;
      }
      engine.tickStep();
    }
    const replay = engine.result();
    const same = stableStringify(replay) === stableStringify(copy.result);
    return { ok: same, expected, found: old, reason: same ? "verified" : "replay mismatch", replay };
  }

  function boot() {
    const doc = root.document;
    if (!doc) return;
    const $ = id => doc.getElementById(id);
    const canvas = $("gameCanvas"), ctx = canvas.getContext("2d");
    const menu = $("menu"), gamePanel = $("game"), report = $("report");
    let engine = null, raf = 0, selected = [];
    let resizeTimer = 0;
    const laneY = [0.28, 0.5, 0.72];
    const TICK_MS = 1000 / 120;           // fixed simulation rate: identical feel on 60/90/120 Hz displays
    const reducedMotion = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let paused = false, lastFrame = 0, acc = 0;
    let sessionBest = null;               // in-memory only — nothing is stored on the device

    /* ── audio: procedural WebAudio synth, zero assets, created on first user gesture ── */
    const AudioKit = {
      ctx: null, master: null, muted: false, padNodes: null,
      ensure() {
        if (this.ctx || this.failed) return;
        try {
          const AC = root.AudioContext || root.webkitAudioContext;
          if (!AC) { this.failed = true; return; }
          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.gain.value = this.muted ? 0 : 0.5;
          this.master.connect(this.ctx.destination);
        } catch (_) { this.failed = true; }
      },
      resume() { this.ensure(); if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {}); },
      setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; },
      env(node, t0, a, peak, d) {
        node.gain.setValueAtTime(0.0001, t0);
        node.gain.exponentialRampToValueAtTime(peak, t0 + a);
        node.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
      },
      tone(freq, type, peak, a, d, glide) {
        if (!this.ctx || this.muted) return;
        const t0 = this.ctx.currentTime;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t0);
        if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + a + d);
        this.env(g, t0, a, peak, d);
        o.connect(g); g.connect(this.master);
        o.start(t0); o.stop(t0 + a + d + 0.05);
      },
      noise(peak, d, freq) {
        if (!this.ctx || this.muted) return;
        const t0 = this.ctx.currentTime, n = Math.floor(this.ctx.sampleRate * d);
        const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const src = this.ctx.createBufferSource(); src.buffer = buf;
        const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq || 900;
        const g = this.ctx.createGain(); this.env(g, t0, 0.005, peak, d);
        src.connect(f); f.connect(g); g.connect(this.master); src.start(t0);
      },
      startPad() {
        if (!this.ctx || this.padNodes) return;
        try {
          const t0 = this.ctx.currentTime;
          const g = this.ctx.createGain(); g.gain.value = 0.0001;
          g.gain.exponentialRampToValueAtTime(0.045, t0 + 2.5);
          const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 320; f.Q.value = 0.6;
          const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.07;
          const lg = this.ctx.createGain(); lg.gain.value = 120;
          lfo.connect(lg); lg.connect(f.frequency);
          const o1 = this.ctx.createOscillator(); o1.type = "sawtooth"; o1.frequency.value = 55;
          const o2 = this.ctx.createOscillator(); o2.type = "sawtooth"; o2.frequency.value = 55.35;
          o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
          o1.start(); o2.start(); lfo.start();
          this.padNodes = { g, stop: () => { try { o1.stop(); o2.stop(); lfo.stop(); } catch (_) {} } };
        } catch (_) {}
      },
      stopPad() {
        this.arpStop(); this.hatsStop();
        if (!this.padNodes || !this.ctx) return;
        const p = this.padNodes; this.padNodes = null;
        try {
          p.g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);
          root.setTimeout(p.stop, 700);
        } catch (_) { p.stop(); }
      },
      arpTimer: 0, hatsTimer: 0,
      arpStart() {
        if (this.arpTimer || !this.ctx || this.muted) return;
        const scale = [392, 494, 587, 784, 587, 494];
        let i = 0;
        this.arpTimer = root.setInterval(() => { this.tone(scale[i++ % scale.length], "triangle", 0.045, 0.006, 0.11); }, 150);
      },
      arpStop() { if (this.arpTimer) { root.clearInterval(this.arpTimer); this.arpTimer = 0; } },
      hatsStart() {
        if (this.hatsTimer || !this.ctx || this.muted) return;
        this.hatsTimer = root.setInterval(() => this.noise(0.05, 0.03, 6000), 250);
      },
      hatsStop() { if (this.hatsTimer) { root.clearInterval(this.hatsTimer); this.hatsTimer = 0; } },
      milestone(m) { [523, 659, 784].slice(0, 1 + (m >= 15 ? 1 : 0) + (m >= 20 ? 1 : 0)).forEach((f, i) => root.setTimeout(() => this.tone(f, "sine", 0.12, 0.008, 0.2), i * 70)); },
      drum() { this.noise(0.28, 0.16, 300); this.tone(70, "sine", 0.24, 0.004, 0.22, 40); },
      pickup(streak) { this.tone(760 + Math.min(streak || 0, 10) * 45, "triangle", 0.16, 0.008, 0.14); },
      key() { this.tone(620, "triangle", 0.16, 0.01, 0.2, 930); },
      token() { this.tone(990, "sine", 0.13, 0.008, 0.22); this.tone(1485, "sine", 0.07, 0.008, 0.22); },
      hit() { this.noise(0.34, 0.22, 500); this.tone(96, "sine", 0.3, 0.005, 0.3, 42); },
      whoosh() { this.noise(0.1, 0.14, 2400); },
      seal() { [880, 1320, 1760].forEach((f, i) => root.setTimeout(() => this.tone(f, "sine", 0.1, 0.008, 0.24), i * 55)); },
      dodge(streak) { this.tone(420 + Math.min(streak, 12) * 30, "sine", 0.05, 0.005, 0.07); },
      sting() { this.tone(392, "triangle", 0.14, 0.02, 0.5); this.tone(494, "triangle", 0.1, 0.02, 0.5); this.tone(587, "triangle", 0.1, 0.02, 0.6); },
      fanfare(ok) {
        const seq = ok ? [523, 659, 784, 1046] : [330, 262, 208];
        seq.forEach((f, i) => root.setTimeout(() => this.tone(f, ok ? "triangle" : "sawtooth", ok ? 0.16 : 0.12, 0.012, ok ? 0.3 : 0.5), i * (ok ? 110 : 190)));
      }
    };

    /* ── visual FX state (presentation only — never feeds back into the simulation) ── */
    const fx = {
      parts: [], toasts: [], trail: [],
      shakeT: 0, shakeMag: 0, flashA: 0, flashCol: "255,92,122",
      streak: 0, kiboX: 0, kiboY: 0, ariY: 0, ariVy: 0, sparkPhase: 0,
      prev: null, prevObjs: new Map(), comboPulse: 0, banner: null
    };
    function burst(x, y, color, n, spread, up) {
      if (reducedMotion) return;
      for (let i = 0; i < n && fx.parts.length < 260; i++) {
        const a = Math.random() * Math.PI * 2, sp = (0.6 + Math.random()) * (spread || 3);
        fx.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (up || 0), r: 1.4 + Math.random() * 2.6, life: 1, decay: 0.02 + Math.random() * 0.02, color });
      }
    }
    function toast(text, color) {
      fx.toasts.push({ text, color: color || "#ffd978", life: 1 });
      if (fx.toasts.length > 3) fx.toasts.shift();
    }
    function shake(mag) { if (!reducedMotion) { fx.shakeT = 1; fx.shakeMag = mag; } }
    function banner(text, color) { fx.banner = { text, color, life: 1 }; }
    function flash(col) { fx.flashA = 0.5; fx.flashCol = col; }

    const HAZARDS = ["raw_leak", "stale_consent", "artifact_spike", "unsafe_stim", "unauthorized_app", "memory_phisher"];
    function objectColor(t) {
      return { raw_leak: "#ff4f74", stale_consent: "#a9b3c9", artifact_spike: "#ffffff", unsafe_stim: "#ff304f",
               unauthorized_app: "#b968ff", memory_phisher: "#ff9ee6", shard: "#ffd978", vault_key: "#76ffbd", consent_token: "#6af6ff" }[t] || "#fff";
    }
    function rr(x, y, w2, h2, r) {
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w2, h2, r); }
      else { ctx.beginPath(); ctx.rect(x, y, w2, h2); }
      ctx.fill();
    }

    /* Diff the sim between ticks and translate state changes into juice.
       Reads engine state only; the sim itself is untouched (replay-identical). */
    function snapshot() {
      return { integrity: engine.integrity, leakage: engine.leakage, consent: engine.consent,
               trust: engine.trust, shards: engine.shards, keys: engine.vaultKeys,
               shield: engine.shieldT > 0, lane: engine.lane, msg: engine.message,
               combo: engine.combo, grazes: engine.grazes, sector: engine.sector,
               swarm: engine.swarm, gate: engine.gate, pulse: engine.auditPulseT > 0 };
    }
    function afterTickFx(w, h) {
      const p = fx.prev; if (!p) { fx.prev = snapshot(); return; }
      const s = snapshot();
      const ax = w * 0.13, ay = fx.ariY || h * laneY[engine.lane];
      const dmg = s.integrity < p.integrity;
      // resolve objects that vanished this tick
      const cur = new Set(engine.objects.map(o => o.id));
      fx.prevObjs.forEach((o, id) => {
        if (cur.has(id)) return;
        const oy = h * laneY[o.lane];
        if (o.wasHit || o.lastX < w * 0.2) {
          if (o.wasHit && dmg) { burst(ax + 8, ay, objectColor(o.type), 26, 4.4); }
          else if (o.wasHit) {
            burst(ax + 6, ay - 8, objectColor(o.type), 16, 3, 1.2);
            if (o.type === "shard") { AudioKit.pickup(fx.streak); }
            else if (o.type === "vault_key") { AudioKit.key(); toast("+1 Vault Key", "#76ffbd"); }
            else if (o.type === "consent_token") { AudioKit.token(); toast("Consent +5", "#6af6ff"); }
            else { AudioKit.pickup(2); }
          }
        }
        fx.prevObjs.delete(id);
      });
      engine.objects.forEach(o => fx.prevObjs.set(o.id, { type: o.type, lane: o.lane, lastX: o.x / 100, wasHit: o.hit }));
      if (s.grazes > p.grazes) {
        AudioKit.dodge(s.combo);
        const gy = fx.ariY || h * laneY[engine.lane];
        burst(w * 0.13 + 20, gy, "#87ffb5", 5, 2.2);
      }
      if (s.combo > p.combo) {
        fx.comboPulse = 1;
        if (s.combo >= 5 && p.combo < 5) { toast("FLOW \u00d75", "#87ffb5"); AudioKit.arpStart(); }
        for (const m of [10, 15, 20]) if (s.combo >= m && p.combo < m) { toast("FLOW \u00d7" + m, "#6af6ff"); AudioKit.milestone(m); }
      }
      if (s.combo < p.combo) AudioKit.arpStop();
      if (s.sector > p.sector) {
        banner("SECTOR " + (s.sector + 1) + " / 5", "#6af6ff");
        AudioKit.drum();
        if (s.sector >= 2) AudioKit.hatsStart(); 
      }
      if (s.swarm === "active" && p.swarm !== "active") { banner("PHISHER SWARM", "#ff9ee6"); AudioKit.sting(); }
      if (s.swarm === "cleared" && p.swarm === "active") { banner("SWARM CLEARED  +30\u25c6", "#87ffb5"); AudioKit.fanfare(true); }
      if (s.gate === "clean" && p.gate !== "clean") { banner("GATE: CONSENT VERIFIED", "#87ffb5"); AudioKit.seal(); }
      if (s.gate === "forced" && p.gate !== "forced") { banner("GATE FORCED", "#ff4f74"); flash("255,79,116"); }
      if (dmg) {
        AudioKit.arpStop();
        shake(Math.min(14, 5 + (p.integrity - s.integrity)));
        flash("255,92,122");
        AudioKit.hit();
      }
      if (s.shield && !p.shield) { AudioKit.seal(); burst(ax, ay, "#ffd978", 22, 3.4); }
      if (s.lane !== p.lane) AudioKit.whoosh();
      pulseHud(s, p);
      fx.prev = s;
    }

    /* ── HUD ── */
    const hudBars = { barIntegrity: "integrity", barLeakage: "leakage", barConsent: "consent", barTrust: "trust" };
    function pulseHud(s, p) {
      const map = [["integrity", s.integrity - p.integrity], ["leakage", p.leakage - s.leakage],
                   ["consent", s.consent - p.consent], ["trust", s.trust - p.trust]];
      for (const [cls, d] of map) {
        if (!d) continue;
        const el = doc.querySelector(".hud .stat." + cls);
        if (!el) continue;
        el.classList.remove("pulse-good", "pulse-bad");
        void el.offsetWidth;
        el.classList.add(d > 0 ? "pulse-good" : "pulse-bad");
      }
    }
    let lastMsg = "";
    function updateHud() {
      $("hudIntegrity").textContent = Math.round(engine.integrity);
      $("hudLeakage").textContent = Math.round(engine.leakage);
      $("hudConsent").textContent = Math.round(engine.consent);
      $("hudLatency").textContent = Math.round(engine.latency);
      $("hudTrust").textContent = Math.round(engine.trust);
      $("hudShards").textContent = engine.shards;
      $("hudKeys").textContent = engine.vaultKeys;
      $("hudSector").textContent = (engine.sector + 1) + "/5";
      const cp = $("comboPill");
      if (engine.combo >= 2) { cp.classList.remove("hidden"); cp.textContent = "\u00d7" + engine.combo + " flow"; cp.classList.toggle("hot", engine.combo >= 10); }
      else cp.classList.add("hidden");
      const cds = { audit: [engine.auditCd, COOLDOWN.audit], revoke: [engine.revokeCd, COOLDOWN.revoke], throttle: [engine.throttleCd, COOLDOWN.throttle] };
      doc.querySelectorAll(".actions button").forEach(b => {
        const act = b.dataset.action, c = cds[act];
        if (c) {
          const frac = c[0] / c[1];
          b.classList.toggle("cooling", frac > 0);
          b.style.setProperty("--cd", frac.toFixed(3));
        }
        if (act === "seal") { const k = b.querySelector(".charge"); if (k) k.textContent = engine.vaultKeys; }
        if (act === "quarantine") {
          const k = b.querySelector(".charge"); if (k) k.textContent = engine.quarCharges;
          b.classList.toggle("cooling", engine.quarCharges <= 0);
        }
      });
      for (const id in hudBars) {
        const el = $(id); if (el) el.style.width = clamp(engine[hudBars[id]], 0, 100) + "%";
      }
      if (engine.message !== lastMsg) {
        lastMsg = engine.message;
        const c = $("coach"); c.textContent = engine.message;
        c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
        const live = $("liveStatus"); if (live) live.textContent = engine.message;
      }
      updateHints();
      updateBranchOverlay();
    }
    function renderWeather() {
      const w = $("weatherPanel"); w.textContent = "";
      engine.weather.forEach(name => {
        const chip = doc.createElement("span");
        chip.className = "wchip" + (name === "Stable Boundary" ? "" : " warn");
        chip.textContent = name;
        w.appendChild(chip);
      });
    }
    function updateHints() {
      const hints = new Set();
      const near = engine.objects.filter(o => o.lane === engine.lane && !o.hit && !(o.warnT > 0) && o.x < 90000 && o.x > 14000);
      for (const o of near) {
        if (o.type === "raw_leak" && engine.vaultKeys > 0 && engine.shieldT === 0) hints.add("seal");
        if ((o.type === "stale_consent" || o.type === "memory_phisher") && engine.auditCd === 0) hints.add("audit");
        if (o.type === "unauthorized_app" && engine.quarCharges > 0 && engine.quarantineT === 0) hints.add("quarantine");
      }
      if (engine.swarm === "active" && engine.auditCd === 0) hints.add("audit");
      if (engine.gateSpawned && engine.gate === "none" && engine.consent < 60 && engine.auditCd === 0) hints.add("audit");
      if ((engine.drainT > 0 || engine.consent < 52) && engine.revokeCd === 0) hints.add("revoke");
      if (engine.sector >= 3 && engine.throttleCd === 0 && engine.objects.length > 7) hints.add("throttle");
      doc.querySelectorAll(".actions button").forEach(b => b.classList.toggle("hint", hints.has(b.dataset.action)));
    }
    function updateBranchOverlay() {
      const ov = $("branchOverlay");
      const prog = engine.distance / engine.length;
      const show = !engine.branchEvent && prog >= 0.34 && prog < 0.455 && !engine.finished;
      ov.classList.toggle("hidden", !show);
    }

    /* ── renderer ── */
    let bgStars = null, bgStarsFar = null;
    function buildStars(w, h) {
      function layer(count, rMax, alpha) {
        const c = doc.createElement("canvas"); c.width = w; c.height = h;
        const g = c.getContext("2d");
        for (let i = 0; i < count; i++) {
          const x = Math.random() * w, y = Math.random() * h, r = 0.4 + Math.random() * rMax;
          g.fillStyle = "rgba(" + (Math.random() < 0.22 ? "160,220,255" : "244,240,226") + "," + (alpha * (0.4 + Math.random() * 0.6)).toFixed(2) + ")";
          g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        }
        return c;
      }
      bgStarsFar = layer(Math.floor(w * h / 16000), 1.1, 0.5);
      bgStars = layer(Math.floor(w * h / 22000), 1.7, 0.85);
    }
    function resize() {
      root.clearTimeout(resizeTimer);
      resizeTimer = root.setTimeout(() => {
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(2, root.devicePixelRatio || 1);
        canvas.width = Math.max(320, Math.floor(r.width * dpr));
        canvas.height = Math.max(240, Math.floor(r.height * dpr));
        buildStars(canvas.width, canvas.height);
      }, 80);
    }
    root.addEventListener("resize", resize, { passive: true });

    function drawBackdrop(w, h, t) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#0a1128"); grad.addColorStop(0.55, "#060a18"); grad.addColorStop(1, "#03040a");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      // drifting nebulae
      const nx = [w * (0.24 + 0.05 * Math.sin(t * 0.00006)), w * (0.74 + 0.06 * Math.cos(t * 0.00005)), w * 0.5];
      const ny = [h * 0.22, h * 0.16, h * 0.55];
      const nc = ["106,246,255", "185,104,255", "255,217,120"];
      for (let i = 0; i < 3; i++) {
        const rg = ctx.createRadialGradient(nx[i], ny[i], 0, nx[i], ny[i], Math.max(w, h) * 0.34);
        rg.addColorStop(0, "rgba(" + nc[i] + "," + (i === 2 ? 0.045 : 0.07) + ")");
        rg.addColorStop(1, "rgba(" + nc[i] + ",0)");
        ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
      }
      // parallax starfields
      if (bgStarsFar) { const off = (t * 0.006) % w; ctx.globalAlpha = 0.8; ctx.drawImage(bgStarsFar, -off, 0); ctx.drawImage(bgStarsFar, w - off, 0); ctx.globalAlpha = 1; }
      if (bgStars) { const off = (t * 0.016) % w; ctx.drawImage(bgStars, -off, 0); ctx.drawImage(bgStars, w - off, 0); }
      // horizon glow + perspective floor
      const hy = h * 0.855;
      const hg = ctx.createLinearGradient(0, hy - h * 0.06, 0, h);
      hg.addColorStop(0, "rgba(106,246,255,0)"); hg.addColorStop(0.35, "rgba(106,246,255,0.05)"); hg.addColorStop(1, "rgba(106,246,255,0.11)");
      ctx.fillStyle = hg; ctx.fillRect(0, hy - h * 0.06, w, h);
      ctx.strokeStyle = "rgba(106,246,255,0.12)"; ctx.lineWidth = 1;
      for (let i = -6; i <= 6; i++) {
        ctx.beginPath(); ctx.moveTo(w / 2 + i * w * 0.055, hy); ctx.lineTo(w / 2 + i * w * 0.22, h); ctx.stroke();
      }
      const depth = 900;
      for (let i = 0; i < 8; i++) {
        const z = ((t * 0.06 + i * depth / 8) % depth) / depth;
        const y = hy + (h - hy) * z * z;
        ctx.strokeStyle = "rgba(106,246,255," + (0.03 + z * 0.1).toFixed(3) + ")";
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      // aurora ribbons
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < 2; k++) {
        const yb = h * (0.12 + k * 0.05), amp = h * 0.02, ph = t * 0.0004 + k * 2.1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += w / 24) ctx.lineTo(x, yb + Math.sin(x / w * 6 + ph) * amp);
        ctx.strokeStyle = k ? "rgba(185,104,255,0.05)" : "rgba(106,246,255,0.06)";
        ctx.lineWidth = h * 0.028; ctx.stroke();
      }
      ctx.restore();
    }

    function drawLanes(w, h, t) {
      for (let i = 0; i < 3; i++) {
        const y = h * laneY[i], active = i === engine.lane;
        ctx.strokeStyle = active ? "rgba(255,217,120,0.16)" : "rgba(106,246,255,0.07)";
        ctx.lineWidth = h * 0.052; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        ctx.save();
        ctx.setLineDash([w * 0.02, w * 0.03]);
        ctx.lineDashOffset = -(t * 0.28) % (w * 0.05);
        ctx.strokeStyle = active ? "rgba(255,217,120," + (0.5 + 0.18 * Math.sin(t * 0.008)).toFixed(2) + ")" : "rgba(106,246,255,0.22)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        ctx.restore();
      }
    }

    function drawObject(o, w, h, t, alpha) {
      const scl = Math.max(0.55, h / 720);
      const frozen = o.warnT > 0;
      const x = ((o.x - (frozen ? 0 : o.speed * alpha)) / 100) / LOGICAL_W * w;
      const y = h * laneY[o.lane];
      // Telegraph: even while the body is off-screen right, paint a warning
      // strip on its lane so the player reads the threat before it launches.
      if (frozen) {
        ctx.save();
        const wa = 0.22 + 0.18 * Math.sin(t * 0.02);
        ctx.strokeStyle = "rgba(255,79,116," + wa.toFixed(3) + ")";
        ctx.setLineDash([w * 0.015, w * 0.02]);
        ctx.lineWidth = h * 0.05;
        ctx.beginPath(); ctx.moveTo(w * 0.62, y); ctx.lineTo(w, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "800 " + Math.max(13, w / 74) + "px Inter, system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,79,116," + (0.5 + wa).toFixed(3) + ")";
        ctx.textAlign = "right";
        ctx.fillText("\u26a0", w - 14, y - h * 0.04);
        ctx.restore();
        if (x > w + 60) return;
        ctx.save(); ctx.globalAlpha = 0.4;
      }
      if (!frozen && (x < -60 || x > w + 60)) return;
      if (o.type === "guardian_gate") {
        ctx.save();
        const ga = 0.5 + 0.2 * Math.sin(t * 0.006);
        const gg = ctx.createLinearGradient(x - 26, 0, x + 26, 0);
        gg.addColorStop(0, "rgba(135,255,181,0)");
        gg.addColorStop(0.5, "rgba(135,255,181," + (ga * 0.45).toFixed(3) + ")");
        gg.addColorStop(1, "rgba(135,255,181,0)");
        ctx.fillStyle = gg; ctx.fillRect(x - 26, 0, 52, h);
        ctx.strokeStyle = "rgba(135,255,181," + ga.toFixed(3) + ")";
        ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 0.05;
        ctx.beginPath(); ctx.moveTo(x - 20, 0); ctx.lineTo(x - 20, h);
        ctx.moveTo(x + 20, 0); ctx.lineTo(x + 20, h); ctx.stroke();
        ctx.setLineDash([]);
        for (let sy = (t * 0.12) % 26; sy < h; sy += 26) {
          ctx.fillStyle = "rgba(135,255,181,0.18)"; ctx.fillRect(x - 20, sy, 40, 2);
        }
        ctx.font = "800 " + Math.max(11, w / 96) + "px \"JetBrains Mono\", ui-monospace, monospace";
        ctx.fillStyle = "rgba(135,255,181,0.95)"; ctx.textAlign = "center";
        ctx.fillText("CONSENT SCAN", x, h * 0.09);
        ctx.restore();
        if (frozen) ctx.restore();
        return;
      }
      const col = objectColor(o.type), ph = (engine.tick + alpha) * 0.09 + (o.x % 97);
      ctx.save(); ctx.translate(x, y); ctx.scale(scl, scl);
      if (o.type === "shard") {
        ctx.rotate(ph * 0.6);
        ctx.shadowBlur = 16; ctx.shadowColor = col; ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(9, 0); ctx.lineTo(0, 13); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fillRect(-1, -6, 2, 12); ctx.fillRect(-6, -1, 12, 2);
      } else if (o.type === "vault_key") {
        ctx.shadowBlur = 14; ctx.shadowColor = col; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3.6;
        ctx.beginPath(); ctx.arc(-5, 0, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.fillRect(2, -1.8, 13, 3.6); ctx.fillRect(9, 1.8, 3.4, 5); ctx.fillRect(13.6, 1.8, 3, 6.5);
      } else if (o.type === "consent_token") {
        ctx.shadowBlur = 14; ctx.shadowColor = col; ctx.strokeStyle = col; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(0, 0, 15 + Math.sin(ph) * 2, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(Math.cos(ph * 1.6) * 11, Math.sin(ph * 1.6) * 11, 2.6, 0, Math.PI * 2); ctx.fill();
      } else if (o.type === "raw_leak") {
        ctx.shadowBlur = 18; ctx.shadowColor = col; ctx.fillStyle = col;
        for (const [dx, dy, r] of [[-7, 2, 9], [6, -2, 10], [0, 6, 8]]) { ctx.beginPath(); ctx.arc(dx, dy + Math.sin(ph + dx) * 1.4, r, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 0.35 + 0.2 * Math.sin(ph * 2);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(2, 16 + (ph * 6) % 9, 2.4, 0, Math.PI * 2); ctx.fill();
      } else if (o.type === "stale_consent") {
        ctx.globalAlpha = 0.8 + 0.2 * Math.sin(ph * 3);
        ctx.shadowBlur = 8; ctx.shadowColor = col; ctx.fillStyle = "rgba(169,179,201,0.22)"; ctx.strokeStyle = col; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(12, -9); ctx.lineTo(12, 5); ctx.quadraticCurveTo(12, 14, 0, 17); ctx.quadraticCurveTo(-12, 14, -12, 5); ctx.lineTo(-12, -9); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-3, -10); ctx.lineTo(2, -2); ctx.lineTo(-2, 1); ctx.lineTo(3, 10); ctx.stroke();
      } else if (o.type === "artifact_spike") {
        ctx.shadowBlur = 10; ctx.shadowColor = "#fff"; ctx.fillStyle = "rgba(255,255,255,0.92)";
        const wob = Math.sin(ph * 4) * 1.2;
        for (const dx of [-16, 0, 16]) { ctx.beginPath(); ctx.moveTo(dx - 9, 14); ctx.lineTo(dx, -18 - wob); ctx.lineTo(dx + 9, 14); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(-28, 13, 56, 3);
      } else if (o.type === "unsafe_stim") {
        const bh = 96;
        const bg = ctx.createLinearGradient(0, -bh, 0, 12);
        bg.addColorStop(0, "rgba(255,48,79,0.85)"); bg.addColorStop(1, "rgba(255,48,79,0.15)");
        ctx.shadowBlur = 16; ctx.shadowColor = col; ctx.fillStyle = bg;
        ctx.fillRect(-9, -bh, 18, bh + 8);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        for (let sy = -bh + ((ph * 14) % 18); sy < 4; sy += 18) ctx.fillRect(-9, sy, 18, 2.4);
        ctx.fillStyle = "rgba(255,217,120,0.9)"; ctx.beginPath(); ctx.moveTo(-5, 20); ctx.lineTo(5, 20); ctx.lineTo(0, 28); ctx.closePath(); ctx.fill();
      } else if (o.type === "unauthorized_app") {
        const j = Math.sin(ph * 7) * 1.6;
        ctx.translate(j, 0);
        ctx.shadowBlur = 12; ctx.shadowColor = col; ctx.fillStyle = col;
        rr(-13, -13, 26, 26, 6);
        ctx.fillStyle = "#1a0b2b"; ctx.fillRect(-7, -5, 4, 4); ctx.fillRect(3, -5, 4, 4); ctx.fillRect(-5, 4, 10, 3);
      } else if (o.type === "memory_phisher") {
        const sway = Math.sin(ph * 1.4) * 4;
        ctx.translate(0, sway);
        ctx.shadowBlur = 12; ctx.shadowColor = col; ctx.strokeStyle = col; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 4); ctx.arc(-5, 4, 5, 0, Math.PI, false); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, -18, 3.6 + Math.sin(ph * 5), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      if (frozen) ctx.restore();
    }

    function drawKibo(w, h, t) {
      const scl = Math.max(0.6, h / 720);
      const tx = w * 0.075, ty = fx.ariY - 34 * scl + Math.sin(t * 0.004) * 6 * scl;
      if (!fx.kiboX) { fx.kiboX = tx; fx.kiboY = ty; }
      fx.kiboX += (tx - fx.kiboX) * 0.1; fx.kiboY += (ty - fx.kiboY) * 0.1;
      ctx.save(); ctx.translate(fx.kiboX, fx.kiboY); ctx.scale(scl, scl);
      ctx.shadowBlur = 14; ctx.shadowColor = "#ffd978";
      const flap = Math.sin(t * 0.02) * 0.5;
      ctx.strokeStyle = "rgba(255,217,120,0.85)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-4, -4); ctx.quadraticCurveTo(-16, -16 - flap * 8, -24, -6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -4); ctx.quadraticCurveTo(16, -16 + flap * 8, 24, -6); ctx.stroke();
      ctx.fillStyle = "#f8f0cf"; ctx.beginPath(); ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.arc(4, -2, 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (!reducedMotion && engine.tick % 6 === 0 && fx.parts.length < 240)
        fx.parts.push({ x: fx.kiboX - 10 * scl, y: fx.kiboY + 4, vx: -0.6, vy: 0.15, r: 1.3, life: 0.7, decay: 0.02, color: "#ffd978" });
    }

    function drawAri(w, h, t, alpha) {
      const scl = Math.max(0.68, h / 720);
      const x = w * 0.13;
      const jump = engine.jumpT > 0 ? -58 * Math.sin(engine.jumpT / 18 * Math.PI) * scl : 0;
      const duck = engine.duckT > 0 ? 20 * scl : 0;
      const target = h * laneY[engine.lane] + jump + duck;
      if (!fx.ariY) fx.ariY = target;
      const prevY = fx.ariY;
      fx.ariY += (target - fx.ariY) * 0.38;   // snappier lane response (v9.2.0 controls)
      fx.ariVy = fx.ariY - prevY;
      const y = fx.ariY;
      const tilt = clamp(fx.ariVy * 0.012, -0.3, 0.3);
      const squash = engine.duckT > 0 ? 0.62 : 1 - clamp(Math.abs(fx.ariVy) * 0.004, 0, 0.14);
      // afterimage trail
      if (!reducedMotion && engine.tick % 2 === 0) {
        fx.trail.push({ x, y: y + 2, a: 0.34 });
        if (fx.trail.length > 12) fx.trail.shift();
      }
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      fx.trail.forEach((tr, i) => {
        tr.x -= w * 0.004; tr.a *= 0.9;
        ctx.fillStyle = "rgba(106,246,255," + (tr.a * (i / fx.trail.length)).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(tr.x, tr.y, (6 + i) * scl * 0.5, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
      ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(scl / squash * (engine.duckT > 0 ? 1.2 : 1), scl * squash);
      const low = engine.integrity < 35;
      if (low && Math.floor(t * 0.02) % 7 === 0) ctx.translate((Math.random() - 0.5) * 5, 0);
      ctx.shadowBlur = 26; ctx.shadowColor = engine.shieldT > 0 ? "#ffd978" : "#6af6ff";
      // body
      const bodyGrad = ctx.createRadialGradient(-5, -6, 2, 0, 0, 26);
      bodyGrad.addColorStop(0, "#fffdf0"); bodyGrad.addColorStop(1, engine.integrity > 70 ? "#ffe9a8" : "#ffc0c8");
      ctx.fillStyle = bodyGrad;
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 24, 0, 0, Math.PI * 2); ctx.fill();
      // visor + eyes with blink
      ctx.fillStyle = "rgba(9,17,31,0.85)"; ctx.beginPath(); ctx.ellipse(4, -8, 13, 9, -0.12, 0, Math.PI * 2); ctx.fill();
      const blink = (engine.tick % 300) > 292 ? 0.15 : 1;
      ctx.fillStyle = "#6af6ff";
      ctx.beginPath(); ctx.ellipse(0, -9, 2.7, 2.7 * blink, 0, 0, Math.PI * 2); ctx.ellipse(9, -9, 2.7, 2.7 * blink, 0, 0, Math.PI * 2); ctx.fill();
      // antenna
      ctx.strokeStyle = "rgba(255,217,120,0.9)"; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-3, -22); ctx.quadraticCurveTo(-7, -32, -2, -35); ctx.stroke();
      ctx.fillStyle = "#ffd978"; ctx.beginPath(); ctx.arc(-2, -36, 3 + Math.sin(t * 0.012) * 0.8, 0, Math.PI * 2); ctx.fill();
      // Intent Spark (the choice Ari carries)
      const pulse = 1 + Math.sin(t * 0.014) * 0.14;
      ctx.save(); ctx.translate(1, 9); ctx.scale(pulse, pulse);
      ctx.shadowBlur = 16; ctx.shadowColor = "#ff7b97"; ctx.fillStyle = "#ff7b97";
      ctx.beginPath(); ctx.arc(-3, -2, 4, 0, Math.PI * 2); ctx.arc(3, -2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6.6, 0); ctx.lineTo(0, 8); ctx.lineTo(6.6, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
      // scarf
      ctx.strokeStyle = "rgba(106,246,255,0.8)"; ctx.lineWidth = 4; ctx.lineCap = "round";
      const wv = Math.sin(t * 0.02) * 5;
      ctx.beginPath(); ctx.moveTo(-14, 3); ctx.quadraticCurveTo(-30, 8 + wv, -44, 4 + wv * 1.6); ctx.stroke();
      // shield bubble
      if (engine.shieldT > 0) {
        ctx.save(); ctx.rotate(t * 0.003);
        ctx.strokeStyle = "rgba(255,217,120,0.85)"; ctx.lineWidth = 3.4; ctx.setLineDash([14, 9]);
        ctx.beginPath(); ctx.arc(0, -2, 42, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
      // jump dust
      if (engine.jumpT === 17) burst(x, h * laneY[engine.lane] + 16 * scl, "#6af6ff", 8, 2.4, 1.6);
    }

    function drawParticles() {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (let i = fx.parts.length - 1; i >= 0; i--) {
        const p = fx.parts[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= p.decay;
        if (p.life <= 0) { fx.parts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }

    function drawToasts(w, h) {
      ctx.save(); ctx.textAlign = "center";
      fx.toasts.forEach((tst, i) => {
        tst.life -= 0.012;
        ctx.globalAlpha = clamp(tst.life, 0, 1);
        ctx.font = "800 " + Math.max(15, w / 62) + "px Inter, system-ui, sans-serif";
        ctx.fillStyle = tst.color;
        ctx.shadowBlur = 12; ctx.shadowColor = tst.color;
        ctx.fillText(tst.text, w / 2, h * 0.3 - i * (w / 44) - (1 - tst.life) * 34);
      });
      fx.toasts = fx.toasts.filter(x => x.life > 0);
      ctx.restore(); ctx.globalAlpha = 1;
    }

    function drawCombo(w, h) {
      if (engine.combo < 2) { fx.comboPulse *= 0.9; return; }
      fx.comboPulse *= 0.88;
      const k = 1 + fx.comboPulse * 0.35;
      const hot = engine.combo >= 10;
      ctx.save();
      ctx.translate(w - Math.max(96, w * 0.09), h * 0.16);
      ctx.scale(k, k);
      ctx.textAlign = "center";
      ctx.font = "900 " + Math.max(24, w / 34) + "px Inter, system-ui, sans-serif";
      ctx.shadowBlur = 18; ctx.shadowColor = hot ? "#6af6ff" : "#87ffb5";
      ctx.fillStyle = hot ? "#6af6ff" : "#87ffb5";
      ctx.fillText("\u00d7" + engine.combo, 0, 0);
      ctx.font = "800 " + Math.max(10, w / 110) + "px Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(244,240,226,0.75)"; ctx.shadowBlur = 0;
      ctx.fillText("FLOW", 0, Math.max(16, w / 60));
      ctx.restore();
    }
    function drawBanner(w, h) {
      const b = fx.banner; if (!b) return;
      b.life -= 0.012;
      if (b.life <= 0) { fx.banner = null; return; }
      const inA = clamp((1 - b.life) * 6, 0, 1), outA = clamp(b.life * 4, 0, 1);
      const a2 = Math.min(inA, outA);
      ctx.save();
      ctx.globalAlpha = a2 * 0.92;
      ctx.textAlign = "center";
      ctx.font = "900 " + Math.max(26, w / 22) + "px Inter, system-ui, sans-serif";
      ctx.shadowBlur = 26; ctx.shadowColor = b.color;
      ctx.fillStyle = b.color;
      const yy = h * 0.42 - (1 - b.life) * 12;
      ctx.fillText(b.text, w / 2, yy);
      ctx.globalAlpha = a2 * 0.5;
      ctx.fillStyle = "rgba(5,7,12,0.6)"; ctx.shadowBlur = 0;
      ctx.fillRect(0, yy - h * 0.075, w, h * 0.11);
      ctx.globalAlpha = a2 * 0.92;
      ctx.fillStyle = b.color; ctx.shadowBlur = 26; ctx.shadowColor = b.color;
      ctx.fillText(b.text, w / 2, yy);
      ctx.restore();
    }
    function drawProgress(w, h) {
      const y = h - Math.max(96, h * 0.155), bw = w * 0.56, bx = (w - bw) / 2;
      const p = clamp(engine.distance / engine.length, 0, 1);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      rr(bx, y, bw, 7, 4);
      const pg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      pg.addColorStop(0, "#6af6ff"); pg.addColorStop(1, "#ffd978");
      ctx.fillStyle = pg;
      rr(bx, y, bw * p, 7, 4);
      // branch milestone diamond at 46%
      const mx = bx + bw * 0.46;
      ctx.save(); ctx.translate(mx, y + 3.5); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = engine.branchEvent ? "#87ffb5" : "#ffd978";
      ctx.shadowBlur = engine.branchEvent ? 4 : 10; ctx.shadowColor = ctx.fillStyle;
      ctx.fillRect(-5, -5, 10, 10); ctx.restore();
      ctx.fillStyle = "rgba(244,240,226,0.85)";
      ctx.font = "700 " + Math.max(11, w / 96) + "px " + '"JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = "left";
      ctx.fillText(Math.round(p * 100) + "%", bx + bw + 12, y + 8);
    }

    function draw(alpha) {
      const w = canvas.width, h = canvas.height;
      const t = engine.tick * TICK_MS + alpha * TICK_MS;
      ctx.save();
      if (fx.shakeT > 0) {
        fx.shakeT -= 0.06;
        const m = fx.shakeMag * fx.shakeT;
        ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
      }
      drawBackdrop(w, h, t);
      drawLanes(w, h, t);
      engine.objects.forEach(o => drawObject(o, w, h, t, alpha));
      drawKibo(w, h, t);
      drawAri(w, h, t, alpha);
      drawParticles();
      drawToasts(w, h);
      drawCombo(w, h);
      drawBanner(w, h);
      drawProgress(w, h);
      // vignette + low-integrity pulse + hit flash
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.42)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
      if (engine.integrity < 35) {
        ctx.fillStyle = "rgba(255,60,90," + (0.05 + 0.04 * Math.sin(t * 0.01)).toFixed(3) + ")";
        ctx.fillRect(0, 0, w, h);
      }
      if (fx.flashA > 0) {
        ctx.fillStyle = "rgba(" + fx.flashCol + "," + (fx.flashA * 0.36).toFixed(3) + ")";
        ctx.fillRect(0, 0, w, h);
        fx.flashA -= 0.05;
      }
      ctx.restore();
    }

    /* ── menu ── */
    function renderContracts() {
      const list = $("contractList"); list.textContent = "";
      CONTRACTS.forEach(c => {
        const el = doc.createElement("button");
        el.type = "button";
        el.className = "contract-card";
        const title = doc.createElement("b"); title.textContent = c.name;
        const mult = doc.createElement("span"); mult.className = "mult"; mult.textContent = "\u00d7" + c.mult;
        const body = doc.createElement("small"); body.textContent = c.rule + " \u2014 " + c.lesson;
        el.append(title, mult, body);
        el.setAttribute("aria-pressed", selected.includes(c.id) ? "true" : "false");
        el.onclick = () => { if (selected.includes(c.id)) selected = selected.filter(x => x !== c.id); else if (selected.length < 2) selected.push(c.id); renderContracts(); };
        if (selected.includes(c.id)) el.classList.add("active");
        list.appendChild(el);
      });
    }
    renderContracts();
    $("dailyBtn").onclick = () => { $("seedInput").value = dailySeed(); };

    /* ── run lifecycle ── */
    function setPaused(v) {
      if (!engine || engine.finished) return;
      paused = v;
      $("pauseVeil").classList.toggle("hidden", !paused);
      $("pauseBtn").textContent = paused ? "\u25B6 Resume" : "\u23F8 Pause";
      if (paused) AudioKit.stopPad(); else { AudioKit.resume(); AudioKit.startPad(); }
    }
    function start() {
      cancelAnimationFrame(raf);
      try {
        engine = new Engine($("seedInput").value.trim() || "daily", selected);
      } catch (err) {
        alert(err.message || "Invalid run configuration.");
        return;
      }
      fx.parts.length = 0; fx.toasts.length = 0; fx.trail.length = 0;
      fx.streak = 0; fx.prev = null; fx.prevObjs.clear();
      fx.ariY = 0; fx.kiboX = 0; fx.kiboY = 0; fx.shakeT = 0; fx.flashA = 0;
      fx.comboPulse = 0; fx.banner = null;
      lastMsg = ""; paused = false; acc = 0; lastFrame = 0;
      menu.classList.add("hidden"); report.classList.add("hidden"); gamePanel.classList.remove("hidden");
      $("pauseBtn").classList.remove("hidden");
      $("pauseVeil").classList.add("hidden");
      $("branchOverlay").classList.add("hidden");
      const sw = $("swipeHint");
      const isTouch = "ontouchstart" in root || (root.navigator && root.navigator.maxTouchPoints > 0);
      $("touchPads").classList.toggle("hidden", !isTouch);
      if (isTouch) { sw.classList.remove("hidden"); root.setTimeout(() => sw.classList.add("hidden"), 5200); }
      renderWeather();
      AudioKit.resume(); AudioKit.startPad();
      resize();
      root.setTimeout(() => { lastFrame = 0; raf = requestAnimationFrame(frame); }, 90);
    }
    $("runBtn").onclick = start;
    $("againBtn").onclick = start;
    $("menuBtn").onclick = () => {
      cancelAnimationFrame(raf); AudioKit.stopPad();
      report.classList.add("hidden"); gamePanel.classList.add("hidden");
      $("pauseBtn").classList.add("hidden");
      $("touchPads").classList.add("hidden");
      menu.classList.remove("hidden");
    };
    $("pauseBtn").onclick = () => setPaused(!paused);
    $("pauseVeil").onclick = () => setPaused(false);
    $("muteBtn").onclick = () => {
      AudioKit.ensure();
      AudioKit.setMuted(!AudioKit.muted);
      $("muteBtn").textContent = AudioKit.muted ? "\uD83D\uDD07 Muted" : "\uD83D\uDD0A Sound";
      $("muteBtn").setAttribute("aria-pressed", AudioKit.muted ? "true" : "false");
    };
    doc.addEventListener("visibilitychange", () => { if (doc.hidden && engine && !engine.finished) setPaused(true); });

    doc.querySelectorAll(".actions button").forEach(b => b.onclick = () => { if (engine && !paused) engine.action(b.dataset.action); });
    doc.querySelectorAll("#branchOverlay .branch-opts button").forEach(b => b.onclick = () => {
      if (!engine || engine.branchEvent || paused) return;
      engine.branchChoice(b.dataset.branch);
      AudioKit.sting();
      toast(engine.branch, "#ffd978");
      $("branchOverlay").classList.add("hidden");
    });

    doc.addEventListener("keydown", e => {
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === "m") { $("muteBtn").click(); return; }
      if (!engine || engine.finished || gamePanel.classList.contains("hidden")) return;
      if (k === "p" || k === "escape") { e.preventDefault(); setPaused(!paused); return; }
      if (paused) return;
      if (e.repeat) return;   // one intent per press — autorepeat never spams the proof
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(k)) e.preventDefault();
      if (k === "arrowleft" || k === "a") engine.action("left");
      if (k === "arrowright" || k === "d") engine.action("right");
      if (k === "arrowup" || k === "w") engine.action("jump");
      if (k === "arrowdown" || k === "s") engine.action("duck");
      if (k === "1") engine.action("audit"); if (k === "2") engine.action("revoke"); if (k === "3") engine.action("throttle"); if (k === "4") engine.action("seal"); if (k === "5") engine.action("quarantine");
    });
    /* ── v9.2.0 controls: everything fires on pointerDOWN / first movement,
       never on release. Latency is one frame, not one gesture. ── */
    const act = name => { if (engine && !paused && !engine.finished) engine.action(name); };
    // on-screen pads (touch devices)
    doc.querySelectorAll("#touchPads button").forEach(b => {
      b.addEventListener("pointerdown", e => { e.preventDefault(); AudioKit.resume(); act(b.dataset.move); }, { passive: false });
      b.addEventListener("contextmenu", e => e.preventDefault());
    });
    // canvas: instant tap zones (side thirds = lane) + instant swipe (fires
    // the moment the threshold is crossed, once per pointer)
    let ptr = null;
    canvas.addEventListener("pointerdown", e => {
      e.preventDefault(); AudioKit.resume();
      const r = canvas.getBoundingClientRect();
      const rx = (e.clientX - r.left) / Math.max(1, r.width);
      ptr = { x: e.clientX, y: e.clientY, used: false };
      if (rx < 0.34) { act("left"); ptr.used = true; }
      else if (rx > 0.66) { act("right"); ptr.used = true; }
    }, { passive: false });
    canvas.addEventListener("pointermove", e => {
      if (!ptr || ptr.used) return;
      const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) { act(dy < 0 ? "jump" : "duck"); ptr.used = true; }
      else if (Math.abs(dx) > 30) { act(dx < 0 ? "left" : "right"); ptr.used = true; }
    }, { passive: true });
    canvas.addEventListener("pointerup", () => { ptr = null; });
    canvas.addEventListener("pointercancel", () => { ptr = null; });
    canvas.addEventListener("touchmove", e => e.preventDefault(), { passive: false });

    /* ── report ── */
    function portrait(hash, integrityBp) { const hue = Math.floor(integrityBp * 1.2); let svg = `<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="160" rx="24" fill="#08111f"/>`; for (let i = 0; i < 5; i++) { const n = parseInt(hash.slice(i * 4, i * 4 + 4), 16); const x = 35 + (n % 170), y = 25 + ((n >>> 4) % 110), r = 18 + ((n >>> 8) % 32); svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="hsl(${(hue + i * 28) % 360} 80% 62%)" stroke-width="3" opacity=".75"/>`; } svg += `<text x="120" y="145" fill="#ffd978" font-size="11" text-anchor="middle">Proof #${hash.slice(0, 12)}</text></svg>`; return svg; }
    function countUp(el, target, ms) {
      const t0 = performance.now();
      function step(now) {
        const p = clamp((now - t0) / ms, 0, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * e);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    async function showReport() {
      cancelAnimationFrame(raf);
      AudioKit.stopPad();
      const proof = await engine.proof();
      const ok = engine.success;
      AudioKit.fanfare(ok);
      gamePanel.classList.add("hidden");
      $("pauseBtn").classList.add("hidden");
      report.classList.remove("hidden");
      const med = $("medallion");
      med.textContent = proof.result.grade;
      med.classList.toggle("fail", !ok);
      $("reportTitle").textContent = ok ? "Intent Delivered" : "Boundary Lost";
      $("reportLine").textContent = ok ? "You protected the choice, not the thought." : "The run failed. The person is still more than the signal.";
      $("reportGrade").textContent = proof.result.grade;
      countUp($("reportScore"), proof.result.score, 850);
      $("reportIntegrity").textContent = proof.result.integrity_bp + "%";
      $("reportCombo").textContent = "\u00d7" + proof.result.combo_max;
      $("reportGrazes").textContent = proof.result.grazes;
      $("reportSector").textContent = proof.result.sector_reached + "/5";
      med.classList.toggle("s", proof.result.grade === "S");
      const sp = $("setpieces");
      const swTxt = proof.result.swarm === "cleared" ? "Swarm cleared" : proof.result.swarm === "hit" ? "Swarm breached" : "Swarm not reached";
      const gtTxt = proof.result.gate === "clean" ? "Gate: consent verified" : proof.result.gate === "forced" ? "Gate forced" : "Gate not reached";
      sp.textContent = swTxt + " \u00b7 " + gtTxt;
      sp.className = "setpieces " + (proof.result.swarm === "cleared" && proof.result.gate === "clean" ? "good" : proof.result.swarm === "hit" || proof.result.gate === "forced" ? "bad" : "");
      $("reportHash").textContent = proof.proof_hash.slice(0, 12);
      $("proofBox").value = JSON.stringify(proof, null, 2);
      $("portrait").innerHTML = portrait(proof.proof_hash, proof.result.integrity_bp);
      const sb = $("sessionBest");
      if (!sessionBest || proof.result.score > sessionBest) {
        sessionBest = proof.result.score;
        sb.textContent = "\u2605 New session best \u2014 " + sessionBest;
      } else {
        sb.textContent = "Session best: " + sessionBest;
      }
      sb.classList.remove("hidden");
      const vio = $("violations"); vio.textContent = "";
      if (proof.result.violations.length) {
        proof.result.violations.forEach(id => {
          const c = CONTRACTS.find(x => x.id === id);
          const chip = doc.createElement("span");
          chip.textContent = "Violated: " + (c ? c.name : id);
          vio.appendChild(chip);
        });
        vio.classList.remove("hidden");
      } else vio.classList.add("hidden");
      $("verifyLine").textContent = "";
    }
    const DOGE = "DMwHAhqVNWf7dyEznukxCufNS5rjuP5MTp";
    doc.querySelectorAll(".doge-copy").forEach(b => b.onclick = async () => {
      try { await navigator.clipboard.writeText(DOGE); b.textContent = "Copied \u2713"; }
      catch (_) { b.textContent = "Select manually"; }
      root.setTimeout(() => { b.textContent = "Copy"; }, 1600);
    });
    $("copyProofBtn").onclick = async () => { try { await navigator.clipboard.writeText($("proofBox").value); $("verifyLine").textContent = "Proof copied."; } catch (_) { $("verifyLine").textContent = "Select and copy the proof manually."; } };
    $("verifyProofBtn").onclick = async () => { try { const v = await verifyProof(JSON.parse($("proofBox").value)); $("verifyLine").textContent = v.ok ? "Proof v2 verified by replay." : "Proof mismatch: " + (v.reason || "unknown"); } catch (e) { $("verifyLine").textContent = "Proof parse failed."; } };

    /* ── fixed-timestep main loop with render interpolation ──
       The simulation always advances at 120 ticks per second of wall time, so the
       game plays identically on 60, 90 and 144 Hz displays; rendering interpolates
       between ticks for smooth motion. Replay proofs are tick-indexed and unaffected. */
    function frame(now) {
      try {
        if (!lastFrame) lastFrame = now;
        if (!paused) {
          acc = Math.min(acc + (now - lastFrame), TICK_MS * 6);
          while (acc >= TICK_MS && !engine.finished) {
            engine.tickStep();
            afterTickFx(canvas.width, canvas.height);
            acc -= TICK_MS;
          }
        }
        lastFrame = now;
        updateHud();
        draw(paused ? 0 : acc / TICK_MS);
        if (engine.finished) return showReport();
        raf = requestAnimationFrame(frame);
      } catch (err) {
        cancelAnimationFrame(raf);
        $("coach").textContent = "Runtime error: " + (err.message || err);
      }
    }
  }

  const api = { VERSION, CONTRACTS, WEATHER, ACTIONS, Engine, verifyProof, hashProof, dailySeed, stableStringify };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BoundaryRunV9 = api;
  if (root.document) {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", boot, { once: true });
    else boot();
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
