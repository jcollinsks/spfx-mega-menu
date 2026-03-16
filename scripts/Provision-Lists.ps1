<#
.SYNOPSIS
    Provisions the MegaMenu and Notifications SharePoint lists.

.DESCRIPTION
    Creates the MegaMenu and Notifications lists with all required columns.
    Idempotent: skips list/field creation if they already exist.

.PARAMETER SiteUrl
    The URL of the SharePoint site where the lists will be created.

.EXAMPLE
    .\Provision-Lists.ps1 -SiteUrl "https://contoso.sharepoint.com"

.EXAMPLE
    .\Provision-Lists.ps1 -SiteUrl "https://contoso.sharepoint.com/sites/intranet"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$SiteUrl
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Field {
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
        $field = Get-PnPField -List $ListTitle -Identity $FieldName
        $field.RichText = $true
        $field.Update()
        Invoke-PnPQuery
    }

    Write-Host "  Field '$FieldName' created on '$ListTitle'." -ForegroundColor Green
}

# Connect to SharePoint
Write-Host "Connecting to $SiteUrl..." -ForegroundColor Cyan
Connect-PnPOnline -Url $SiteUrl -Interactive

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

Ensure-Field -ListTitle $megaMenuListTitle -FieldName "Category" -FieldType "Text" -Required
Ensure-Field -ListTitle $megaMenuListTitle -FieldName "NavigationUrl" -FieldType "Text"
Ensure-Field -ListTitle $megaMenuListTitle -FieldName "OpenInNewTab" -FieldType "Boolean" -DefaultValue "0"
Ensure-Field -ListTitle $megaMenuListTitle -FieldName "SortOrder" -FieldType "Number"
Ensure-Field -ListTitle $megaMenuListTitle -FieldName "IsVisible" -FieldType "Boolean" -DefaultValue "1"

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

Ensure-Field -ListTitle $notificationsListTitle -FieldName "Message" -FieldType "Note" -RichText
Ensure-Field -ListTitle $notificationsListTitle -FieldName "StartDate" -FieldType "DateTime" -Required
Ensure-Field -ListTitle $notificationsListTitle -FieldName "EndDate" -FieldType "DateTime" -Required
Ensure-Field -ListTitle $notificationsListTitle -FieldName "BackgroundColor" -FieldType "Text" -DefaultValue "#FFF3CD"
Ensure-Field -ListTitle $notificationsListTitle -FieldName "TextColor" -FieldType "Text" -DefaultValue "#856404"
Ensure-Field -ListTitle $notificationsListTitle -FieldName "Priority" -FieldType "Choice" -Choices @("Low", "Medium", "High", "Critical") -DefaultValue "Low"
Ensure-Field -ListTitle $notificationsListTitle -FieldName "IsActive" -FieldType "Boolean" -DefaultValue "1"
Ensure-Field -ListTitle $notificationsListTitle -FieldName "SortOrder" -FieldType "Number"

Write-Host "`nProvisioning complete!" -ForegroundColor Green
Write-Host "Lists created at: $SiteUrl" -ForegroundColor Cyan

Disconnect-PnPOnline
