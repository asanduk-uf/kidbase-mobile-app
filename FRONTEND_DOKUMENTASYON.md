# Kidbase Mobile App - Frontend Dokümantasyon

## Genel Bakış

Kidbase mobil uygulaması, React Native ve Expo kullanılarak geliştirilmiş bir mobil uygulamadır. Uygulama, Laravel backend API'si ile iletişim kurarak kullanıcı kimlik doğrulama, profil yönetimi ve diğer özellikleri sunar.

## Teknoloji Stack

- **Framework**: React Native (Expo)
- **Routing**: Expo Router (file-based routing)
- **UI Library**: Gluestack UI + NativeWind (Tailwind CSS)
- **State Management**: React Hooks (useState, useEffect)
- **Storage**: AsyncStorage (token ve cache yönetimi)
- **API**: Fetch API (REST)

## Uygulama Yapısı

```
app/
├── _layout.tsx          # Root layout (theme, fonts, providers)
├── login.tsx            # Login sayfası
├── tabs/
│   ├── _layout.tsx      # Tab layout (auth kontrolü)
│   └── (tabs)/
│       ├── index.tsx    # Ana sayfa (Home)
│       ├── profile.tsx  # Profil sayfası
│       └── ...
lib/
├── api.ts               # API servisleri
└── auth.ts              # Auth servisleri (token, cache)
```

---

## 1. Authentication (Kimlik Doğrulama)

### 1.1 Login Sayfası (`app/login.tsx`)

**Özellikler:**
- Kullanıcı adı ve şifre ile giriş
- "Angemeldet bleiben" (Beni hatırla) seçeneği
- Hata mesajları gösterimi
- External link'ler (AIDA, Kidicap, CB)

**İşleyiş:**
1. Kullanıcı kullanıcı adı ve şifre girer
2. "Angemeldet bleiben" seçeneği token süresini belirler:
   - Seçili: 30 gün
   - Seçili değil: 1 saat
3. Login API çağrısı yapılır (`/api/login`)
4. Başarılı olursa:
   - Token AsyncStorage'a kaydedilir
   - Kullanıcı bilgileri cache'lenir
   - `/tabs` sayfasına yönlendirilir
5. Hata durumunda hata mesajı gösterilir

**Kod Örneği:**
```typescript
const handleLogin = async () => {
  const response = await login(username, password.trim(), rememberMe);
  await saveAuthData(response.token, response.user, response.expires_at);
  const userInfo = await getUserInfo(response.token);
  await saveUserInfo(userInfo);
  router.replace('/tabs');
};
```

### 1.2 Auth Kontrolü (`app/tabs/_layout.tsx`)

**İşleyiş:**
- Her tab sayfası açıldığında token kontrolü yapılır
- Token yoksa veya süresi dolmuşsa login sayfasına yönlendirilir
- Token geçerliyse sayfa gösterilir
- Her 1 dakikada bir token expiration kontrolü yapılır

**Kod Örneği:**
```typescript
const token = await getToken();
if (!token || await isTokenExpired()) {
  await clearAuthData();
  router.replace('/login');
}
```

### 1.3 Auth Servisleri (`lib/auth.ts`)

**Fonksiyonlar:**
- `saveAuthData()`: Token ve kullanıcı bilgilerini kaydeder
- `getToken()`: Token'ı döndürür
- `isTokenExpired()`: Token'ın süresi dolmuş mu kontrol eder
- `clearAuthData()`: Tüm auth verilerini temizler (logout)
- `saveUserInfo()`: Kullanıcı bilgilerini cache'ler
- `getCachedUserInfo()`: Cache'lenmiş kullanıcı bilgilerini döndürür

**Storage Keys (AsyncStorage):**
- `@auth_token`: Authentication token
- `@auth_user`: Kullanıcı bilgileri
- `@auth_token_expires_at`: Token expiration tarihi
- `@auth_user_info`: Tam kullanıcı bilgileri (user + mitarbeiter)
- `@contacts_cache`: Kontakt listesi cache'i

---

## 2. Ana Sayfa (Home) (`app/tabs/(tabs)/index.tsx`)

### 2.1 Özellikler

**Welcome Section:**
- Kullanıcı adı gösterimi
- Hoş geldin mesajı (wave animasyonu)
- Kullanıcının grupları gösterimi
- Birden fazla grup varsa, tıklanınca profile'a yönlendirir

