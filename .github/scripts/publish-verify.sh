#!/usr/bin/env bash
#
# publish-verify.sh — guards the changeset publish pipeline against the
# 2026-07-04 "stale registry version" incident and against silently-swallowed
# publish failures.
#
# Subcommands:
#   detect     After `changeset version`, list every package whose version was
#              bumped (name@version + dir) into $BUMPED_FILE.
#   precheck   For each bumped package, if that exact version already exists on
#              the registry, compare the *artifact contents* against what we are
#              about to publish. Identical -> benign (a retry of a partially
#              completed release; `pnpm -r publish` will skip it). Different ->
#              HARD FAIL: the registry holds a foreign/stale artifact at this
#              version and publishing would be a silent no-op that poisons
#              consumers. This is the incident detector.
#   postcheck  After publish, confirm every bumped version is actually present
#              on the registry (with retries for propagation lag).
#
# Why content comparison and not dist.shasum: gzip/tarball metadata is
# non-deterministic, so the registry `dist.shasum` never matches a fresh local
# `npm pack` even for byte-identical source. The *extracted* file bytes (dist/)
# ARE deterministic across machines (tsup emits content-hashed, path-independent
# output), so we diff the unpacked trees, excluding package.json (pnpm rewrites
# `workspace:` -> `^` and strips prepublishOnly on publish).
#
# Why "any non-zero publish exit = fail": `pnpm -r publish` reads the registry
# and skips already-published versions ("There are no new packages that should
# be published", exit 0). Combined with precheck guaranteeing no different-
# artifact collision reaches publish, the only remaining non-zero exits are real
# failures (auth, network, build, registry errors). See the workflow's Publish
# step for that classification.
#
# Auth: uses the repo .npmrc (@bcl32:registry + _authToken=${GITHUB_TOKEN}).
# GITHUB_TOKEN / NODE_AUTH_TOKEN must be exported by the calling workflow step.

set -euo pipefail

REGISTRY="${NPM_REGISTRY:-https://npm.pkg.github.com}"
BUMPED_FILE="${BUMPED_FILE:-${RUNNER_TEMP:-/tmp}/publish-bumped.txt}"
export BUMPED_FILE

pkg_field() { # <package.json path> <field>
  node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(d[process.argv[2]]??""))' "$1" "$2"
}

head_version() { # <path> — version at git HEAD, or empty
  git show "HEAD:$1" 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s).version??""))}catch(e){}})' 2>/dev/null || true
}

detect_bumped() {
  : > "$BUMPED_FILE"
  local files f name newv oldv
  files=$(git diff --name-only HEAD -- '*/package.json' || true)
  for f in $files; do
    [ -f "$f" ] || continue
    name=$(pkg_field "$f" name)
    newv=$(pkg_field "$f" version)
    oldv=$(head_version "$f")
    if [ -n "$name" ] && [ -n "$newv" ] && [ "$oldv" != "$newv" ]; then
      echo "$name@$newv $(dirname "$f")" | tee -a "$BUMPED_FILE"
    fi
  done
  if [ ! -s "$BUMPED_FILE" ]; then
    echo "::warning::detect_bumped found no version changes (nothing to publish?)"
  fi
}

precheck_one() { # <name@version> <dir>
  local spec="$1" dir="$2"
  local version="${spec##*@}"
  echo "── precheck ${spec} (dir: ${dir})"
  if ! npm view "$spec" version --registry="$REGISTRY" >/dev/null 2>&1; then
    echo "   fresh: ${spec} is not on the registry — will publish"
    return 0
  fi
  local when
  when=$(npm view "$spec" time --registry="$REGISTRY" --json 2>/dev/null \
         | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s)[process.argv[1]]||""))}catch(e){}})' "$version" || true)
  [ -n "$when" ] || when="unknown date"
  echo "   ${spec} already exists (published ${when}) — comparing artifact contents"
  local work; work=$(mktemp -d)
  mkdir -p "$work/local" "$work/reg" "$work/local_x" "$work/reg_x"
  # Local: pnpm pack mirrors how CI (`pnpm -r publish`) selects files and
  # rewrites the workspace: protocol, so it is a faithful preview of the tarball.
  ( cd "$dir" && pnpm pack --pack-destination "$work/local" >/dev/null 2>&1 )
  # Remote: fetch the already-published tarball as-is.
  ( cd "$dir" && npm pack "$spec" --pack-destination "$work/reg" --registry="$REGISTRY" >/dev/null 2>&1 )
  tar -xzf "$work"/local/*.tgz -C "$work/local_x"
  tar -xzf "$work"/reg/*.tgz -C "$work/reg_x"
  if diff -rq --exclude=package.json "$work/local_x/package" "$work/reg_x/package" >"$work/diff.txt" 2>&1; then
    echo "   OK: identical artifact already published (benign retry) — pnpm will skip it"
    rm -rf "$work"; return 0
  fi
  echo "::error::VERSION COLLISION: the registry already has a DIFFERENT artifact at ${spec} (published ${when}). Publishing would be a silent no-op that ships the stale artifact to consumers. Bump past this version and investigate — do NOT reuse it."
  echo "   Artifact differences (excluding package.json):"
  sed 's/^/     /' "$work/diff.txt" || true
  rm -rf "$work"
  return 1
}

postcheck_one() { # <name@version>
  local spec="$1" i
  for i in 1 2 3; do
    if npm view "$spec" version --registry="$REGISTRY" >/dev/null 2>&1; then
      echo "   verified present on registry: ${spec}"
      return 0
    fi
    echo "   attempt ${i}/3: ${spec} not yet visible — waiting 10s for propagation"
    sleep 10
  done
  echo "::error::publish reported success but ${spec} is absent from the registry"
  return 1
}

run_over_bumped() { # <fn>
  local fn="$1" fail=0 spec dir
  if [ ! -s "$BUMPED_FILE" ]; then
    echo "No bumped packages recorded ($BUMPED_FILE empty) — nothing to check"
    return 0
  fi
  while read -r spec dir; do
    [ -n "$spec" ] || continue
    "$fn" "$spec" "$dir" || fail=1
  done < "$BUMPED_FILE"
  return $fail
}

case "${1:-}" in
  detect)    detect_bumped ;;
  precheck)  run_over_bumped precheck_one ;;
  postcheck) run_over_bumped postcheck_one ;;
  *) echo "usage: publish-verify.sh {detect|precheck|postcheck}" >&2; exit 2 ;;
esac
