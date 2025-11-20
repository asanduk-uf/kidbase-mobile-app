# Kidbase Mobile App - Frontend Dokumentation

## Übersicht

Die Kidbase Mobile App ist eine mobile Anwendung, die mit React Native und Expo entwickelt wurde. Die App kommuniziert mit der Laravel Backend-API und bietet Benutzerauthentifizierung, Profilverwaltung und weitere Funktionen.

## Technologie-Stack

- **Framework**: React Native (Expo)
- **Routing**: Expo Router (file-based routing)
- **UI Library**: Gluestack UI + NativeWind (Tailwind CSS)
- **State Management**: React Hooks (useState, useEffect)
- **Storage**: AsyncStorage (Token- und Cache-Verwaltung)
- **API**: Fetch API (REST)

## Anwendungsstruktur

```
app/
├── _layout.tsx          # Root Layout (Theme, Fonts, Provider)
├── login.tsx            # Login-Seite
├── tabs/
│   ├── _layout.tsx      # Tab Layout (Auth-Kontrolle)
│   └── (tabs)/
│       ├── index.tsx    # Startseite (Home)
│       ├── profile.tsx  # Profil-Seite
│       └── ...
lib/
├── api.ts               # API-Services
└── auth.ts              # Auth-Services (Token, Cache)
```

---

## 1. Authentifizierung

### 1.1 Login-Seite (`app/login.tsx`)

**Funktionen:**
- Anmeldung mit Benutzername und Passwort
- "Angemeldet bleiben" (Remember Me) Option
- Fehlermeldungen anzeigen
- Externe Links (AIDA, Kidicap, CB)

**Ablauf:**
1. Benutzer gibt Benutzername und Passwort ein
2. "Angemeldet bleiben" Option bestimmt Token-Dauer:
   - Ausgewählt: 30 Tage
   - Nicht ausgewählt: 1 Stunde
3. Login-API-Aufruf wird durchgeführt (`/api/login`)
4. Bei Erfolg:
   - Token wird in AsyncStorage gespeichert
   - Benutzerinformationen werden gecacht
   - Weiterleitung zur `/tabs` Seite
5. Bei Fehler wird Fehlermeldung angezeigt

**Code-Beispiel:**
```typescript
const handleLogin = async () => {
  const response = await login(username, password.trim(), rememberMe);
  await saveAuthData(response.token, response.user, response.expires_at);
  const userInfo = await getUserInfo(response.token);
  await saveUserInfo(userInfo);
  router.replace('/tabs');
};
```

### 1.2 Auth-Kontrolle (`app/tabs/_layout.tsx`)

**Ablauf:**
- Bei jedem Öffnen einer Tab-Seite wird Token-Kontrolle durchgeführt
- Wenn kein Token vorhanden oder abgelaufen, wird zur Login-Seite weitergeleitet
- Wenn Token gültig, wird die Seite angezeigt
- Alle 1 Minute wird Token-Ablauf kontrolliert

**Code-Beispiel:**
```typescript
const token = await getToken();
if (!token || await isTokenExpired()) {
  await clearAuthData();
  router.replace('/login');
}
```

### 1.3 Auth-Services (`lib/auth.ts`)

**Funktionen:**
- `saveAuthData()`: Speichert Token und Benutzerinformationen
- `getToken()`: Gibt Token zurück
- `isTokenExpired()`: Prüft, ob Token abgelaufen ist
- `clearAuthData()`: Löscht alle Auth-Daten (Logout)
- `saveUserInfo()`: Cacht Benutzerinformationen
- `getCachedUserInfo()`: Gibt gecachte Benutzerinformationen zurück

**Storage Keys (AsyncStorage):**
- `@auth_token`: Authentifizierungs-Token
- `@auth_user`: Benutzerinformationen
- `@auth_token_expires_at`: Token-Ablaufdatum
- `@auth_user_info`: Vollständige Benutzerinformationen (user + mitarbeiter)
- `@contacts_cache`: Kontaktliste Cache

---

## 2. Startseite (Home) (`app/tabs/(tabs)/index.tsx`)

### 2.1 Funktionen

**Welcome-Bereich:**
- Anzeige des Benutzernamens
- Willkommensnachricht (Wave-Animation)
- Anzeige der Gruppen des Benutzers
- Bei mehreren Gruppen: Klick leitet zur Profil-Seite weiter

**Ankündigungen:**
- Liste der Ankündigungen (aktuell wird eine leere Statusmeldung angezeigt)

**Posteingang (E-Mail):**
- E-Mail-Liste (aktuell wird eine leere Statusmeldung angezeigt)

**Bereiche:**
- Externe Links (Ausweis, Buchungssystem, etc.)

### 2.2 Datenlade-Strategie

**Cache-First-Ansatz:**
1. Zuerst werden Daten aus dem Cache geladen (sofortige Anzeige)
2. Im Hintergrund werden frische Daten von der API abgerufen
3. Wenn frische Daten ankommen, wird Cache aktualisiert und UI aktualisiert

