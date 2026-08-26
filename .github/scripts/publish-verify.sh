#!/usr/bin/env bash
#
# publish-verify.sh — guards the changeset publish pipeline against the
# 2026-07-04 "stale registry version" incident and against silently-swallowed
# publish failures.
#
# Subcommands:
#   detect     After `changeset version`, list every package that this publish
#              would ship (name@version + dir) into $BUMPED_FILE: the ones
#              `changeset version` just bumped (dirty against HEAD), PLUS a
#              registry sweep of the whole workspace for any package whose
#              local version is absent from the registry. The sweep is what
#              catches a HAND-BUMPED version — committed directly, so invisible
#              to the diff, yet published by `pnpm -r publish` all the same.
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

# Last non-404 npm failure recorded by registry_state, for the caller's message.
REGISTRY_ERROR=""

registry_state() { # <name@version> -> 0 present | 1 definitively absent | 2 UNKNOWN
  # npm signals "no such package/version" with `code E404` and exit 1 — but it
  # exits 1 for E401 (expired/missing token), 5xx and ENOTFOUND too. Reading
  # any non-zero exit as "not published yet" is a guard failing open: an
  # unauthenticated `npm view` against GitHub Packages answers `code E401`,
  # which would sail through as "fresh" and skip the collision check entirely.
  # Only an explicit E404 counts as absent; everything else is UNKNOWN and the
  # caller must refuse to proceed.
  local spec="$1" out rc=0
  REGISTRY_ERROR=""
  out=$(npm view "$spec" version --registry="$REGISTRY" 2>&1) || rc=$?
  if [ "$rc" -eq 0 ]; then
    # A zero exit that reports no version confirms nothing either way.
    if [ -n "${out//[[:space:]]/}" ]; then return 0; fi
    REGISTRY_ERROR="npm view exited 0 but reported no version"
    return 2
  fi
  # Matched in-shell rather than through `grep -q`: under `set -o pipefail` a
  # grep that exits on its first match can SIGPIPE the writer and turn a hit
  # into a non-zero pipeline.
  if [[ "$out" == *"code E404"* ]]; then
    return 1
  fi
  REGISTRY_ERROR="${out//$'\n'/ }"
  return 2
}

bumped_has() { # <name@version> — already recorded?
  [ -s "$BUMPED_FILE" ] || return 1
  awk -v s="$1" '$1 == s { found = 1 } END { exit !found }' "$BUMPED_FILE"
}

detect_bumped() {
  : > "$BUMPED_FILE"
  local files f name newv oldv rc=0
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
  detect_unpublished || rc=1
  if [ ! -s "$BUMPED_FILE" ]; then
    echo "::warning::detect_bumped found no version changes (nothing to publish?)"
  fi
  return $rc
}

detect_unpublished() {
  # The diff pass above only sees versions this run changed (`changeset
  # version` leaves them dirty against HEAD). A HAND-BUMPED package — version
  # edited in package.json and committed directly — is already identical to
  # HEAD by the time we get here, so the diff finds nothing, yet
  # `pnpm -r publish` publishes EVERY workspace package whose local version is
  # absent from the registry. That package would reach consumers having skipped
  # the collision precheck and the postcheck both.
  #
  # So sweep the whole workspace and record any publishable package whose local
  # version is not on the registry, however that version came to be. Packages
  # already published at their local version are left out: `pnpm -r publish`
  # skips them, so nothing new ships for them.
  local list name version dir spec state fail=0
  # shellcheck disable=SC2016  # `${...}` below is a JS template literal, not shell
  if ! list=$(pnpm -r list --depth -1 --json 2>/dev/null \
              | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=require("path");for(const m of JSON.parse(s)){if(!m.version||m.private)continue;process.stdout.write(`${m.name} ${m.version} ${p.relative(process.cwd(),m.path)||"."}\n`)}})'); then
    echo "::error::could not enumerate workspace packages — cannot confirm which packages \`pnpm -r publish\` would ship, so the publish must not proceed"
    return 1
  fi
  while read -r name version dir; do
    [ -n "$name" ] || continue
    spec="$name@$version"
    if bumped_has "$spec"; then continue; fi
    state=0; registry_state "$spec" || state=$?
    case "$state" in
      0) ;; # already on the registry at this version — publish will skip it
      1) echo "   hand-bumped (not changeset-bumped, absent from the registry) — verifying it too:"
         echo "$spec $dir" | tee -a "$BUMPED_FILE" ;;
      *) echo "::error::COULD NOT VERIFY ${spec} against ${REGISTRY}: ${REGISTRY_ERROR:-unknown npm failure}. Refusing to guess whether it would be published."
         fail=1 ;;
    esac
  done <<< "$list"
  return $fail
}

pack_failed() { # <spec> <label> <detail...>
  local spec="$1" label="$2"; shift 2
  echo "::error::PACK FAILED for ${spec} [${label}]: $*. The artifact comparison could NOT run, so this is not a benign retry — publishing is blocked until the pack succeeds."
}

