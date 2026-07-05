# Skill Lifecycle Implementation Plan

Date: 2026-07-05

Reference behavior:

- `docs/skill-lifecycle.md`

## Purpose

Implement the staged skill lifecycle described in `docs/skill-lifecycle.md`.

This plan is temporary and execution-oriented. The lifecycle document is the durable source of truth for terminology and behavior.

## Scope

This plan covers:

- durable review artifacts for review and audit
- a non-live staged fetch area
- review over staged content
- accept, reject, and remove operations
- lock updates that describe only live accepted content

This plan does not redesign the TypeScript module layout again. It builds on the current `core/`, `providers/`, and `skills/` structure.

## Outcome

After this work:

- fetched candidate skills do not become live immediately
- review and audit both emit structured artifacts into the repo
- another agent can review candidate content from artifacts and inert file reads
- accept promotes staged content into `.agents/skills` and updates `config/skills/lock.json`
- reject does not promote staged content and does not change the lock
- remove deletes already-live content and updates the lock

## Non-Goals

Do not include these in the first implementation:

- sandboxed evaluator runtime such as agentOS
- LLM auto-approval
- persistent reject ledger
- release-age or commit-age trust gates
- baseline redesign beyond what is required to preserve current behavior

## Current Gap

The current tooling can:

- fetch and scan content
- emit findings
- suppress accepted findings with baselines

It cannot yet:

- keep fetched candidate content inert before acceptance
- produce a first-class review artifact as the handoff object between scan and judgment
- represent accept, reject, and remove as distinct lifecycle actions

## Design Decisions

### 1. Review artifact is a first-class object

Both review and audit must write a structured artifact into the repository.

Suggested location:

```text
reports/security/
  vendor-review/
  vendor-audit/
```

These files may be committed or left untracked. The implementation should support either workflow.

### 2. Review and audit stay separate

- `review` operates on staged candidate content and may lead to accept or reject
- `audit` operates on live accepted content and may lead to remove or baseline changes

`audit` must not gain `accept` semantics.

### 3. Lock describes live content only

`config/skills/lock.json` must never describe staged or rejected content.

### 4. Reject is revision-specific

Reject means “do not promote this fetched revision.” It does not mean “ban this skill forever.”

In the first implementation, reject may be lightweight and non-persistent beyond the review artifact.

### 5. Another agent reviews artifacts, not active skills

Reviewing agents must read:

- the review artifact
- the cited candidate files as inert text or code

They must not load staged skills as active skills.

## Artifact Schema

The exact JSON shape may evolve, but each artifact must capture enough information for another agent or a human to review findings without guessing.

Minimum fields:

- artifact kind: `vendor-review` or `vendor-audit`
- timestamp
- root command used
- skill names affected
- revision identifiers where available
  - upstream commit
  - content hash
- finding list
  - file
  - label
  - snippet
  - line number if available
  - fingerprint
- scanner sources used
- changed file or diff references where applicable

If convenient, add a shallow summary section with counts by scanner and by skill.

## Staging Model

Introduce a non-live staging area for fetched candidate content.

Suggested behavior:

- fetch writes candidate skill revisions into a staging directory
- the staging directory is not symlinked into any agent home
- review compares staged candidate content against the current live tree
- accept copies staged content into the live tree and updates the lock
- reject leaves the live tree unchanged

The exact staging path can be decided in code, but it must be outside the live `.agents/skills` activation path.

## Command Semantics

### `make vendor`

Should evolve toward:

- fetch into stage
- emit review artifact
- do not promote directly into live content

If needed, keep a temporary compatibility mode while the transition lands, but the end state should be staged-first.

### `make vendor-review`

Should operate on staged candidate content and write a review artifact.

### `make vendor-audit`

Should operate on the live tree and write an audit artifact.

### `accept`

New or evolved command behavior:

- takes a reviewed staged revision
- copies it into `.agents/skills`
- updates `config/skills/lock.json`
- may update baselines only after review acceptance, not as a substitute for review

### `reject`

New command behavior:

- leaves live tree unchanged
- leaves lock unchanged
- records the decision in the artifact or adjacent review note if helpful

### `remove`

New command behavior:

- removes already-live content
- updates the lock
- should work for both manifest-driven removal and review-driven removal

## Implementation Phases

### Phase 1: Review artifact output (Done)

Artifact writing added to both review and audit without changing the fetch-to-live boundary.

Delivered:

- `src/skills/review/artifact.ts` — artifact type definitions and `writeArtifact()` writer
- `reports/security/vendor-review/` and `reports/security/vendor-audit/` directories (created at runtime)
- JSON artifact emitted from `runVendorReview` (all exit paths: no-changes, accept, normal)
- JSON artifact emitted from `runVendorAudit` (all exit paths: accept, json, normal)
- `.gitignore` entry for `.stage/skills/`

Artifact schema:
- kind, timestamp, command, skills, findings, scanners, changedFiles, summary
- Filename: `<kind>-<timestamp>.json` (timestamp colons/dots replaced with hyphens)
- Path: `reports/security/vendor-review/<file>`, `reports/security/vendor-audit/<file>`

### Phase 2: Staged fetch area

Introduce staging for fetched candidate content.

Deliverables:

- non-live staging directory
- fetch writes to stage instead of directly to live tree
- review consumes staged content

### Phase 3: Accept and reject

Implement promotion and refusal explicitly.

Deliverables:

- accept command or subcommand
- reject command or subcommand
- lock updates only on accept

### Phase 4: Remove and cleanup

Implement removal of already-live content and align docs and Make targets.

Deliverables:

- remove command or subcommand
- lock updates on remove
- obsolete direct-live fetch behavior removed

## Verification

Each phase should preserve or improve the current verification story.

Minimum verification:

- `pnpm build`
- `pnpm typecheck`
- `pnpm test`
- `make check`

Add tests for:

- artifact generation paths and JSON shape
- staged fetch not touching live tree
- accept updating live tree and lock
- reject leaving live tree and lock unchanged
- remove deleting live content and updating lock

## Resolved Decisions

These were settled during Phase 1 implementation:

1. **Staging directory path:** `.stage/skills/` — gitignored, cleaned by `make clean`.
2. **Artifact filename convention:** `<kind>-<timestamp>.json` under `reports/security/<kind>/`.
3. **accept/reject/remove UI:** Make targets wrapping CLI subcommands on `vendor.js`. `make accept` / `make reject` operate interactively (readline prompt if >1 staged skill). `make remove <skill>` requires a name.
4. **Reject persistence:** No persistent ledger — stage entry stays until overwritten by next fetch or swept by `make clean`.
5. **Reports tracked:** `reports/security/` is committed so CI can produce and publish artifacts.

## Success Criteria

- [x] review and audit both emit durable structured artifacts in-repo
- [ ] another agent can review a candidate from artifact plus inert file reads
- [ ] fetched candidate content is staged before live activation
- [ ] accept promotes staged content and updates the lock
- [ ] reject does not mutate live content or the lock
- [ ] remove mutates live content and the lock only for already-live accepted content
- [ ] `docs/skill-lifecycle.md` remains aligned with implementation behavior
