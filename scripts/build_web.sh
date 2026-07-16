#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
DIST="${1:-dist}"
rm -rf "$DIST"
mkdir -p "$DIST"
cp index.html app.js styles.css VERSION README.md PRIVACY_NOTICE.md SECURITY.md TERMS_OF_USE.md CRYPTO_PAYMENT_TERMS.md "$DIST/"
test -s "$DIST/index.html"
test -s "$DIST/app.js"
test -s "$DIST/styles.css"
node --check "$DIST/app.js"
grep -q "Boundary Run v9" "$DIST/index.html"
grep -q "Ari" "$DIST/index.html"
grep -q "Content-Security-Policy" "$DIST/index.html"
grep -q "SHA-256" "$DIST/app.js"
grep -q "RUN GAME" README.md
! grep -R "v7.9.812\|v8.0.1\|v8.8.4\|v9.0.0\|v9.1.0\|v9.2.0\|v9.3.0\|v9.3.1\|v9.4.0\|v7.3.0\|ABI v3\|unstick-ui\|serviceWorker.register\|gtag" "$DIST"
echo "Build OK: Boundary Run v9.5.0 -> $DIST"
