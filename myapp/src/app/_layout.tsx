import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../context/AuthContext";
import LocationTracker from "../components/LocationTracker";

function AppLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (isLoading) return;
    if (!rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === "auth";
    console.log("Layout check:", { user: !!user, segments, inAuthGroup });

    if (!user && !inAuthGroup) {
      // Redirect to the sign-in page.
      console.log("Redirecting to /auth");
      setTimeout(() => {
        router.replace("/auth");
      }, 0);
    } else if (user && inAuthGroup) {
      // Redirect away from the sign-in page.
      console.log("Redirecting to /home");
      setTimeout(() => {
        router.replace("/home");
      }, 0);
    }
  }, [user, segments, isLoading, rootNavigationState?.key]);

  if (isLoading) {
      return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#0000ff" />
          </View>
      );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LocationTracker />
      <AppLayout />
    </AuthProvider>
  );
}

