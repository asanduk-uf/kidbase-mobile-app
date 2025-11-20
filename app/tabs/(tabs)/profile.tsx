import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, Alert, Pressable, Platform, Animated, Easing } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { Button, ButtonText } from '@/components/ui/button';
import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Divider } from '@/components/ui/divider';
import { Spinner } from '@/components/ui/spinner';
import {
  Icon,
  EditIcon,
  UsersIcon,
  MailIcon,
  PhoneIcon,
  BellIcon,
  LockIcon,
  HelpCircleIcon,
  InfoIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  BriefcaseIcon,
} from '@/components/ui/icon';
import { AppHeader } from '@/components/app-header';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { getUserInfo, getContacts, ContactItem } from '@/lib/api';
import { getToken, clearAuthData, getCachedUserInfo, saveUserInfo } from '@/lib/auth';
import { logout } from '@/lib/api';
import { useRouter } from 'expo-router';

const menuItems = [
  {
    id: 1,
    title: 'Profilinformationen',
    icon: UsersIcon,
    action: () => Alert.alert('Profilinformationen', 'Profil bearbeiten'),
  },
  {
    id: 2,
    title: 'E-Mail-Einstellungen',
    icon: MailIcon,
    action: () => Alert.alert('E-Mail-Einstellungen', 'E-Mail konfigurieren'),
  },
  {
    id: 3,
    title: 'Kontakt-Einstellungen',
    icon: PhoneIcon,
    action: () => Alert.alert('Kontakt-Einstellungen', 'Kontakte verwalten'),
  },
  {
    id: 4,
    title: 'Benachrichtigungseinstellungen',
    icon: BellIcon,
    action: () => Alert.alert('Benachrichtigungen', 'Benachrichtigungen verwalten'),
  },
  {
    id: 5,
    title: 'Sicherheit',
    icon: LockIcon,
    action: () => Alert.alert('Sicherheit', 'Sicherheitseinstellungen'),
  },
  {
    id: 6,
    title: 'Hilfe & Support',
    icon: HelpCircleIcon,
    action: () => Alert.alert('Hilfe & Support', 'Support kontaktieren'),
  },
  {
    id: 7,
    title: 'Über',
    icon: InfoIcon,
    action: () => Alert.alert('Über', 'Kidbase App v1.0.0'),
  },
];

