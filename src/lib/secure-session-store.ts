import AsyncStorage from '@react-native-async-storage/async-storage';
import aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Encrypted storage adapter for Supabase auth tokens (task 1.1).
 *
 * **Why this exists.** Neither obvious option works alone:
 *
 * - `expo-secure-store` gives OS-level encryption (iOS Keychain, Android
 *   EncryptedSharedPreferences) but items are limited to about 2KB. A Supabase
 *   session — access JWT plus refresh token — exceeds that, so writes fail.
 * - `AsyncStorage` has no size limit but writes plaintext. A refresh token
 *   sitting unencrypted on disk is readable on a rooted or jailbroken device,
 *   or out of an unencrypted backup, and it is enough to impersonate the user.
 *
 * So the two are combined, which is the pattern Supabase documents for this
 * exact problem: a random 32-byte key goes in SecureStore (small, so it fits),
 * the session is AES-encrypted with it, and the ciphertext goes in AsyncStorage
 * (large, but useless without the key).
 *
 * **Threat model.** This protects tokens at rest against someone with access to
 * the filesystem. It does not defend against a compromised OS or an attacker
 * with the device unlocked and the app running — nothing client-side does.
 */

/** AES-CTR with a per-entry random key. */
async function encrypt(key: string, value: string): Promise<string> {
  const encryptionKey = Crypto.getRandomValues(new Uint8Array(32));

  const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
  const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

  // The key is what SecureStore protects; it is small enough to always fit.
  await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));

  return aesjs.utils.hex.fromBytes(encryptedBytes);
}

async function decrypt(key: string, value: string): Promise<string | null> {
  const encryptionKeyHex = await SecureStore.getItemAsync(key);
  if (!encryptionKeyHex) {
    return null;
  }

  const cipher = new aesjs.ModeOfOperation.ctr(
    aesjs.utils.hex.toBytes(encryptionKeyHex),
    new aesjs.Counter(1),
  );
  const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));

  return aesjs.utils.utf8.fromBytes(decryptedBytes);
}

/**
 * Matches the interface `createClient` expects for `auth.storage`.
 */
export const secureSessionStore = {
  async getItem(key: string): Promise<string | null> {
    try {
      const encrypted = await AsyncStorage.getItem(key);
      if (!encrypted) {
        return null;
      }
      return await decrypt(key, encrypted);
    } catch {
      // The key and the ciphertext live in two different stores, so they can
      // desync — a restore from backup brings back AsyncStorage but not the
      // Keychain, for instance. Treat any failure as "no session" and clear
      // both halves, so the user re-authenticates instead of hitting a
      // permanently broken state.
      await this.removeItem(key);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  },

  async removeItem(key: string): Promise<void> {
    // Both halves, always — leaving an orphaned key or blob behind is what
    // causes the desync above.
    await Promise.all([
      AsyncStorage.removeItem(key),
      SecureStore.deleteItemAsync(key).catch(() => undefined),
    ]);
  },
};