**Ankündigungen (Duyurular):**
- Duyurular listesi (şu an boş durum mesajı gösteriliyor)

**Posteingang (E-Mail):**
- E-posta listesi (şu an boş durum mesajı gösteriliyor)

**Bereiche (Alanlar):**
- External link'ler (Ausweis, Buchungssystem, vb.)

### 2.2 Veri Yükleme Stratejisi

**Cache-First Approach:**
1. İlk olarak cache'den veri yüklenir (anında gösterim)
2. Arka planda API'den fresh data çekilir
3. Fresh data geldiğinde cache güncellenir ve UI güncellenir

**Kod Örneği:**
```typescript
// Cache'den yükle (anında gösterim)
const cachedUserInfo = await getCachedUserInfo();
if (cachedUserInfo) {
  setUserName(cachedUserInfo.mitarbeiter.vorname + ' ' + cachedUserInfo.mitarbeiter.name);
  setIsLoadingUser(false);
}

// Arka planda fresh data çek
const userInfo = await getUserInfo(token);
await saveUserInfo(userInfo);
setUserName(userInfo.mitarbeiter.vorname + ' ' + userInfo.mitarbeiter.name);
```

### 2.3 Grup Navigasyonu

- Kullanıcının birden fazla grubu varsa, grup adına tıklanınca profile sayfasına yönlendirilir
- URL parametresi ile scroll pozisyonu belirlenir: `/tabs/profile?scrollTo=gruppen&t={timestamp}`

---

## 3. Profil Sayfası (`app/tabs/(tabs)/profile.tsx`)

### 3.1 Özellikler

**Profil Header:**
- Avatar (kullanıcı adının baş harfleri)
- Kullanıcı adı
- E-posta, telefon, meslek bilgileri
- Düzenle butonu (su an deaktiv)

**Gruppe/n (Gruplar) Section:**
- Kullanıcının ait olduğu gruplar listesi
- Her grup tıklanabilir (accordion yapısı)
- Grup detayları açıldığında:
  - Telefon numaraları (Festnetz, Mobil)
  - E-posta
  - Adres
  - Fax
- Scroll animasyonu: Index'ten gelindiğinde "Gruppe/n" bölümüne scroll yapılır ve mavi border animasyonu gösterilir

**Schnelleinstellungen (Hızlı Ayarlar):** (su an deaktiv)
- Benachrichtigungen (Bildirimler) toggle
- E-Mail-Synchronisation toggle
- Automatische Synchronisation toggle

**Einstellungen (Ayarlar):** (su an deaktiv)
- Profilinformationen
- E-Mail-Einstellungen
- Kontakt-Einstellungen
- Benachrichtigungseinstellungen
- Sicherheit
- Hilfe & Support
- Über

**Abmelden (Çıkış):**
- Logout butonu
- Token ve cache temizlenir
- Login sayfasına yönlendirilir

### 3.2 Scroll ve Highlight Animasyonu

**Index'ten Profile'a Navigasyon:**
1. Index'te grup adına tıklanınca: `/tabs/profile?scrollTo=gruppen&t={timestamp}`
2. Profile sayfasında:
   - Scroll pozisyonu sıfırlanır
   - "Gruppe/n" bölümüne scroll yapılır
   - Mavi border animasyonu gösterilir (500ms fade in, 1000ms bekleme, 500ms fade out)

**Kod Örneği:**
```typescript
useEffect(() => {
  if (searchParams.scrollTo === 'gruppen' && timestamp !== lastScrollToTimestamp.current) {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: gruppenYPosition.current - 20, animated: true });
      // Highlight animasyonu başlat
      highlightAnim.setValue(0);
      Animated.sequence([...]).start();
    }, 150);
  }
}, [searchParams.scrollTo, searchParams.t]);
```

### 3.3 Grup Detayları (Accordion)

**İşleyiş:**
1. Grup adına tıklanınca accordion açılır/kapanır
2. İlk açılışta grup detayları API'den yüklenir (`/api/contacts`)
3. Detaylar cache'lenir (tekrar açılışta cache'den gösterilir)
4. Detaylar: telefon, e-posta, adres, fax

**Kod Örneği:**
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

### 3.4 HTML Tag Temizleme

