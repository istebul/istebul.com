#!/usr/bin/env bash
# Retry transient CLI/network/gateway failures with bounded backoff.
set -euo pipefail

RETRY_CMD_BACKOFF=(10 20 40 60 60)
RETRY_CMD_MAX_ATTEMPTS=5

retry_cmd__redact_output() {
  local body="${1:-}"
  body="$(printf '%s' "$body" | tr '\n' ' ' | sed -E \
    -e 's/Bearer [A-Za-z0-9._~+\/=-]+/Bearer [REDACTED]/g' \
    -e 's/(password|secret|token)(=|:)[^[:space:]"'\'']+/\1\2[REDACTED]/gi' \
    -e 's#(postgresql://)[^@]+@#\1[REDACTED]@#gi')"
  if [ "${#body}" -gt 240 ]; then
    body="${body:0:240}…"
  fi
  printf '%s' "$body"
}

retry_cmd_is_auth_failure() {
  local msg="${1,,}"
  case "$msg" in
    *unauthorized*|*forbidden*|*"invalid token"*|*"invalid project"*|*"permission denied"*) return 0 ;;
  esac
  if [[ "$msg" =~ (^|[^0-9])401([^0-9]|$) ]] || [[ "$msg" =~ (^|[^0-9])403([^0-9]|$) ]]; then
    return 0
  fi
  return 1
}

retry_cmd_is_transient() {
  local msg="${1,,}"
  if retry_cmd_is_auth_failure "$msg"; then
    return 1
  fi
  case "$msg" in
    *502*|*503*|*504*|*gateway*|*timeout*|*"timed out"*|*network*|*econnreset*|*etimedout*|*"error code: 502"*|*"error code: 503"*|*"error code: 504"*) return 0 ;;
  esac
  return 1
}

retry_cmd_run() {
  if [ "$#" -lt 1 ]; then
    echo "usage: retry-command.sh <command> [args...]" >&2
    exit 2
  fi

  local attempt delay output status
  for attempt in $(seq 1 "$RETRY_CMD_MAX_ATTEMPTS"); do
    set +e
    output="$("$@" 2>&1)"
    status=$?
    set -e
    if [ "$status" -eq 0 ]; then
      if [ -n "$output" ]; then
        printf '%s\n' "$output"
      fi
      return 0
    fi

    if retry_cmd_is_auth_failure "$output"; then
      retry_cmd__redact_output "$output" >&2
      return "$status"
    fi

    if ! retry_cmd_is_transient "$output"; then
      retry_cmd__redact_output "$output" >&2
      return "$status"
    fi

    if [ "$attempt" -lt "$RETRY_CMD_MAX_ATTEMPTS" ]; then
      delay="${RETRY_CMD_BACKOFF[$((attempt - 1))]}"
      echo "Transient command failure (attempt ${attempt}/${RETRY_CMD_MAX_ATTEMPTS}), retrying in ${delay}s…" >&2
      sleep "$delay"
    fi
  done

  retry_cmd__redact_output "$output" >&2
  return "$status"
}

retry_cmd_run "$@"
