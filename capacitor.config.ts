import type { CapacitorConfig } from '@capacitor/cli';

const portalUrl = process.env.CAPACITOR_SERVER_URL || 'https://sheshaanglobal.com';

const config: CapacitorConfig = {
  appId: 'com.sheshaanglobal.portal',
  appName: 'Sheshaan Global',
  webDir: 'public',
  server: {
    url: portalUrl,
    cleartext: false
  },
  ios: {
    contentInset: 'automatic'
  }
};

export default config;
