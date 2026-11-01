import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.funpixelnest.circuitforge',
  appName: 'Circuit Forge',
  webDir: 'www',
  backgroundColor: '#070a14',
  ios: {
    backgroundColor: '#070a14',
    // the game draws its own safe-area padding (env(safe-area-inset-*)), so the web view fills the screen
    contentInset: 'never',
    scrollEnabled: false,
    allowsLinkPreview: false,
    preferredContentMode: 'mobile',
  },
  plugins: {
    // full screen: hides the status bar and auto-hides the home bar (Capacitor's built-in SystemBars plugin)
    SystemBars: { hidden: true },
    // The iOS app offers Sign in with Apple (plus email). Google stays switched on so the shared game code works unchanged. Facebook and Twitter are left out of the build.
    SocialLogin: {
      providers: { google: true, apple: true, facebook: false, twitter: false },
    },
  },
};

export default config;
