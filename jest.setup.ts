// jest.setup.ts
import { TextEncoder, TextDecoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  // @ts-ignore
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  // @ts-ignore
  global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;
}

// (Opcional) Si usas WebCrypto:
if (typeof global.crypto === 'undefined') {
  // Node 18+ tiene webcrypto
  // @ts-ignore
  const { webcrypto } = require('crypto');
  // @ts-ignore
  global.crypto = webcrypto;
}
