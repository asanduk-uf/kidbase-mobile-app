/**
 * API Service
 * Verwaltet alle API-Aufrufe zum Laravel Backend
 */

const API_BASE_URL = 'http://192.168.32.13:8082/api';

export interface LoginResponse {
  message: string;
  token: string;
  expires_at: string; // Token-Ablaufdatum im ISO 8601 Format
  user: {
    id: number;
    username: string;
    name: string;
    email: string;
  };
}

export interface LoginError {
  message: string;
  errors?: {
    username?: string[];
    password?: string[];
    [key: string]: string[] | undefined;
  };
}

export interface UserInfoResponse {
  user: {
    id: number;
    username: string;
    name: string;
    email: string;
  };
  mitarbeiter: {
    name: string | null; // Nachname
    vorname: string | null; // Vorname
    beruf: string | null; // Beruf
    kontakt1: string | null; // Telefon 1
    mobil_telefon: string | null; // Telefon 2 (kontakt2)
    email: string | null; // E-Mail
  } | null;
  gruppen: {
    id: number;
    name: string | null;
  }[];
}

export interface ContactItem {
  id: number;
  typ: 'G' | 'P';
  name: string;
  festnetz?: string | null;
  mobil?: string | null;
  email?: string | null;
  aufgaben?: string[];
  gruppen?: { id: number; name: string }[];
  adresse?: string | null;
  fax?: string | null; // Nur für Gruppe (wird unter Festnetz angezeigt)
  children?: ContactItem[];
}

export type ContactsResponse = ContactItem[];

export interface BereicheItem {
  id: number;
  bereich: number;
  bezeichnung: string | null;
  beschreibung: string | null;
  prio: number;
  global: boolean;
  rights: {
    r: boolean; // Lesen
    w: boolean; // Schreiben
    a: boolean; // Admin
  };
}

export type BereicheResponse = BereicheItem[];

/**
 * Login API-Aufruf
 */
export async function login(username: string, password: string, rememberMe: boolean = false): Promise<LoginResponse> {
  try {
    // Benutzername: unverändert senden (kann Leerzeichen enthalten, case-sensitive)
    // Passwort: bereits getrimmt, unverändert senden (Laravel wird es mit MD5 hashen)
    const requestBody = {
      username: username, // Kein Trim - Benutzername kann Leerzeichen enthalten
      password: password,  // Bereits getrimmt vor dem Aufruf dieser Funktion
      remember_me: rememberMe, // Remember me Auswahl (30 Tage vs 1 Stunde)
    };
    
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      // Wenn Antwort kein JSON ist, Fehler erstellen
      throw {
        message: `Serverfehler: ${response.status} ${response.statusText}`,
      } as LoginError;
    }

    if (!response.ok) {
      // Validierungsfehler behandeln
      if (response.status === 422) {
        const error: LoginError = {
          message: data.message || 'Validierungsfehler',
          errors: data.errors,
        };
        throw error;
      }
      
      // Andere Fehler behandeln
      const error: LoginError = {
        message: data.message || 'Ein Fehler ist aufgetreten',
      };
      throw error;
    }

    return data as LoginResponse;
  } catch (error) {
    // Netzwerkfehler behandeln
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw {
        message: 'Verbindung zum Server fehlgeschlagen. Bitte überprüfen Sie Ihre Internetverbindung.',
      } as LoginError;
    }
    throw error;
  }
}

/**
 * Aktuelle Benutzerinformationen abrufen (me)
 */
export async function getUserInfo(token: string): Promise<UserInfoResponse> {
  try {
    console.log('Fetching user info from:', `${API_BASE_URL}/me`);
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('User info response status:', response.status);

    let data;
    try {
      data = await response.json();
      console.log('User info response data:', data);
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new Error('Ungültige Antwort vom Server erhalten');
    }

    if (!response.ok) {
      console.error('User info error:', data);
      throw new Error(data.message || `Benutzerinformationen konnten nicht abgerufen werden (${response.status})`);
    }

    return data as UserInfoResponse;
  } catch (error) {
    console.error('Get user info error:', error);
    throw error;
  }
}

/**
 * Logout API-Aufruf
 */
export async function logout(token: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Beim Abmelden ist ein Fehler aufgetreten');
    }
  } catch (error) {
    // Auch wenn Logout auf Server fehlschlägt, sollten wir lokalen Token löschen
    console.error('Logout error:', error);
    throw error;
  }
}

/**
 * Bereiche-Liste abrufen (Bereiche, für die der Benutzer berechtigt ist)
 */
export async function getBereiche(token: string): Promise<BereicheResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/bereiche`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new Error('Ungültige Antwort vom Server erhalten');
    }

    if (!response.ok) {
      console.error('Get bereiche error:', data);
      throw new Error(data.message || `Bereiche konnten nicht abgerufen werden (${response.status})`);
    }

    return data as BereicheResponse;
  } catch (error) {
    console.error('Get bereiche error:', error);
    throw error;
  }
}

/**
 * Kontaktliste abrufen (Gruppen + Mitarbeiter)
 * @param token - Authentifizierungs-Token
 * @param bereichId - Bereich ID (Standard: 13 = Kontakt-Modul)
 */
export async function getContacts(token: string, bereichId: number = 13): Promise<ContactsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/contacts?bereich_id=${bereichId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new Error('Ungültige Antwort vom Server erhalten');
    }

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(data.message || 'Sie haben keine Berechtigung für diesen Bereich.');
      }
      console.error('Get contacts error:', data);
      throw new Error(data.message || `Kontakte konnten nicht abgerufen werden (${response.status})`);
    }

    return data as ContactsResponse;
  } catch (error) {
    console.error('Get contacts error:', error);
    throw error;
  }
}

