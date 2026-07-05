# Security

This repository vendors third-party agent skills. That creates two review surfaces:

- skill prose that an agent may read and follow
- vendored code that may execute or assist execution

This document records the current security path.

## 1. Threat Model

We are defending against unsafe upstream skill content.

Examples:

- a `SKILL.md` that tells an agent to ignore instructions, hide behavior, read secrets, or exfiltrate data
- a script that shells out, decodes payloads, reads dynamic environment state, or runs obviously dangerous commands

## 2. Current Controls

### 2.1. We verify integrity with `make vendor`

`make vendor` handles vendoring mechanics:

- fetch upstream repositories declared in `config/skills/manifest.json`
- copy selected skills unchanged
- verify content against `config/skills/lock.json`
- enforce path-safe extraction
- track upstream license files

This proves integrity. It does not prove safety.

### 2.2. We scan skill prose with the local regex scanner

`make vendor-review` and `make vendor-audit` use `src/skills/review/prose-scanner.ts` for prose-like files such as:

- `.md`
- `.mdx`
- `.txt`

This scanner looks for prompt-injection and instruction-risk patterns, including:

- instruction overrides
- concealment from the user
- secret or credential access phrasing
- obvious exfiltration language
- zero-width or invisible characters

We keep this scanner local and simple because this is plain-text policy scanning, not classic code analysis.

### 2.3. We scan code with Semgrep

`make vendor-review` and `make vendor-audit` use Semgrep for code files such as:

- `.sh`
- `.py`
- `.js`
- `.mjs`
- `.cjs`
- `.ts`

The Semgrep rules live in `config/skills/semgrep.yml`.

The current rules look for:

- `curl | sh`
- `rm -rf /`
- `base64 -d`
- `child_process`
- string `exec(...)`
- `eval(...)`
- `process.env[...]`
- `subprocess.*`
- `os.system(...)`
- `os.environ[...]`

We use Semgrep here because code scanning should rely on a maintained scanner and rule format, not a custom engine.

### 2.4. We use SkillSpector as a secondary scanner

`make vendor-review --skillspector` and `make vendor-audit --skillspector` run NVIDIA SkillSpector.

We use it for an extra static-analysis pass. We do not use it as the primary source of truth.

Reason:

- it can catch things the lighter scanners miss
- it is useful as a second opinion
- it is noisy enough that we do not want the default workflow to depend on it

## 3. Command Roles

### 3.1. `make vendor-review`

Purpose:

- scan only the current Git diff under `.agents/skills`
- report only findings introduced by the current change
- write structured artifact to `reports/security/vendor-review/`

Behavior:

- prose findings come from the local regex scanner
- code findings come from Semgrep
- findings are filtered against `config/skills/vendor-review-baseline.json`
- optional SkillSpector pass can be added
- artifact written regardless of whether findings exist

### 3.2. `make vendor-audit`

Purpose:

- scan the entire live skill tree
- produce a full current finding set
- write structured artifact to `reports/security/vendor-audit/`

Behavior:

- prose findings come from the local regex scanner
- code findings come from Semgrep
- optional SkillSpector pass recommended (`--skillspector`)
- artifact captures scanners, findings, summary by skill, and SkillSpector issue details

## 4. Baselines

We keep separate baselines for separate scanners.

### 4.1. `config/skills/vendor-review-baseline.json`

Used by the local review pipeline.

Stores accepted findings for prose and Semgrep-normalized code results.

Fingerprints are based on:

- file
- label
- snippet

### 4.2. `config/skills/skillspector-baseline.yaml`

Used by SkillSpector.

This baseline is optional scanner-noise suppression state. It is not part of the core staged promotion path.

## 5. Output Normalization

Semgrep output is normalized in `src/skills/review/semgrep.ts` into the same internal finding shape used by the rest of the review pipeline:

- `file`
- `label`
- `snippet`
- `lineNum`
- `fingerprint`

This keeps:

- `vendor-review`
- `vendor-audit`
- fingerprint baselines

stable even if the code-scanning engine changes.

## 6. Commands

```bash
make vendor             # fetch skills to stage
make vendor-review      # scan staged diff (with SkillSpector), write artifact
make vendor-audit       # scan live tree, write artifact (with SkillSpector)
make vendor-accept      # promote remaining staged skills to live and update lock
make check              # verify lock integrity + MCP + providers
```

## 7. Current Limits

- no sandboxing of skill execution
- no guarantee that vendored content is safe
- no replacement for reading the actual diff
- no claim that all prompt-injection patterns are covered
- no claim that all code-execution paths are covered
- staged cache boundary exists but reject/remove flow is still being finished

Today, vendored content is written to `.stage/skills` before review. The intended workflow is review, reject unwanted staged skills, then accept whatever remains.

## 8. Improvements In Progress

Work still to be done:

- reject/remove flow and exact post-rejection promotion semantics
- optional isolated staging evaluation for checkout, scanning, and review
- filesystem-attribute checks for vendored content
- persistence-mechanism checks such as shell profile or cron writes
- stronger diff-to-finding range mapping for multi-line code findings
- possible commit-age or release-age trust gates for upstream changes

Reference plan:

- `docs/plans/2026-07-05-skill-lifecycle-implementation.md`

### 8.1. Staged cache boundary

The next trust boundary should be:

```text
upstream repository
-> inert cache
-> scan and review
-> explicit accept
-> live .agents/skills tree
```

This is safer than the current flow because unreviewed upstream prose is not immediately loadable by agent sessions through the live skill symlinks.

The staged cache does not prove safety. It only creates the place where safety review can happen before content becomes active.

### 8.2. Isolated staging evaluation

The staging phase may eventually run inside an isolated execution environment such as agentOS or another sandbox-like VM.

Possible shape:

```text
isolated evaluator
-> clone upstream content
-> copy candidate skills into a staged filesystem
-> run regex scanner
-> run Semgrep and optional SkillSpector
-> optionally run LLM review over skill prose as inert data
-> emit findings, diffs, and content hashes

host
-> human reviews output
-> accepted content is copied into .agents/skills
-> skills.lock is updated
```

The evaluator should have restricted permissions:

- no mount of the host home directory
- no access to `~/.ssh`, `.env`, cloud credentials, agent config, or other secrets
- only temporary checkout and cache paths mounted
- outbound network disabled after checkout, or allowlisted to required upstream and scanner endpoints
- no broad process or filesystem access outside the staged workspace

If LLM review is used, the candidate `SKILL.md` must be provided as untrusted quoted data, not loaded as an active skill. The LLM review is advisory only and must not automatically approve content.

This reduces blast radius if candidate code or prose attempts secret access, persistence, or exfiltration during evaluation. It does not replace human diff review, does not guarantee semantic prompt-injection detection, and does not protect a normal host agent session after a skill has been accepted into the live tree.
