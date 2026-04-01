import { createRequire } from 'module';

if (!globalThis.fetch) {
  try {
    const require = createRequire(import.meta.url);
    const fetch = require('node-fetch');
    globalThis.fetch = fetch;
    globalThis.Headers = fetch.Headers;
    globalThis.Request = fetch.Request;
    globalThis.Response = fetch.Response;
  } catch (err) {
    console.warn('Fetch API unavailable. Install node-fetch or upgrade to Node 18+.');
  }
}
