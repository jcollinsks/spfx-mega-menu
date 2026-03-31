<#
.SYNOPSIS
    Provisions the MegaMenu and Notifications SharePoint lists.

.DESCRIPTION
    Creates the MegaMenu and Notifications lists with all required columns,
    configures versioning and content approval, and optionally restricts
    permissions to a designated admin group.
    Idempotent: skips list/field creation if they already exist.

.PARAMETER SiteUrl
    The URL of the SharePoint site where the lists will be created.
    Must be a valid SharePoint Online URL.

.PARAMETER AdminGroupName
    Optional. The name of a SharePoint group that should have exclusive
    Edit access to the provisioned lists. When specified, list permission
    inheritance is broken and only this group receives Edit rights.

.PARAMETER ClientId
    Optional. Azure AD App Registration Client ID for automated (non-interactive)
    authentication. Requires CertificatePath and Tenant parameters.

.PARAMETER CertificatePath
    Optional. Path to the PFX certificate file for app-only authentication.

.PARAMETER Tenant
    Optional. Azure AD tenant domain (e.g., contoso.onmicrosoft.com).

.EXAMPLE
    .\Provision-Lists.ps1 -SiteUrl "https://contoso.sharepoint.com"

.EXAMPLE
    .\Provision-Lists.ps1 -SiteUrl "https://contoso.sharepoint.com/sites/intranet" -AdminGroupName "Navigation Admins"

.EXAMPLE
    .\Provision-Lists.ps1 -SiteUrl "https://contoso.sharepoint.com" -ClientId "guid" -CertificatePath "./cert.pfx" -Tenant "contoso.onmicrosoft.com"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    # PS-05: Validate SharePoint Online URL format
    [ValidatePattern('^https:\/\/[\w-]+\.sharepoint\.com')]
    [string]$SiteUrl,

    [Parameter(Mandatory = $false)]
    [string]$AdminGroupName,

    # PS-02: Support automated authentication for CI/CD
    [Parameter(Mandatory = $false)]
    [string]$ClientId,

    [Parameter(Mandatory = $false)]
    [string]$CertificatePath,

    [Parameter(Mandatory = $false)]
    [string]$Tenant
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# PS-04: Enable transcript logging for audit trail
$transcriptPath = Join-Path $PSScriptRoot "Provision-Lists_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
Start-Transcript -Path $transcriptPath

# PS-07: Renamed from "Ensure-Field" to use approved PowerShell verb
function Initialize-Field {
    param(
        [Parameter(Mandatory)][string]$ListTitle,
        [Parameter(Mandatory)][string]$FieldName,
        [Parameter(Mandatory)][string]$FieldType,
        [string]$DefaultValue,
        [string[]]$Choices,
        [switch]$Required,
        [switch]$RichText
    )

    $existingFields = Get-PnPField -List $ListTitle -ErrorAction SilentlyContinue
    $fieldExists = $existingFields | Where-Object { $_.InternalName -eq $FieldName }

    if ($fieldExists) {
        Write-Host "  Field '$FieldName' already exists on '$ListTitle'. Skipping." -ForegroundColor Yellow
        return
    }

    $params = @{
        List         = $ListTitle
        DisplayName  = $FieldName
        InternalName = $FieldName
        Type         = $FieldType
        AddToDefaultView = $true
    }

    if ($Required) {
        $params.Required = $true
    }

    if ($FieldType -eq "Choice" -and $Choices) {
        $params.Choices = $Choices
    }

    Add-PnPField @params | Out-Null

    if ($DefaultValue) {
        $field = Get-PnPField -List $ListTitle -Identity $FieldName
        $field.DefaultValue = $DefaultValue
        $field.Update()
        Invoke-PnPQuery
    }

    if ($RichText -and $FieldType -eq "Note") {
        Set-PnPField -List $ListTitle -Identity $FieldName -Values @{ RichText = $true }
    }

    Write-Host "  Field '$FieldName' created on '$ListTitle'." -ForegroundColor Green
}

# PS-03: Configure restricted permissions on a list
function Set-RestrictedListPermissions {
    param(
        [Parameter(Mandatory)][string]$ListTitle,
        [Parameter(Mandatory)][string]$GroupName
    )

    $group = Get-PnPGroup -Identity $GroupName -ErrorAction SilentlyContinue
    if (-not $group) {
        Write-Warning "Group '$GroupName' not found on this site. Skipping permission restriction for '$ListTitle'."
        Write-Warning "Create the group first, then re-run this script."
        return
    }

    Write-Host "  Restricting permissions on '$ListTitle' to group '$GroupName'..." -ForegroundColor Cyan

    # Break inheritance without copying existing permissions
    Set-PnPList -Identity $ListTitle -BreakRoleInheritance -CopyRoleAssignments:$false

    # Grant the admin group Edit access
    Set-PnPGroupPermissions -Identity $GroupName -List $ListTitle -AddRole "Edit"

    Write-Host "  Permissions restricted on '$ListTitle'. Only '$GroupName' has Edit access." -ForegroundColor Green
}

