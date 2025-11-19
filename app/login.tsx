import React, { useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, Image, Pressable } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Checkbox, CheckboxIndicator, CheckboxLabel, CheckboxIcon } from '@/components/ui/checkbox';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CheckIcon } from '@/components/ui/icon';
import { login, LoginError, getUserInfo } from '@/lib/api';
import { saveAuthData, saveUserInfo } from '@/lib/auth';

const externalLinks = [
  { name: 'AIDA', url: 'https://aida.example.com', image: require('../assets/images/aida.png') },
  { name: 'Kidicap', url: 'https://kidicap.example.com', image: require('../assets/images/kidicap.png') },
  { name: 'CB', url: 'https://cb.example.com', image: require('../assets/images/cb.png') },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    // Fehler zurücksetzen
    setError(null);

    // Eingaben validieren
    // Benutzername kann Leerzeichen enthalten, daher nur prüfen ob nicht leer
    // Passwort sollte getrimmt werden
    if (!username || username.length === 0 || !password.trim()) {
      setError('Lütfen kullanıcı adı ve şifrenizi girin.');
      return;
    }

    setIsLoading(true);

    try {
      // Login-API aufrufen
      // Benutzername: unverändert senden (kann Leerzeichen enthalten, case-sensitive)
      // Passwort: trimmen, um führende/nachfolgende Leerzeichen zu entfernen
      const trimmedPassword = password.trim();
      const response = await login(username, trimmedPassword, rememberMe);

      // Token, Benutzerdaten und Ablaufdatum speichern
      await saveAuthData(response.token, response.user, response.expires_at);

      // Vollständige Benutzerinformationen abrufen und cachen (user + mitarbeiter)
      try {
        const userInfo = await getUserInfo(response.token);
        await saveUserInfo(userInfo);
      } catch (error) {
        console.error('Error fetching user info after login:', error);
        // Trotzdem fortfahren, Benutzerinformationen werden später abgerufen
      }

      // Bei Erfolg zu Tabs navigieren
      router.replace('/tabs');
    } catch (err) {
      // Fehler behandeln
      const loginError = err as LoginError;
      
      // Fehlermeldung aus Validierungsfehlern abrufen (Benutzername oder Passwort)
      let errorMessage = loginError.message || 'Giriş başarısız. Lütfen tekrar deneyin.';
      
      if (loginError.errors) {
        // Zuerst Benutzername-Fehler prüfen
        if (loginError.errors.username && loginError.errors.username.length > 0) {
          errorMessage = loginError.errors.username[0];
        }
        // Dann Passwort-Fehler prüfen
        else if (loginError.errors.password && loginError.errors.password.length > 0) {
          errorMessage = loginError.errors.password[0];
        }
        // Wenn es andere Fehler gibt, den ersten anzeigen
        else {
          const firstErrorKey = Object.keys(loginError.errors)[0];
          if (firstErrorKey && loginError.errors[firstErrorKey]) {
            errorMessage = loginError.errors[firstErrorKey][0];
          }
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExternalLink = async (url: string) => {
    if (Platform.OS === 'web') {
      // Für Web window.open verwenden
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
    } else {
      // Für Native WebBrowser verwenden
      await WebBrowser.openBrowserAsync(url);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <VStack className="flex-1 px-6 py-10 gap-12">
            {/* Marke & Formular */}
            <VStack
              className="gap-8"
              style={{ maxWidth: 420, width: '100%', alignSelf: 'center' }}
            >
              <VStack className="items-center gap-4">
                <Image
                  source={require('../assets/images/kidbaselogo04.png')}
                  style={{ width: 220, height: 80, resizeMode: 'contain' }}
                />
              </VStack>

              <Card variant="elevated" size="md" className="p-6">
                <VStack className="gap-5">
                  {/* Fehlermeldung */}
                  {error && (
                    <Box className="bg-error-50 border border-error-200 rounded-md p-3">
                      <Text className="text-error-700 text-sm">{error}</Text>
                    </Box>
                  )}

                  {/* Benutzername-Feld */}
                  <VStack className="gap-2">
                    <Text className="text-typography-700 font-medium text-base">
                      Benutzername:
                    </Text>
                    <Input variant="outline" size="lg" className="min-h-[56px]">
                      <InputField
                        placeholder="Benutzername eingeben"
                        value={username}
                        onChangeText={(text) => {
                          setUsername(text);
                          setError(null); // Fehler löschen, wenn Benutzer tippt
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                        className="text-base"
                      />
                    </Input>
                  </VStack>

                  {/* Passwort-Feld */}
                  <VStack className="gap-2">
                    <Text className="text-typography-700 font-medium text-base">
                      Passwort:
                    </Text>
                    <Input variant="outline" size="lg" className="min-h-[56px]">
                      <InputField
                        placeholder="Passwort eingeben"
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          setError(null); // Fehler löschen, wenn Benutzer tippt
                        }}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                        className="text-base"
                      />
                    </Input>
                  </VStack>

                  {/* Angemeldet bleiben Checkbox */}
                  <Box className="mt-2">
                    <Checkbox
                      size="md"
                      value="remember"
                      isChecked={rememberMe}
                      onChange={(isChecked) => setRememberMe(isChecked)}
                    >
                      <CheckboxIndicator>
                        <CheckboxIcon as={CheckIcon} />
                      </CheckboxIndicator>
                      <CheckboxLabel className="ml-3 flex-1">
                        <VStack className="gap-1">
                          <Text className="text-typography-700">
                            Angemeldet bleiben
                          </Text>
                          <Text className="text-typography-500 text-xs">
                            (bitte nur wählen, wenn dieses Gerät ausschließlich von Ihnen
                            benutzt wird)
                          </Text>
                        </VStack>
                      </CheckboxLabel>
                    </Checkbox>
                  </Box>

                  {/* Anmelden-Button */}
                  <Button
                    size="lg"
                    action="primary"
                    onPress={handleLogin}
                    className="mt-2"
                    isDisabled={!username || !password || isLoading}
                  >
                    {isLoading ? (
                      <HStack className="items-center gap-2">
                        <Spinner size="small" color="white" />
                        <ButtonText>Anmeldung läuft...</ButtonText>
                      </HStack>
                    ) : (
                      <ButtonText>Anmelden</ButtonText>
                    )}
                  </Button>
                </VStack>
              </Card>
            </VStack>

            {/* Externe Links */}
            <Box
              style={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}
              className="mb-8"
            >
              <Card variant="elevated" size="md" className="p-5">
                <VStack className="gap-3">
                  <HStack className="gap-4 flex-wrap justify-between">
                    {externalLinks.map((link) => (
                      <Pressable
                        key={link.name}
                        onPress={() => handleExternalLink(link.url)}
                        className="w-[30%]"
                      >
                        <Box className="items-center">
                          <Image
                            source={link.image}
                            style={{ width: 80, height: 40, resizeMode: 'contain' }}
                          />
                        </Box>
                      </Pressable>
                    ))}
                  </HStack>
                </VStack>
              </Card>
            </Box>

            <VStack className="items-center gap-1 pb-6">
              <Text className="text-xs text-typography-500">
                © {new Date().getFullYear()} Ev. Kinderheims Jugendhilfe Herne & Wanne Eickel gGmbH
              </Text>
              <Text className="text-xs text-typography-500">
                Kidbase App · Status: Beta
              </Text>
            </VStack>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

