# Security

This repository vendors third-party agent skills. Two review surfaces: skill prose an agent reads and follows, and vendored code that may execute.

## Threat Model

Defending against unsafe upstream content: `SKILL.md` with instruction overrides, concealment, secret access, or exfiltration; scripts that shell out, decode payloads, or read dynamic environment state.

## Current Controls

- **Staged boundary**: content lands in `.stage/skills` before explicit accept into `.agents/skills`. Unreviewed upstream prose is not immediately loadable by agents. See `docs/skill-lifecycle.md` for the full lifecycle.
- **Integrity**: `apm skills fetch` pins commits and hashes in the lock; `apm skills check` verifies them. Integrity does not prove safety.

## Scanners

All scanners run during `apm skills review` (staged diff only) and `apm skills audit` (full live tree). Both write structured artifacts to `reports/security/skills-review/` and `reports/security/skills-audit/`.

Output is normalized to a unified finding shape: `file`, `label`, `snippet`, `lineNum`, `fingerprint`. This keeps artifacts stable across engine changes.

### Prose scanner (`src/skills/review/prose-scanner.ts`)

Targets `.md`, `.mdx`, `.txt`. Local regex — no external dependency.

Patterns: instruction overrides, concealment from user, credential access phrasing, exfiltration language, zero-width or invisible characters.

### Semgrep

Targets `.sh`, `.py`, `.js`, `.mjs`, `.cjs`, `.ts`. Rules in `config/skills/semgrep.yml`.

Patterns: `curl | sh`, `rm -rf /`, `base64 -d`, `child_process`, `exec()`, `eval()`, `process.env[...]`, `subprocess.*`, `os.system()`, `os.environ[...]`.

We use Semgrep for code scanning because it is a maintained scanner and rule format, not a custom engine.

### SkillSpector (`--skillspector`)

Secondary static-analysis pass via NVIDIA SkillSpector. Not primary — useful as a second opinion, noisy enough that default workflows don't depend on it.

## Baselines

Separate baselines per scanner, used to suppress known-accepted noise:

- `config/skills/skills-review-baseline.json` — prose + Semgrep findings, fingerprinted by `file`/`label`/`snippet`
- `config/skills/skillspector-baseline.yaml` — SkillSpector noise only. Optional; not part of staged promotion.

## Commands

```bash
./apm skills fetch
./apm skills review [--skillspector]
./apm skills audit [--skillspector] [--accept]
./apm skills reject <name>
./apm skills accept
```

## Current Limits

- no sandboxed execution of skill content
- no guarantee that vendored content is safe
- no replacement for reading the actual diff
- prompt-injection and code-execution coverage is incomplete
- staged review still runs on the host environment

## Improvements Planned

- isolated staging evaluation (sandboxed checkout, scan, review)
- filesystem-attribute checks for vendored content
- persistence-mechanism checks (shell profile, cron)
- stronger multi-line code finding mapping
- commit-age or release-age trust gates

Isolated evaluator shape:

- no mount of host home directory, no access to `~/.ssh`, `.env`, cloud credentials, or agent config
- temporary checkout and cache paths only; outbound network disabled or allowlisted after checkout
- restrictive filesystem and process permissions
- candidate `SKILL.md` treated as untrusted quoted data in any LLM review — never loaded as an active skill
- does not replace human diff review or guarantee semantic prompt-injection detection
