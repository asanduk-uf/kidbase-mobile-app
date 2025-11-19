import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getToken, clearAuthData, isTokenExpired } from '@/lib/auth';
import { getUserInfo } from '@/lib/api';

export default function TabsLayout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if token exists
        const token = await getToken();
        
        if (!token) {
          // No token, redirect to login
          setIsAuthenticated(false);
          router.replace('/login');
          return;
        }

        // Check if token is expired
        const expired = await isTokenExpired();
        if (expired) {
          // Token expired, redirect to login
          console.log('Token expired, redirecting to login');
          setIsAuthenticated(false);
          await clearAuthData();
          router.replace('/login');
          return;
        }

        // Verify token is valid by making an API call
        try {
          await getUserInfo(token);
          // Token is valid
          setIsAuthenticated(true);
        } catch (error) {
          // Token is invalid (401 or network error)
          console.error('Token validation failed:', error);
          setIsAuthenticated(false);
          // Clear invalid token from storage
          await clearAuthData();
          router.replace('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Periyodik olarak token expiration kontrolü yap (her 1 dakikada bir)
    const expirationCheckInterval = setInterval(async () => {
      const expired = await isTokenExpired();
      if (expired) {
        console.log('Token expired during session, redirecting to login');
        await clearAuthData();
        router.replace('/login');
      }
    }, 60000); // 1 dakika = 60000 ms

    // Cleanup: component unmount olduğunda interval'i temizle
    return () => {
      clearInterval(expirationCheckInterval);
    };
  }, [router]);

  // Show nothing while checking auth (prevents flash of content)
  if (isLoading) {
    return null;
  }

  // If not authenticated, don't render tabs (will be redirected to login)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
