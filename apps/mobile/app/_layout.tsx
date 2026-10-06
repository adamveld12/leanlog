// Must be the first import: uuidv7 needs crypto.getRandomValues, which Hermes lacks.
import 'react-native-get-random-values';
import { Stack } from 'expo-router';
import { Text } from 'react-native';
import { useDatabase } from '../src/db/useDatabase';
import { MobileStoreProvider } from '../src/state/MobileStore';

export default function RootLayout() {
  const { db, error } = useDatabase();
  // Placeholder error surface until the mobile UI kit lands (milestone C).
  if (error) return <Text>Couldn't open the database: {error.message}</Text>;
  if (!db) return null;
  return (
    <MobileStoreProvider db={db}>
      <Stack screenOptions={{ headerShown: false }} />
    </MobileStoreProvider>
  );
}
