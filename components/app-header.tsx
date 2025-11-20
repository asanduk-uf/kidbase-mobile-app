import React from 'react';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Button } from '@/components/ui/button';
import { Icon, BellIcon, MoonIcon, SunIcon } from '@/components/ui/icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Image, Alert, Platform } from 'react-native';
import { createIcon } from '@/components/ui/icon';
import { Path } from 'react-native-svg';
import { Svg } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { logout } from '@/lib/api';
import { getToken, clearAuthData } from '@/lib/auth';

// Logout Icon
const LogoutIcon = createIcon({
  Root: Svg,
  viewBox: '0 0 24 24',
  path: (
    <>
      <Path
        d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 17L21 12L16 7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 12H9"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
});

LogoutIcon.displayName = 'LogoutIcon';

export function AppHeader() {
  const { colorMode, toggleColorMode } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
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

    // Web'de window.confirm kullan, mobil'de Alert.alert kullan
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
  };

  return (
    <Box className="bg-background-0 border-b border-outline-200 px-4 py-3">
      <HStack className="items-center justify-between">
        <HStack className="items-center gap-3">
          <Image
            source={require('@/assets/images/kidbaselogo04.png')}
            style={{ width: 140, height: 40 }}
            resizeMode="contain"
          />
        </HStack>
        <HStack className="items-center gap-2">
          <Box className="flex-row items-center gap-2">
            <Button
              size="sm"
              variant="link"
              action="secondary"
              onPress={() => {
                alert('Benachrichtigungen');
              }}
              className="p-2"
            >
              <Box className="relative">
                <Icon as={BellIcon} size="md" className="text-typography-900" />
                <Box className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-secondary-500 border border-background-0" />
              </Box>
            </Button>
            <Button
              size="sm"
              variant="link"
              action="secondary"
              onPress={toggleColorMode}
              className="p-2"
            >
              <Icon
                as={colorMode === 'dark' ? SunIcon : MoonIcon}
                size="md"
                className="text-typography-900"
              />
            </Button>
            <Button
              size="sm"
              variant="link"
              action="negative"
              onPress={handleLogout}
              className="p-2"
            >
              <Icon
                as={LogoutIcon}
                size="md"
                className="text-typography-900"
              />
            </Button>
          </Box>
        </HStack>
      </HStack>
    </Box>
  );
}

