# clean-code skill

An [agent skill](https://docs.claude.com/en/docs/claude-code/skills) that helps a coding agent refactor and clean up code in **any codebase** — methodically, not by vibes.

It encodes Martin Fowler's *Refactoring* catalog, organized the way [refactoring.guru](https://refactoring.guru/refactoring) presents it, into a repeatable loop: **detect a code smell → choose the matching technique → apply it in safe, behavior-preserving small steps → keep tests green → confirm the result is actually cleaner.**

## What's inside

```
clean-code-skill/
├── SKILL.md                              # entry point: clean-code definition, the loop, rules, when-to-refactor
└── references/
    ├── clean-code-principles.md          # naming, small functions, guard clauses, DRY, comments — before → after
    ├── code-smells.md                    # 22 smells in 5 families → which technique fixes each (diagnose)
    └── refactoring-techniques.md         # 60+ techniques in 6 families with clean readable patterns (fix)
```

The agent loads `SKILL.md` first; the reference files are pulled in only when a task needs them (progressive disclosure), so the catalog depth costs nothing until it's used.

## When it triggers

The agent activates this skill when you ask to refactor, clean up, simplify, or improve the readability/maintainability of code — e.g. "untangle this long function," "reduce the code smells in this module," "make this class cleaner," or "do a refactoring pass on the codebase."

It is **behavior-preserving by contract**: it won't change what your program does. Behavior changes (features, bug fixes) are kept in separate commits.

## Install

Skills are discovered from a `skills/` directory. Make this skill available globally (all projects) or per-project:

**Global (recommended):**
```bash
# Claude Code
git clone https://github.com/<you>/clean-code-skill ~/.claude/skills/clean-code
# the skill name comes from SKILL.md frontmatter ("clean-code"); the folder name is cosmetic
```

**Per project:**
```bash
git clone https://github.com/<you>/clean-code-skill .claude/skills/clean-code
```

Then invoke it explicitly with `/clean-code`, or just describe a cleanup task and let the agent pick it up.

> Note: a skill is loaded by directory placement, not by running an installer. The repo root *is* the skill — `SKILL.md` must sit at the top level of the skills subfolder.

## Source & credit

- Method and catalog: Martin Fowler, *Refactoring: Improving the Design of Existing Code*.
- Structure and smell/technique taxonomy: https://refactoring.guru/refactoring
- This skill is an independent teaching aid, not affiliated with or endorsed by refactoring.guru.

## License

MIT
