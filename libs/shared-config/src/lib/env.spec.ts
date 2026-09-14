import { loadEnv } from './env.js';

const validEnv = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/auth',
  JWT_PRIVATE_KEY_PATH: 'secrets/jwt-private.pem',
  JWT_PUBLIC_KEY_PATH: 'secrets/jwt-public.pem',
};

describe('loadEnv', () => {
  it('parses a valid environment', () => {
    const env = loadEnv(validEnv as NodeJS.ProcessEnv);
    expect(env.PORT).toBe(3001);
    expect(env.NODE_ENV).toBe('test');
  });

  it('throws a readable error when DATABASE_URL is missing', () => {
    const { DATABASE_URL, ...rest } = validEnv;
    expect(() => loadEnv(rest as NodeJS.ProcessEnv)).toThrow();
  });

  it('throws when PORT is not a number', () => {
    expect(() => loadEnv({ ...validEnv, PORT: 'abc' } as NodeJS.ProcessEnv)).toThrow();
  });
});