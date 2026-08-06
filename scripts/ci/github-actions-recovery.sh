#!/usr/bin/env bash

set -Eeuo pipefail

REPO="${GITHUB_REPOSITORY:-istebul/istebul.com}"
BRANCH="${1:-main}"
STATUS_URL="https://www.githubstatus.com/api/v2/components.json"

log() {
  printf '%s\n' "$*"
}

fail() {
  log "HATA: $*"
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 komutu bulunamadı."
}

component_statuses() {
  curl \
    --fail \
    --silent \
    --show-error \
    --location \
    --retry 3 \
    --retry-delay 2 \
    "$STATUS_URL" |
    python3 -c '
import json
import sys

payload = json.load(sys.stdin)
wanted = {"Actions", "Pages"}
statuses = {
    item.get("name"): item.get("status", "unknown")
    for item in payload.get("components", [])
    if item.get("name") in wanted
}

print(
    statuses.get("Actions", "unknown")
    + "\t"
    + statuses.get("Pages", "unknown")
)
'
}

latest_run_id() {
  local workflow="$1"

  gh run list \
    --repo "$REPO" \
    --workflow "$workflow" \
    --limit 1 \
    --json databaseId \
    --jq '.[0].databaseId // 0'
}

wait_for_new_run() {
  local workflow="$1"
  local expected_sha="$2"
  local previous_run_id="$3"
  local run_id=""
  local attempt

  for attempt in $(seq 1 60); do
    run_id="$(
      gh run list \
        --repo "$REPO" \
        --workflow "$workflow" \
        --event workflow_dispatch \
        --branch "$BRANCH" \
        --limit 20 \
        --json databaseId,headSha \
        --jq \
          --arg sha "$expected_sha" \
          --argjson previous "$previous_run_id" \
          '[
            .[] |
            select(.headSha == $sha) |
            select(.databaseId != $previous)
          ][0].databaseId // empty'
    )"

    if [ -n "$run_id" ]; then
      printf '%s\n' "$run_id"
      return 0
    fi

    sleep 3
  done

  return 1
}

show_run_summary() {
  local run_id="$1"

  gh run view "$run_id" \
    --repo "$REPO" \
    --json databaseId,displayTitle,event,status,conclusion,headBranch,headSha,createdAt,updatedAt,url,jobs \
    --jq '{
      "calisma_id": .databaseId,
      "baslik": .displayTitle,
      "olay": .event,
      "durum": .status,
      "sonuc": .conclusion,
      "dal": .headBranch,
      "commit": .headSha,
      "baslangic": .createdAt,
      "bitis": .updatedAt,
      "adres": .url,
      "isler": [
        .jobs[]? | {
          "ad": .name,
          "durum": .status,
          "sonuc": .conclusion
        }
      ]
    }'
}

run_workflow() {
  local workflow="$1"
  local label="$2"
  local expected_sha="$3"
  local previous_run_id
  local run_id

  previous_run_id="$(latest_run_id "$workflow")"

  log ""
  log "=== $label BAŞLATILIYOR ==="

  gh workflow run "$workflow" \
    --repo "$REPO" \
    --ref "$BRANCH"

  if ! run_id="$(
    wait_for_new_run \
      "$workflow" \
      "$expected_sha" \
      "$previous_run_id"
  )"; then
    fail "Yeni $label çalışması bulunamadı."
  fi

  log "$label Run ID: $run_id"

  if ! gh run watch "$run_id" \
    --repo "$REPO" \
    --exit-status
  then
    log ""
    log "$label başarısız oldu."
    show_run_summary "$run_id" || true
    log ""
    log "Başarısız adım logları:"
    gh run view "$run_id" \
      --repo "$REPO" \
      --log-failed || true
    return 1
  fi

  log ""
  log "$label başarıyla tamamlandı."
  show_run_summary "$run_id"
}

main() {
  local actions_status
  local pages_status
  local status_line
  local target_sha

  require_command curl
  require_command git
  require_command gh
  require_command python3

  log "=================================================="
  log " İSTEBUL GITHUB ACTIONS KURTARMA"
  log "=================================================="

  status_line="$(component_statuses)"
  IFS=$'\t' read -r actions_status pages_status <<< "$status_line"

  log "Actions durumu : ${actions_status:-unknown}"
  log "Pages durumu   : ${pages_status:-unknown}"

  if [ "${actions_status:-unknown}" != "operational" ]; then
    log ""
    log "GitHub Actions henüz çalışır durumda değil."
    log "Hiçbir workflow veya deploy başlatılmadı."
    exit 2
  fi

  if [ "${pages_status:-unknown}" != "operational" ]; then
    log ""
    log "UYARI: GitHub Pages henüz tam çalışır durumda değil."
    log "İSTEBUL Production Deploy Cloudflare Pages kullantığı için"
    log "Actions doğrulamasıyla devam edilecek."
  fi

  gh auth status >/dev/null

  git rev-parse --is-inside-work-tree >/dev/null 2>&1 ||
    fail "Komut bir Git repository içinde çalıştırılmalıdır."

  git fetch origin --prune

  git show-ref --verify --quiet "refs/remotes/origin/$BRANCH" ||
    fail "origin/$BRANCH bulunamadı."

  target_sha="$(git rev-parse "origin/$BRANCH")"

  log ""
  log "Hedef repository : $REPO"
  log "Hedef dal        : $BRANCH"
  log "Hedef commit     : $target_sha"

  run_workflow \
    "ci.yml" \
    "CI DOĞRULAMASI" \
    "$target_sha"

  run_workflow \
    "production-deploy.yml" \
    "PRODUCTION DEPLOY" \
    "$target_sha"

  log ""
  log "=================================================="
  log " CI/CD KURTARMA BAŞARILI"
  log "=================================================="
  log "Doğrulanan commit: $target_sha"
}

main "$@"
