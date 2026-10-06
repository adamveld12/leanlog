import { cleanup } from '@testing-library/react-native';

// Global cleanup, mirroring the vitest setup files; don't add per-file cleanup.
afterEach(cleanup);
