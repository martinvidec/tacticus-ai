# Private Issues

Dieser Ordner enthält **vertrauliche Issues**, die nicht in GitHub veröffentlicht werden sollen.

## Verwendung

### Issue erstellen

Eine neue Markdown-Datei mit dem Format `<bezeichnung>-issue.md` anlegen:

```
private-issues/
  custom-domain-setup-issue.md
  api-key-rotation-issue.md
  security-audit-issue.md
```

### Issue-Format

```markdown
# Titel des Issues

**Status:** open | in-progress | closed
**Priorität:** low | medium | high | critical
**Erstellt:** YYYY-MM-DD

## Beschreibung

Was muss getan werden?

## Akzeptanzkriterien

- [ ] Kriterium 1
- [ ] Kriterium 2

## Notizen

Zusätzliche Informationen, Links, etc.
```

### Status ändern

Einfach das `Status:`-Feld in der Datei aktualisieren.

### Issue schließen

Entweder:
- Status auf `closed` setzen, oder
- Datei löschen

## Hinweis

Die `*-issue.md` Dateien sind in `.gitignore` eingetragen und werden **nicht** committet.
Der Ordner und diese README werden committet, damit die Struktur beim Auschecken vorhanden ist.

Für öffentliche Issues → GitHub Issues verwenden.
