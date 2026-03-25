# Fixes Changelog

**Date:** 2026-03-24
**Scope:** All security findings (S-01 through S-05), code quality findings (CQ-02 through CQ-08), and PowerShell findings (PS-01 through PS-07)

This document describes every code change made to remediate findings from the enterprise code review and security audit. Each fix references the original finding ID from the review documents.

---

## Summary of Changes

| Finding | Severity | Fix | Files Changed |
| ------- | -------- | --- | ------------- |
| S-01 | HIGH | Added CSS color validation on inline styles | `NotificationBar.tsx`, new `colorValidator.ts` |
| S-02 | HIGH | Added URL validation on all navigation hrefs | `MegaMenuNav.tsx`, `MobileNav.tsx`, `MegaMenuContainer.tsx`, new `urlValidator.ts` |
| S-03 | MEDIUM-HIGH | Removed `style` from DOMPurify ALLOWED_ATTR | `NotificationBar.tsx` |
| S-05 | MEDIUM | Added structural validation on cached data | `MegaMenuService.ts` |
| CQ-02 | MEDIUM | Consolidated `any` casts into single typed helper | `pnpjsConfig.ts` |
| CQ-04 | MEDIUM | Replaced silent error swallowing with logging | `MegaMenuService.ts`, `NotificationBar.tsx` |
| CQ-05 | LOW | Removed redundant `return Promise.resolve()` | `MegaMenuApplicationCustomizer.ts` |
| CQ-06 | MEDIUM | Added React Error Boundary with fallback UI | new `MegaMenuErrorBoundary.tsx`, `MegaMenuApplicationCustomizer.ts` |
| CQ-07 | MEDIUM | Scoped cache key to site URL | `MegaMenuService.ts`, `MegaMenuApplicationCustomizer.ts` |
| CQ-08 | LOW | Added truncation warning log | `MegaMenuService.ts` |
| PS-01 | MEDIUM | Added try/finally with guaranteed disconnect | `Provision-Lists.ps1` |
| PS-02 | HIGH | Added certificate-based auth support | `Provision-Lists.ps1` |
| PS-03 | HIGH | Added permission restriction function | `Provision-Lists.ps1` |
| PS-04 | MEDIUM | Added transcript logging | `Provision-Lists.ps1` |
| PS-05 | LOW | Added SharePoint URL format validation | `Provision-Lists.ps1` |
| PS-06 | MEDIUM | Added versioning and content approval | `Provision-Lists.ps1` |
| PS-07 | LOW | Renamed `Ensure-Field` to `Initialize-Field` | `Provision-Lists.ps1` |

**New files created:** 6
**Files modified:** 7
**Test files added:** 2

---

## New Files

### `src/extensions/megaMenu/utils/urlValidator.ts`

**Fixes:** S-02 (URL Injection / Open Redirect)

URL validation utility that prevents XSS via `javascript:`, `data:`, `vbscript:`, and other dangerous protocol handlers in navigation URLs sourced from SharePoint list data.

**Exported functions:**

- `isValidNavigationUrl(url: string): boolean` - Returns true only for `https:`, `http:`, relative paths (`/...`), and fragment links (`#...`). Rejects all other protocols and protocol-relative URLs (`//`).
- `sanitizeNavigationUrl(url: string, fallback?: string): string` - Returns the URL if valid, otherwise returns the fallback (default `'#'`).

**Design decisions:**
- Allowlist approach (only permit known-safe protocols) rather than blocklist (reject known-bad). This is more secure because new attack vectors are automatically blocked.
- Relative paths starting with `/` are allowed because SharePoint navigation commonly uses site-relative URLs.
- Protocol-relative URLs (`//evil.com`) are rejected because they can redirect to attacker-controlled origins.

---

### `src/extensions/megaMenu/utils/colorValidator.ts`

**Fixes:** S-01 (CSS Injection via Inline Styles)

Color validation utility that prevents CSS injection through the `backgroundColor` and `textColor` fields sourced from the SharePoint Notifications list.

**Exported functions:**

- `isValidColor(value: string): boolean` - Returns true only for hex colors (`#RGB`, `#RRGGBB`, `#RRGGBBAA`) and a curated set of ~60 named CSS colors.
- `sanitizeColor(value: string, fallback: string): string` - Returns the color if valid, otherwise returns the fallback.

