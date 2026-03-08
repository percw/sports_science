import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";

import { migrateDbIfNeeded } from "@/db/migrations";
import { theme } from "@/lib/theme";

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="sport-science.db" onInit={migrateDbIfNeeded}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.page,
          },
          headerShadowVisible: false,
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: "800",
            fontSize: 18,
          },
          contentStyle: {
            backgroundColor: theme.colors.page,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: "Setup" }} />
        <Stack.Screen name="morning-check-in" options={{ title: "Morning Check-in" }} />
        <Stack.Screen name="mental-load" options={{ title: "Mental Load" }} />
        <Stack.Screen name="import-session" options={{ title: "Import Session" }} />
        <Stack.Screen name="session/[id]" options={{ title: "Session Review" }} />
        <Stack.Screen name="performance-anchors" options={{ title: "Performance Anchors" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SQLiteProvider>
  );
}
