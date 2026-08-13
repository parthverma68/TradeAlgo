/**
 * JWT + user persistence via react-native-keychain
 * (iOS Keychain / Android EncryptedSharedPreferences).
 * Never use AsyncStorage for tokens — it is plain text on disk.
 */
import * as Keychain from 'react-native-keychain';
import type { User } from '@/types';

const SERVICE = 'com.premarketiq.session';

export async function saveSession(token: string, user: User): Promise<void> {
  // username field carries the serialized user; password field carries the JWT.
  await Keychain.setGenericPassword(JSON.stringify(user), token, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadSession(): Promise<{ token: string | null; user: User | null }> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    if (!creds) return { token: null, user: null };
    return { token: creds.password, user: JSON.parse(creds.username) as User };
  } catch {
    return { token: null, user: null };
  }
}

export async function clearSession(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch {
    /* nothing to clear */
  }
}
