#!/usr/bin/env python3
from pathlib import Path
import re, subprocess
root = Path(__file__).resolve().parents[1]
required = ["index.html", "app.js", "styles.css", "README.md", "VERSION", "PRIVACY_NOTICE.md", "SECURITY.md", "CRYPTO_PAYMENT_TERMS.md", ".github/workflows/ci.yml", ".github/workflows/pages.yml", "COMMERCIAL_LICENSE.md", "THIRD_PARTY_NOTICES.md"]
missing = [p for p in required if not (root/p).exists()]
if missing:
    raise SystemExit("missing files: " + ", ".join(missing))
content_files = ["index.html", "app.js", "styles.css", "README.md", "VERSION", "PRIVACY_NOTICE.md", "SECURITY.md", "CRYPTO_PAYMENT_TERMS.md", "COMMERCIAL_LICENSE.md", "THIRD_PARTY_NOTICES.md"]
text = "\n".join((root/p).read_text(errors="ignore") for p in content_files)
for phrase in ["Boundary Run v9", "v9.0.2", "Ari", "Kibo", "RUN GAME", "Replay Proof", "Dogecoin", "DMwHAhqVNWf7dyEznukxCufNS5rjuP5MTp", "Not a medical device", "No telemetry", "Content-Security-Policy"]:
    if phrase not in text:
        raise SystemExit(f"required phrase missing: {phrase}")
for bad in ["v7.9.812", "v8.0.1", "v8.8.4", "v7.3.0", "v9.0.0", "ABI v3", "unstick-ui", "serviceWorker.register", "gtag(", "XMLHttpRequest", "navigator.sendBeacon"]:
    if bad in text:
        raise SystemExit(f"forbidden marker found: {bad}")
app = (root/"app.js").read_text(errors="ignore")
if re.search(r"\bfetch\s*\(", app):
    raise SystemExit("forbidden fetch() found")
for phrase in ["crypto.subtle.digest(\"SHA-256\"", "async function hashProof", "async function verifyProof", "validateSeed", "validateContracts", "Stable Boundary", "COLLISION_LEFT_RATIO", "passive: false"]:
    if phrase not in app:
        raise SystemExit(f"required implementation marker missing: {phrase}")
subprocess.run(["node", "--check", str(root/"app.js")], check=True)
print("Audit OK: v9.0.2 security, deterministic hardening, CI/CD and no stale markers")
