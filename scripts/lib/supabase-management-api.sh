#!/usr/bin/env bash
# Shared Supabase Management API helpers: retry/backoff, verify-first, optional DB fallback.
set -euo pipefail

: "${SUPABASE_PROJECT_REF:=hjfrcdstbyonmgatgwcc}"

MGMT_API_BACKOFF=(10 20 40 60 60)
MGMT_API_MAX_ATTEMPTS=5

mgmt_api__redact_body() {
  local body="${1:-}"
  body="$(printf '%s' "$body" | tr '\n' ' ' | sed -E \
    -e 's/Bearer [A-Za-z0-9._~+\/=-]+/Bearer [REDACTED]/g' \
    -e 's/(password|secret|token)(=|:)[^[:space:]"'\'']+/\1\2[REDACTED]/gi')"
  if [ "${#body}" -gt 240 ]; then
    body="${body:0:240}…"
  fi
  printf '%s' "$body"
}

mgmt_api_is_retriable() {
  local http="$1"
  case "$http" in
    000|408|409|425|429|500|502|503|504) return 0 ;;
    400|401|403|404) return 1 ;;
  esac
  if [[ "$http" =~ ^4 ]]; then
    return 1
  fi
  if [[ "$http" =~ ^5 ]]; then
    return 0
  fi
  return 1
}

mgmt_api__curl_once() {
  local payload="$1"
  local outfile="$2"
  local http
  set +e
  http="$(curl -sS --connect-timeout 10 --max-time 90 \
    -o "$outfile" -w '%{http_code}' \
    -X POST "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>/dev/null)"
  local curl_exit=$?
  set -e
  if [ "$curl_exit" -ne 0 ] || [ -z "$http" ]; then
    printf '000'
    return 0
  fi
  printf '%s' "$http"
}

mgmt_api_post_with_retry() {
  local payload="$1"
  local outfile="$2"
  local attempt http delay body

  for attempt in $(seq 1 "$MGMT_API_MAX_ATTEMPTS"); do
    http="$(mgmt_api__curl_once "$payload" "$outfile")"
    if [ "$http" = "200" ] || [ "$http" = "201" ]; then
      printf '%s' "$http"
      return 0
    fi

    if ! mgmt_api_is_retriable "$http"; then
      body="$(mgmt_api__redact_body "$(cat "$outfile" 2>/dev/null || true)")"
      echo "Management API non-retriable HTTP $http${body:+ — $body}" >&2
      printf '%s' "$http"
      return 1
    fi

    if [ "$attempt" -lt "$MGMT_API_MAX_ATTEMPTS" ]; then
      delay="${MGMT_API_BACKOFF[$((attempt - 1))]}"
      echo "Management API HTTP $http (attempt ${attempt}/${MGMT_API_MAX_ATTEMPTS}), retrying in ${delay}s…" >&2
      sleep "$delay"
    fi
  done

  body="$(mgmt_api__redact_body "$(cat "$outfile" 2>/dev/null || true)")"
  echo "Management API retriable HTTP $http after ${MGMT_API_MAX_ATTEMPTS} attempts${body:+ — $body}" >&2
  printf '%s' "$http"
  return 1
}

mgmt_api_query_with_retry() {
  local query="$1"
  local outfile="$2"
  local payload
  if ! command -v jq >/dev/null 2>&1; then
    echo "jq required" >&2
    return 1
  fi
  payload="$(jq -n --arg query "$query" '{query: $query}')"
  mgmt_api_post_with_retry "$payload" "$outfile"
}

mgmt_api__db_url() {
  local var
  for var in SUPABASE_DATABASE_URL SUPABASE_DB_URL DATABASE_URL POSTGRES_URL; do
    if [ -n "${!var:-}" ]; then
      printf '%s' "${!var}"
      return 0
    fi
  done
  return 1
}

mgmt_db_query() {
  local query="$1"
  local url
  url="$(mgmt_api__db_url)" || return 1
  if ! command -v psql >/dev/null 2>&1; then
    echo "psql required for direct DB fallback" >&2
    return 1
  fi
  psql "$url" -v ON_ERROR_STOP=1 -At -c "$query"
}

mgmt_db_apply_sql_file() {
  local file="$1"
  local label="$2"
  local url
  url="$(mgmt_api__db_url)" || return 1
  if ! command -v psql >/dev/null 2>&1; then
    echo "psql required for direct DB fallback" >&2
    return 1
  fi
  if [ ! -f "$file" ]; then
    echo "Missing $file" >&2
    return 1
  fi
  psql "$url" -v ON_ERROR_STOP=1 -f "$file"
  echo "Applied $label via direct DB fallback"
}

mgmt_api_analytics_schema_ready() {
  local query outfile http
  query="SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'analytics_exclusion_rules'
) AS ok;"
  outfile="$(mktemp)"
  trap 'rm -f "$outfile"' RETURN

  if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then
    http="$(mgmt_api_query_with_retry "$query" "$outfile" || true)"
    if [ "$http" = "200" ] || [ "$http" = "201" ]; then
      if jq -e '.[0].ok == true' "$outfile" >/dev/null 2>&1; then
        return 0
      fi
      return 1
    fi
    if ! mgmt_api_is_retriable "$http"; then
      return 1
    fi
  fi

  if mgmt_api__db_url >/dev/null 2>&1; then
    local result
    result="$(mgmt_db_query "$query" || true)"
    [ "$result" = "t" ]
    return $?
  fi

  return 1
}

mgmt_api_posts_columns_ready() {
  local query outfile http count
  query="SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name IN ('content_type', 'cover_image_url');"
  outfile="$(mktemp)"
  trap 'rm -f "$outfile"' RETURN

  if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then
    http="$(mgmt_api_query_with_retry "$query" "$outfile" || true)"
    if [ "$http" = "200" ] || [ "$http" = "201" ]; then
      count="$(jq '[.[] | select(.column_name == "content_type" or .column_name == "cover_image_url")] | length' "$outfile" 2>/dev/null || echo 0)"
      [ "${count:-0}" -ge 2 ]
      return $?
    fi
    if ! mgmt_api_is_retriable "$http"; then
      return 1
    fi
  fi

  if mgmt_api__db_url >/dev/null 2>&1; then
    count="$(mgmt_db_query "$query" | wc -l | tr -d ' ')"
    [ "${count:-0}" -ge 2 ]
    return $?
  fi

  return 1
}

mgmt_api_apply_sql_file() {
  local file="$1"
  local label="$2"
  local payload outfile http

  if [ ! -f "$file" ]; then
    echo "Missing $file" >&2
    return 1
  fi
  if ! command -v jq >/dev/null 2>&1; then
    echo "jq required" >&2
    return 1
  fi

  payload="$(jq -n --rawfile query "$file" '{query: $query}')"
  outfile="$(mktemp)"
  trap 'rm -f "$outfile"' RETURN

  http="$(mgmt_api_post_with_retry "$payload" "$outfile" || true)"
  if [ "$http" = "200" ] || [ "$http" = "201" ]; then
    echo "Applied $label via Management API (HTTP $http)"
    return 0
  fi

  if mgmt_api_is_retriable "$http" && mgmt_api__db_url >/dev/null 2>&1; then
    echo "Management API unavailable for $label (HTTP $http); trying direct DB fallback…" >&2
    mgmt_db_apply_sql_file "$file" "$label"
    return $?
  fi

  echo "Management API failed for $label (HTTP $http)" >&2
  return 1
}

mgmt_api_fail_unavailable() {
  echo "Supabase Management API unavailable after retries; schema could not be verified/applied." >&2
  exit 1
}
