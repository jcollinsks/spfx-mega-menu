# Remediation Roadmap

**Date:** 2026-03-24
**Target:** Production-ready for Fortune 100 enterprise deployment

---

## Phase 1: Block Deployment (Sprint 1)

These items must be resolved before any production deployment. All are low-effort, high-impact security fixes.

### 1.1 Add URL Validation on Navigation Links

**Findings:** S-02
**Files:** `MegaMenuNav.tsx`, `MobileNav.tsx`, new `utils/urlValidator.ts`
**Effort:** 2-4 hours

Create a URL validation utility that:
1. Allows relative URLs starting with `/` (but not `//`)
2. Allows `https:` and `http:` protocols only
3. Rejects `javascript:`, `data:`, `vbscript:`, and all other protocols
4. Optionally validates against a domain allowlist
5. Falls back to `#` for invalid URLs

Apply to all `href` attributes rendered from list data.

### 1.2 Add Color Value Validation

**Findings:** S-01
**Files:** `NotificationBar.tsx`, new `utils/colorValidator.ts`
**Effort:** 1-2 hours

Create a color validation function that:
1. Accepts hex colors (`#RGB`, `#RRGGBB`, `#RRGGBBAA`)
2. Accepts a curated set of named CSS colors
3. Rejects all other values
4. Falls back to default colors (`#FFF3CD` / `#856404`)

### 1.3 Remove `style` from DOMPurify Allowed Attributes

**Findings:** S-03
**Files:** `NotificationBar.tsx`
**Effort:** 5 minutes

```diff
- const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'style'];
+ const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];
```

If styling is needed in notification messages, provide predefined CSS classes.

### 1.4 Restrict List Permissions in Provisioning Script

**Findings:** S-04, PS-03
**Files:** `scripts/Provision-Lists.ps1`
**Effort:** 2-4 hours

1. Add an optional `-AdminGroupName` parameter
2. Break permission inheritance on both lists after creation
3. Grant only the specified group Edit access
4. Enable content approval and versioning

### 1.5 Commit Lock File and Add Dependency Auditing

**Findings:** S-07
**Files:** `package-lock.json`, CI configuration
**Effort:** 1 hour

1. Run `npm install` to generate `package-lock.json`
2. Commit it to the repository
3. Add `npm audit --audit-level=high` to the build/CI process

---

## Phase 2: Before Production (Sprints 2-3)

### 2.1 Write Comprehensive Test Suite

**Findings:** CQ-01
**Effort:** 3-5 days

#### Priority order:

1. **Security validation tests** (URL validator, color validator, DOMPurify config)
   - Test every known attack vector
   - Test boundary cases
   - 100% branch coverage

2. **Service layer tests** (`MegaMenuService`, `NotificationService`)
   - Cache hit/miss/expiry
   - Data transformation (groupByCategory, sortByPriority)
   - Error handling paths
   - Edge cases (empty lists, max items, invalid data)

3. **Component render tests** (all `.tsx` files)
   - Render with various data scenarios
   - Keyboard interaction
   - Accessibility attributes present
   - Dismiss behavior

### 2.2 Add React Error Boundary

**Findings:** CQ-06
**Files:** New `components/MegaMenuErrorBoundary.tsx`, `MegaMenuApplicationCustomizer.ts`
**Effort:** 2-4 hours

1. Create an Error Boundary component with minimal fallback navigation
2. Log errors to the SPFx logging framework
3. Wire up to telemetry (see 2.3)
4. Wrap the `MegaMenuContainer` in the Error Boundary at the render site

### 2.3 Add Structured Telemetry

**Findings:** EG-01
**Files:** New `services/TelemetryService.ts`, integration across all services and components
**Effort:** 1-2 days

Integrate with the organization's APM solution. Instrument:
- API call latency and error rates
- Cache hit/miss ratios
- Component render errors (via Error Boundary)
- Navigation interaction events

### 2.4 Fix Cache Key Collision

**Findings:** CQ-07
**Files:** `MegaMenuService.ts`
**Effort:** 30 minutes

Scope the cache key to include the site URL:

```typescript
private getCacheKey(): string {
  return `spfx_megamenu_cache_${this.siteUrl}`;
}
```

### 2.5 Add Loading and Error States

**Findings:** CQ-09
**Files:** `MegaMenuContainer.tsx`, `MegaMenuApplicationCustomizer.ts`
**Effort:** 2-4 hours

1. Pass `isLoading` and `error` props to the container
2. Render a shimmer/skeleton during data fetch
3. Show a non-intrusive error indicator on failure
4. Provide a retry mechanism

### 2.6 Replace Silent Error Swallowing with Logging

