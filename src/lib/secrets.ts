/**
 * API credentials live in the platform keychain via expo-secure-store —
 * never in AsyncStorage and never in the repo.
 */
import * as SecureStore from 'expo-secure-store';

const NOTION_TOKEN_KEY = 'cesca.notionToken';
const OPENAI_KEY_KEY = 'cesca.openaiKey';

async function setOrDelete(key: string, value: string): Promise<void> {
  const trimmed = value.trim();
  if (trimmed) {
    await SecureStore.setItemAsync(key, trimmed);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function saveSecrets(input: {
  notionToken?: string;
  openaiKey?: string;
}): Promise<void> {
  if (input.notionToken !== undefined) {
    await setOrDelete(NOTION_TOKEN_KEY, input.notionToken);
  }
  if (input.openaiKey !== undefined) {
    await setOrDelete(OPENAI_KEY_KEY, input.openaiKey);
  }
}

export interface Secrets {
  notionToken: string | null;
  openaiKey: string | null;
}

export async function loadSecrets(): Promise<Secrets> {
  const [notionToken, openaiKey] = await Promise.all([
    SecureStore.getItemAsync(NOTION_TOKEN_KEY),
    SecureStore.getItemAsync(OPENAI_KEY_KEY),
  ]);
  return { notionToken, openaiKey };
}