**Code-Beispiel:**
```typescript
// Aus Cache laden (sofortige Anzeige)
const cachedUserInfo = await getCachedUserInfo();
if (cachedUserInfo) {
  setUserName(cachedUserInfo.mitarbeiter.vorname + ' ' + cachedUserInfo.mitarbeiter.name);
  setIsLoadingUser(false);
}

// Im Hintergrund frische Daten abrufen
const userInfo = await getUserInfo(token);
await saveUserInfo(userInfo);
setUserName(userInfo.mitarbeiter.vorname + ' ' + userInfo.mitarbeiter.name);
```

### 2.3 Gruppen-Navigation

- Wenn Benutzer mehrere Gruppen hat, wird bei Klick auf Gruppennamen zur Profil-Seite weitergeleitet
- Scroll-Position wird über URL-Parameter bestimmt: `/tabs/profile?scrollTo=gruppen&t={timestamp}`

---

## 3. Profil-Seite (`app/tabs/(tabs)/profile.tsx`)

### 3.1 Funktionen

**Profil-Header:**
- Avatar (Initialen des Benutzernamens)
- Benutzername
- E-Mail, Telefon, Berufsinformationen
- Bearbeiten-Button (aktuell deaktiviert)

**Gruppe/n (Gruppen) Bereich:**
- Liste der Gruppen, zu denen der Benutzer gehört
- Jede Gruppe ist klickbar (Accordion-Struktur)
- Wenn Gruppendetails geöffnet werden:
  - Telefonnummern (Festnetz, Mobil)
  - E-Mail
  - Adresse
  - Fax
- Scroll-Animation: Wenn von Index-Seite kommend, wird zu "Gruppe/n" Bereich gescrollt und blaue Border-Animation angezeigt

**Schnelleinstellungen:** (aktuell deaktiviert)
- Benachrichtigungen Toggle
- E-Mail-Synchronisation Toggle
- Automatische Synchronisation Toggle

**Einstellungen:** (aktuell deaktiviert)
- Profilinformationen
- E-Mail-Einstellungen
- Kontakt-Einstellungen
- Benachrichtigungseinstellungen
- Sicherheit
- Hilfe & Support
- Über

**Abmelden:**
- Logout-Button
- Token und Cache werden gelöscht
- Weiterleitung zur Login-Seite

### 3.2 Scroll- und Highlight-Animation

**Navigation von Index zu Profil:**
1. Bei Klick auf Gruppennamen auf Index-Seite: `/tabs/profile?scrollTo=gruppen&t={timestamp}`
2. Auf Profil-Seite:
   - Scroll-Position wird zurückgesetzt
   - Scroll zu "Gruppe/n" Bereich
   - Blaue Border-Animation wird angezeigt (500ms fade in, 1000ms Wartezeit, 500ms fade out)

**Code-Beispiel:**
```typescript
useEffect(() => {
  if (searchParams.scrollTo === 'gruppen' && timestamp !== lastScrollToTimestamp.current) {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: gruppenYPosition.current - 20, animated: true });
      // Highlight-Animation starten
      highlightAnim.setValue(0);
      Animated.sequence([...]).start();
    }, 150);
  }
}, [searchParams.scrollTo, searchParams.t]);
```

### 3.3 Gruppendetails (Accordion)

**Ablauf:**
1. Bei Klick auf Gruppennamen öffnet/schließt sich Accordion
2. Beim ersten Öffnen werden Gruppendetails von API geladen (`/api/contacts`)
3. Details werden gecacht (bei erneutem Öffnen aus Cache angezeigt)
4. Details: Telefon, E-Mail, Adresse, Fax

**Code-Beispiel:**
```typescript
const handleGruppeToggle = (gruppeId: number) => {
  if (expandedGruppe === gruppeId) {
    setExpandedGruppe(null);
  } else {
    setExpandedGruppe(gruppeId);
    loadGruppeDetails(gruppeId);
  }
};
```

### 3.4 HTML-Tag-Bereinigung

**Beruf (Berufsfeld) Feld:**
- Kann mit HTML-Tags aus der Datenbank kommen (z.B. `<b>Informationstechnik</b>`)
- HTML-Tags werden mit `stripHtmlTags()` Funktion entfernt
- Nur reiner Text wird angezeigt

**Code-Beispiel:**
```typescript
const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').trim();
};

setUserBeruf(userInfo.mitarbeiter.beruf ? stripHtmlTags(userInfo.mitarbeiter.beruf) : '');
```

---

## 4. API-Services (`lib/api.ts`)

### 4.1 Endpoints

**Base URL:** `http://127.0.0.1:8000/api`

**Login:**
- `POST /api/login`
- Body: `{ username, password, remember_me }`
- Response: `{ token, user, expires_at }`