**Design decisions:**
- Rejects `rgb()`, `rgba()`, `hsl()` functional notation because these could potentially contain expressions in older browsers or be used to disguise injection payloads.
- The named color allowlist includes common colors needed for enterprise notification bars but excludes obscure CSS colors to reduce attack surface.
- Values are trimmed before validation to handle minor formatting differences.

---

### `src/extensions/megaMenu/utils/urlValidator.test.ts`

**Tests for:** S-02 fix

Comprehensive test suite covering:
- Valid URLs: `https:`, `http:`, relative paths, fragment links
- Dangerous URLs: `javascript:`, `data:`, `vbscript:`, `file:`, `ftp:`, protocol-relative
- Edge cases: empty strings, whitespace, null, undefined, non-string types
- `sanitizeNavigationUrl` fallback behavior

---

### `src/extensions/megaMenu/utils/colorValidator.test.ts`

**Tests for:** S-01 fix

Comprehensive test suite covering:
- Valid colors: 3-digit hex, 6-digit hex, 8-digit hex (alpha), named colors, case insensitivity
- Injection attacks: semicolon injection, `url()` values, `expression()`, malformed hex
- Edge cases: empty strings, whitespace, null, undefined
- `sanitizeColor` fallback behavior

---

### `src/extensions/megaMenu/utils/index.ts`

Barrel export file for the new utils module.

---

### `src/extensions/megaMenu/components/MegaMenuErrorBoundary.tsx`

**Fixes:** CQ-06 (No React Error Boundaries)

React Error Boundary class component that wraps the entire mega menu component tree. When an unhandled render error occurs:

1. **Catches the error** via `getDerivedStateFromError` and `componentDidCatch`
2. **Logs to SPFx** via `Log.error()` with the error message and React component stack
3. **Renders fallback UI**: A minimal navigation bar with a "Home" link, styled to match the mega menu's theme, ensuring users are never left without navigation

**Why a class component:** React Error Boundaries require class components with `getDerivedStateFromError` or `componentDidCatch` lifecycle methods. This is a React limitation that applies regardless of whether the rest of the codebase uses functional components.

---

## Modified Files

### `src/extensions/megaMenu/components/NotificationBar.tsx`

**Fixes:** S-01, S-03, CQ-04

**Change 1 - S-03: Remove `style` from DOMPurify ALLOWED_ATTR**

```diff
- const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'style'];
+ const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];
```

**Why:** The `style` attribute in user-authored HTML enables CSS-based data exfiltration (via `background: url(...)`) and UI redress attacks (absolute positioning, z-index manipulation). Removing it eliminates these vectors while preserving all other necessary attributes.

**Change 2 - S-01: Validate color values before rendering**

```diff
+ import { sanitizeColor } from '../utils';
  ...
  style={{
-   backgroundColor: notification.backgroundColor,
-   color: notification.textColor,
+   backgroundColor: sanitizeColor(notification.backgroundColor, '#FFF3CD'),
+   color: sanitizeColor(notification.textColor, '#856404'),
  }}
```

**Why:** `backgroundColor` and `textColor` come from SharePoint list data and were rendered directly into inline styles. Now they pass through the color validator, falling back to safe defaults if the value is not a valid hex or named color.

**Change 3 - CQ-04: Replace silent catch blocks with logging**

```diff
  } catch (error: unknown) {
-   return false;
+   console.debug('[NotificationBar] sessionStorage read failed:', error);
+   return false;
  }
```

**Why:** Empty `catch {}` blocks hide unexpected failures and make production debugging impossible. Now failures are logged at debug level (stripped from production builds by the SPFx build pipeline).

---

### `src/extensions/megaMenu/components/MegaMenuNav.tsx`

**Fixes:** S-02

```diff
+ import { sanitizeNavigationUrl } from '../utils';
  ...
  <a
-   href={item.navigationUrl}
+   href={sanitizeNavigationUrl(item.navigationUrl)}
    role="menuitem"
```

**Why:** Navigation URLs from the SharePoint list are now validated before rendering. `javascript:alert(1)` becomes `#`. Legitimate `https:` and relative URLs pass through unchanged.

---

### `src/extensions/megaMenu/components/MobileNav.tsx`

**Fixes:** S-02

```diff
+ import { sanitizeNavigationUrl } from '../utils';
  ...
  <a
-   href={item.navigationUrl}
+   href={sanitizeNavigationUrl(item.navigationUrl)}
    target={item.openInNewTab ? '_blank' : '_self'}
```

