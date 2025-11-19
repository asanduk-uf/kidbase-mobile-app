import React, { useState, useEffect } from 'react';
import { Linking, Alert, Pressable, Platform } from 'react-native';
import { SectionList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Icon, SearchIcon, PhoneIcon, MailIcon, ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon, ArrowUpIcon, ArrowDownIcon, ChevronsUpDownIcon, CloseIcon, HelpCircleIcon, AddIcon } from '@/components/ui/icon';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button, ButtonText } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { getContacts, ContactItem } from '@/lib/api';
import { getToken, getCachedContacts, saveContactsCache } from '@/lib/auth';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableData,
} from '@/components/ui/table';
import { AppHeader } from '@/components/app-header';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { Divider } from '@/components/ui/divider';

type SortField = 'typ' | 'name' | 'festnetz' | 'mobil' | 'email' | 'aufgaben' | 'gruppen' | 'adresse' | null;
type SortDirection = 'asc' | 'desc';
type ContactWithLevel = ContactItem & { level?: number };

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null); // null = kontrol ediliyor
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('name'); // İlk yüklemede name A-Z
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const itemsPerPage = 10;
  const [hoveredRowKey, setHoveredRowKey] = useState<string | null>(null);
  const sectionListRef = React.useRef<SectionList<ContactWithLevel>>(null);
  const navigation = useNavigation<any>();
  // Mobile lazy loading state
  const [mobileVisibleCount, setMobileVisibleCount] = useState<number>(10);
  const [mobileDetailItem, setMobileDetailItem] = useState<(ContactItem & { level?: number }) | null>(null);
  const [pickerOptions, setPickerOptions] = useState<{ type: 'phone' | 'email'; options: string[] } | null>(null);
  const [showContactsOnboarding, setShowContactsOnboarding] = useState(false);

  const KONTAKT_BEREICH_ID = 13; // Kontakt modülü ID'si

  // Load contacts from API or cache (sadece ID=13 için yetki kontrolü ile)
  useEffect(() => {
    const loadContacts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setHasPermission(null);
        
        const token = await getToken();
        if (!token) {
          setError('Nicht angemeldet');
          setHasPermission(false);
          return;
        }

        // Önce cache'den oku (10 dakika geçerli)
        const cachedContacts = await getCachedContacts(10);
        
        if (cachedContacts) {
          // Cache'den veri var, kullan
          console.log('Contacts loaded from cache');
          setContacts(cachedContacts);
          setHasPermission(true);
          setSelectedGroupId(null);
          setIsLoading(false);
          
          // Arka planda güncel verileri çek (cache'i güncelle)
          try {
            const freshData = await getContacts(token, KONTAKT_BEREICH_ID);
            await saveContactsCache(freshData);
            setContacts(freshData); // Güncel verileri güncelle
            console.log('Contacts cache updated in background');
          } catch (err) {
            // Arka plan güncellemesi başarısız olsa bile cache'den gelen veriler gösteriliyor
            console.warn('Background contacts update failed:', err);
          }
          return;
        }

        // Cache yok veya expired, API'den çek
        console.log('Contacts loaded from API');
        const data = await getContacts(token, KONTAKT_BEREICH_ID);
        await saveContactsCache(data); // Cache'le
        setContacts(data);
        setHasPermission(true);
        setSelectedGroupId(null);
      } catch (err) {
        console.error('Error loading contacts:', err);
        
        // 403 hatası = Yetki yok
        if (err instanceof Error && err.message.includes('Berechtigung')) {
          setHasPermission(false);
          setError('Sie haben keine Berechtigung für den Kontakt-Bereich.');
        } else {
          setHasPermission(true); // Diğer hatalar için (network vb.)
          setError(err instanceof Error ? err.message : 'Fehler beim Laden der Kontakte');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadContacts();
  }, []);

  const getGroupNameById = (groupId: number) => {
    const grp = contacts.find((c) => c.typ === 'G' && c.id === groupId);
    return grp?.name || '';
  };

  const handleGroupClick = (groupId: number) => {
    // Eğer aynı gruba tekrar tıklanırsa, filtreyi kaldır
    if (selectedGroupId === groupId) {
      setSelectedGroupId(null);
      setSearchQuery(''); // Arama temizlensin
    } else {
      // Yeni grup seçildi, sadece o grubun personellerini göster
      // Arama alanında grup adı görünsün (sadece görsel amaçlı)
      setSelectedGroupId(groupId);
      setSearchQuery(getGroupNameById(groupId));

      // Mobilde: seçilen grup görünümüne geçerken listeyi en üste kaydır
      if (Platform.OS !== 'web') {
        setTimeout(() => {
          sectionListRef.current?.scrollToLocation({
            sectionIndex: 0,
            itemIndex: 0,
            animated: true,
          });
        }, 0);
      }
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedGroupId(null); // Grup filtresini de temizle
  };

  const handleSearchChange = (text: string) => {
    // Kullanıcı aramayı değiştirdiğinde, grup filtresini bırakıp normal aramaya dön
    setSearchQuery(text);
    if (selectedGroupId !== null) {
      setSelectedGroupId(null);
    }
    setMobileVisibleCount(10);
  };

  // Basit arama mantığı: Her kayıt bağımsız kontrol edilir
  // Herhangi bir sütunda query içeriyorsa o kayıt gösterilir
  // Person eşleşirse, grubu gösterme, sadece person göster
  // Grup eşleşirse, children'ları sakla (tıklanınca gösterilsin)
  const getSearchResults = (contactsToSearch: (ContactItem & { level?: number })[], query: string) => {
    if (!query) return contactsToSearch;
    
    const lowerQuery = query.toLowerCase().trim();
    const results: (ContactItem & { level?: number })[] = [];
    const processedGroupIds = new Set<number>();
    const processedPersonIds = new Set<number>();

    // Tüm grupları ve personelleri kontrol et
    contactsToSearch.forEach((contact) => {
      if (contact.typ === 'G') {
        // Grup kontrolü: Herhangi bir sütunda query içeriyor mu?
        const groupMatches =
          contact.name?.toLowerCase().includes(lowerQuery) ||
          contact.festnetz?.toLowerCase().includes(lowerQuery) ||
          contact.mobil?.toLowerCase().includes(lowerQuery) ||
          contact.email?.toLowerCase().includes(lowerQuery) ||
          contact.aufgaben?.some((a) => a.toLowerCase().includes(lowerQuery)) ||
          contact.adresse?.toLowerCase().includes(lowerQuery);
        
        if (groupMatches && !processedGroupIds.has(contact.id)) {
          processedGroupIds.add(contact.id);
          // Grup eşleşti, children'ları sakla (tıklanınca gösterilsin)
          // children'ları boş bırakmayalım, orijinal children'ları saklayalım
          results.push({
            ...contact,
            // children'ları koru (tıklanınca gösterilsin)
          });
        }
        
        // Personelleri kontrol et (grup içindeki)
        if (contact.children && contact.children.length > 0) {
          contact.children.forEach((child) => {
            if (processedPersonIds.has(child.id)) return;
            
            // Person kontrolü: Herhangi bir sütunda query içeriyor mu?
            const personMatches =
              child.name?.toLowerCase().includes(lowerQuery) ||
              child.festnetz?.toLowerCase().includes(lowerQuery) ||
              child.mobil?.toLowerCase().includes(lowerQuery) ||
              child.email?.toLowerCase().includes(lowerQuery) ||
              child.aufgaben?.some((a) => a.toLowerCase().includes(lowerQuery)) ||
              child.gruppen?.some((g) => g.name?.toLowerCase().includes(lowerQuery));
            
            if (personMatches && !processedPersonIds.has(child.id)) {
              processedPersonIds.add(child.id);
              // Person eşleşti, sadece person'u göster (grubu gösterme)
              results.push({
                ...child,
                level: 1,
              });
            }
          });
        }
      } else if (contact.typ === 'P') {
        // Standalone personel kontrolü
        if (processedPersonIds.has(contact.id)) return;
        
        const personMatches =
          contact.name?.toLowerCase().includes(lowerQuery) ||
          contact.festnetz?.toLowerCase().includes(lowerQuery) ||
          contact.mobil?.toLowerCase().includes(lowerQuery) ||
          contact.email?.toLowerCase().includes(lowerQuery) ||
          contact.aufgaben?.some((a) => a.toLowerCase().includes(lowerQuery)) ||
          contact.gruppen?.some((g) => g.name?.toLowerCase().includes(lowerQuery));
        
        if (personMatches && !processedPersonIds.has(contact.id)) {
          processedPersonIds.add(contact.id);
          results.push({
            ...contact,
            level: 1,
          });
        }
      }
    });
    
    return results;
  };

  // Search filtresi uygula
  let filteredWithChildren: ContactWithLevel[] = [];
  
  if (searchQuery) {
    // Search sonuçlarını orijinal contacts'ten al
    // Grup eşleştiğinde children'ları saklanır (tıklanınca gösterilsin)
    filteredWithChildren = getSearchResults(contacts, searchQuery) as ContactWithLevel[];
  } else {
    filteredWithChildren = contacts.map((contact) => ({
      ...(contact as ContactWithLevel),
      level: (contact as ContactWithLevel).level || 0,
    }));
  }

  // Filtreleme: Eğer bir grup seçiliyse, grubu en üste al ve altına personellerini ekle
  // Search sonuçlarından veya normal contacts'ten seçili grubu bul
  let contactsToDisplay: ContactWithLevel[] = [];

  if (selectedGroupId !== null) {
    // Seçili grup varsa, grubu bul ve grubu + children'larını göster
    // Önce search sonuçlarında ara, bulunamazsa orijinal contacts'te ara
    let selectedGroup = filteredWithChildren.find(
      (contact) => contact.id === selectedGroupId && contact.typ === 'G'
    );
    
    if (!selectedGroup && !searchQuery) {
      // Search sonucunda bulunamadı ve search yoksa, orijinal contacts'te ara
      selectedGroup = contacts.find(
        (contact) => contact.id === selectedGroupId && contact.typ === 'G'
      );
    }
    
    if (selectedGroup) {
      // Grubu en üste ekle (level 0)
      contactsToDisplay.push({
        ...selectedGroup,
        level: 0,
      });
      // Children'ları altına ekle (level 1, ama sadece gösterim için indent yapacağız)
      // Not: Search sonuçlarında grup eşleştiğinde children'ları zaten saklanır
      if (selectedGroup.children && selectedGroup.children.length > 0) {
        selectedGroup.children.forEach((child) => {
          contactsToDisplay.push({
            ...child,
            level: 1, // Indent için
          });
        });
      }
    } else {
      // Seçili grup bulunamadı, search sonuçlarını göster (veya tüm kontaktları)
      contactsToDisplay = filteredWithChildren.map((contact) => ({
        ...(contact as ContactWithLevel),
        level: (contact as ContactWithLevel).level || 0,
      }));
    }
  } else {
    // Seçili grup yoksa, search sonuçlarını göster (veya tüm grupları)
    // Search sonuçlarında gruplar children'sız gösterilir (tıklanınca gösterilsin)
    contactsToDisplay = filteredWithChildren.map((contact) => ({
      ...(contact as ContactWithLevel),
      level: (contact as ContactWithLevel).level || 0,
    }));
  }

  // Sorting: Sıralama uygula
  // contactsToDisplay kullan (seçili grup veya search sonuçları)
  const sortedContacts = [...contactsToDisplay].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: string | string[] = '';
    let bValue: string | string[] = '';

    switch (sortField) {
      case 'typ':
        aValue = a.typ || '';
        bValue = b.typ || '';
        break;
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'festnetz':
        aValue = a.festnetz || '';
        bValue = b.festnetz || '';
        break;
      case 'mobil':
        aValue = a.mobil || '';
        bValue = b.mobil || '';
        break;
      case 'email':
        aValue = a.email || '';
        bValue = b.email || '';
        break;
      case 'aufgaben':
        aValue = a.aufgaben?.join(', ') || '';
        bValue = b.aufgaben?.join(', ') || '';
        break;
      case 'gruppen':
        // Birleşik sütun: Gruplar için adres, personel için grup isimleri
        aValue = a.typ === 'G'
          ? (a.adresse || '')
          : (a.gruppen?.map((g) => g.name || '').join(', ') || '');
        bValue = b.typ === 'G'
          ? (b.adresse || '')
          : (b.gruppen?.map((g) => g.name || '').join(', ') || '');
        break;
    }

    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    if (sortDirection === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });

  // Pagination: Önce gruplar, sonra personeller
  // Sayfa 1-X: Sadece gruplar
  // Sayfa X+1+: Personeller
  // Not: Search sırasında grup seçilirse, o grubun children'ları gösterilir
  let paginatedContacts: ContactWithLevel[] = [];
  let fullListForMobile: ContactWithLevel[] = [];
  let totalItems = 0;
  let totalPages = 0;

  if (selectedGroupId !== null) {
    // Seçili grup varsa, pagination yapma - grubu ve tüm personellerini birlikte göster
    // Çocukları kesin almak için orijinal contacts üzerinden grubu bul
    const fullGroup = contacts.find(
      (c) => c.id === selectedGroupId && c.typ === 'G'
    );

    if (fullGroup) {
      // Grup en üste
      paginatedContacts.push({ ...fullGroup, level: 0 });
      // Ardından tüm personeller (varsa)
      if (fullGroup.children && fullGroup.children.length > 0) {
        fullGroup.children.forEach((child) => {
          paginatedContacts.push({ ...child, level: 1 });
        });
      }
      totalItems = paginatedContacts.length;
      totalPages = 1; // Seçili grup görünümünde sayfalama kapalı
      fullListForMobile = [...paginatedContacts];
    } else {
      // Yedek: sortedContacts içinden bulmayı dene
      const selectedGroup = sortedContacts.find(
        (contact) => contact.id === selectedGroupId && contact.typ === 'G'
      );
      if (selectedGroup) {
        paginatedContacts.push({ ...selectedGroup, level: 0 });
        // Eğer children property mevcutsa ekle
        if (selectedGroup.children && selectedGroup.children.length > 0) {
          selectedGroup.children.forEach((child) => {
            paginatedContacts.push({ ...child, level: 1 });
          });
        }
        totalItems = paginatedContacts.length;
        totalPages = 1;
        fullListForMobile = [...paginatedContacts];
      }
      // Seçili grup bulunamadıysa, aşağıdaki blok normal akışa devam eder
    }
  }
  
  if (paginatedContacts.length === 0) {
    // Grupları ve personelleri ayır ve birleştir
    // Önce tüm gruplar, sonra tüm personeller (düz liste)
    const gruppen: ContactWithLevel[] = [];
    const personeller: ContactWithLevel[] = [];
    const seenPersonIds = new Set<number>(); // Duplicate kontrolü için
    const seenGroupIds = new Set<number>(); // Duplicate kontrolü için
    
    // Search sonuçlarını işle: Gruplar ve standalone personeller
    sortedContacts.forEach((contact) => {
      if (contact.typ === 'G') {
        // Grup kontrolü
        if (!seenGroupIds.has(contact.id)) {
          seenGroupIds.add(contact.id);
          
          // Eğer grup seçiliyse, children'ları da göster
          // Eğer search varsa ama grup seçili değilse, children'ları flat list'e ekleme (sadece grup göster)
          // Eğer search yoksa, normal akış (children'ları ekle)
          const shouldIncludeChildren = 
            selectedGroupId === contact.id || // Grup seçiliyse children'ları göster
            !searchQuery; // Search yoksa normal akış (children'ları ekle)
          
          gruppen.push({
            ...contact,
            level: 0,
          });
          
          // Grup'un children'larını ekle (eğer varsa ve koşullar sağlanıyorsa)
          if (contact.children && contact.children.length > 0 && shouldIncludeChildren) {
            contact.children.forEach((child) => {
              // Duplicate kontrolü: Aynı ID'li personel zaten eklenmiş mi?
              if (!seenPersonIds.has(child.id)) {
                seenPersonIds.add(child.id);
                personeller.push({
                  ...child,
                  level: 1,
                });
              }
            });
          }
        }
      } else if (contact.typ === 'P') {
        // Standalone personel (grup olmadan, search sonucunda eklenen)
        if (!seenPersonIds.has(contact.id)) {
          seenPersonIds.add(contact.id);
          personeller.push({
            ...contact,
            level: 1,
          });
        }
      }
    });
    
    // Personelleri de sırala (eğer sortField varsa)
    let sortedPersoneller = personeller;
    if (sortField) {
      sortedPersoneller = [...personeller].sort((a, b) => {
        let aValue: string | string[] = '';
        let bValue: string | string[] = '';

        switch (sortField) {
          case 'typ':
            aValue = a.typ || '';
            bValue = b.typ || '';
            break;
          case 'name':
            aValue = a.name || '';
            bValue = b.name || '';
            break;
          case 'festnetz':
            aValue = a.festnetz || '';
            bValue = b.festnetz || '';
            break;
          case 'mobil':
            aValue = a.mobil || '';
            bValue = b.mobil || '';
            break;
          case 'email':
            aValue = a.email || '';
            bValue = b.email || '';
            break;
          case 'aufgaben':
            aValue = a.aufgaben?.join(', ') || '';
            bValue = b.aufgaben?.join(', ') || '';
            break;
          case 'gruppen':
            aValue = a.gruppen?.map((g) => g.name || '').join(', ') || '';
            bValue = b.gruppen?.map((g) => g.name || '').join(', ') || '';
            break;
          case 'adresse':
            aValue = a.adresse || '';
            bValue = b.adresse || '';
            break;
        }

        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }
    
    // Grupları ve personelleri birleştir (önce gruplar, sonra personeller)
    // Not: Duplicate kontrolü zaten yukarıda yapıldı (seenGroupIds ve seenPersonIds ile)
    const allContacts: ContactWithLevel[] = [
      ...gruppen.map((g) => ({ ...g, level: 0 })),
      ...sortedPersoneller, // Zaten level 1 set edildi
    ];
    
    // Toplam item ve sayfa sayısı
    totalItems = allContacts.length;
    totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Pagination: Sayfa içinde gruplar bitince personeller başlasın
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    paginatedContacts = allContacts.slice(startIndex, endIndex);
    fullListForMobile = allContacts;
  }

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Aynı sütuna tıklanırsa, yönü değiştir
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Yeni sütuna tıklanırsa, ascending yap
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Sıralama değiştiğinde sayfayı sıfırla
  };

  // Page number click handler
  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  // Search, selectedGroupId veya sortField değiştiğinde sayfayı sıfırla
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGroupId, sortField]);

  const displayContacts = paginatedContacts;

  // Mobile: no alphabet sections, just use current page's contacts in a single section
  const mobileSectionsAll = React.useMemo(() => {
    const sliceCount = Math.min(mobileVisibleCount, fullListForMobile.length);
    return [{ title: selectedGroupId !== null ? 'Gruppe' : 'Kontakte', data: fullListForMobile.slice(0, sliceCount) }];
  }, [fullListForMobile, mobileVisibleCount, selectedGroupId]);

  // Mobile: single section with current page contacts
  const mobileSections = React.useMemo(() => {
    if (selectedGroupId !== null && paginatedContacts.length > 0) {
      // Seçili grup görünümü: mevcut paginatedContacts tek section olarak kullan
      return [{ title: paginatedContacts[0].name || 'Gruppe', data: paginatedContacts }];
    }
    // Default: full listeyi (visible slice) kullan
    return mobileSectionsAll;
  }, [mobileSectionsAll, selectedGroupId, contacts, paginatedContacts]);

  // Reset mobile visible count when data set changes
  useEffect(() => {
    setMobileVisibleCount(10);
  }, [selectedGroupId, searchQuery, sortField, sortDirection]);

  // Reset search/selection on tab reselect without reload
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      // Kontakte tabına tekrar basılınca liste başa dönsün, overlay kapansın, filtreler temizlensin
      setMobileDetailItem(null);
      setSelectedGroupId(null);
      setSearchQuery('');
      setMobileVisibleCount(10);
      try {
        sectionListRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: true });
      } catch {}
    });
    return unsubscribe;
  }, [navigation]);

  // Kontakte onboarding (mobil) - sadece ilk açılışta
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const flag = await AsyncStorage.getItem('contacts_onboarding_shown');
        if (!flag) {
          setShowContactsOnboarding(true);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const dismissContactsOnboarding = async (remember = true) => {
    setShowContactsOnboarding(false);
    if (remember) {
      try {
        await AsyncStorage.setItem('contacts_onboarding_shown', 'true');
      } catch {
        // ignore
      }
    }
  };

  const handleCall = (phone: string | null | undefined) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Fehler', 'Telefonnummer konnte nicht geöffnet werden');
    });
  };

  const handleEmail = (email: string | null | undefined) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Fehler', 'E-Mail konnte nicht geöffnet werden');
    });
  };

  const renderTypBadge = (typ: 'G' | 'P') => {
    return (
      <Badge
        action={typ === 'G' ? 'info' : 'success'}
        variant="solid"
        size="sm"
      >
        <BadgeText>{typ}</BadgeText>
      </Badge>
    );
  };

  const renderAufgaben = (aufgaben?: string[]) => {
    if (!aufgaben || aufgaben.length === 0) return '-';
    return aufgaben.join(', ');
  };

  const handleSaveToPhonebook = async (item: ContactItem) => {
    if (Platform.OS === 'web') {
      Alert.alert('Nicht verfügbar', 'Das Speichern im Telefonbuch ist nur auf mobilen Geräten möglich.');
      return;
    }

    try {
      // expo-contacts dinamik import (tip: any, type deklarasyonu gerekmez)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Contacts: any = require('expo-contacts');
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Hinweis', 'Zugriff auf Kontakte wurde nicht erlaubt.');
        return;
      }

      const fullName = item.name || '';
      let firstName: string | undefined;
      let lastName: string | undefined;
      if (fullName.includes(' ')) {
        const parts = fullName.split(' ');
        firstName = parts.slice(0, -1).join(' ');
        lastName = parts[parts.length - 1];
      } else {
        firstName = fullName;
      }

      const phoneNumbers: any[] = [];
      if (item.mobil) {
        phoneNumbers.push({ label: 'mobile', number: item.mobil });
      }
      if (item.festnetz) {
        phoneNumbers.push({ label: 'home', number: item.festnetz });
      }

      const emails: any[] = [];
      if (item.email) {
        emails.push({ label: 'work', email: item.email });
      }

      const contact: any = {
        firstName,
        lastName,
        name: fullName,
        phoneNumbers: phoneNumbers.length > 0 ? phoneNumbers : undefined,
        emails: emails.length > 0 ? emails : undefined,
        note: item.typ === 'G'
          ? 'Kontakt aus der KidBase Gruppenliste'
          : 'Kontakt aus der KidBase Mitarbeiterliste',
      };

      await Contacts.addContactAsync(contact);
      Alert.alert('Erfolg', 'Kontakt wurde im Telefonbuch gespeichert.');
    } catch (e) {
      Alert.alert('Fehler', 'Kontakt konnte nicht gespeichert werden.');
    }
  };

  const renderGruppen = (gruppen?: { id: number; name: string }[]) => {
    if (!gruppen || gruppen.length === 0) return '-';
    return (
      <VStack className="gap-0.5">
        {gruppen.map((gruppe) => (
          <Pressable
            key={gruppe.id}
            onPress={() => {
              // Eğer zaten bu grup seçiliyse, hiçbir şey yapma (aynı grupta kal)
              if (selectedGroupId === gruppe.id) return;
              handleGroupClick(gruppe.id);
            }}
          >
            <Text className="text-primary-700">{gruppe.name}</Text>
          </Pressable>
        ))}
      </VStack>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-0">
      <AppHeader />
      <VStack className="flex-1">
        <VStack className="p-4 gap-4">
          <HStack className="items-center justify-between">
          <Heading className="text-2xl font-bold">Kontakte</Heading>
            {Platform.OS !== 'web' && (
              <Pressable
                onPress={() => setShowContactsOnboarding(true)}
                className="p-1"
                hitSlop={8}
              >
                <Icon as={HelpCircleIcon} size="lg" className="text-primary-600" />
              </Pressable>
            )}
          </HStack>

          {/* Search - Sadece yetkisi varsa göster */}
          {hasPermission && (
          <Input variant="outline" size="md">
            <Icon as={SearchIcon} className="ml-3" />
            <InputField
                placeholder="Suchen (Name, Telefon, E-Mail, Gruppe)..."
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={handleClearSearch} className="mr-3 p-2" hitSlop={8}>
                <Icon as={CloseIcon} size="md" className="text-typography-500" />
              </Pressable>
            )}
          </Input>
          )}
        </VStack>

        {/* Contacts - Table (Web) or Cards (Mobile) */}
        {isLoading || hasPermission === null ? (
          <Box className="items-center justify-center py-8">
            <Spinner size="large" />
            <Text className="text-typography-600 mt-4">Lade Kontakte...</Text>
          </Box>
        ) : !hasPermission ? (
          <Box className="items-center justify-center py-8 px-4">
            <Text className="text-typography-600 text-center">
              Sie haben keine Berechtigung für den Kontakt-Bereich.
            </Text>
          </Box>
        ) : error ? (
          <Box className="items-center justify-center py-8">
            <Text className="text-typography-600">{error}</Text>
          </Box>
        ) : displayContacts.length === 0 ? (
            <Box className="items-center justify-center py-8">
              <Text className="text-typography-600">Keine Kontakte gefunden</Text>
            </Box>
        ) : Platform.OS === 'web' ? (
          // Web: Table View
          <Box className="flex-1 w-full overflow-x-auto">
              <Table className="w-full border-collapse" style={{ minWidth: 800, width: '100%' }}>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: 36 }}>
                      <Pressable onPress={() => handleSort('typ')} className="flex-row items-center gap-1">
                        <Text>Typ</Text>
                        {sortField === 'typ' ? (
                          <Icon as={sortDirection === 'asc' ? ArrowUpIcon : ArrowDownIcon} size="xs" className="text-primary-500" />
                        ) : (
                          <Icon as={ChevronsUpDownIcon} size="xs" className="text-typography-300 opacity-50" />
                        )}
                      </Pressable>
                    </TableHead>
                    <TableHead style={{ width: 240 }}>
                      <Pressable onPress={() => handleSort('name')} className="flex-row items-center gap-1">
                        <Text>Name</Text>
                        {sortField === 'name' ? (
                          <Icon as={sortDirection === 'asc' ? ArrowUpIcon : ArrowDownIcon} size="xs" className="text-primary-500" />
                        ) : (
                          <Icon as={ChevronsUpDownIcon} size="xs" className="text-typography-300 opacity-50" />
                        )}
                      </Pressable>
                    </TableHead>
                    <TableHead style={{ width: 140 }}>
                      <Pressable onPress={() => handleSort('festnetz')} className="flex-row items-center gap-1">
                        <Text>Festnetz</Text>
                        {sortField === 'festnetz' ? (
                          <Icon as={sortDirection === 'asc' ? ArrowUpIcon : ArrowDownIcon} size="xs" className="text-primary-500" />
                        ) : (
                          <Icon as={ChevronsUpDownIcon} size="xs" className="text-typography-300 opacity-50" />
                        )}
                      </Pressable>
                    </TableHead>
                    <TableHead style={{ width: 140 }}>
                      <Pressable onPress={() => handleSort('mobil')} className="flex-row items-center gap-1">
                        <Text>Mobil</Text>
                        {sortField === 'mobil' ? (
                          <Icon as={sortDirection === 'asc' ? ArrowUpIcon : ArrowDownIcon} size="xs" className="text-primary-500" />
                        ) : (
                          <Icon as={ChevronsUpDownIcon} size="xs" className="text-typography-300 opacity-50" />
                        )}
                      </Pressable>
                    </TableHead>
                    <TableHead style={{ width: 220 }}>
                      <Pressable onPress={() => handleSort('email')} className="flex-row items-center gap-1">
                        <Text>E-Mail</Text>
                        {sortField === 'email' ? (
                          <Icon as={sortDirection === 'asc' ? ArrowUpIcon : ArrowDownIcon} size="xs" className="text-primary-500" />
                        ) : (
                          <Icon as={ChevronsUpDownIcon} size="xs" className="text-typography-300 opacity-50" />
                        )}
                      </Pressable>
                    </TableHead>
                    <TableHead style={{ width: 180 }}>
                      <Pressable onPress={() => handleSort('aufgaben')} className="flex-row items-center gap-1">
                        <Text>Aufgabe(n)</Text>
                        {sortField === 'aufgaben' ? (
                          <Icon as={sortDirection === 'asc' ? ArrowUpIcon : ArrowDownIcon} size="xs" className="text-primary-500" />
                        ) : (
                          <Icon as={ChevronsUpDownIcon} size="xs" className="text-typography-300 opacity-50" />
                        )}
                      </Pressable>
                    </TableHead>
                    <TableHead style={{ width: 320 }}>
                      <Pressable onPress={() => handleSort('gruppen')} className="flex-row items-center gap-1">
                        <Text>Gruppe(n)/Adresse</Text>
                        {sortField === 'gruppen' ? (
                          <Icon as={sortDirection === 'asc' ? ArrowUpIcon : ArrowDownIcon} size="xs" className="text-primary-500" />
                        ) : (
                          <Icon as={ChevronsUpDownIcon} size="xs" className="text-typography-300 opacity-50" />
                        )}
                      </Pressable>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayContacts.map((contact, rowIndex) => {
                    const isGroup = contact.typ === 'G';
                    const isSelected = selectedGroupId === contact.id;
                    const level = contact.level || 0;
                    const rowKey = `${contact.id}-${contact.level || 0}`;
                    const handleRowPress = () => {
                      if (!isGroup) return;
                      if (isSelected && selectedGroupId !== null) {
                        handleGroupClick(contact.id);
                      } else if (!isSelected) {
                        handleGroupClick(contact.id);
                      }
                    };

                    return (
                      <React.Fragment key={`${contact.id}-${contact.level || 0}`}>
                        <TableRow
                          className={`transition-colors duration-75 ease-out ${isGroup ? 'cursor-pointer' : ''}`}
                          style={{
                            backgroundColor: isSelected
                              ? 'rgba(59, 130, 246, 0.1)'
                              : rowIndex % 2 === 0
                                ? 'rgba(0, 0, 0, 0.02)'
                                : 'transparent',
                          }}
                        >
                            <TableData style={{ width: 36, paddingLeft: level > 0 ? 24 : 8 }}>
                              <Pressable
                                onPress={handleRowPress}
                              >
                                <HStack className="items-center gap-2">
                                  {renderTypBadge(contact.typ)}
                                  {isGroup && selectedGroupId !== null && (
                                    <Icon
                                      as={isSelected ? ChevronUpIcon : ChevronDownIcon}
                                      size="xs"
                                      className="text-typography-400"
                                    />
                                  )}
                                </HStack>
                              </Pressable>
                            </TableData>
                            <TableData style={{ width: 240 }}>
                              <Pressable onPress={handleRowPress}>
                                <Text className={isGroup ? 'font-extrabold' : 'font-bold'}>{contact.name}</Text>
                              </Pressable>
                            </TableData>
                            <TableData style={{ width: 140 }}>
                              {contact.festnetz || (contact.typ === 'G' && contact.fax) ? (
                                <VStack className="gap-0">
                                  {contact.festnetz && (
                                    <Pressable onPress={() => handleCall(contact.festnetz)}>
                                      <Text className="text-typography-700 text-sm">
                                        {contact.festnetz}
                                      </Text>
                                    </Pressable>
                                  )}
                                  {contact.typ === 'G' && contact.fax && (
                                    <Text className="text-typography-600 text-xs">
                                      Fax: {contact.fax}
                                    </Text>
                                  )}
                                </VStack>
                              ) : null}
                            </TableData>
                            <TableData style={{ width: 140 }}>
                              {contact.mobil ? (
                                <Pressable onPress={() => handleCall(contact.mobil)}>
                                  <Text className="text-typography-700 text-sm">
                                    {contact.mobil}
                                  </Text>
                                </Pressable>
                              ) : null}
                            </TableData>
                            <TableData style={{ width: 220 }}>
                              {contact.email ? (
                                <Pressable onPress={() => handleEmail(contact.email)}>
                                  <Text className="text-typography-700 text-sm" numberOfLines={1}>
                                    {contact.email}
                                  </Text>
                                </Pressable>
                              ) : null}
                            </TableData>
                            <TableData style={{ width: 180 }}>
                              <Text className="text-typography-700 text-sm">
                                {renderAufgaben(contact.aufgaben)}
                              </Text>
                            </TableData>
                            <TableData style={{ width: 320 }}>
                              {contact.typ === 'G' ? (
                                <Text className="text-typography-700 text-sm">
                                  {contact.adresse || '-'}
                                </Text>
                              ) : (
                                renderGruppen(contact.gruppen)
                              )}
                            </TableData>
                          </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              
            </Box>
        ) : (
          // Mobile: Native contacts-like view with SectionList and A–Z index
          <Box className="flex-1">
            <SectionList
              ref={sectionListRef}
              sections={mobileSections}
              keyExtractor={(item) => `${item.id}-${item.level || 0}`}
              stickySectionHeadersEnabled
              initialNumToRender={12}
              windowSize={10}
              removeClippedSubviews
              onEndReachedThreshold={0.3}
              onEndReached={() => {
                // Mobilde sona gelince daha fazla item yükle
                if (selectedGroupId === null && mobileVisibleCount < fullListForMobile.length) {
                  setMobileVisibleCount((c) => Math.min(c + 30, fullListForMobile.length));
                }
              }}
              onScroll={({ nativeEvent }) => {
                const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
                if (distanceFromBottom < 400) {
                  // Daha agresif yükleme; hızlı kaydırma için
                  if (selectedGroupId === null && mobileVisibleCount < fullListForMobile.length) {
                    setMobileVisibleCount((c) => Math.min(c + 20, fullListForMobile.length));
                  }
                }
              }}
              renderSectionHeader={({ section: { title } }) => (
                <Box className="bg-background-100 px-4 py-1">
                  <Text className="text-typography-600 font-semibold">{title}</Text>
                </Box>
              )}
              renderItem={({ item: contact }) => {
                const isGroup = contact.typ === 'G';
                const isSelected = selectedGroupId === contact.id;
                // Kontakt-Logik: varsa önce mobil, yoksa festnetz göster
                const primaryNumber = (contact.mobil || contact.festnetz) ?? null;

                const handleRowPress = () => {
                  if (isGroup) {
                    if (!isSelected) {
                      // İlk dokunuş: grubu aç (grup + personeller)
                      handleGroupClick(contact.id);
                      setMobileDetailItem(null);
                      return;
                    }
                    // Aynı gruba ikinci dokunuş: detay
                    setMobileDetailItem(contact);
                    return;
                  }
                  // Person: detay göster
                  setMobileDetailItem(contact);
                };

                return (
                  <Pressable onPress={handleRowPress}>
                    <HStack className="items-center justify-between px-4 py-3 border-b border-outline-100">
                      <HStack className="items-center gap-3 flex-1">
                        {renderTypBadge(contact.typ)}
                        <VStack className="flex-1 gap-0.5">
                          <Text
                            className={`${isGroup ? 'font-extrabold' : 'font-bold'} text-base text-typography-900`}
                            numberOfLines={1}
                          >
                        {contact.name}
                      </Text>
                          {primaryNumber && (
                            <HStack className="items-center gap-2">
                              <Text className="text-typography-600 text-xs" numberOfLines={1}>
                                {primaryNumber}
                              </Text>
                            </HStack>
                          )}
                    </VStack>
                  </HStack>
                      <Icon as={ChevronRightIcon} size="sm" className="text-typography-400" />
                    </HStack>
                  </Pressable>
                );
              }}
              ListFooterComponent={null}
            />

            {/* Basit mobil onboarding overlay (sadece ilk sefer) */}
            {showContactsOnboarding && (
              <Box className="absolute inset-0 bg-black/40">
                <Pressable className="flex-1" onPress={() => dismissContactsOnboarding()} />
                <Box className="absolute left-4 right-4 bottom-10 bg-background-0 rounded-2xl p-4">
                  <VStack className="gap-3">
                    <Text className="text-lg font-extrabold text-typography-900">
                      Kontakte – Kurze Erklärung
                    </Text>
                    <Text className="text-typography-700 text-sm">
                      • Tip \"G\" = Gruppe, \"P\" = Person.
                    </Text>
                    <Text className="text-typography-700 text-sm">
                      • Auf eine Gruppe tippen: Gruppe wird oben mit allen zugehörigen Personen angezeigt.
                    </Text>
                    <Text className="text-typography-700 text-sm">
                      • Nochmals auf den Namen tippen: Detailleiste mit allen Kontaktinfos öffnet sich.
                    </Text>
                    <Text className="text-typography-700 text-sm">
                      • Im Suchfeld kannst du nach Name, Telefonnummer oder E‑Mail dynamisch filtern.
                    </Text>
                    <HStack className="justify-end gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        action="secondary"
                        onPress={() => dismissContactsOnboarding(false)}
                      >
                        <ButtonText>Später</ButtonText>
                      </Button>
                      <Button
                        size="sm"
                        variant="solid"
                        action="primary"
                        onPress={() => dismissContactsOnboarding(true)}
                      >
                        <ButtonText>Verstanden</ButtonText>
                      </Button>
                    </HStack>
                  </VStack>
                </Box>
              </Box>
            )}

            {/* Mobile detail overlay */}
            {mobileDetailItem && (
              <Box className="absolute inset-0 bg-black/40">
                <Pressable className="flex-1" onPress={() => setMobileDetailItem(null)} />
                <Box className="absolute left-0 right-0 bottom-0 bg-background-0 rounded-t-2xl pt-2">
                  <VStack className="items-center">
                    <Box className="w-10 h-1.5 bg-typography-300 rounded-full mb-2" />
                  </VStack>
                  <VStack className="gap-3 max-h-[65vh]">
                    <HStack className="items-start justify-between px-4">
                      <VStack className="flex-1 pr-4">
                        <Text className="text-xl font-extrabold text-typography-900" numberOfLines={2}>{mobileDetailItem.name}</Text>
                        <Text className="text-typography-500 text-xs mt-0.5">{mobileDetailItem.typ === 'G' ? 'Gruppe' : 'Person'}</Text>
                      </VStack>
                      <Pressable onPress={() => setMobileDetailItem(null)} accessibilityLabel="Schließen" className="p-2" hitSlop={8}>
                        <Icon as={CloseIcon} size="lg" className="text-typography-400" />
                      </Pressable>
                    </HStack>

                    <ScrollView className="px-4" showsVerticalScrollIndicator={false}>
                      <VStack className="gap-3 pb-4">
                        {mobileDetailItem.typ === 'G' ? (
                          <>
                            {mobileDetailItem.adresse ? (
                              <VStack>
                                <Text className="text-typography-600 text-xs">Adresse</Text>
                                <Text className="text-typography-800">{mobileDetailItem.adresse}</Text>
                              </VStack>
                            ) : null}
                            {mobileDetailItem.festnetz ? (
                              <VStack>
                                <Text className="text-typography-600 text-xs">Festnetz</Text>
                                <Pressable onPress={() => handleCall(mobileDetailItem.festnetz)}>
                                  <Text className="text-primary-600">{mobileDetailItem.festnetz}</Text>
                                </Pressable>
                              </VStack>
                            ) : null}
                            {mobileDetailItem.fax ? (
                              <Text className="text-typography-600">Fax: {mobileDetailItem.fax}</Text>
                            ) : null}
                            {mobileDetailItem.email ? (
                              <VStack>
                                <Text className="text-typography-600 text-xs">E-Mail</Text>
                                <Pressable onPress={() => handleEmail(mobileDetailItem.email!)}>
                                  <Text className="text-primary-600" numberOfLines={1}>{mobileDetailItem.email}</Text>
                                </Pressable>
                              </VStack>
                            ) : null}
                            {mobileDetailItem.aufgaben && mobileDetailItem.aufgaben.length > 0 ? (
                              <VStack>
                                <Text className="text-typography-600 text-xs">Aufgabe(n)</Text>
                                <Text className="text-typography-800">{renderAufgaben(mobileDetailItem.aufgaben)}</Text>
                              </VStack>
                            ) : null}
                          </>
                        ) : (
                          <>
                            {mobileDetailItem.mobil ? (
                              <VStack>
                                <Text className="text-typography-600 text-xs">Mobil</Text>
                                <Pressable onPress={() => handleCall(mobileDetailItem.mobil!)}>
                                  <Text className="text-primary-600">{mobileDetailItem.mobil}</Text>
                                </Pressable>
                              </VStack>
                            ) : null}
                            {mobileDetailItem.festnetz ? (
                              <VStack>
                                <Text className="text-typography-600 text-xs">Festnetz</Text>
                                <Pressable onPress={() => handleCall(mobileDetailItem.festnetz!)}>
                                  <Text className="text-primary-600">{mobileDetailItem.festnetz}</Text>
                                </Pressable>
                              </VStack>
                            ) : null}
                            {mobileDetailItem.email ? (
                              <VStack>
                                <Text className="text-typography-600 text-xs">E-Mail</Text>
                                <Pressable onPress={() => handleEmail(mobileDetailItem.email!)}>
                                  <Text className="text-primary-600" numberOfLines={1}>{mobileDetailItem.email}</Text>
                                </Pressable>
                              </VStack>
                            ) : null}
                            {mobileDetailItem.gruppen && mobileDetailItem.gruppen.length > 0 ? (
                              <VStack className="gap-1">
                                <Text className="text-typography-600 text-xs">Gruppe(n)</Text>
                                {renderGruppen(mobileDetailItem.gruppen)}
                              </VStack>
                            ) : null}
                            {mobileDetailItem.aufgaben && mobileDetailItem.aufgaben.length > 0 ? (
                              <VStack>
                                <Text className="text-typography-600 text-xs">Aufgabe(n)</Text>
                                <Text className="text-typography-800">{renderAufgaben(mobileDetailItem.aufgaben)}</Text>
                              </VStack>
                            ) : null}
                          </>
                        )}
                      </VStack>
                    </ScrollView>

                    <HStack className="gap-8 px-4 pb-4 justify-end">
                      {mobileDetailItem && (Platform.OS === 'ios' || Platform.OS === 'android') && (
                        <Pressable
                          onPress={() => handleSaveToPhonebook(mobileDetailItem)}
                          accessibilityLabel="Im Telefonbuch speichern"
                        >
                          <Icon as={AddIcon} size="xl" className="text-primary-600" />
                        </Pressable>
                      )}
                      {(mobileDetailItem.mobil || mobileDetailItem.festnetz) && (
                        <Pressable
                          onPress={() => {
                            const phones = [mobileDetailItem.mobil, mobileDetailItem.festnetz].filter(Boolean) as string[];
                            if (phones.length > 1) {
                              setPickerOptions({ type: 'phone', options: phones });
                            } else if (phones.length === 1) {
                              handleCall(phones[0]);
                            }
                          }}
                          accessibilityLabel="Anrufen"
                        >
                          <Icon as={PhoneIcon} size="xl" className="text-primary-600" />
                        </Pressable>
                      )}
                      {mobileDetailItem.email && (
                        <Pressable
                          onPress={() => {
                            const emails = [mobileDetailItem.email].filter(Boolean) as string[];
                            if (emails.length > 1) {
                              setPickerOptions({ type: 'email', options: emails });
                            } else if (emails.length === 1) {
                              handleEmail(emails[0]);
                            }
                          }}
                          accessibilityLabel="E-Mail senden"
                        >
                          <Icon as={MailIcon} size="xl" className="text-primary-600" />
                        </Pressable>
                      )}
                    </HStack>
                  </VStack>
                </Box>
              </Box>
            )}

            {/* Picker modal for multiple phones/emails */}
            {pickerOptions && (
              <Box className="absolute inset-0 bg-black/40">
                <Pressable className="flex-1" onPress={() => setPickerOptions(null)} />
                <Box className="absolute left-4 right-4 bottom-8 bg-background-0 rounded-2xl p-4">
                  <VStack className="gap-2">
                    <HStack className="items-center justify-between mb-1">
                      <Text className="font-semibold">
                        {pickerOptions.type === 'phone' ? 'Nummer wählen' : 'E-Mail wählen'}
                      </Text>
                      <Pressable onPress={() => setPickerOptions(null)}>
                        <Icon as={CloseIcon} size="sm" className="text-typography-400" />
                      </Pressable>
                    </HStack>
                    {pickerOptions.options.map((opt, idx) => (
                      <Pressable
                        key={`${pickerOptions.type}-${idx}`}
                        className="py-2"
                        onPress={() => {
                          if (pickerOptions.type === 'phone') handleCall(opt);
                          else handleEmail(opt);
                          setPickerOptions(null);
                        }}
                      >
                        <Text className="text-primary-700">{opt}</Text>
                      </Pressable>
                    ))}
                  </VStack>
                </Box>
              </Box>
            )}
          </Box>
          )}

        {/* Pagination Controls - Tek satır, solda sayfalar sağda bilgi */}
        {Platform.OS === 'web' && hasPermission && totalPages > 1 && (
          <VStack className="border-t border-outline-200">
            <HStack className={`items-center px-2 py-1 ${Platform.OS === 'web' ? 'justify-between' : 'justify-center'}`}>
              <Text className="text-typography-500 text-[10px]">
                {totalItems} Einträge • Seite {currentPage}/{totalPages}
              </Text>

              <HStack className={`items-center ${Platform.OS === 'web' ? 'gap-1' : 'gap-2'}`}>
                    <Button
                  size="xs"
                      variant="outline"
                  action="secondary"
                  onPress={() => currentPage > 1 && handlePageClick(currentPage - 1)}
                  className="h-6 px-2"
                >
                  <ButtonText className="text-[10px]">Zurück</ButtonText>
                </Button>

                {(() => {
                  const pages: (number | string)[] = [];
                  const seen = new Set<number>();
                  if (totalPages > 0) {
                    pages.push(1);
                    seen.add(1);
                  }
                  if (currentPage > 3) pages.push('...');
                  const startPage = Math.max(2, currentPage - 1);
                  const endPage = Math.min(totalPages - 1, currentPage + 1);
                  for (let i = startPage; i <= endPage; i++) {
                    if (!seen.has(i)) {
                      pages.push(i);
                      seen.add(i);
                    }
                  }
                  if (currentPage < totalPages - 2 && !seen.has(totalPages)) pages.push('...');
                  if (totalPages > 1 && !seen.has(totalPages)) pages.push(totalPages);

                  return pages.map((page, index) => {
                    if (page === '...') {
                      return (
                        <Text key={`ellipsis-${index}`} className="text-typography-400 text-[10px] px-0.5">
                          ...
                        </Text>
                      );
                    }
                    const pageNum = page as number;
                    return (
                      <Button
                        key={pageNum}
                        size="xs"
                        variant={currentPage === pageNum ? 'solid' : 'outline'}
                        action={currentPage === pageNum ? 'primary' : 'secondary'}
                        onPress={() => handlePageClick(pageNum)}
                        className="min-w-[24px] h-6 px-1"
                      >
                        <ButtonText className="text-[10px]">{pageNum}</ButtonText>
                    </Button>
                    );
                  });
                })()}

                    <Button
                  size="xs"
                      variant="outline"
                  action="secondary"
                  onPress={() => currentPage < totalPages && handlePageClick(currentPage + 1)}
                  className="h-6 px-2"
                >
                  <ButtonText className="text-[10px]">Nächste</ButtonText>
                    </Button>
                  </HStack>
            </HStack>
            </VStack>
          )}

        </VStack>
    </SafeAreaView>
  );
}