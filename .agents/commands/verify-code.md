Run verification checks before a PR. Auto-detect package manager and stack.

## Steps

### 1. Detect stack
```bash
# Package manager
[ -f pnpm-lock.yaml ] && PM=pnpm || [ -f bun.lockb ] && PM=bun || PM=npm

# Languages present
[ -f tsconfig.json ] && HAS_TS=1
[ -f pyproject.toml ] && HAS_PYTHON=1
[ -f Gemfile ] && HAS_RUBY=1
```

### 2. Build
```bash
$PM run build 2>&1 | tail -20
```
Stop if build fails.

### 3. Types
```bash
# TypeScript
[ $HAS_TS ] && npx tsc --noEmit 2>&1 | head -30

# Python
[ $HAS_PYTHON ] && (pyright . 2>&1 || mypy . 2>&1) | head -30
# Ruby (Sorbet or Steep if present)
[ $HAS_RUBY ] && [ -f sorbet/config ] && bundle exec srb tc 2>&1 | head -30
[ $HAS_RUBY ] && [ -f Steepfile ] && bundle exec steep check 2>&1 | head -30
```

### 4. Lint
```bash
$PM run lint 2>&1 | head -30
# Python
[ $HAS_PYTHON ] && ruff check . 2>&1 | head -20
# Ruby
[ $HAS_RUBY ] && bundle exec rubocop --format progress 2>&1 | tail -20
```

### 5. Tests
```bash
$PM run test 2>&1 | tail -30
# Ruby
[ $HAS_RUBY ] && bundle exec rspec --format progress 2>&1 | tail -30
```

### 6. Diff
```bash
git diff --stat HEAD
```
Flag any unintended files.

## Output

```
VERIFY
------
Build:  PASS / FAIL
Types:  PASS / FAIL  (N errors)
Lint:   PASS / FAIL  (N warnings)
Tests:  PASS / FAIL  (N/N, N% coverage)
Diff:   N files changed

Status: READY / NOT READY

Issues:
1. ...
```