**Why:** Same URL validation applied to the mobile navigation panel, which renders the same list data in a different layout.

---

### `src/extensions/megaMenu/components/MegaMenuContainer.tsx`

**Fixes:** S-02 (extended to logoUrl)

```diff
+ import { isValidNavigationUrl } from '../utils';
  ...
- {logoUrl && (
+ {logoUrl && isValidNavigationUrl(logoUrl) && (
    <div className={styles.logo}>
```

**Why:** The `logoUrl` comes from component properties (configurable by site admins). While less exposed than list data, it should still be validated to prevent `javascript:` or `data:` URI injection via the `img` `src` attribute.

---

### `src/extensions/megaMenu/services/MegaMenuService.ts`

**Fixes:** CQ-04, CQ-07, CQ-08, S-05

**Change 1 - CQ-07: Scope cache key to site URL**

```diff
- const CACHE_KEY = 'spfx_megamenu_cache';
+ const CACHE_KEY_PREFIX = 'spfx_megamenu_cache_';
  ...
  export class MegaMenuService {
    private readonly sp: SPFI;
    private readonly listName: string;
+   private readonly cacheKey: string;

-   public constructor(sp: SPFI, listName: string) {
+   public constructor(sp: SPFI, listName: string, siteUrl: string) {
      this.sp = sp;
      this.listName = listName;
+     this.cacheKey = `${CACHE_KEY_PREFIX}${siteUrl}`;
    }
```

**Why:** The static cache key caused cross-site cache collisions. When `rootWebOnly: false` and a user navigated between site collections, cached data from site A would be incorrectly served on site B. The cache key is now scoped per site URL.

**Change 2 - S-05: Structural validation on cached data**

Added `isValidCacheEntry()` private method that validates:
- The parsed object has the expected `timestamp` (number) and `data` (array) fields
- The first 5 category entries have `category` (string) and `items` (array) fields

**Why:** If an attacker achieves XSS on the SharePoint origin (through any other vector), they could poison the sessionStorage cache with malicious navigation data. Structural validation catches tampered payloads that don't match the expected schema.

**Change 3 - CQ-04: Replace all silent catch blocks with logging**

All three `catch` blocks in `clearCache()`, `getFromCache()`, and `saveToCache()` now log via `Log.verbose()` instead of silently swallowing errors.

**Change 4 - CQ-08: Truncation warning**

```diff
+ if (response.length === MAX_ITEMS) {
+   Log.warn(LOG_SOURCE, `Fetched ${MAX_ITEMS} items (limit reached). Menu data may be truncated.`);
+ }
```

**Why:** When the 500-item limit is hit, items are silently truncated. Now a warning is logged so administrators can identify when the list has outgrown the query limit.

---

### `src/extensions/megaMenu/services/pnpjsConfig.ts`

**Fixes:** CQ-02

```diff
+ function createSPFI(context: unknown, baseUrl?: string): SPFI {
+   const base = baseUrl ? spfi(baseUrl) : spfi();
+   // eslint-disable-next-line @typescript-eslint/no-explicit-any
+   return base.using(SPFx(context as any)).using(PnPLogging(LogLevel.Warning));
+ }

  export function getSP(context?: unknown): SPFI {
    if (context !== undefined && context !== null) {
-     // eslint-disable-next-line @typescript-eslint/no-explicit-any
-     _sp = spfi().using(SPFx(context as any)).using(PnPLogging(LogLevel.Warning));
+     _sp = createSPFI(context);
    }
```

**Why:** The `any` cast is unavoidable due to a type mismatch between PnPjs's `SPFx()` function and SPFx's `ApplicationCustomizerContext`. Previously this cast was repeated in two locations with two separate eslint-disable comments. Now it's consolidated into a single `createSPFI()` helper function with one documented cast, reducing the surface area of type unsafety.

---

### `src/extensions/megaMenu/MegaMenuApplicationCustomizer.ts`

**Fixes:** CQ-05, CQ-06, CQ-07

**Change 1 - CQ-06: Error Boundary wrapping**

```diff
+ import { MegaMenuErrorBoundary } from './components/MegaMenuErrorBoundary';
  ...
- ReactDom.render(element, this._topPlaceholder.domElement);
+ const element = React.createElement(MegaMenuErrorBoundary, null, menuElement);
+ ReactDom.render(element, this._topPlaceholder.domElement);
```

