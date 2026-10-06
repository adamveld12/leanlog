// Must be the first import: uuidv7 needs crypto.getRandomValues, which Hermes lacks.
import 'react-native-get-random-values';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
