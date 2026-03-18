import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenant_id: string;
}

interface AuthUser {
  user_id: string;
  email: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  tenant_id: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.findUser(payload.sub);

    if (!user || !user.is_active || !user.is_verified) {
      throw new UnauthorizedException('User is no longer authorized');
    }

    return user;
  }

  private async findUser(userId: string): Promise<AuthUser | null> {
    return this.prisma.db.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        email: true,
        role: true,
        is_active: true,
        is_verified: true,
        tenant_id: true,
      },
    }) as Promise<AuthUser | null>;
  }
}
