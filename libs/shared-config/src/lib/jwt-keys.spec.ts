import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadJwtKeys } from './jwt-keys.js';

describe('loadJwtKeys', () => {
  it('reads private and public key files from disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jwt-test-'));
    const privatePath = join(dir, 'private.pem');
    const publicPath = join(dir, 'public.pem');
    writeFileSync(privatePath, 'FAKE-PRIVATE-KEY');
    writeFileSync(publicPath, 'FAKE-PUBLIC-KEY');

    const keys = loadJwtKeys({
      JWT_PRIVATE_KEY_PATH: privatePath,
      JWT_PUBLIC_KEY_PATH: publicPath,
    } as any);

    expect(keys.privateKey).toBe('FAKE-PRIVATE-KEY');
    expect(keys.publicKey).toBe('FAKE-PUBLIC-KEY');
  });

  it('throws a readable error when a key file does not exist', () => {
    expect(() =>
      loadJwtKeys({
        JWT_PRIVATE_KEY_PATH: '/nonexistent/private.pem',
        JWT_PUBLIC_KEY_PATH: '/nonexistent/public.pem',
      } as any)
    ).toThrow(/Could not read JWT key file/);
  });
});
