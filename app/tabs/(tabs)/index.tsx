import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Animated, Easing } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { Button, ButtonText } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Icon,
  UsersIcon,
  CalendarDaysIcon,
  PlayIcon,
  MailIcon,
  HelpCircleIcon,
  ClockIcon,
  MessageCircleIcon,
  ChevronRightIcon,
} from '@/components/ui/icon';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/app-header';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { getUserInfo } from '@/lib/api';
import { getToken, getCachedUserInfo, saveUserInfo } from '@/lib/auth';

const exploreLinks = [
  { name: 'Ausweis', icon: UsersIcon, url: 'https://example.com/ausweis' },
  { name: 'Buchungssystem', icon: CalendarDaysIcon, url: 'https://example.com/buchungssystem' },
  { name: 'Datenschutz-Video', icon: PlayIcon, url: 'https://example.com/datenschutz-video' },
  { name: 'E-Mail Signatur erstellen', icon: MailIcon, url: 'https://example.com/email-signatur' },
  { name: 'FAQ', icon: HelpCircleIcon, url: 'https://example.com/faq' },
  { name: 'Stundennachweis', icon: ClockIcon, url: 'https://example.com/stundennachweis' },
  {
    name: 'Ticketsystem / Supportanfrage',
    icon: MessageCircleIcon,
    url: 'https://example.com/ticketsystem',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [showWave, setShowWave] = useState(false);
  const waveAnim = useRef(new Animated.Value(0)).current;
  const [userName, setUserName] = useState<string>('');
  const [gruppen, setGruppen] = useState<{ id: number; name: string | null }[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    setShowWave(true);
    waveAnim.setValue(0);
    Animated.sequence([
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.delay(1800),
      Animated.timing(waveAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowWave(false);
    });
  }, [waveAnim]);

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
          } else {
            setUserName(cachedUserInfo.user.name || '');
          }
          // Gruppen aus Cache setzen
          setGruppen(cachedUserInfo.gruppen || []);
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
          } else {
            setUserName(userInfo.user.name || '');
          }
          // Gruppen aktualisieren
          setGruppen(userInfo.gruppen || []);
        } catch (error) {
          console.error('Error fetching fresh user info:', error);
          // Wenn API fehlschlägt, aber Cache vorhanden ist, Cache weiterhin anzeigen
          if (!cachedUserInfo) {
            setUserName('');
          }
        } finally {
          setIsLoadingUser(false);
        }
      } catch (error) {
        console.error('Error loading user info:', error);
        setUserName('');
        setIsLoadingUser(false);
      }
    };

    loadUserInfo();
  }, []);

  const waveBaseStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: 0,
      bottom: 0,
      right: 16,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    }),
    []
  );

  const waveAnimatedStyle = {
    opacity: waveAnim,
    transform: [
      {
        translateY: waveAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0, 0],
        }),
      },
      {
        rotate: waveAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: ['0deg', '14deg', '0deg'],
        }),
      },
    ],
  };

  return (
    <SafeAreaView className="flex-1 bg-background-0">
      <AppHeader />
      <ScrollView className="flex-1">
        <VStack className="p-4 gap-6">
          {/* Willkommens-Bereich */}
          <Card variant="elevated" size="md" className="p-6 overflow-visible">
            <Box className="relative">
              <VStack className="gap-2">
                <VStack className="gap-1">
                  <Heading className="text-2xl font-semibold text-typography-900">
                    Willkommen zurück!
                  </Heading>
                  <Text className="text-typography-600">
                    Schönen Tag,{" "}
                    {isLoadingUser ? (
                      <Spinner size="small" />
                    ) : (
                      <Text className="font-semibold text-typography-900">
                        {userName || 'Benutzer'}
                      </Text>
                    )}
                  </Text>
                  {/* Gruppen-Anzeige */}
                  {gruppen.length > 0 && (
                    <Pressable
                      onPress={() => {
                        if (gruppen.length > 1) {
                          // Timestamp hinzufügen, um sicherzustellen, dass Effekt jedes Mal ausgeführt wird
                          router.push(`/tabs/profile?scrollTo=gruppen&t=${Date.now()}`);
                        }
                      }}
                      disabled={gruppen.length === 1}
                    >
                      <HStack className="items-center gap-2 mt-1">
                        <Text className="text-typography-500 text-sm">
                          {gruppen[0].name || 'Gruppe'}
                        </Text>
                        {gruppen.length > 1 && (
                          <HStack className="items-center gap-1">
                            <Icon as={UsersIcon} size="xs" className="text-typography-400" />
                            <Text className="text-typography-400 text-xs">
                              +{gruppen.length - 1} weitere
                            </Text>
                            <Icon as={ChevronRightIcon} size="xs" className="text-typography-400" />
                          </HStack>
                        )}
                      </HStack>
                    </Pressable>
                  )}
                </VStack>

              </VStack>

              {showWave && (
                <Animated.View style={[waveBaseStyle, waveAnimatedStyle]} pointerEvents="none">
                  <Text className="text-4xl">👋</Text>
                </Animated.View>
              )}
            </Box>
          </Card>

          {/* Ankündigungen */}
          <Card variant="elevated" size="md" className="p-4">
            <HStack className="items-center justify-between mb-3">
              <Heading className="text-lg font-semibold">Ankündigungen</Heading>
              <Button
                size="sm"
                variant="link"
                onPress={() => router.push('/tabs/announcements')}
              >
                <ButtonText>Mehr anzeigen</ButtonText>
              </Button>
            </HStack>
            <VStack className="gap-3">
              <Text className="text-typography-500 text-sm text-center py-4">
                Keine Ankündigungen vorhanden
              </Text>
            </VStack>
          </Card>

          {/* E-Mails */}
          <Card variant="elevated" size="md" className="p-4">
            <HStack className="items-center justify-between mb-3">
              <Heading className="text-lg font-semibold">Posteingang</Heading>
              <Button size="sm" variant="link" onPress={() => router.push('/tabs/mail')}>
                <ButtonText>Mehr anzeigen</ButtonText>
              </Button>
            </HStack>
            <VStack className="gap-3">
              <Text className="text-typography-500 text-sm text-center py-4">
                Keine E-Mails vorhanden
              </Text>
            </VStack>
          </Card>

          {/* Bereiche-Bereich */}
          <Card variant="elevated" size="md" className="p-4">
            <Heading className="text-lg font-semibold mb-4">Bereiche</Heading>
            <VStack className="gap-1.5">
              {exploreLinks.map((link) => (
                <Pressable
                  key={link.name}
                  onPress={() => {
                    Alert.alert('Öffnen', `Öffne ${link.name}`);
                  }}
                >
                  <HStack className="items-center justify-between py-3 border-b border-outline-100 last:border-b-0">
                    <HStack className="items-center gap-3">
                      <Box className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center">
                        <Icon as={link.icon} size="sm" className="text-primary-500" />
                      </Box>
                      <Text className="text-typography-900 font-medium">
                        {link.name}
                      </Text>
                    </HStack>
                    <Icon as={ChevronRightIcon} size="sm" className="text-outline-400" />
                  </HStack>
                </Pressable>
              ))}
            </VStack>
          </Card>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}

