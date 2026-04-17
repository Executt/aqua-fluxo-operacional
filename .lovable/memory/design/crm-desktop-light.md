---
name: CRM Desktop Light Theme
description: CRM-style light palette, elevation, chart tokens, typography, icon mapping for SIGSAN-FED
type: design
---
## Theme: CRM Desktop Light
- Background: #F4F6FA (220 24% 97%)
- Card: #FFFFFF
- Primary: #3D4ED8 (232 72% 56%) — Corporate indigo
- Primary-soft: #EBEEFF (232 88% 96%) — tint
- Success #1F9D6E, Warning #F59E0B, Destructive #DC2626, Informative #1E88E5
- Border: #DCE0E8 (220 18% 90%)
- Shell (topbar): #FFFFFF; Subnav: #F7F9FC
- Radius: 0.625rem (10px)

## Layout
TopNav h-14 (brand + horizontal modules + search/avatar) + sub-nav h-10 (contextual `?tab=`).
Container: `max-w-[1600px] mx-auto p-6 space-y-6`.

## Typography (Inter + JetBrains Mono)
48 sb (display), 24 sb (h1), 18 sb (h2), 14 r (body-lg), 12 r (body-sm), 10 m (caption).

## Elevation
elevation-1: 0 1px 2px rgba(16,24,40,0.05) — default cards
elevation-2: 0 1px 3px + 0 1px 2px — hover/popover
elevation-3: 0 4px 8px + 0 2px 4px — modals

## Utilities
`surface-card` = bg-card border border-border rounded elevation-1.
Pills: `pill-success`, `pill-warning`, `pill-destructive`, `pill-informative`, `pill-muted`.

## Chart colors (src/lib/chart-colors.ts)
primary=indigo, informative=blue, success=green, warning=amber, destructive=red, violet (alias purple), teal.

## Icon map (lucide)
Globe(global), Radio(IoT), ShieldCheck(compliance), Building2(entidades), BrainCircuit(IA),
Settings(admin), Users(usuarios), Server(LDAP), Mail(SMTP), FileSignature(SEI),
KeyRound(SSO), History(auditoria), Check/AlertTriangle/RefreshCw.
Sizes: h-3.5 (btn sm), h-4 (default), h-5 (admin section), h-6 (KPI).
