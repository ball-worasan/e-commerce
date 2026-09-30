import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { generateKeyPairSync } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { DatabaseService } from '../common/database.service';
import { AuthService, JwtKeys } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthGuard } from './auth.guard';
import type { ExecutionContext } from '@nestjs/common';

const keys: JwtKeys = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const safeUser = { id: '6f5bb98b-e72e-4e52-a6f9-ab1389964228', email: 'one@example.test',
  role: 'MEMBER' as const, createdAt: new Date(), updatedAt: new Date() };

function fixture(selected: unknown[] = []) {
  const returning = jest.fn().mockResolvedValue(selected);
  const insert = jest.fn().mockReturnValue({ values: jest.fn().mockReturnValue({ returning }) });
  const where = jest.fn().mockResolvedValue(selected);
  const select = jest.fn().mockReturnValue({ from: jest.fn().mockReturnValue({ where }) });
  const database = { db: { insert, select } } as unknown as DatabaseService;
  return { service: new AuthService(database, keys), returning, where, insert };
}

describe('integrated auth', () => {
  it('validates and normalizes registration input', async () => {
    expect(await validate(plainToInstance(RegisterDto, { email: 'bad', password: 'short' }))).not.toHaveLength(0);
    const dto = plainToInstance(RegisterDto, { email: ' ONE@Example.Test ', password: 'long-enough' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.email).toBe('one@example.test');
  });

  it('hashes passwords and returns only safe user fields', async () => {
    const { service, insert } = fixture([safeUser]);
    const result = await service.register({ email: 'ONE@example.test', password: 'long-enough' });
    expect(result).toEqual(safeUser);
    expect(result).not.toHaveProperty('passwordHash');
    const data = insert.mock.results[0].value.values.mock.calls[0][0];
    expect(data.email).toBe('one@example.test');
    expect(data.passwordHash).not.toBe('long-enough');
    expect(await bcrypt.compare('long-enough', data.passwordHash)).toBe(true);
  });

  it('rejects duplicate email', async () => {
    const { service, returning } = fixture();
    returning.mockRejectedValue({ cause: { code: '23505' } });
    await expect(service.register({ email: safeUser.email, password: 'long-enough' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with RS256 and never includes the password hash in token claims', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 12);
    const { service } = fixture([{ ...safeUser, passwordHash }]);
    const { accessToken } = await service.login({ email: safeUser.email, password: 'correct-password' });
    const payload = jwt.verify(accessToken, keys.publicKey, { algorithms: ['RS256'] });
    expect(payload).toMatchObject({ sub: safeUser.id, role: 'MEMBER' });
    expect(payload).not.toHaveProperty('passwordHash');
  });

  it('rejects wrong passwords, unknown users, and invalid login payloads', async () => {
    const hash = await bcrypt.hash('correct-password', 12);
    await expect(fixture([{ ...safeUser, passwordHash: hash }]).service.login({ email: safeUser.email, password: 'wrong' })).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(fixture().service.login({ email: safeUser.email, password: 'wrong' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(await validate(plainToInstance(LoginDto, { email: 'bad', password: '' }))).not.toHaveLength(0);
  });

  it('authenticates valid tokens and rejects missing, invalid, and expired tokens', async () => {
    const { service } = fixture([safeUser]);
    const valid = jwt.sign({ role: 'MEMBER' }, keys.privateKey, { algorithm: 'RS256', subject: safeUser.id, expiresIn: '15m' });
    const expired = jwt.sign({ role: 'MEMBER' }, keys.privateKey, { algorithm: 'RS256', subject: safeUser.id, expiresIn: -1 });
    expect(await service.authenticate(`Bearer ${valid}`)).toEqual(safeUser);
    await expect(service.authenticate(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.authenticate('Bearer invalid')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.authenticate(`Bearer ${expired}`)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('guard attaches a safe user and denies requests without a bearer token', async () => {
    const auth = { authenticate: jest.fn().mockResolvedValue(safeUser) } as unknown as AuthService;
    const guard = new AuthGuard(auth);
    const request = { headers: { authorization: 'Bearer test' } } as Record<string, unknown>;
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext;
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(safeUser);
    (auth.authenticate as jest.Mock).mockRejectedValue(new UnauthorizedException());
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
