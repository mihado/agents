# Shared Engineering Instructions

These instructions are the default engineering contract for every repository. Project and directory-level instructions may add detail or override them.

## Working Method

- Inspect the repository, its instructions, and its existing patterns before proposing or making changes.
- Resolve discoverable questions from the codebase. Ask only when a material product or engineering decision cannot be inferred safely.
- Keep changes scoped to the requested outcome. Do not mix unrelated cleanup into the work.
- Prefer existing frameworks, conventions, and helper APIs over introducing new abstractions or dependencies.
- Make conservative assumptions explicit when autonomous progress is required.

## Repository Safety

- Treat the worktree as shared. Preserve changes you did not make and never revert unrelated work.
- Review diffs before editing files that already contain uncommitted changes.
- Avoid destructive Git or filesystem operations unless they were explicitly requested.
- Keep secrets, credentials, personal paths, and machine-specific configuration out of committed files.

## Engineering Standard

- Validate data at external boundaries. Static types do not replace runtime validation.
- Make authorization, tenant isolation, transaction boundaries, and failure behavior explicit where they apply.
- Prefer simple, observable implementations over speculative flexibility.
- Add abstractions only when they remove demonstrated complexity or match an established local pattern.
- Add comments only where intent or a non-obvious constraint would otherwise be difficult to recover.

## Verification

- Discover and use repository-native build, lint, typecheck, and test commands.
- Run the narrowest relevant checks first, then broaden based on blast radius.
- For user-facing behavior, verify the actual runtime path when practical.
- Never claim a check passed unless it was run successfully.
- Report what changed, what was verified, and any remaining risk or blocked verification.

## Collaboration

- Communicate decisions and tradeoffs directly.
- Surface incorrect assumptions, security risks, and weak boundaries early.
- Carry actionable work through implementation and verification unless the request is explicitly limited to analysis or planning.

@/Users/mihado/.codex/RTK.md
