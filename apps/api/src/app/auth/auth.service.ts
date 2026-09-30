import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../common/database.service';
import { users } from '../common/schema';
import { LoginDto, RegisterDto } from './auth.dto';

export type SafeUser = Pick<typeof users.$inferSelect, 'id' | 'email' | 'role' | 'createdAt' | 'updatedAt'>;
export type UserRole = SafeUser['role'];
export const JWT_KEYS = Symbol('JWT_KEYS');
export interface JwtKeys { privateKey: string; publicKey: string }

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService, private readonly keys: JwtKeys) {}

  async register(input: RegisterDto): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(input.password, 12);
    try {
      const [user] = await this.database.db.insert(users).values({
        id: randomUUID(), email: input.email.trim().toLowerCase(), passwordHash,
      }).returning({ id: users.id, email: users.email, role: users.role,
        createdAt: users.createdAt, updatedAt: users.updatedAt });
      return user;
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('Email already registered');
      throw error;
    }
  }

  async login(input: LoginDto): Promise<{ accessToken: string }> {
    const [user] = await this.database.db.select().from(users)
      .where(eq(users.email, input.email.trim().toLowerCase()));
    if (!user || !await bcrypt.compare(input.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return { accessToken: jwt.sign({ role: user.role }, this.keys.privateKey, {
      algorithm: 'RS256', subject: user.id, expiresIn: '15m',
    }) };
  }

  async authenticate(header: string | undefined): Promise<SafeUser> {
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Authentication required');
    let subject: string;
    try {
      const payload = jwt.verify(header.slice(7), this.keys.publicKey, { algorithms: ['RS256'] });
      if (typeof payload === 'string' || typeof payload.sub !== 'string') throw new Error('Invalid subject');
      subject = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const [user] = await this.database.db.select({ id: users.id, email: users.email,
      role: users.role, createdAt: users.createdAt, updatedAt: users.updatedAt })
      .from(users).where(eq(users.id, subject));
    if (!user) throw new UnauthorizedException('Invalid or expired token');
    return user;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const candidate = error as { code?: unknown; cause?: { code?: unknown } };
    return candidate.code === '23505' || candidate.cause?.code === '23505';
  }
}
