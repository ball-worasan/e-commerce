import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@ecommerce/shared-types';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';

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
}