unpack_verify() { # <tarball dir> <dest dir> <label> <spec>
  # A swallowed pack used to leave both extract dirs empty, and `diff -rq` on
  # two empty trees SUCCEEDS — the old code then reported "benign retry" and
  # waved the publish through, the exact opposite of this guard's job. Every
  # step from "a tarball exists" to "the unpacked tree has real content" is
  # therefore asserted, and any failure is fatal.
  local src="$1" dest="$2" label="$3" spec="$4" tgz n
  n=$(find "$src" -maxdepth 1 -type f -name '*.tgz' | wc -l)
  if [ "$n" -ne 1 ]; then
    pack_failed "$spec" "$label" "expected exactly one .tgz in ${src}, found ${n}"
    return 1
  fi
  tgz=$(find "$src" -maxdepth 1 -type f -name '*.tgz')
  if [ ! -s "$tgz" ]; then
    pack_failed "$spec" "$label" "the packed tarball $(basename "$tgz") is empty"
    return 1
  fi
  if ! tar -xzf "$tgz" -C "$dest" 2>"${dest}.untar.log"; then
    pack_failed "$spec" "$label" "could not extract $(basename "$tgz")"
    sed 's/^/     /' "${dest}.untar.log" 2>/dev/null || true
    return 1
  fi
  if [ ! -d "$dest/package" ]; then
    pack_failed "$spec" "$label" "the tarball unpacked without a package/ directory"
    return 1
  fi
  # An otherwise-empty tree would make the diff below vacuously pass, since
  # package.json is excluded from it. Require something real to compare.
  if [ -z "$(find "$dest/package" -mindepth 1 ! -path "$dest/package/package.json" -print -quit)" ]; then
    pack_failed "$spec" "$label" "the unpacked tarball holds nothing but package.json — there is nothing for the collision check to compare"
    return 1
  fi
  return 0
}

precheck_one() { # <name@version> <dir>
  local spec="$1" dir="$2"
  local version="${spec##*@}"
  echo "── precheck ${spec} (dir: ${dir})"
  local state=0
  registry_state "$spec" || state=$?
  if [ "$state" -eq 1 ]; then
    echo "   fresh: ${spec} is not on the registry — will publish"
    return 0
  fi
  if [ "$state" -ne 0 ]; then
    # Fail CLOSED. A masked auth/network/registry error here used to read as
    # "fresh", skipping the only check that catches the stale-artifact incident.
    echo "::error::COULD NOT VERIFY ${spec} against ${REGISTRY}: ${REGISTRY_ERROR:-unknown npm failure}. Refusing to treat an unverifiable version as fresh — fix the registry access and re-run."
    return 1
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
  # Both packs are exit-code checked: their errors used to be discarded into
  # /dev/null, and the comparison that followed was between two empty trees.
  if ! ( cd "$dir" && pnpm pack --pack-destination "$work/local" ) >"$work/local.log" 2>&1; then
    pack_failed "$spec" "local (pnpm pack in ${dir})" "pnpm pack exited non-zero"
    sed 's/^/     /' "$work/local.log" 2>/dev/null || true
    rm -rf "$work"; return 1
  fi
  # Remote: fetch the already-published tarball as-is.
  if ! ( cd "$dir" && npm pack "$spec" --pack-destination "$work/reg" --registry="$REGISTRY" ) >"$work/reg.log" 2>&1; then
    pack_failed "$spec" "registry (npm pack ${spec})" "npm pack exited non-zero"
    sed 's/^/     /' "$work/reg.log" 2>/dev/null || true
    rm -rf "$work"; return 1
  fi
  if ! unpack_verify "$work/local" "$work/local_x" "local (pnpm pack in ${dir})" "$spec"; then
    rm -rf "$work"; return 1
  fi
  if ! unpack_verify "$work/reg" "$work/reg_x" "registry (npm pack ${spec})" "$spec"; then
    rm -rf "$work"; return 1
  fi
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
  local spec="$1" i state last=""
  for i in 1 2 3; do
    state=0; registry_state "$spec" || state=$?
    if [ "$state" -eq 0 ]; then
      echo "   verified present on registry: ${spec}"
      return 0
    fi
    # Still fail-closed either way, but say WHICH it was: "absent" and "the
    # lookup itself broke" call for different fixes.
    if [ "$state" -eq 1 ]; then
      last="absent from the registry"
      echo "   attempt ${i}/3: ${spec} not yet visible — waiting 10s for propagation"
    else
      last="could not be verified: ${REGISTRY_ERROR:-unknown npm failure}"
      echo "   attempt ${i}/3: ${spec} lookup failed (${REGISTRY_ERROR:-unknown npm failure}) — retrying in 10s"
    fi
    sleep 10
  done
  echo "::error::publish reported success but ${spec} ${last}"
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
