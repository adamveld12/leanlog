// Must be the first import: uuidv7 needs crypto.getRandomValues, which Hermes lacks.
import 'react-native-get-random-values';
import { Stack } from 'expo-router';
import { now } from '../src/clock';
import { useDatabase } from '../src/db/useDatabase';
import { MobileStoreProvider, useMobileStore } from '../src/state/MobileStore';
import { Text } from '../src/ui/atoms/Text';
import { UnitsProvider } from '../src/ui/units';

// Display units follow the stored setting (storage itself stays lb / in).
function Navigation() {
  const { state } = useMobileStore();
  const units = state.status === 'ready' ? state.data.settings.units : 'imperial';
  return (
    <UnitsProvider unitSystem={units}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="meal/[id]" options={{ headerShown: true, title: 'Meal' }} />
        <Stack.Screen name="food/[id]" options={{ headerShown: true, title: 'Food' }} />
        <Stack.Screen name="body-fat" options={{ headerShown: true, title: 'Body fat' }} />
      </Stack>
    </UnitsProvider>
  );
}

export default function RootLayout() {
  const { db, error } = useDatabase();
  // Placeholder error surface until the mobile UI kit lands (milestone C).
  if (error) return <Text>Couldn't open the database: {error.message}</Text>;
  if (!db) return null;
  return (
    <MobileStoreProvider db={db} clock={now}>
      <Navigation />
    </MobileStoreProvider>
  );
}
