# PowerShell Provisioning Script Review

**Date:** 2026-03-24
**File:** `scripts/Provision-Lists.ps1`
**Scope:** Code quality, security, operational readiness

---

## Overview

The provisioning script creates two SharePoint lists (`MegaMenu` and `Notifications`) with all required columns. It uses PnP PowerShell cmdlets and is designed to be idempotent.

---

## Strengths

| Aspect | Assessment |
| ------ | ---------- |
| **Idempotent design** | Checks for existing lists and fields before creating. Safe to run multiple times without side effects. |
| **Strict mode** | `Set-StrictMode -Version Latest` catches common scripting errors. |
| **Error preference** | `$ErrorActionPreference = "Stop"` ensures errors don't silently continue. |
| **Parameter validation** | `[Parameter(Mandatory = $true)]` and `[ValidateNotNullOrEmpty()]` on `$SiteUrl`. |
| **Comment-based help** | Proper `.SYNOPSIS`, `.DESCRIPTION`, `.PARAMETER`, and `.EXAMPLE` blocks. |
| **Clean disconnect** | `Disconnect-PnPOnline` called at script end. |
| **Colored output** | Uses `Write-Host` with `-ForegroundColor` for clear visual feedback during manual execution. |

---

## Findings

### PS-01: No Error Handling Around Critical Operations

| Field           | Value |
| --------------- | ----- |
| **Severity**    | MEDIUM |
| **Status**      | Open |

#### Description

The script has no `try/catch/finally` blocks. If `Connect-PnPOnline`, `New-PnPList`, or `Add-PnPField` throws an error, the script terminates abruptly with a PowerShell stack trace and **`Disconnect-PnPOnline` never runs**, leaving the connection open.

#### Recommendation

Wrap the main execution in a try/finally:

```powershell
try {
    Connect-PnPOnline -Url $SiteUrl -Interactive

    # ... provisioning logic ...

    Write-Host "`nProvisioning complete!" -ForegroundColor Green
}
catch {
    Write-Error "Provisioning failed: $_"
    exit 1
}
finally {
    Disconnect-PnPOnline -ErrorAction SilentlyContinue
}
```

---

### PS-02: No Support for Automated Authentication

| Field           | Value |
| --------------- | ----- |
| **Severity**    | HIGH (for enterprise CI/CD) |
| **Status**      | Open |

#### Description

```powershell
Connect-PnPOnline -Url $SiteUrl -Interactive
```

The script only supports interactive browser-based authentication. This prevents:

- CI/CD pipeline execution
- Automated provisioning across multiple sites
- Scheduled re-runs for drift detection
- Infrastructure-as-Code workflows

#### Recommendation

Support multiple authentication methods:

```powershell
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [Parameter(Mandatory = $false)]
    [string]$ClientId,

    [Parameter(Mandatory = $false)]
    [string]$CertificatePath,

    [Parameter(Mandatory = $false)]
    [string]$Tenant
)

if ($ClientId -and $CertificatePath -and $Tenant) {
    Connect-PnPOnline -Url $SiteUrl -ClientId $ClientId -CertificatePath $CertificatePath -Tenant $Tenant
} else {
    Connect-PnPOnline -Url $SiteUrl -Interactive
}
```

---

### PS-03: No Permission Configuration After List Creation

| Field           | Value |
| --------------- | ----- |
| **Severity**    | HIGH |
| **Status**      | Open |

#### Description

Lists are created with default permissions (inheriting from the site). This means any site member with Edit access can modify navigation data. See Security Audit finding S-04 for full impact analysis.

#### Recommendation

Add permission configuration after list creation:

```powershell
function Set-RestrictedPermissions {
    param(
        [Parameter(Mandatory)][string]$ListTitle,
        [Parameter(Mandatory)][string]$AdminGroupName
    )

    # Break inheritance
    Set-PnPList -Identity $ListTitle -BreakRoleInheritance -CopyRoleAssignments:$false

    # Grant admin group full control
    $group = Get-PnPGroup -Identity $AdminGroupName -ErrorAction SilentlyContinue
    if ($group) {
        Set-PnPGroupPermissions -Identity $AdminGroupName -List $ListTitle -AddRole "Full Control"
        Write-Host "  Permissions restricted to '$AdminGroupName' on '$ListTitle'." -ForegroundColor Green
    } else {
        Write-Warning "Group '$AdminGroupName' not found. Permissions not configured."
    }
}
```

---

### PS-04: No Audit Logging or Transcript

| Field           | Value |
| --------------- | ----- |
| **Severity**    | MEDIUM |
| **Status**      | Open |

#### Description

The script produces colored console output but no persistent log. In enterprise environments, provisioning operations must be auditable. There's no record of:

- When the script ran
- Who ran it
- What actions were taken
- Whether it succeeded or failed

#### Recommendation

Add PowerShell transcript logging:

```powershell
$transcriptPath = Join-Path $PSScriptRoot "Provision-Lists_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
Start-Transcript -Path $transcriptPath

try {
    # ... provisioning logic ...
}
finally {
    Stop-Transcript
}
```

---

### PS-05: No URL Format Validation

| Field           | Value |
| --------------- | ----- |
| **Severity**    | LOW |
| **Status**      | Open |

#### Description

The `$SiteUrl` parameter validates only that it is not null or empty. It does not validate that it is a well-formed SharePoint URL. Passing an invalid URL will fail at `Connect-PnPOnline` with a confusing error message.

#### Recommendation

Add a validation pattern:

```powershell
[ValidatePattern('^https:\/\/[\w-]+\.sharepoint\.com')]
[string]$SiteUrl
```

---

### PS-06: No Content Approval or Versioning Configuration

| Field           | Value |
| --------------- | ----- |
| **Severity**    | MEDIUM |
| **Status**      | Open |

#### Description

The lists are created without enabling content approval or versioning. For enterprise governance:

- Content approval ensures changes are reviewed before going live
- Versioning provides an audit trail and rollback capability

#### Recommendation

Add after list creation:

```powershell
Set-PnPList -Identity $megaMenuListTitle -EnableVersioning $true -MajorVersions 50
Set-PnPList -Identity $megaMenuListTitle -EnableContentApproval $true

Set-PnPList -Identity $notificationsListTitle -EnableVersioning $true -MajorVersions 50
Set-PnPList -Identity $notificationsListTitle -EnableContentApproval $true
```

---

### PS-07: Unapproved Verb `Ensure-Field`

| Field           | Value |
| --------------- | ----- |
| **Severity**    | LOW |
| **Status**      | Open |

#### Description

The function `Ensure-Field` uses a verb (`Ensure`) that is not in PowerShell's approved verb list. This will generate warnings when importing as a module and violates PowerShell best practices.

#### Recommendation

Rename to `Assert-Field` or `Initialize-Field` (both approved verbs), or restructure as `New-FieldIfNotExists`.
