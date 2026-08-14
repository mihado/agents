# Research Branch

1. Restate the bounded decision and scope boundary.
2. Gather primary evidence from the target repository, configuration, tests, and official documentation.
3. Record facts before interpretations or recommendations.
4. Compare findings against Brief constraints and the existing workflow contract.
5. Stop when the requested decision can be made; otherwise name the exact missing evidence.

Return:

```md
## Decision Question
<bounded decision this report informs>

## Evidence Sources
| Source | Tier | Locator | What it establishes |
| --- | --- | --- | --- |
| <source> | primary / secondary / speculative | <file:line, URL@ref, or command> | <scope> |

## Findings
- [fact] <claim> — <citation>
- [interpretation, confidence: normal] <claim> — <supporting citations>

## Recommendations
- [recommendation, confidence: high] <adopt / defer / reject decision> — <tradeoff and supporting citations>

## Unknowns
- [unknown: discoverable] <unknown> — <why it matters; how to resolve>
- [unknown: unsettled] <unknown> — <why it matters; decision owner>

## Next Decision
<the one next decision or execution Brief this report enables>
```
