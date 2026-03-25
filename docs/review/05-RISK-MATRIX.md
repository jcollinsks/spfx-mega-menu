# Consolidated Risk Matrix

**Date:** 2026-03-24

---

## Risk Scoring Methodology

- **Severity:** How damaging is the issue if exploited or triggered?
- **Likelihood:** How probable is exploitation or occurrence in a Fortune 100 environment?
- **Business Impact:** What is the organizational consequence?
- **Remediation Effort:** How much work to fix?

### Severity Scale

| Rating | Definition |
| ------ | ---------- |
| CRITICAL | Immediate exploitation possible, data breach or org-wide outage |
| HIGH | Significant security or reliability risk, likely to cause incidents |
| MEDIUM | Moderate risk, defense-in-depth gap, could contribute to incidents |
| LOW | Minor issue, best practice deviation, unlikely to cause direct harm |

---

## Security Findings

| ID | Finding | Severity | Likelihood | Business Impact | Effort | Priority |
| -- | ------- | -------- | ---------- | --------------- | ------ | -------- |
| S-02 | URL Injection in navigation links | HIGH | Medium | Org-wide phishing via trusted navigation. Reputational damage, potential credential theft. | Low | **P1** |
| S-04 | No access control on data lists | MEDIUM | High | Any site member can modify enterprise navigation. Social engineering, misdirection, DoS. | Low | **P1** |
| S-01 | CSS Injection via inline styles | HIGH | Low | UI spoofing, content overlay, potential phishing within the notification bar. | Low | **P1** |
| S-03 | `style` attr in DOMPurify allowlist | MEDIUM-HIGH | Low | CSS-based exfiltration, UI redress attacks via notification rich text. | Trivial | **P1** |
| S-06 | Tenant-wide deployment, no domain isolation | MEDIUM | Low | Bug affects every site and every user in the SharePoint tenant. | Low | **P2** |
| S-05 | Session storage cache poisoning | MEDIUM | Low | Persistent attack via poisoned cache if any other XSS exists on the origin. | Medium | **P2** |
| S-07 | No dependency auditing or lock file | LOW | Medium | Supply chain compromise via unpinned transitive dependencies. | Low | **P2** |

---

## Code Quality Findings

| ID | Finding | Severity | Likelihood | Business Impact | Effort | Priority |
| -- | ------- | -------- | ---------- | --------------- | ------ | -------- |
| CQ-01 | Zero test coverage | CRITICAL | N/A | Cannot validate correctness. Regressions undetectable. CI/CD is unsafe. | High | **P1** |
| CQ-06 | No React error boundaries | MEDIUM | Medium | Unhandled render error removes all navigation for affected users. | Low | **P2** |
| CQ-09 | No loading or error states | MEDIUM | Medium | Users see blank space during load. Silent failure on API errors. | Low | **P2** |
| CQ-07 | Cache key collision across sites | MEDIUM | Low | Wrong navigation displayed when navigating between site collections. | Trivial | **P2** |
| CQ-04 | Silent error swallowing | MEDIUM | Low | Hides failures, makes production debugging impossible. | Low | **P3** |
| CQ-02 | `any` type casts | MEDIUM | Low | Type safety bypassed at PnPjs boundary. | Low | **P3** |
| CQ-08 | Hardcoded 500-item limit | LOW | Low | Silent data truncation if list exceeds limit. | Trivial | **P3** |
| CQ-05 | Redundant Promise.resolve() | LOW | N/A | Code clarity. No functional impact. | Trivial | **P3** |
| CQ-10 | React 17 technical debt | LOW | Low | End-of-life framework, no security patches. Constrained by SPFx. | High | **P4** |

---

## PowerShell Findings

| ID | Finding | Severity | Likelihood | Business Impact | Effort | Priority |
| -- | ------- | -------- | ---------- | --------------- | ------ | -------- |
| PS-03 | No permission configuration | HIGH | High | Lists open to all site editors; enables S-04 attack vector. | Low | **P1** |
| PS-02 | No automated auth support | HIGH | N/A | Cannot integrate with CI/CD. Manual-only provisioning. | Medium | **P2** |
| PS-01 | No error handling / try-finally | MEDIUM | Medium | Connection leak on failure. Unhelpful error messages. | Low | **P2** |
| PS-04 | No audit logging | MEDIUM | N/A | No record of provisioning operations for compliance. | Low | **P2** |
| PS-06 | No content approval / versioning | MEDIUM | N/A | No change governance on list data. | Trivial | **P2** |
| PS-05 | No URL format validation | LOW | Low | Confusing error on invalid input. | Trivial | **P3** |
| PS-07 | Unapproved PowerShell verb | LOW | N/A | Module import warnings. Style issue. | Trivial | **P3** |

---

## Enterprise Gap Findings

| ID | Finding | Severity | Business Impact | Effort | Priority |
| -- | ------- | -------- | --------------- | ------ | -------- |
| EG-01 | No observability / telemetry | HIGH | Blind operations, no alerting, no debugging capability | Medium | **P1** |
| EG-02 | No localization (i18n) | HIGH | Unusable for multinational organizations | Medium | **P1** |
| EG-03 | No role-based menu visibility | HIGH | Cannot implement audience-specific navigation | Medium | **P1** |
| EG-04 | No content approval workflow | HIGH | No governance over navigation changes | Medium | **P1** |
| EG-05 | No navigation analytics | MEDIUM | Cannot measure usage or optimize structure | Medium | **P3** |
| EG-06 | No search in mega menu | LOW | Usability gap for large navigation structures | Medium | **P3** |

---

## Heat Map Summary

```
              LOW Likelihood    MEDIUM Likelihood    HIGH Likelihood
CRITICAL     |                 |                    |
             |                 |                    |
HIGH         | S-01, S-03      | S-02               | PS-03
             |                 |                    |
MEDIUM       | S-05, S-06,     | CQ-06, CQ-09       | S-04
             | CQ-07           |                    |
LOW          | CQ-08           | S-07                |
             |                 |                    |
```

**Total findings: 25**
- P1 (Block deployment): 8
- P2 (Fix before production): 9
- P3 (Improve post-launch): 6
- P4 (Future planning): 2