**Findings:** CQ-04
**Files:** `MegaMenuService.ts`, `NotificationBar.tsx`
**Effort:** 1 hour

Replace empty `catch` blocks with `Log.verbose()` or `Log.warning()` calls.

### 2.7 Add Error Handling and Transcript to Provisioning Script

**Findings:** PS-01, PS-04
**Files:** `scripts/Provision-Lists.ps1`
**Effort:** 1-2 hours

Wrap in try/finally, add Start-Transcript, ensure Disconnect-PnPOnline always runs.

---

## Phase 3: Enterprise Hardening (Sprints 4-7)

### 3.1 Implement Audience Targeting (RBAC)

**Findings:** EG-03
**Effort:** 3-5 days

1. Add `AudienceGroupIds` field to MegaMenu list (multi-value text or lookup)
2. Resolve current user's Azure AD group memberships via Microsoft Graph
3. Filter menu items at fetch time based on group membership
4. Cache group membership separately with appropriate TTL
5. Fall back to showing all items if Graph call fails (fail-open for navigation)

### 3.2 Implement Localization (i18n)

**Findings:** EG-02
**Effort:** 2-3 days

1. Create SPFx localization files (`loc/en-us.js`, `loc/mystrings.d.ts`)
2. Externalize all UI strings
3. Support RTL layouts
4. Document the localization process for adding new languages

### 3.3 Add Content Approval Workflow

**Findings:** EG-04
**Effort:** 2-3 days

1. Enable content approval on both lists (partially done in Phase 1)
2. Create a Power Automate flow for change notification and approval
3. Update the MegaMenuService to filter by approval status
4. Add a "Preview" mode for content authors to see pending changes

### 3.4 Add Change Audit Trail

**Effort:** 1-2 days

1. Enable list versioning (done in Phase 1)
2. Configure SharePoint alerts for item modifications
3. Create a Power Automate flow to log changes to a central audit list
4. Build a simple admin dashboard for change history

### 3.5 Harden Deployment Configuration

**Findings:** S-06
**Effort:** 1 day

1. Set `skipFeatureDeployment: false`
2. Document the staged rollout process
3. Create separate .sppkg packages for dev/staging/production
4. Establish a rollback procedure

### 3.6 Add Automated Auth to Provisioning Script

**Findings:** PS-02
**Effort:** 1 day

Support certificate-based and managed identity authentication for CI/CD pipelines.

### 3.7 Upgrade to React 18

**Findings:** CQ-10
**Effort:** 2-3 days (dependent on SPFx framework support)

1. Upgrade React dependencies when SPFx supports React 18
2. Replace `ReactDom.render` with `createRoot`
3. Test all components for React 18 compatibility
4. Leverage concurrent features if beneficial

---

## Phase 4: Continuous Improvement (Ongoing)

### 4.1 Navigation Analytics

**Findings:** EG-05
**Effort:** 2-3 days

Track click events on navigation links, build dashboards, use data to optimize navigation structure.

### 4.2 Search Integration

**Findings:** EG-06
**Effort:** 3-5 days

Add type-ahead search within the mega menu for quick navigation.

### 4.3 Multi-Level Hierarchy

**Effort:** 3-5 days

Support sub-categories for deeper navigation structures if organizational needs require it.

---

## Summary Timeline

```
Sprint 1       | Phase 1: Security fixes (BLOCKING)
                | - URL validation, color validation, DOMPurify fix
                | - List permissions, lock file
                |
Sprints 2-3     | Phase 2: Production readiness
                | - Test suite (3-5 days)
                | - Error boundaries, telemetry, loading states
                | - Cache key fix, logging improvements
                |
Sprints 4-7     | Phase 3: Enterprise features
                | - Audience targeting, i18n, approval workflows
                | - Audit trail, deployment hardening
                | - React 18 upgrade
                |
Ongoing         | Phase 4: Optimization
                | - Analytics, search, hierarchy depth
```

## Acceptance Criteria for Production Readiness

Before deploying to production, all of the following must be true:

- [ ] All Phase 1 items complete and verified
- [ ] All Phase 2 items complete and verified
- [ ] Test coverage >= 80% overall, 100% on security validators
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run lint` passes with zero errors
- [ ] `npm run test` passes with zero failures
- [ ] `npm audit` reports zero high/critical vulnerabilities
- [ ] Security review sign-off on URL and HTML sanitization
- [ ] Telemetry verified in staging environment
- [ ] Error boundary tested with simulated failures
- [ ] Load tested with maximum expected list item count
- [ ] Accessibility audit passes WCAG 2.1 AA
- [ ] Staged rollout plan documented and approved
- [ ] Rollback procedure tested
