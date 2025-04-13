// Polyfills for browser environment
import { Buffer } from 'buffer';

// Make Buffer available globally
window.Buffer = Buffer;

// Make process available globally
window.process = {
  env: {},
  browser: true,
  version: '',
  platform: 'browser',
} as any;

// Export for use in other files
export { Buffer }; 