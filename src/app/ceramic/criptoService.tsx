// criptoService.tsx

// --- GENERAR PAR DE CLAVES ECDH P-256 ---

/**
 * Genera un par de claves ECDH (P-256) y las devuelve en formato JWK (JSON).
 * La pública la puedes guardar en Ceramic y la privada la debes cifrar y guardar en local.
 */
export async function generateKeyPair() {
  // 1. Genera el par de claves
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey", "deriveBits"]
  );

  // 2. Exporta las claves a formato JWK (JSON Web Key)
  const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

  // 3. Devuelve las claves en JSON string
  return {
    publicKey: JSON.stringify(publicKeyJwk),    // Guarda en Ceramic/user
    privateKey: JSON.stringify(privateKeyJwk)   // Guarda cifrada localmente
  };
}

// --- UTILIDADES PARA CIFRAR/DESCIFRAR LA CLAVE PRIVADA CON CONTRASEÑA ---

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getRandomBytes(length: number): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(length));
}

async function deriveKey(password: string, salt: any): Promise<CryptoKey> {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptWithPassword(
  plaintext: string,
  password: string
): Promise<string> {
  const salt = getRandomBytes(16);
  const iv : any= getRandomBytes(12);
  const key = await deriveKey(password, salt);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptWithPassword(
  ciphertextBase64: string,
  password: string
): Promise<string> {
  const combined = Uint8Array.from(
    atob(ciphertextBase64),
    c => c.charCodeAt(0)
  );

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const key = await deriveKey(password, salt);
  const plaintextBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return decoder.decode(plaintextBuffer);
}

// --- IMPORTAR/EXPORTAR CLAVES PARA USAR EN DERIVACIÓN ---

/**
 * Importa una clave privada ECDH (P-256) desde JWK (JSON).
 */
export async function importPrivateKey(jwkJson: string): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    "jwk",
    JSON.parse(jwkJson),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"]
  );
}

/**
 * Importa una clave pública ECDH (P-256) desde JWK (JSON).
 */
export async function importPublicKey(jwkJson: string): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    "jwk",
    JSON.parse(jwkJson),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
}

/**
 * Deriva una clave AES-GCM 256 bits compartida para cifrado punto a punto.
 * Usa tu clave privada y la pública del otro usuario.
 */
export async function deriveSharedSecret(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  return window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey
    },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Utils igual que antes (importJWK, deriveSharedKey, encryptAES, etc.)

export async function encryptMessage(
  content: string,
  receiverPublicKeyJwk: JsonWebKey,
  myPrivateJwk: JsonWebKey
): Promise<{ content: string, iv: string }> {
  // Importa claves
  const myPrivateKey = await importJWK(myPrivateJwk, ["deriveKey"]);
  const receiverPublicKey = await importJWK(receiverPublicKeyJwk, []);
  // Deriva la shared key (ECDH)
  const sharedKey = await deriveSharedKey(myPrivateKey, receiverPublicKey);
  // Cifra el mensaje
  const { iv, ciphertext } = await encryptAES(content, sharedKey);
  return { content: ciphertext, iv };
}

export async function decryptMessage(
  encryptedContent: string,
  iv: string,
  authorPublicKeyJwk: JsonWebKey,
  myPrivateJwk: JsonWebKey
): Promise<string> {
  // Importa claves
  const myPrivateKey = await importJWK(myPrivateJwk, ["deriveKey"]);
  const authorPublicKey = await importJWK(authorPublicKeyJwk, []);
  // Deriva la shared key (ECDH)
  const sharedKey = await deriveSharedKey(myPrivateKey, authorPublicKey);
  // Descifra el mensaje
  return await decryptAES(encryptedContent, iv, sharedKey);
}

// --- Utils WebCrypto ---
async function importJWK(jwk: JsonWebKey, usage: KeyUsage[]): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    "jwk", jwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    usage
  );
}
async function exportJWK(key: CryptoKey): Promise<JsonWebKey> {
  return window.crypto.subtle.exportKey("jwk", key);
}

async function deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  return window.crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function decryptAES(ciphertextB64: string, ivB64: string, key: CryptoKey): Promise<string> {
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

// Utilidad para generar clave simétrica aleatoria (AES-GCM 256)
async function generateAESKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}


function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function uint8ToBase64(uint8: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

async function encryptAES(plaintext: string, key: CryptoKey): Promise<{ iv: string, ciphertext: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encoded = encoder.encode(plaintext);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return {
    iv: uint8ToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertext)
  };
}