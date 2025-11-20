/**
 * Auth Service
 * Verwaltet Authentifizierungs-Token-Speicherung und -Abruf
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@auth_token';
const USER_KEY = '@auth_user';
const USER_INFO_KEY = '@auth_user_info'; // Cache für vollständige Benutzerinformationen (user + mitarbeiter)
const TOKEN_EXPIRES_AT_KEY = '@auth_token_expires_at'; // Token-Ablaufdatum
const CONTACTS_CACHE_KEY = '@contacts_cache'; // Cache für Kontaktliste
const CONTACTS_CACHE_TIMESTAMP_KEY = '@contacts_cache_timestamp'; // Cache-Zeitstempel

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}

/**
 * Authentifizierungs-Token und Benutzerdaten speichern
 */
export async function saveAuthData(token: string, user: User, expiresAt?: string): Promise<void> {
  try {
    const items: [string, string][] = [
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(user)],
    ];
    
    if (expiresAt) {
      items.push([TOKEN_EXPIRES_AT_KEY, expiresAt]);
    }
    
    await AsyncStorage.multiSet(items);
  } catch (error) {
    console.error('Error saving auth data:', error);
    throw new Error('Authentifizierungsdaten konnten nicht gespeichert werden');
  }
}

/**
 * Authentifizierungs-Token abrufen
 */
export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

/**
 * Benutzerdaten abrufen
 */
export async function getUser(): Promise<User | null> {
  try {
    const userString = await AsyncStorage.getItem(USER_KEY);
    if (userString) {
      return JSON.parse(userString) as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Authentifizierungsdaten löschen (Logout)
 */
export async function clearAuthData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      TOKEN_KEY,
      USER_KEY,
      USER_INFO_KEY,
      TOKEN_EXPIRES_AT_KEY,
      CONTACTS_CACHE_KEY,
      CONTACTS_CACHE_TIMESTAMP_KEY,
    ]);
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw new Error('Beim Abmelden ist ein Fehler aufgetreten');
  }
}

/**
 * Prüfen, ob Token abgelaufen ist
 */
export async function isTokenExpired(): Promise<boolean> {
  try {
    const expiresAtString = await AsyncStorage.getItem(TOKEN_EXPIRES_AT_KEY);
    if (!expiresAtString) {
      // Wenn kein Ablaufdatum vorhanden ist, wissen wir nicht, ob Token abgelaufen ist
      return false;
    }
    
    const expiresAt = new Date(expiresAtString);
    const now = new Date();
    
    return now >= expiresAt;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return false;
  }
}

/**
 * Prüfen, ob Benutzer authentifiziert ist
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}

/**
 * Benutzerinformationen (user + mitarbeiter) im Cache speichern
 */
export async function saveUserInfo(userInfo: any): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
  } catch (error) {
    console.error('Error saving user info:', error);
  }
}

/**
 * Gecachte Benutzerinformationen (user + mitarbeiter) abrufen
 */
export async function getCachedUserInfo(): Promise<any | null> {
  try {
    const userInfoString = await AsyncStorage.getItem(USER_INFO_KEY);
    if (userInfoString) {
      return JSON.parse(userInfoString);
    }
    return null;
  } catch (error) {
    console.error('Error getting cached user info:', error);
    return null;
  }
}

/**
 * Benutzerinformationen-Cache löschen
 */
export async function clearUserInfoCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_INFO_KEY);
  } catch (error) {
    console.error('Error clearing user info cache:', error);
  }
}

/**
 * Kontakte im Cache speichern
 */
export async function saveContactsCache(contacts: any[]): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    await AsyncStorage.multiSet([
      [CONTACTS_CACHE_KEY, JSON.stringify(contacts)],
      [CONTACTS_CACHE_TIMESTAMP_KEY, timestamp],
    ]);
  } catch (error) {
    console.error('Error saving contacts cache:', error);
  }
}

/**
 * Gecachte Kontakte abrufen
 * @param maxAgeInMinutes - Maximale Cache-Alter in Minuten (Standard: 10)
 * @returns Gecachte Kontakte oder null, wenn Cache abgelaufen/fehlt
 */
export async function getCachedContacts(maxAgeInMinutes: number = 10): Promise<any[] | null> {
  try {
    const [contactsString, timestampString] = await AsyncStorage.multiGet([
      CONTACTS_CACHE_KEY,
      CONTACTS_CACHE_TIMESTAMP_KEY,
    ]);

    if (!contactsString[1] || !timestampString[1]) {
      return null; // Cache existiert nicht
    }

    // Prüfen, ob Cache abgelaufen ist
    const cacheTime = new Date(timestampString[1]);
    const now = new Date();
    const ageInMinutes = (now.getTime() - cacheTime.getTime()) / (1000 * 60);

    if (ageInMinutes > maxAgeInMinutes) {
      // Cache abgelaufen, entfernen
      await clearContactsCache();
      return null;
    }

    return JSON.parse(contactsString[1]);
  } catch (error) {
    console.error('Error getting cached contacts:', error);
    return null;
  }
}

/**
 * Kontakte-Cache löschen
 */
export async function clearContactsCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([CONTACTS_CACHE_KEY, CONTACTS_CACHE_TIMESTAMP_KEY]);
  } catch (error) {
    console.error('Error clearing contacts cache:', error);
  }
}

