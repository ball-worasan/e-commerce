import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UserRole } from '@ecommerce/shared-types';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtKeys: { privateKey: string; publicKey: string }
  ) {}

  async register(dto: RegisterDto): Promise<{ id: string; email: string; role: UserRole }> {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: { email: dto.email, passwordHash },
      });
      return { id: user.id, email: user.email, role: user.role as UserRole };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user.id, role: user.role };
    const accessToken = jwt.sign(payload, this.jwtKeys.privateKey, {
      algorithm: 'RS256',
      expiresIn: '15m',
    });
    const refreshToken = jwt.sign(payload, this.jwtKeys.privateKey, {
      algorithm: 'RS256',
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}
