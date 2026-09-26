import type { CapacitorConfig } from '@capacitor/cli';

// Native wrapper for the iOS (WKWebView) build, same shape as chain and cubes.
// `webDir` is Vite's production output; this only repackages the built assets.
//
// Dev live-reload: temporarily set
//   server: { url: 'http://<mac-lan-ip>:5176', cleartext: true }
// then `pnpm dev` + `pnpm exec cap sync ios`. Remove it before archiving.
const config: CapacitorConfig = {
  appId: 'com.ashwink.qbr',
  appName: 'QBR',
  webDir: 'dist',
  ios: {
    // Edge-to-edge: the teal desktop runs under the notch; App pays the safe
    // area back with env(safe-area-inset-*) padding.
    contentInset: 'never',
    // The web view's own background before the page paints: the teal desktop, so the
    // launch screen (also teal) hands over with no white frame in between.
    backgroundColor: '#0f7b7b',
  },
};

export default config;