**Why:** Without an Error Boundary, any unhandled render error in the component tree would unmount the entire mega menu with no fallback, leaving users without navigation. Now errors are caught and a minimal "Home" link is shown instead.

**Change 2 - CQ-05: Remove redundant `Promise.resolve()`**

```diff
    this.context.placeholderProvider.changedEvent.add(this, this._renderPlaceHolders);
-
-   return Promise.resolve();
  }
```

**Why:** The `onInit()` method is `async`, so it already returns a `Promise<void>` implicitly. The explicit `return Promise.resolve()` was dead code.

**Change 3 - CQ-07: Pass site URL to MegaMenuService constructor**

```diff
-   this._menuService = new MegaMenuService(rootSp, menuListName);
+   this._menuService = new MegaMenuService(rootSp, menuListName, rootWebUrl);
    ...
-   this._menuService = new MegaMenuService(sp, menuListName);
+   this._menuService = new MegaMenuService(sp, menuListName, currentWebUrl);
```

**Why:** The MegaMenuService constructor now requires a `siteUrl` parameter to scope the sessionStorage cache key and prevent cross-site cache collisions.

---

### `scripts/Provision-Lists.ps1`

**Fixes:** PS-01, PS-02, PS-03, PS-04, PS-05, PS-06, PS-07

This file was substantially rewritten. All changes are listed below:

**PS-01: Try/finally with guaranteed disconnect**

The entire provisioning body is now wrapped in `try { ... } catch { ... } finally { Disconnect-PnPOnline; Stop-Transcript }`. This ensures the PnP connection is always closed and the transcript is always stopped, even on failure.

**PS-02: Automated authentication support**

Added optional `-ClientId`, `-CertificatePath`, and `-Tenant` parameters. When all three are provided, the script uses certificate-based app-only authentication instead of interactive browser auth, enabling CI/CD pipeline execution.

**PS-03: Permission restriction function**

Added `Set-RestrictedListPermissions` function and optional `-AdminGroupName` parameter. When specified:
1. Breaks permission inheritance on both lists (without copying existing permissions)
2. Grants only the specified group Edit access
3. Warns clearly when the group doesn't exist

When not specified, a warning is displayed reminding the operator to restrict permissions for production.

**PS-04: Transcript logging**

Added `Start-Transcript` at script start and `Stop-Transcript` in the `finally` block. Creates timestamped log files (e.g., `Provision-Lists_20260324_143022.log`) in the scripts directory for audit compliance.

**PS-05: URL format validation**

```diff
+ [ValidatePattern('^https:\/\/[\w-]+\.sharepoint\.com')]
  [string]$SiteUrl
```

Validates that the URL matches a SharePoint Online pattern before attempting connection, providing a clear error message instead of a confusing PnP connection failure.

**PS-06: Versioning and content approval**

Added `Set-ListGovernance` function that enables:
- Version history (50 major versions) for audit trail and rollback
- Content approval so changes require admin review before going live

Applied to both MegaMenu and Notifications lists.

**PS-07: Approved verb naming**

```diff
- function Ensure-Field {
+ function Initialize-Field {
```

Renamed from `Ensure-Field` (unapproved verb) to `Initialize-Field` (approved verb), eliminating PowerShell module import warnings.

---

## Remaining Items (Not Fixed in This Pass)

The following findings require infrastructure, design decisions, or significant feature work that is beyond the scope of a code-level fix:

| Finding | Reason Not Fixed | Recommendation |
| ------- | ---------------- | -------------- |
| S-04 | List permissions depend on runtime SharePoint environment | Run updated `Provision-Lists.ps1` with `-AdminGroupName` parameter |
| S-06 | `skipFeatureDeployment` / `isDomainIsolated` are deployment-time decisions | Change in `package-solution.json` per environment policy |
| S-07 | No `package-lock.json` (requires `npm install` in project environment) | Run `npm install` and commit the lock file |
| CQ-01 | Full test suite requires significant effort (estimated 3-5 days) | Test files for validators are included; remaining tests should follow |
| CQ-03 | Default export is required by SPFx framework | Acknowledged, no change needed |
| CQ-09 | Loading/error states require UX design decisions | Implement in next sprint with UX team input |
| CQ-10 | React 18 upgrade depends on SPFx framework support | Track SPFx release notes |
| EG-01-06 | Enterprise features (telemetry, i18n, RBAC, etc.) | See Phase 3 in remediation roadmap |
