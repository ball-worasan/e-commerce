import { readFileSync } from 'fs';
import type { Env } from './env.js';

export interface JwtKeys {
  privateKey: string;
  publicKey: string;
}

function readKeyFile(path: string): string {
  try {
    return readFileSync(path, 'utf-8');
  } catch (error) {
    throw new Error(`Could not read JWT key file at ${path}: ${(error as Error).message}`);
  }
}

export function loadJwtKeys(env: Pick<Env, 'JWT_PRIVATE_KEY_PATH' | 'JWT_PUBLIC_KEY_PATH'>): JwtKeys {
  return {
    privateKey: readKeyFile(env.JWT_PRIVATE_KEY_PATH),
    publicKey: readKeyFile(env.JWT_PUBLIC_KEY_PATH),
  };
}