**Beruf (Meslek) Alanı:**
- Veritabanından HTML tag'leri ile gelebilir (örn: `<b>Informationstechnik</b>`)
- `stripHtmlTags()` fonksiyonu ile HTML tag'leri temizlenir
- Sadece düz metin gösterilir

**Kod Örneği:**
```typescript
const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').trim();
};

setUserBeruf(userInfo.mitarbeiter.beruf ? stripHtmlTags(userInfo.mitarbeiter.beruf) : '');
```

---

## 4. API Servisleri (`lib/api.ts`)

### 4.1 Endpoint'ler

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

### 4.2 Hata Yönetimi

- Network hataları yakalanır ve kullanıcıya gösterilir
- 401 (Unauthorized) durumunda token temizlenir ve login'e yönlendirilir
- 422 (Validation Error) durumunda validation mesajları gösterilir
- Tüm async işlemler try-catch ile sarılmıştır
- Hata durumunda console'a log yazılır ve kullanıcıya mesaj gösterilir

---

## 5. State Management

### 5.1 Local State

- `useState`: Component seviyesinde state yönetimi
- `useRef`: DOM referansları ve animasyon değerleri için

### 5.2 Cache Stratejisi

**AsyncStorage Kullanımı:**
- Token ve kullanıcı bilgileri cache'lenir
- Cache-first yaklaşımı ile hızlı yükleme (detaylar için bkz. 2.2 Veri Yükleme Stratejisi)
- Arka planda fresh data çekilir ve cache güncellenir

---

## 6. Routing (Expo Router)

### 6.1 File-Based Routing

- `app/login.tsx` → `/login`
- `app/tabs/(tabs)/index.tsx` → `/tabs` (default)
- `app/tabs/(tabs)/profile.tsx` → `/tabs/profile`

### 6.2 Protected Routes

- `app/tabs/_layout.tsx` içinde auth kontrolü yapılır
- Token yoksa veya geçersizse login'e yönlendirilir

### 6.3 Navigation

- `useRouter()` hook'u ile programatik navigasyon
- `router.push()`: Yeni sayfaya git
- `router.replace()`: Mevcut sayfayı değiştir

---

## 7. UI Components

### 7.1 Gluestack UI

- Card, Button, Input, Text, Heading, vb.
- NativeWind (Tailwind CSS) ile styling
- Responsive ve accessible component'ler

### 7.2 Custom Components

- `AppHeader`: Üst bar (her sayfada gösterilir)
- `SafeAreaView`: Güvenli alan desteği

---

## 8. Animasyonlar

### 8.1 React Native Animated API

**Wave Animasyonu (Index):**
- Hoş geldin mesajında el sallama animasyonu
- 600ms fade in, 1800ms bekleme, 500ms fade out

**Highlight Animasyonu (Profile):**
- "Gruppe/n" bölümüne scroll yapıldığında mavi border animasyonu
- 500ms fade in, 1000ms bekleme, 500ms fade out

**Kod Örneği:**
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

## 9. Performans Optimizasyonları

### 9.1 Lazy Loading

- Grup detayları sadece accordion açıldığında yüklenir
- İlk yüklemede sadece grup listesi gösterilir

### 9.2 Memoization

- `useMemo` ile hesaplanmış değerler cache'lenir
- Gereksiz re-render'lar önlenir

---

## 10. Güvenlik

### 10.1 Token Yönetimi

- Token AsyncStorage'da güvenli şekilde saklanır (detaylar için bkz. 1.3 Auth Servisleri)
- Token expiration kontrolü yapılır
- Süresi dolmuş token'lar otomatik temizlenir

### 10.2 Remember Me

- "Angemeldet bleiben" seçeneği token süresini belirler (detaylar için bkz. 1.1 Login Sayfası)
- Seçili: 30 gün
- Seçili değil: 1 saat

---

## 11. Platform Desteği

### 11.1 Desteklenen Platformlar

- iOS
- Android
- Web

### 11.2 Platform-Specific Kod

- `Platform.OS` ile platform kontrolü
- Web için `window.open()`, native için `WebBrowser.openBrowserAsync()`

---

## Sonuç

Bu dokümantasyon, Kidbase mobil uygulamasının frontend tarafındaki temel işleyişini özetlemektedir. Login, ana sayfa ve profil sayfası özellikleri detaylı olarak açıklanmıştır. Kontakt (contacts) sayfası bu dokümantasyonun kapsamı dışındadır.

