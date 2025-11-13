# Starter Kit Expo

Ein modernes React Native Starter-Kit basierend auf Expo Router mit TypeScript, NativeWind und Gluestack UI.

## 📋 Voraussetzungen

Bevor Sie beginnen, stellen Sie sicher, dass Sie folgende Software installiert haben:

- **Node.js** (Version 18 oder höher)
- **npm** oder **yarn** (Paketmanager)
- **Expo CLI** (wird automatisch installiert)
- Für iOS-Entwicklung: **Xcode** (nur auf macOS)
- Für Android-Entwicklung: **Android Studio** mit Android SDK

## 🚀 Installation

### 1. Repository klonen

```bash
git clone <repository-url>
cd starter-kit-expo
```

### 2. Abhängigkeiten installieren

Mit npm:
```bash
npm install
```

Oder mit yarn:
```bash
yarn install
```

### 3. Projekt starten

Starten Sie den Entwicklungsserver:

```bash
npm start
```

oder

```bash
yarn start
```

Dies öffnet die Expo Developer Tools im Browser. Von dort aus können Sie:

- **QR-Code scannen**: Verwenden Sie die Expo Go App auf Ihrem Smartphone
- **iOS Simulator starten**: Drücken Sie `i` (nur auf macOS)
- **Android Emulator starten**: Drücken Sie `a`
- **Web-Version öffnen**: Drücken Sie `w`

## 📱 Verfügbare Skripte

### Entwicklung

```bash
# Entwicklungsserver starten
npm start
# oder
yarn start

# Nur für Android starten
npm run android
# oder
yarn android

# Nur für iOS starten (nur macOS)
npm run ios
# oder
yarn ios

# Web-Version starten
npm run web
# oder
yarn web
```

### Build

```bash
# Web-Build erstellen
npm run build
# oder
yarn build

# Preview-Build erstellen
npm run build:preview
# oder
yarn build:preview
```

### Tests

```bash
# Tests ausführen
npm test
# oder
yarn test
```

## 🏗️ Projektstruktur

```
starter-kit-expo/
├── app/                    # Expo Router App-Verzeichnis
│   ├── _layout.tsx        # Root Layout
│   ├── index.tsx          # Startseite
│   ├── login.tsx          # Login-Seite
│   └── tabs/              # Tab-Navigation
│       └── (tabs)/        # Tab-Screens
│           ├── index.tsx
│           ├── announcements.tsx
│           ├── contacts.tsx
│           ├── explore.tsx
│           ├── mail.tsx
│           └── profile.tsx
├── assets/                 # Statische Assets
│   ├── fonts/             # Schriftarten
│   ├── icons/             # Icon-Komponenten
│   └── images/            # Bilder
├── components/             # Wiederverwendbare Komponenten
│   ├── ui/                # UI-Komponenten (Gluestack UI)
│   └── ...
├── constants/              # Konstanten
├── contexts/              # React Contexts
├── app.json               # Expo-Konfiguration
├── package.json           # Projekt-Abhängigkeiten
└── tsconfig.json          # TypeScript-Konfiguration
```

## 🛠️ Technologien

- **Expo SDK 54**: React Native Framework
- **Expo Router**: File-based Routing
- **React 19**: UI-Bibliothek
- **React Native 0.81**: Mobile Framework
- **TypeScript**: Typisierung
- **NativeWind 4**: Tailwind CSS für React Native
- **Gluestack UI**: UI-Komponenten-Bibliothek
- **React Native Reanimated**: Animationen
- **Expo Font**: Schriftarten-Verwaltung

## 📦 Wichtige Abhängigkeiten

- `expo-router`: Navigation und Routing
- `nativewind`: Tailwind CSS für React Native
- `@gluestack-ui/core`: UI-Komponenten
- `react-native-reanimated`: Performance-optimierte Animationen
- `@react-native-async-storage/async-storage`: Lokale Datenspeicherung
- `lucide-react-native`: Icon-Bibliothek

## 🔧 Konfiguration

### Expo-Konfiguration

Die Expo-Konfiguration befindet sich in `app.json`. Hier können Sie:

- App-Name und Slug ändern
- Icons und Splash-Screens anpassen
- Plattform-spezifische Einstellungen konfigurieren

### TypeScript

Die TypeScript-Konfiguration befindet sich in `tsconfig.json`. Das Projekt verwendet strikte Typisierung.

### Tailwind CSS

Die Tailwind-Konfiguration befindet sich in `tailwind.config.js`. NativeWind ermöglicht die Verwendung von Tailwind-Klassen in React Native.

## 📱 Plattformen

Dieses Projekt unterstützt:

- ✅ **iOS** (iPhone & iPad)
- ✅ **Android** (Smartphones & Tablets)
- ✅ **Web** (Browser)

## 🧪 Entwicklung

### Hot Reload

Das Projekt unterstützt Hot Reload. Änderungen werden automatisch im Simulator/Emulator oder auf dem Gerät aktualisiert.

### Debugging

- **React Native Debugger**: Verwenden Sie die Entwicklertools im Browser
- **Flipper**: Für erweiterte Debugging-Funktionen
- **Console Logs**: Werden in der Terminal-Konsole angezeigt

## 🚢 Deployment

### iOS (App Store)

1. Erstellen Sie ein Apple Developer-Konto
2. Konfigurieren Sie die iOS-Einstellungen in `app.json`
3. Führen Sie `eas build --platform ios` aus (mit EAS CLI)

### Android (Google Play Store)

1. Erstellen Sie ein Google Play Developer-Konto
2. Konfigurieren Sie die Android-Einstellungen in `app.json`
3. Führen Sie `eas build --platform android` aus (mit EAS CLI)

### Web

```bash
npm run build
```

Die statischen Dateien werden im `dist/` Verzeichnis erstellt.

## 📝 Weitere Ressourcen

- [Expo Dokumentation](https://docs.expo.dev/)
- [Expo Router Dokumentation](https://docs.expo.dev/router/introduction/)
- [React Native Dokumentation](https://reactnative.dev/)
- [NativeWind Dokumentation](https://www.nativewind.dev/)
- [Gluestack UI Dokumentation](https://ui.gluestack.io/)

## 🤝 Beitragen

Beiträge sind willkommen! Bitte erstellen Sie einen Pull Request oder öffnen Sie ein Issue für Diskussionen.

## 📄 Lizenz

Dieses Projekt ist privat.

## 💡 Tipps

- Verwenden Sie `expo start --clear` um den Cache zu löschen
- Für bessere Performance verwenden Sie den Production-Build
- Testen Sie auf echten Geräten, nicht nur im Simulator/Emulator

---

**Viel Erfolg mit Ihrem Projekt! 🎉**