**User Info:**
- `GET /api/me`
- Headers: `Authorization: Bearer {token}`
- Response: `{ user, mitarbeiter, gruppen }`

**Contacts:**
- `GET /api/contacts?bereich_id={id}`
- Headers: `Authorization: Bearer {token}`
- Response: `ContactItem[]`

**Logout:**
- `POST /api/logout`
- Headers: `Authorization: Bearer {token}`

### 4.2 Fehlerbehandlung

- Netzwerkfehler werden abgefangen und dem Benutzer angezeigt
- Bei 401 (Unauthorized) wird Token gelöscht und zur Login-Seite weitergeleitet
- Bei 422 (Validation Error) werden Validierungsmeldungen angezeigt
- Alle async Operationen sind mit try-catch umschlossen
- Bei Fehlern wird in Console geloggt und Benutzer erhält Meldung

---

## 5. State Management

### 5.1 Lokaler State

- `useState`: State-Verwaltung auf Component-Ebene
- `useRef`: Für DOM-Referenzen und Animationswerte

### 5.2 Cache-Strategie

**AsyncStorage-Verwendung:**
- Token und Benutzerinformationen werden gecacht
- Cache-First-Ansatz für schnelles Laden (Details siehe 2.2 Datenlade-Strategie)
- Im Hintergrund werden frische Daten abgerufen und Cache aktualisiert

---

## 6. Routing (Expo Router)

### 6.1 File-Based Routing

- `app/login.tsx` → `/login`
- `app/tabs/(tabs)/index.tsx` → `/tabs` (Standard)
- `app/tabs/(tabs)/profile.tsx` → `/tabs/profile`

### 6.2 Geschützte Routen

- Auth-Kontrolle erfolgt in `app/tabs/_layout.tsx`
- Wenn kein Token vorhanden oder ungültig, wird zur Login-Seite weitergeleitet

### 6.3 Navigation

- Programmatische Navigation mit `useRouter()` Hook
- `router.push()`: Zu neuer Seite navigieren
- `router.replace()`: Aktuelle Seite ersetzen

---

## 7. UI-Komponenten

### 7.1 Gluestack UI

- Card, Button, Input, Text, Heading, etc.
- Styling mit NativeWind (Tailwind CSS)
- Responsive und barrierefreie Komponenten

### 7.2 Benutzerdefinierte Komponenten

- `AppHeader`: Obere Leiste (wird auf jeder Seite angezeigt)
- `SafeAreaView`: Unterstützung für sichere Bereiche

---

## 8. Animationen

### 8.1 React Native Animated API

**Wave-Animation (Index):**
- Winken-Animation in Willkommensnachricht
- 600ms fade in, 1800ms Wartezeit, 500ms fade out

**Highlight-Animation (Profil):**
- Blaue Border-Animation beim Scrollen zu "Gruppe/n" Bereich
- 500ms fade in, 1000ms Wartezeit, 500ms fade out

**Code-Beispiel:**
```typescript
const highlightAnim = useRef(new Animated.Value(0)).current;

Animated.sequence([
  Animated.timing(highlightAnim, {
    toValue: 1,
    duration: 500,
    easing: Easing.out(Easing.ease),
    useNativeDriver: false,
  }),
  Animated.delay(1000),
  Animated.timing(highlightAnim, {
    toValue: 0,
    duration: 500,
    easing: Easing.in(Easing.ease),
    useNativeDriver: false,
  }),
]).start();
```

---

## 9. Leistungsoptimierungen

### 9.1 Lazy Loading

- Gruppendetails werden nur geladen, wenn Accordion geöffnet wird
- Beim ersten Laden wird nur Gruppenliste angezeigt

### 9.2 Memoization

- Berechnete Werte werden mit `useMemo` gecacht
- Unnötige Re-Renders werden vermieden

---

## 10. Sicherheit

### 10.1 Token-Verwaltung

- Token wird sicher in AsyncStorage gespeichert (Details siehe 1.3 Auth-Services)
- Token-Ablauf wird kontrolliert
- Abgelaufene Token werden automatisch gelöscht

### 10.2 Remember Me

- "Angemeldet bleiben" Option bestimmt Token-Dauer (Details siehe 1.1 Login-Seite)
- Ausgewählt: 30 Tage
- Nicht ausgewählt: 1 Stunde

---

## 11. Plattform-Unterstützung

### 11.1 Unterstützte Plattformen

- iOS
- Android
- Web

### 11.2 Plattform-spezifischer Code

- Plattform-Kontrolle mit `Platform.OS`
- Für Web: `window.open()`, für Native: `WebBrowser.openBrowserAsync()`

---

## Fazit

Diese Dokumentation fasst die grundlegende Funktionsweise der Frontend-Seite der Kidbase Mobile App zusammen. Die Funktionen der Login-, Start- und Profil-Seite wurden detailliert beschrieben. Die Kontakt (contacts) Seite liegt außerhalb des Umfangs dieser Dokumentation.