# PS-06: Enable versioning and content approval on a list
function Set-ListGovernance {
    param(
        [Parameter(Mandatory)][string]$ListTitle
    )

    Set-PnPList -Identity $ListTitle -EnableVersioning $true -MajorVersions 50
    Write-Host "  Versioning enabled on '$ListTitle' (50 major versions)." -ForegroundColor Green

    Set-PnPList -Identity $ListTitle -EnableModeration $true
    Write-Host "  Content approval enabled on '$ListTitle'." -ForegroundColor Green
}

# PS-01: Wrap entire execution in try/finally for guaranteed cleanup
try {
    # PS-02: Support both interactive and automated authentication
    Write-Host "Connecting to $SiteUrl..." -ForegroundColor Cyan
    if ($ClientId -and $CertificatePath -and $Tenant) {
        Write-Host "  Using certificate-based authentication." -ForegroundColor Cyan
        Connect-PnPOnline -Url $SiteUrl -ClientId $ClientId -CertificatePath $CertificatePath -Tenant $Tenant
    } else {
        Write-Host "  Using interactive authentication." -ForegroundColor Cyan
        Connect-PnPOnline -Url $SiteUrl -Interactive
    }

    # --- MegaMenu List ---
    $megaMenuListTitle = "MegaMenu"
    Write-Host "`nProvisioning list: $megaMenuListTitle" -ForegroundColor Cyan

    $existingList = Get-PnPList -Identity $megaMenuListTitle -ErrorAction SilentlyContinue
    if ($existingList) {
        Write-Host "  List '$megaMenuListTitle' already exists. Ensuring fields..." -ForegroundColor Yellow
    } else {
        New-PnPList -Title $megaMenuListTitle -Template GenericList -EnableContentTypes:$false | Out-Null
        Write-Host "  List '$megaMenuListTitle' created." -ForegroundColor Green
    }

    Initialize-Field -ListTitle $megaMenuListTitle -FieldName "Category" -FieldType "Text" -Required
    Initialize-Field -ListTitle $megaMenuListTitle -FieldName "NavigationUrl" -FieldType "Text"
    Initialize-Field -ListTitle $megaMenuListTitle -FieldName "OpenInNewTab" -FieldType "Boolean" -DefaultValue "0"
    Initialize-Field -ListTitle $megaMenuListTitle -FieldName "SortOrder" -FieldType "Number"
    Initialize-Field -ListTitle $megaMenuListTitle -FieldName "IsVisible" -FieldType "Boolean" -DefaultValue "1"

    Set-ListGovernance -ListTitle $megaMenuListTitle

    # --- Notifications List ---
    $notificationsListTitle = "Notifications"
    Write-Host "`nProvisioning list: $notificationsListTitle" -ForegroundColor Cyan

    $existingList = Get-PnPList -Identity $notificationsListTitle -ErrorAction SilentlyContinue
    if ($existingList) {
        Write-Host "  List '$notificationsListTitle' already exists. Ensuring fields..." -ForegroundColor Yellow
    } else {
        New-PnPList -Title $notificationsListTitle -Template GenericList -EnableContentTypes:$false | Out-Null
        Write-Host "  List '$notificationsListTitle' created." -ForegroundColor Green
    }

    Initialize-Field -ListTitle $notificationsListTitle -FieldName "Message" -FieldType "Note" -RichText
    Initialize-Field -ListTitle $notificationsListTitle -FieldName "StartDate" -FieldType "DateTime" -Required
    Initialize-Field -ListTitle $notificationsListTitle -FieldName "EndDate" -FieldType "DateTime" -Required
    Initialize-Field -ListTitle $notificationsListTitle -FieldName "BackgroundColor" -FieldType "Text" -DefaultValue "#FFF3CD"
    Initialize-Field -ListTitle $notificationsListTitle -FieldName "TextColor" -FieldType "Text" -DefaultValue "#856404"
    Initialize-Field -ListTitle $notificationsListTitle -FieldName "Priority" -FieldType "Choice" -Choices @("Low", "Medium", "High", "Critical") -DefaultValue "Low"
    Initialize-Field -ListTitle $notificationsListTitle -FieldName "IsActive" -FieldType "Boolean" -DefaultValue "1"
    Initialize-Field -ListTitle $notificationsListTitle -FieldName "SortOrder" -FieldType "Number"

    Set-ListGovernance -ListTitle $notificationsListTitle

    # PS-03: Restrict permissions if admin group specified
    if ($AdminGroupName) {
        Write-Host "`nConfiguring list permissions..." -ForegroundColor Cyan
        Set-RestrictedListPermissions -ListTitle $megaMenuListTitle -GroupName $AdminGroupName
        Set-RestrictedListPermissions -ListTitle $notificationsListTitle -GroupName $AdminGroupName
    } else {
        Write-Warning "No -AdminGroupName specified. Lists inherit site permissions."
        Write-Warning "For production use, specify -AdminGroupName to restrict edit access."
    }

    Write-Host "`nProvisioning complete!" -ForegroundColor Green
    Write-Host "Lists created at: $SiteUrl" -ForegroundColor Cyan
}
catch {
    Write-Error "Provisioning failed: $_"
    exit 1
}
finally {
    # PS-01: Guaranteed disconnect even on failure
    Disconnect-PnPOnline -ErrorAction SilentlyContinue
    Stop-Transcript
}
