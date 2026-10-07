import { Redirect } from 'expo-router';
import StorybookUIRoot from '../.rnstorybook';

// Dev-only route (open leanlog://storybook in a dev-client build started with
// EXPO_PUBLIC_STORYBOOK_ENABLED=true). In normal builds Metro stubs Storybook out.
export default function StorybookScreen() {
  if (process.env.EXPO_PUBLIC_STORYBOOK_ENABLED !== 'true') return <Redirect href="/" />;
  return <StorybookUIRoot />;
}
