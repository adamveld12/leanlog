module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  // pnpm nests packages under node_modules/.pnpm/<pkg>/node_modules/<pkg>.
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|standard-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@leanlog/.*)))',
  ],
};