// Hilfsfunktion zum Entfernen von HTML-Tags
const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').trim();
};

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  const gruppenYPosition = useRef<number>(0);
  const gruppenCardRef = useRef<any>(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const lastScrollToTimestamp = useRef<string>('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailSyncEnabled, setEmailSyncEnabled] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [userPhone1, setUserPhone1] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userBeruf, setUserBeruf] = useState<string>('');
  const [gruppen, setGruppen] = useState<{ id: number; name: string | null }[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [expandedGruppe, setExpandedGruppe] = useState<number | null>(null);
  const [gruppeDetails, setGruppeDetails] = useState<Record<number, ContactItem | null>>({});
  const [loadingGruppeDetails, setLoadingGruppeDetails] = useState<Record<number, boolean>>({});

  // Benutzerinformationen laden - zuerst aus Cache, dann von API aktualisieren
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        // Zuerst versuchen, aus Cache zu laden (sofortige Anzeige, kein Lade-Spinner)
        const cachedUserInfo = await getCachedUserInfo();
        if (cachedUserInfo) {
          if (cachedUserInfo.mitarbeiter) {
            const fullName = [
              cachedUserInfo.mitarbeiter.vorname,
              cachedUserInfo.mitarbeiter.name,
            ]
              .filter(Boolean)
              .join(' ');
            setUserName(fullName || cachedUserInfo.user.name || '');
            setUserEmail(cachedUserInfo.mitarbeiter.email || cachedUserInfo.user.email || '');
            setUserPhone(cachedUserInfo.mitarbeiter.mobil_telefon || '');
            setUserPhone1(cachedUserInfo.mitarbeiter.kontakt1 || '');
            setUserBeruf(cachedUserInfo.mitarbeiter.beruf ? stripHtmlTags(cachedUserInfo.mitarbeiter.beruf) : '');
            setGruppen(cachedUserInfo.gruppen || []);
          } else {
            setUserName(cachedUserInfo.user.name || '');
            setUserEmail(cachedUserInfo.user.email || '');
            setUserPhone('');
            setUserPhone1('');
            setUserBeruf('');
            setGruppen([]);
          }
          setIsLoadingUser(false); // Ladeanzeige sofort ausblenden, wenn Cache vorhanden
        } else {
          // Kein Cache, Ladeanzeige während des Abrufens anzeigen
          setIsLoadingUser(true);
        }

        // Dann frische Daten von API im Hintergrund abrufen
        const token = await getToken();
        if (!token) {
          if (!cachedUserInfo) {
            setUserName('');
            setUserEmail('');
            setUserPhone('');
            setIsLoadingUser(false);
          }
          return;
        }

        try {
          const userInfo = await getUserInfo(token);
          // Für nächstes Mal im Cache speichern
          await saveUserInfo(userInfo);
          
          // UI mit frischen Daten aktualisieren
          if (userInfo.mitarbeiter) {
            const fullName = [
              userInfo.mitarbeiter.vorname,
              userInfo.mitarbeiter.name,
            ]
              .filter(Boolean)
              .join(' ');
            setUserName(fullName || userInfo.user.name || '');
            setUserEmail(userInfo.mitarbeiter.email || userInfo.user.email || '');
            setUserPhone(userInfo.mitarbeiter.mobil_telefon || '');
            setUserPhone1(userInfo.mitarbeiter.kontakt1 || '');
            setUserBeruf(userInfo.mitarbeiter.beruf ? stripHtmlTags(userInfo.mitarbeiter.beruf) : '');
            setGruppen(userInfo.gruppen || []);
          } else {
            setUserName(userInfo.user.name || '');
            setUserEmail(userInfo.user.email || '');
            setUserPhone('');
            setUserPhone1('');
            setUserBeruf('');
            setGruppen([]);
          }
        } catch (error) {
          console.error('Profile: Error fetching fresh user info:', error);
          // Wenn API fehlschlägt, aber Cache vorhanden ist, Cache weiterhin anzeigen
          if (!cachedUserInfo) {
            setUserName('');
            setUserEmail('');
            setUserPhone('');
            setUserPhone1('');
            setUserBeruf('');
            setGruppen([]);
          }
        } finally {
          setIsLoadingUser(false);
        }
      } catch (error) {
        console.error('Profile: Error loading user info:', error);
        setUserName('');
        setUserEmail('');
        setUserPhone('');
        setUserPhone1('');
        setUserBeruf('');
        setGruppen([]);
        setIsLoadingUser(false);
      }
    };

    loadUserInfo();
  }, []);

  // Zu Gruppen-Bereich scrollen, wenn Query-Parameter vorhanden ist, und Highlight-Animation hinzufügen
  useEffect(() => {
    const timestamp = searchParams.t as string;
    if (searchParams.scrollTo === 'gruppen' && gruppen.length > 0 && timestamp && timestamp !== lastScrollToTimestamp.current) {
      lastScrollToTimestamp.current = timestamp;
      
      // Zuerst Scroll-Position sofort nach oben zurücksetzen
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      
      // Kurz warten, bis Layout abgeschlossen und Scroll zurückgesetzt ist
      const scrollTimeout = setTimeout(() => {
        // Position nach Reset erneut messen
        if (gruppenYPosition.current > 0) {
          scrollViewRef.current?.scrollTo({ y: gruppenYPosition.current - 20, animated: true });
          
          // Highlight-Animation starten, nachdem Scroll abgeschlossen ist (Scroll-Animation ist ~300ms)
          setTimeout(() => {
            highlightAnim.setValue(0);
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
          }, 400);
        } else {
          // Wenn Position noch nicht gemessen wurde, nach kurzer Verzögerung erneut versuchen
          setTimeout(() => {
            if (gruppenYPosition.current > 0) {
              scrollViewRef.current?.scrollTo({ y: gruppenYPosition.current - 20, animated: true });
              
              setTimeout(() => {
                highlightAnim.setValue(0);
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
              }, 400);
            }
          }, 200);
        }
      }, 150);

      return () => clearTimeout(scrollTimeout);
    }
  }, [searchParams.scrollTo, searchParams.t, gruppen.length, highlightAnim]);

  // Gruppendetails laden, wenn erweitert
  const loadGruppeDetails = async (gruppeId: number) => {
    if (gruppeDetails[gruppeId] || loadingGruppeDetails[gruppeId]) {
      return; // Bereits geladen oder wird geladen
    }

    setLoadingGruppeDetails((prev) => ({ ...prev, [gruppeId]: true }));

    try {
      const token = await getToken();
      if (!token) {
        return;
      }

      const contacts = await getContacts(token);
      // Gruppe in Kontakten finden
      const gruppe = contacts.find((contact) => contact.typ === 'G' && contact.id === gruppeId);
      
      setGruppeDetails((prev) => ({ ...prev, [gruppeId]: gruppe || null }));
    } catch (error) {
      console.error('Error loading gruppe details:', error);
      setGruppeDetails((prev) => ({ ...prev, [gruppeId]: null }));
    } finally {
      setLoadingGruppeDetails((prev) => ({ ...prev, [gruppeId]: false }));
    }
  };

  // Gruppen-Toggle behandeln
  const handleGruppeToggle = (gruppeId: number) => {
    if (expandedGruppe === gruppeId) {
      setExpandedGruppe(null);
    } else {
      setExpandedGruppe(gruppeId);
      loadGruppeDetails(gruppeId);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-0">
      <AppHeader />
      <ScrollView ref={scrollViewRef} className="flex-1">
        <VStack className="p-4 gap-4">
          {/* Profil-Header */}
          <Card variant="elevated" size="md" className="p-4">
            <HStack className="items-center gap-3 mb-3">
              <Avatar size="lg">
                <AvatarFallbackText>
                  {userName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'U'}
                </AvatarFallbackText>
              </Avatar>
              <VStack className="flex-1 gap-1">
                {isLoadingUser ? (
                  <Spinner size="small" />
                ) : (
                  <Text className="font-semibold text-lg text-typography-900">
                    {userName || 'Benutzer'}
                  </Text>
                )}
                {(userEmail || userPhone1 || userPhone || userBeruf) && (
                  <VStack className="gap-1 mt-1">
                    {userEmail && (
                      <HStack className="items-center gap-2">
                        <Icon as={MailIcon} size="xs" className="text-typography-500" />
                        <Text className="text-typography-600 text-sm">{userEmail}</Text>
                      </HStack>
                    )}
                    {userPhone1 && (
                      <HStack className="items-center gap-2">
                        <Icon as={PhoneIcon} size="xs" className="text-typography-500" />
                        <Text className="text-typography-600 text-sm">{userPhone1}</Text>
                      </HStack>
                    )}
                    {userPhone && (
                      <HStack className="items-center gap-2">
                        <Icon as={PhoneIcon} size="xs" className="text-typography-500" />
                        <Text className="text-typography-600 text-sm">{userPhone}</Text>
                      </HStack>
                    )}
                    {userBeruf && (
                      <HStack className="items-center gap-2">
                        <Icon as={BriefcaseIcon} size="xs" className="text-typography-500" />
                        <Text className="text-typography-600 text-sm">{userBeruf}</Text>
                      </HStack>
                    )}
                  </VStack>
                )}
              </VStack>
              <Button size="sm" variant="outline" action="secondary">
                <Icon as={EditIcon} size="sm" />
              </Button>
            </HStack>
          </Card>

          {/* Gruppen-Karte */}
          {gruppen.length > 0 && (
            <Box
              ref={gruppenCardRef}
              onLayout={(event) => {
                const { y } = event.nativeEvent.layout;
                gruppenYPosition.current = y;
              }}
            >
              <Animated.View
                style={{
                  borderWidth: highlightAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 3],
                  }),
                  borderColor: highlightAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['transparent', 'rgba(59, 130, 246, 0.6)'],
                  }),
                  borderRadius: 8,
                }}
              >
                <Card variant="elevated" size="md" className="p-4">
                  <Heading className="text-base font-semibold mb-3">Gruppe/n</Heading>
                  <VStack className="gap-2">
                    {gruppen.map((gruppe, index) => {
                      const isExpanded = expandedGruppe === gruppe.id;
                      const details = gruppeDetails[gruppe.id];
                      const isLoading = loadingGruppeDetails[gruppe.id];

                      return (
                        <Box key={gruppe.id}>
                          <Pressable onPress={() => handleGruppeToggle(gruppe.id)}>
                            <HStack className="items-center justify-between">
                              <HStack className="items-center gap-2 flex-1">
                                <Box className="w-7 h-7 rounded-full bg-primary-50 items-center justify-center">
                                  <Icon as={UsersIcon} size="xs" className="text-primary-500" />
                                </Box>
                                <Text className="text-typography-900 font-medium text-sm">
                                  {gruppe.name || `Gruppe ${gruppe.id}`}
                                </Text>
                              </HStack>
                              <Icon
                                as={isExpanded ? ChevronDownIcon : ChevronRightIcon}
                                size="sm"
                                className="text-outline-400"
                              />
                            </HStack>
                          </Pressable>

                          {/* Erweiterter Inhalt */}
                          {isExpanded && (
                            <Box className="mt-3 ml-9">
                              {isLoading ? (
                                <HStack className="items-center gap-2 py-2">
                                  <Spinner size="small" />
                                  <Text className="text-typography-500 text-sm">
                                    Lade Gruppendetails...
                                  </Text>
                                </HStack>
                              ) : details ? (
                                <VStack className="gap-3 bg-background-50 p-3 rounded-lg">
                                  {/* Kontaktinformationen */}
                                  {(details.festnetz || details.mobil) && (
                                    <VStack className="gap-1">
                                      {details.festnetz && (
                                        <HStack className="items-center gap-2">
                                          <Icon as={PhoneIcon} size="xs" className="text-typography-500" />
                                          <Text className="text-typography-600 text-sm">
                                            {details.festnetz}
                                          </Text>
                                        </HStack>
                                      )}
                                      {details.mobil && (
                                        <HStack className="items-center gap-2">
                                          <Icon as={PhoneIcon} size="xs" className="text-typography-500" />
                                          <Text className="text-typography-600 text-sm">
                                            {details.mobil}
                                          </Text>
                                        </HStack>
                                      )}
                                    </VStack>
                                  )}

                                  {details.email && (
                                    <HStack className="items-center gap-2">
                                      <Icon as={MailIcon} size="xs" className="text-typography-500" />
                                      <Text className="text-typography-600 text-sm">{details.email}</Text>
                                    </HStack>
                                  )}

                                  {details.adresse && (
                                    <VStack className="gap-1">
                                      <Text className="text-typography-500 text-xs font-medium">
                                        Adresse:
                                      </Text>
                                      <Text className="text-typography-600 text-sm">{details.adresse}</Text>
                                    </VStack>
                                  )}

                                  {details.fax && (
                                    <HStack className="items-center gap-2">
                                      <Icon as={PhoneIcon} size="xs" className="text-typography-500" />
                                      <Text className="text-typography-600 text-sm">
                                        Fax: {details.fax}
                                      </Text>
                                    </HStack>
                                  )}

                                  {!details.festnetz &&
                                    !details.mobil &&
                                    !details.email &&
                                    !details.adresse &&
                                    !details.fax && (
                                      <Text className="text-typography-500 text-sm text-center py-2">
                                        Keine weiteren Informationen verfügbar
                                      </Text>
                                    )}
                                </VStack>
                              ) : (
                                <Text className="text-typography-500 text-sm py-2">
                                  Gruppendetails konnten nicht geladen werden
                                </Text>
                              )}
                            </Box>
                          )}

                          {index < gruppen.length - 1 && <Divider className="my-2" />}
                        </Box>
                      );
                    })}
                  </VStack>
                </Card>
              </Animated.View>
            </Box>
          )}

          {/* Schnelleinstellungen */}
          <Card variant="elevated" size="md" className="p-4">
            <Heading className="text-lg font-semibold mb-4">Schnelleinstellungen</Heading>
            <VStack className="gap-4">
              <HStack className="items-center justify-between">
                <VStack className="flex-1">
                  <Text className="font-semibold text-typography-900">Benachrichtigungen</Text>
                  <Text className="text-typography-600 text-sm">
                    Push-Benachrichtigungen aktivieren
                  </Text>
                </VStack>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                />
              </HStack>
              <Divider />
              <HStack className="items-center justify-between">
                <VStack className="flex-1">
                  <Text className="font-semibold text-typography-900">E-Mail-Synchronisation</Text>
                  <Text className="text-typography-600 text-sm">
                    E-Mails automatisch synchronisieren
                  </Text>
                </VStack>
                <Switch value={emailSyncEnabled} onValueChange={setEmailSyncEnabled} />
              </HStack>
              <Divider />
              <HStack className="items-center justify-between">
                <VStack className="flex-1">
                  <Text className="font-semibold text-typography-900">
                    Automatische Synchronisation
                  </Text>
                  <Text className="text-typography-600 text-sm">
                    Daten im Hintergrund aktualisieren
                  </Text>
                </VStack>
                <Switch value={autoSyncEnabled} onValueChange={setAutoSyncEnabled} />
              </HStack>
            </VStack>
          </Card>

          {/* Menüpunkte */}
          <Card variant="elevated" size="md" className="p-4">
            <Heading className="text-lg font-semibold mb-4">Einstellungen</Heading>
            <VStack className="gap-1.5">
              {menuItems.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={item.action}
                >
                  <HStack className="items-center justify-between py-3 border-b border-outline-100 last:border-b-0">
                    <HStack className="items-center gap-3">
                      <Box className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center">
                        <Icon as={item.icon} size="sm" className="text-primary-500" />
                      </Box>
                      <Text className="text-typography-900 font-medium">
                        {item.title}
                      </Text>
                    </HStack>
                    <Icon as={ChevronRightIcon} size="sm" className="text-outline-400" />
                  </HStack>
                </Pressable>
              ))}
            </VStack>
          </Card>

          {/* Abmelden-Button */}
          <Button
            size="lg"
            variant="solid"
            action="negative"
            onPress={async () => {
              const performLogout = async () => {
                try {
                  const token = await getToken();
                  if (token) {
                    await logout(token);
                  }
                } catch (error) {
                  console.error('Logout error:', error);
                } finally {
                  await clearAuthData();
                  router.replace('/login');
                }
              };

              // Für Web window.confirm verwenden, für Mobile Alert.alert verwenden
              if (Platform.OS === 'web') {
                const confirmed = window.confirm('Möchten Sie sich wirklich abmelden?');
                if (confirmed) {
                  await performLogout();
                }
              } else {
                Alert.alert('Abmelden', 'Möchten Sie sich wirklich abmelden?', [
                  { text: 'Abbrechen', style: 'cancel' },
                  {
                    text: 'Abmelden',
                    style: 'destructive',
                    onPress: performLogout,
                  },
                ]);
              }
            }}
          >
            <ButtonText>Abmelden</ButtonText>
          </Button>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}

