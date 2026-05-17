## Day_timer Refactor Tasks

Denna fil spårar arkitekturella förbättringar och refaktoreringar.

### Genomfört (Maj 2026)

- ✅ **Stärk "Planera" som eget sammanhang**: Separata draft-states (`nowDraft`/`planDraft`) och tydligare koppling till kalendern.
- ✅ **Extrahera sektionspaneler**: `NowEditorPanel`, `PlanEditorPanel`, `AgendaImportPanel`, `AgendaPanel`, `Sidebar` och `Clock` är nu egna komponenter.
- ✅ **Sektionsnavigation**: All navigation går nu via `appState.value.activeSection`.
- ✅ **Gemensam UI-puts**: Onboarding, Manual, Välkomstvy och Beta-branding implementerat.
- ✅ **ICS-import**: Grundläggande stöd för ICS-filer och AI-genererade dagplaner.

### Nästa steg (Långsiktigt)

1. **Domänuppdelning i AppState**: Gruppera egenskaper i objekt för `timer`, `plan`, `ui` etc. för bättre överblick.
2. **Starkare Item Identity**: Förbättra hur valda block i agendan trackas (via ID istället för index där möjligt).
3. **Prestanda i Klockan**: Utforska en helt deklarativ SVG-klocka (ersätt `renderClock()`).

### Utvecklingspolicy

Varje ny feature eller ändring i kärnlogik måste nu **motiveras och genomtänkas noggrant**. Appen har nått en hög nivå av stabilitet och polering — vi ändrar bara för att göra den bättre, inte bara annorlunda. UI-puts är dock alltid välkommet.
