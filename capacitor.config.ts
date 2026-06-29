import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fishcondish.app',
  appName: 'FishCondish',
  webDir: 'build', // Create React App build output
  ios: {
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0C2340',
      showSpinner: false,
    },
  },
};

export default config;
