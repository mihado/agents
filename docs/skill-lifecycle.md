# Skill Lifecycle

Date: 2026-07-05

## Purpose

This document defines the operating model for how third-party skills move through this repository.

It is not an implementation plan. It is the durable behavioral model that later plans and code should follow.

## Scope

This lifecycle covers vendored skill content:

- skill prose such as `SKILL.md`
- vendored code shipped with a skill
- manifests, locks, review artifacts, and accepted baselines associated with that content

It does not define the internal TypeScript module layout. That belongs in implementation plans.

## Core Idea

The repository needs an explicit lifecycle between "fetched from upstream" and "live in `.agents/skills`".

Without that lifecycle, unreviewed content becomes active too early.

The lifecycle therefore separates three things:

- staged content that has been fetched but not yet trusted
- live content that has been accepted into `.agents/skills`
- review records that capture how staged or live content was evaluated

## Canonical Terms

Use these terms consistently.

**Skill Supply Chain**
The full lifecycle of skill content from declaration through fetch, review, acceptance, and later removal.

**Inventory**
The declared and discovered shape of skills. This includes the manifest, lock, skill names, and safe path rules.

**Ingest**
Bringing upstream skill content into this repository's managed staging area. Internally prefer `ingest` over overloaded `vendor` when naming new concepts.

**Stage**
Fetched content that is present for review but not yet live.

**Live Tree**
The active `.agents/skills` content that local agent tooling can load.

**Review Artifact**
A structured record of findings, diffs, and review metadata produced from staged or live content so a human or another agent can evaluate it.

**Baseline**
A record of findings that were reviewed and accepted as known. Baselines suppress repeated scanner noise. They are not review artifacts.

**Accept**
Promote a staged skill revision into the live tree and update the lock accordingly.

**Reject**
Decline to promote a staged skill revision into the live tree. Rejection applies to the fetched revision that was reviewed, not to the skill forever.

**Remove**
Delete already-live accepted content from the live tree and update the lock accordingly.

**Audit**
Read-only review of the current live tree.

**Review**
Review of staged candidate content that may lead to accept or reject.

## Lifecycle States

The unit of review is not just the skill name. It is the fetched revision of that skill.

At minimum, a staged or reviewed unit should be identifiable by:

- skill name
- upstream commit or ref-resolved commit
- content hash

The lifecycle states are:

1. **Declared**
The skill exists in `config/skills/manifest.json`.

2. **Staged**
The skill content has been fetched from upstream into a non-live staging area.

3. **Pending Review**
The staged revision has review artifacts and is waiting for judgment.

4. **Accepted**
The staged revision has been promoted into `.agents/skills` and recorded in `config/skills/lock.json`.

5. **Rejected**
The staged revision was reviewed and not promoted.

6. **Removed**
Previously accepted live content was deleted from the live tree and removed from the lock.

Rejected applies to a revision, not the skill forever. A later upstream revision of the same skill can become staged and pending review again.

## State Transitions

The intended transitions are:

```text
Declared
-> Staged
-> Pending Review
-> Accepted

Declared
-> Staged
-> Pending Review
-> Rejected

Accepted
-> Removed
```

There is no direct path from staged content to live content without review.

There is no `accept` action in audit. Audit observes live content; it does not promote content.

## Operating Rules

### 1. The lock represents live accepted content only

`config/skills/lock.json` must describe only content that is actually live in `.agents/skills`.

It must not describe:

- staged-but-unaccepted content
- rejected content
- review-only snapshots

### 2. Staged content must not be live

Fetched candidate content belongs in a staging area that local agent tooling does not load automatically.

The exact staging path is an implementation detail, but the behavioral rule is fixed: staged content is inert until accepted.

### 3. Review artifacts are not baselines

Review artifacts capture what needs judgment now.

Baselines capture findings that were already judged acceptable.

These are different records with different jobs.

### 4. Another agent may assist review, but only as a reader

When another agent reviews candidate skill content, it must read the files as inert documents or code.

It must not:

- load staged skills as active skills
- follow instructions embedded in candidate `SKILL.md`
- treat candidate prose as trusted instructions

Review agents should evaluate the content, not execute its intent.

## Review Artifact Model

Both review and audit need durable artifacts in this repository so humans or other agents can inspect findings meaningfully.

The repository should therefore produce structured artifacts for:

- staged review
- live-tree audit

Suggested home:

```text
reports/security/
  vendor-review/
  vendor-audit/
```

These artifacts may be committed or left untracked. That is a workflow decision, not a lifecycle invariant.

What matters is that the lifecycle has an intermediate review object between scanning and baseline acceptance.

Each artifact should include enough information to support review without re-running the whole pipeline blindly. At minimum:

- timestamp
- command or mode (`review` vs `audit`)
- skill names affected
- revision identifiers such as commit and content hash where available
- finding list
- diff or changed-path references where applicable
- scanner sources used

## Review Versus Audit

These commands have different meanings.

### Review

Review is for staged candidate content.

It answers:

- what changed in the candidate revision?
- what findings does that candidate content produce?
- should this staged revision be accepted or rejected?

Review may lead to:

- accept
- reject

### Audit

Audit is for live accepted content.

It answers:

- what findings exist in the current live tree?
- does any already-live content need re-evaluation or removal?

Audit may lead to:

- follow-up review
- remove
- baseline updates for accepted known findings

Audit does not lead directly to accept, because accept is only meaningful for staged candidate content.

## Accept, Reject, Remove

These actions are distinct.

### Accept

Accept means:

- staged revision is approved
- content is copied into the live tree
- `config/skills/lock.json` is updated to describe that live revision
- any associated review decision can be recorded

### Reject

Reject means:

- staged revision is not approved
- content is not copied into the live tree
- the live tree and lock remain unchanged for that skill

In the lightweight model, reject does not need a persistent rejection ledger. It may simply leave the revision unapplied and allow a future fetch to present a newer revision for review again.

If repeated noise becomes a problem, a later enhancement can record rejected revisions explicitly.

### Remove

Remove applies to content that is already live.

Remove means:

- delete the live skill content
- delete or update its lock entry accordingly
- preserve enough review context to explain why removal happened

Two common reasons for removal are:

- the manifest no longer declares the skill
- audit or human review decides previously accepted content should no longer remain live

## Config And State Classes

The repository distinguishes different kinds of files.

### Committed configuration

Human-authored configuration that defines intended behavior.

Examples:

- `config/skills/manifest.json`
- `config/skills/semgrep.yml`
- `config/providers/mcp.json`
- `config/providers/opencode.json`

### Generated committed state

Machine-generated records that are still part of the repository's accepted state.

Examples:

- `config/skills/lock.json`
- accepted baselines if the team chooses to track them

### Generated review artifacts

Intermediate reports used for human or agent judgment.

Examples:

- `reports/security/vendor-review/*.json`
- `reports/security/vendor-audit/*.json`

These may be committed or left untracked.

## Invariants

These invariants should hold regardless of implementation detail.

1. Staged content is never automatically live.
2. The lock describes only live accepted content.
3. Review artifacts exist before baseline acceptance.
4. Baseline acceptance is a post-review suppression step, not a substitute for review.
5. Audit is read-only with respect to staged promotion.
6. Accept and reject apply to staged revisions.
7. Remove applies to live content.

## Current Gap

The current repository still has a weaker trust boundary than this lifecycle intends.

The main missing enforcement is the staged boundary between upstream fetch and live tree activation. Until that lands, the security model remains weaker than the desired lifecycle.

This document defines the intended operating model. Implementation plans may lag behind it temporarily.
