import { view } from './storybook.requires';

// On-device Storybook UI. Only bundled when EXPO_PUBLIC_STORYBOOK_ENABLED=true
// (see metro.config.js); `app/storybook.tsx` is the entry route.
const StorybookUIRoot = view.getStorybookUI({});

export default StorybookUIRoot;
