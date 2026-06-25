---
name: ship-ready
description: Ship readiness chain — pre-launch checklist, observability, security hardening. Use before deploying to production, or when the user says "is this ready to ship", "pre-flight check", "launch readiness", "can we deploy this?".
disable-model-invocation: true
---

Run these three skills in sequence. Load each one with the `skill` tool, apply it, then move to the next.

## Pass 1: Launch Checklist

Load `shipping-and-launch` with the `skill` tool. Run its pre-launch checklist:

1. Feature flags — is the feature behind a flag? Can it be toggled off?
2. Rollback plan — can we revert this deployment in under 5 minutes?
3. Staged rollout — what's the rollout strategy? (percentage, cohort, region)
4. Monitoring — what metrics tell us this is working? What signals tell us to rollback?
5. Communication — who needs to know this is going live?

Fix any gaps found.

## Pass 2: Observability

Load `observability-and-instrumentation` with the `skill` tool. Verify we can see what's happening in production:

1. Structured logging — are logs machine-parseable with correlation IDs?
2. Metrics — do we have RED metrics (Rate, Errors, Duration) for the key paths?
3. Alerting — are alerts symptom-based (user impact) not cause-based (CPU high)?
4. Tracing — can we follow a request across service boundaries?

Fix any gaps found.

## Pass 3: Security

Load `security-and-hardening` with the `skill` tool. Run the security review:

1. Input validation — is all external input validated at boundaries?
2. Authentication & authorization — are auth checks explicit, not implicit?
3. Secrets — no hardcoded credentials, API keys, or tokens in code?
4. Dependencies — are there known vulnerabilities in the dependency tree?
5. OWASP Top 10 — quick scan for the most common web vulnerabilities

Fix any gaps found.

## Output

After all three passes, produce a readiness report:

- **Launch checklist**: Items checked, items with gaps, action items
- **Observability**: Logging, metrics, alerting, tracing status
- **Security**: Findings and severity, fixes applied, remaining risks
- **Verdict**: Ready to ship / Ship with caveats / Not ready — with reasoning
