#!/usr/bin/env bash
set -euo pipefail

SITE="https://www.istebul.com"

echo "== Git =="
git status --short
git log --oneline -5

echo ""
echo "== Build/Test =="
npm test

echo ""
echo "== Security headers =="
/usr/bin/curl -I -s "$SITE/?audit=$(date +%s)" \
| grep -iE "cache-control|content-security-policy|strict-transport-security|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|cf-cache-status"

echo ""
echo "== Asset refs =="
/usr/bin/curl -Ls "$SITE/?audit=$(date +%s)" | grep -oE 'css/style[^"]*\.css|app.bundle-[A-Z0-9]*\.js' | sort -u

echo ""
echo "== Auto CSS =="
/usr/bin/curl -Ls "$SITE/auto?audit=$(date +%s)" | grep -oE 'href="/css/auto[^"]*\.css"'

echo ""
echo "== Secret scan =="
BUNDLE=$(/usr/bin/curl -Ls "$SITE/" | grep -o "app.bundle-[A-Z0-9]*.js" | head -1)
for url in "$SITE/" "$SITE/env.js" "$SITE/js/$BUNDLE"; do
  echo "### $url"
  /usr/bin/curl -Ls "$url" | grep -Ei "SERVICE_ROLE|STRIPE_SECRET|WEBHOOK_SECRET|OPENAI_API_KEY|GROQ_API_KEY|RESEND_API_KEY|sk_live|sk_test|whsec_" && exit 1 || echo "OK"
done
