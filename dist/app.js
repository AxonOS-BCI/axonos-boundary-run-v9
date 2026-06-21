(function (root) {
  "use strict";

  const VERSION = "9.0.2";
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
        if (this.duckT > 0) return;
        this.record(name, null);
        this.jumpT = 18;
        this.message = "Ari jumped over the spike.";
        return;
      }
      if (name === "duck") {
        if (this.jumpT > 0) return;
        this.record(name, null);
        this.duckT = 20;
        this.message = "Ari compressed the signal path.";
        return;
      }
      this.record(name, null);
      if (name === "left") return this.setLane(this.lane - 1);
      if (name === "right") return this.setLane(this.lane + 1);
      if (name === "audit") { this.auditCount++; this.latency = clamp(this.latency + 3, 0, 100); this.trust = clamp(this.trust + 3, 0, 100); this.message = "Audit reveals what is asking for access."; return; }
      if (name === "revoke") { this.revokes++; this.consent = clamp(this.consent + 9, 0, 100); this.latency = clamp(this.latency + 2, 0, 100); this.message = "Consent must stay revocable."; return; }
      if (name === "throttle") { this.throttles++; this.latency = clamp(this.latency - 11, 0, 100); this.integrity = clamp(this.integrity + 3, 0, 100); this.message = "Throttle prioritizes safety over speed."; return; }
      if (name === "seal") {
        if (this.vaultKeys > 0) { this.vaultKeys--; this.shieldT = 44; this.trust = clamp(this.trust + 7, 0, 100); this.message = "Seal Vault protects Ari's Intent Spark."; }
        else { this.message = "No Vault Keys left. Dodge the leak."; this.trust = clamp(this.trust - 4, 0, 100); }
        return;
      }
      if (name === "quarantine") { this.quarantines++; this.integrity = clamp(this.integrity + 4, 0, 100); this.latency = clamp(this.latency + 4, 0, 100); this.message = "Suspicious access isolated."; }
    }
    spawn() {
      const interval = this.branch === "Fast Lane" ? 42 : this.branch === "Safe Lane" ? 64 : 54;
      if (this.tick - this.lastSpawn < interval) return;
      this.lastSpawn = this.tick;
      const h = hash32(`${this.seedText}:${this.tick}:${this.distance}`);
      const lane = h % 3;
      const roll = (h >>> 5) % 100;
      let type = "shard";
      if (roll < 18) type = "raw_leak";
      else if (roll < 31) type = "stale_consent";
      else if (roll < 43) type = "artifact_spike";
      else if (roll < 53) type = "unsafe_stim";
      else if (roll < 61) type = "unauthorized_app";
      else if (roll < 68) type = "memory_phisher";
      else if (roll < 75) type = "vault_key";
      else if (roll < 82) type = "consent_token";
      const speed = 500 + ((h >>> 16) % 22) * 10 + (this.branch === "Fast Lane" ? 120 : 0); // centi-pixels per tick
      this.objects.push({ id: hex32(h), type, lane, x: 132000, speed, hit: false });
    }
    applyCollision(o) {
      const left = Math.floor(COLLISION_LEFT_RATIO * LOGICAL_W * 100);
      const right = Math.floor(COLLISION_RIGHT_RATIO * LOGICAL_W * 100);
      if (o.hit || o.lane !== this.lane || o.x > right || o.x < left) return;
      o.hit = true;
      if (o.type === "shard") { this.shards += this.weather.includes("Data Gravity") ? 9 : 3; this.trust = clamp(this.trust + 1, 0, 100); this.message = "Proof Shard collected."; return; }
      if (o.type === "vault_key") { this.vaultKeys++; this.message = "Vault Key recovered."; return; }
      if (o.type === "consent_token") { this.consent = clamp(this.consent + 5, 0, 100); this.message = "Consent Token stabilized the gate."; return; }
      if (o.type === "artifact_spike" && this.jumpT > 0) { this.shards += 2; this.message = "Spike avoided. Not every signal is intent."; return; }
      if (o.type === "unsafe_stim" && this.duckT > 0) { this.integrity = clamp(this.integrity + 2, 0, 100); this.message = "Unsafe beam compressed safely."; return; }
      if (o.type === "raw_leak" && this.shieldT > 0) { this.shards += 5; this.message = "Raw leak sealed. Private data stayed private."; return; }
      if (o.type === "stale_consent" && this.auditCount > 0) { this.consent = clamp(this.consent + 2, 0, 100); this.message = "Stale consent detected. Revoke recommended."; return; }
      if (o.type === "unauthorized_app" && this.quarantines > 0) { this.shards += 4; this.message = "Unauthorized app isolated."; return; }
      if (o.type === "memory_phisher" && this.auditCount > 0) { this.message = "Phisher exposed by Audit."; return; }
      const damage = o.type === "raw_leak" ? 20 : o.type === "unsafe_stim" ? 18 : 10;
      this.integrity = clamp(this.integrity - damage, 0, 100);
      this.leakage = clamp(this.leakage + (o.type === "raw_leak" ? 18 : 7), 0, 100);
      this.consent = clamp(this.consent - (o.type === "stale_consent" ? 14 : 2), 0, 100);
      this.trust = clamp(this.trust - 8, 0, 100);
      this.corruption = clamp(this.corruption + 1, 0, 3);
      if (o.type === "raw_leak") this.sealMisses++;
      if (o.type === "stale_consent") this.missedAudits++;
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
      this.jumpT = Math.max(0, this.jumpT - 1);
      this.duckT = Math.max(0, this.duckT - 1);
      this.shieldT = Math.max(0, this.shieldT - 1);
      this.spawn();
      for (const o of this.objects) { o.x -= o.speed; this.applyCollision(o); }
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
      const base = Math.floor(this.shards * 20 + this.integrity * 8 + this.consent * 4 + this.trust * 3 - this.leakage * 12 - this.latency * 2);
      const mult = this.contracts.reduce((m, id) => m * ((CONTRACTS.find(c => c.id === id) || { mult: 1 }).mult), 1);
      const penalty = this.contractViolations().length ? 0.62 : 1;
      return Math.max(0, Math.floor(base * mult * penalty));
    }
    grade() {
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
        violations: this.contractViolations()
      };
    }
    proofBody() {
      return { version: 2, game: "Boundary Run v9", release: VERSION, seed: this.seedText, config: { contracts: this.contracts, weather: this.weather }, inputs: this.inputs, branch_event: this.branchEvent, result: this.result() };
    }
    async proof() {
      const body = this.proofBody();
      body.proof_hash = await hashProof(body);
      return body;
    }
    end(ok) { this.finished = true; this.success = ok && this.integrity > 0; }
  }

  async function verifyProof(proof) {
    if (!proof || proof.version !== 2) return { ok: false, reason: "unsupported proof" };
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
    let bgGradient = null;

    function resize() {
      root.clearTimeout(resizeTimer);
      resizeTimer = root.setTimeout(() => {
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(2, root.devicePixelRatio || 1);
        canvas.width = Math.max(320, Math.floor(r.width * dpr));
        canvas.height = Math.max(240, Math.floor(r.height * dpr));
        bgGradient = null;
      }, 80);
    }
    root.addEventListener("resize", resize, { passive: true });

    function renderContracts() {
      const list = $("contractList"); list.textContent = "";
      CONTRACTS.forEach(c => {
        const el = doc.createElement("button");
        el.type = "button";
        el.className = "contract-card";
        const title = doc.createElement("b"); title.textContent = `${c.name} · ×${c.mult}`;
        const body = doc.createElement("small"); body.textContent = `${c.rule} — ${c.lesson}`;
        el.append(title, body);
        el.onclick = () => { if (selected.includes(c.id)) selected = selected.filter(x => x !== c.id); else if (selected.length < 2) selected.push(c.id); renderContracts(); };
        if (selected.includes(c.id)) el.classList.add("active");
        list.appendChild(el);
      });
    }
    renderContracts();
    $("dailyBtn").onclick = () => { $("seedInput").value = dailySeed(); };

    function start() {
      cancelAnimationFrame(raf);
      try {
        engine = new Engine($("seedInput").value.trim() || "daily", selected);
      } catch (err) {
        $("coach").textContent = err.message || "Invalid run configuration.";
        alert(err.message || "Invalid run configuration.");
        return;
      }
      menu.classList.add("hidden"); report.classList.add("hidden"); gamePanel.classList.remove("hidden");
      resize(); setTimeout(loop, 90);
    }
    $("runBtn").onclick = start;
    $("againBtn").onclick = start;
    $("menuBtn").onclick = () => { cancelAnimationFrame(raf); report.classList.add("hidden"); gamePanel.classList.add("hidden"); menu.classList.remove("hidden"); };

    doc.querySelectorAll(".actions button").forEach(b => b.onclick = () => { if (engine) engine.action(b.dataset.action); });
    doc.addEventListener("keydown", e => {
      if (!engine || engine.finished) return;
      const k = e.key.toLowerCase();
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(k)) e.preventDefault();
      if (k === "arrowleft" || k === "a") engine.action("left");
      if (k === "arrowright" || k === "d") engine.action("right");
      if (k === "arrowup" || k === "w") engine.action("jump");
      if (k === "arrowdown" || k === "s") engine.action("duck");
      if (k === "1") engine.action("audit"); if (k === "2") engine.action("revoke"); if (k === "3") engine.action("throttle"); if (k === "4") engine.action("seal"); if (k === "5") engine.action("quarantine");
    });
    let touch = null;
    canvas.addEventListener("touchstart", e => { e.preventDefault(); const t = e.changedTouches[0]; touch = { x: t.clientX, y: t.clientY }; }, { passive: false });
    canvas.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
    canvas.addEventListener("touchend", e => { e.preventDefault(); if (!touch || !engine) return; const t = e.changedTouches[0]; const dx = t.clientX - touch.x, dy = t.clientY - touch.y; if (Math.abs(dx) > Math.abs(dy)) engine.action(dx < 0 ? "left" : "right"); else engine.action(dy < 0 ? "jump" : "duck"); touch = null; }, { passive: false });

    function drawAri(x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.shadowBlur = canvas.width < 800 ? 14 : 28; ctx.shadowColor = engine.shieldT > 0 ? "#ffd978" : "#6af6ff";
      ctx.fillStyle = engine.integrity > 70 ? "#fff7d6" : "#ffc0c8";
      ctx.beginPath(); ctx.arc(0, -22, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#6af6ff"; ctx.beginPath(); ctx.arc(-6, -25, 3, 0, Math.PI * 2); ctx.arc(6, -25, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffd978"; ctx.beginPath(); ctx.arc(0, 8, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ff7b97"; ctx.beginPath(); ctx.arc(0, 6, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(106,246,255,.8)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-36, 12); ctx.moveTo(18, 0); ctx.lineTo(36, 12); ctx.stroke();
      if (engine.shieldT > 0) { ctx.strokeStyle = "rgba(255,217,120,.8)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -2, 48, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
    function drawKibo(x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.shadowBlur = canvas.width < 800 ? 10 : 18; ctx.shadowColor = "#ffd978"; ctx.fillStyle = "#f8f0cf"; ctx.beginPath(); ctx.ellipse(0, 0, 26, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(23, -8, 12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.arc(27, -10, 2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#ffd978"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-22, -3); ctx.quadraticCurveTo(-42, -22, -50, -4); ctx.stroke(); ctx.restore();
    }
    function objectColor(t) { return { raw_leak: "#ff4f74", stale_consent: "#a9b3c9", artifact_spike: "#ffffff", unsafe_stim: "#ff304f", unauthorized_app: "#b968ff", memory_phisher: "#ff9ee6", shard: "#ffd978", vault_key: "#76ffbd", consent_token: "#6af6ff" }[t] || "#fff"; }
    function drawObject(o, w, h) { const y = h * laneY[o.lane]; ctx.save(); ctx.translate((o.x / 100) / LOGICAL_W * w, y); ctx.shadowBlur = canvas.width < 800 ? 10 : 20; ctx.shadowColor = objectColor(o.type); ctx.fillStyle = objectColor(o.type); if (["shard", "vault_key", "consent_token"].includes(o.type)) { ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); } else { ctx.rotate((engine.tick % 60) / 60 * Math.PI); ctx.fillRect(-16, -16, 32, 32); } ctx.restore(); }
    function draw() {
      const w = canvas.width, h = canvas.height; ctx.clearRect(0, 0, w, h);
      if (!bgGradient) { bgGradient = ctx.createLinearGradient(0, 0, w, h); bgGradient.addColorStop(0, "#071024"); bgGradient.addColorStop(1, "#020308"); }
      ctx.fillStyle = bgGradient; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 3; i++) { const y = h * laneY[i]; ctx.strokeStyle = i === 1 ? "rgba(255,217,120,.55)" : "rgba(106,246,255,.22)"; ctx.lineWidth = i === engine.lane ? 6 : 2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      for (let x = (engine.tick * 7) % 80; x < w; x += 80) { ctx.strokeStyle = "rgba(255,255,255,.035)"; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 240, h); ctx.stroke(); }
      engine.objects.forEach(o => drawObject(o, w, h));
      const ariY = h * laneY[engine.lane] + (engine.jumpT > 0 ? -50 * Math.sin(engine.jumpT / 18 * Math.PI) : 0) + (engine.duckT > 0 ? 18 : 0);
      drawKibo(w * .09, ariY + 18, Math.max(0.6, w / LOGICAL_W)); drawAri(w * .13, ariY, Math.max(0.75, w / LOGICAL_W));
      const p = clamp(engine.distance / engine.length, 0, 1); ctx.fillStyle = "rgba(255,217,120,.28)"; ctx.fillRect(w * .2, h - 62, w * .6, 8); ctx.fillStyle = "#ffd978"; ctx.fillRect(w * .2, h - 62, w * .6 * p, 8);
      if (!engine.branchEvent && p > .42 && p < .55) { ctx.fillStyle = "rgba(255,217,120,.9)"; ctx.font = `${Math.max(16, w/55)}px system-ui`; ctx.fillText("Moral branch ahead: Safe / Fast / Audit", w * .28, h * .18); }
    }
    function updateHud() { $("hudIntegrity").textContent = Math.round(engine.integrity); $("hudLeakage").textContent = Math.round(engine.leakage); $("hudConsent").textContent = Math.round(engine.consent); $("hudLatency").textContent = Math.round(engine.latency); $("hudTrust").textContent = Math.round(engine.trust); $("hudShards").textContent = engine.shards; $("weatherPanel").textContent = "Weather: " + engine.weather.join(" + "); $("coach").textContent = engine.message; const live = $("liveStatus"); if (live) live.textContent = engine.message; }
    function portrait(hash, integrityBp) { const hue = Math.floor(integrityBp * 1.2); let svg = `<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="160" rx="24" fill="#08111f"/>`; for (let i=0;i<5;i++){ const n=parseInt(hash.slice(i*4,i*4+4),16); const x=35+(n%170), y=25+((n>>>4)%110), r=18+((n>>>8)%32); svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="hsl(${(hue+i*28)%360} 80% 62%)" stroke-width="3" opacity=".75"/>`; } svg += `<text x="120" y="145" fill="#ffd978" font-size="11" text-anchor="middle">Proof #${hash.slice(0,12)}</text></svg>`; return svg; }
    async function showReport() { cancelAnimationFrame(raf); const proof = await engine.proof(); const ok = engine.success; gamePanel.classList.add("hidden"); report.classList.remove("hidden"); $("reportTitle").textContent = ok ? "Intent Delivered" : "Boundary Lost"; $("reportLine").textContent = ok ? "You protected the choice, not the thought." : "The run failed. The person is still more than the signal."; $("reportGrade").textContent = proof.result.grade; $("reportScore").textContent = proof.result.score; $("reportIntegrity").textContent = proof.result.integrity_bp + "%"; $("reportHash").textContent = proof.proof_hash.slice(0, 12); $("proofBox").value = JSON.stringify(proof, null, 2); $("portrait").innerHTML = portrait(proof.proof_hash, proof.result.integrity_bp); }
    $("copyProofBtn").onclick = async () => { try { await navigator.clipboard.writeText($("proofBox").value); $("verifyLine").textContent = "Proof copied."; } catch (_) { $("verifyLine").textContent = "Select and copy the proof manually."; } };
    $("verifyProofBtn").onclick = async () => { try { const v = await verifyProof(JSON.parse($("proofBox").value)); $("verifyLine").textContent = v.ok ? "Proof v2 verified by replay." : "Proof mismatch: " + (v.reason || "unknown"); } catch (e) { $("verifyLine").textContent = "Proof parse failed."; } };
    function loop() { try { for (let i = 0; i < 2; i++) engine.tickStep(); updateHud(); draw(); if (engine.finished) return showReport(); raf = requestAnimationFrame(loop); } catch (err) { cancelAnimationFrame(raf); $("coach").textContent = "Runtime error: " + (err.message || err); } }
  }

  const api = { VERSION, CONTRACTS, WEATHER, ACTIONS, Engine, verifyProof, hashProof, dailySeed, stableStringify };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BoundaryRunV9 = api;
  if (root.document) {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", boot, { once: true });
    else boot();
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
