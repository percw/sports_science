import { Redirect } from "expo-router";
import { Text } from "react-native";

import { Screen } from "@/components/Screen";
import { useAthlete } from "@/hooks/useAthlete";

export default function IndexRoute() {
  const { athlete, loading } = useAthlete();

  if (loading) {
    return (
      <Screen>
        <Text>Loading athlete profile...</Text>
      </Screen>
    );
  }

  return <Redirect href={athlete ? "/(tabs)/dashboard" : "/onboarding"} />;
}
