import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthUser } from '../interfaces/auth-user.interface';
import { InactiveUserException } from '../exceptions/inactive-user.exception';
import { UnverifiedUserException } from '../exceptions/unverified-user.exception';
import { UserService } from '../../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger('JwtStrategy');

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    const secret = configService.getOrThrow<string>('JWT_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    // Log first 5 chars of secret so we can verify it's loaded correctly
    new Logger('JwtStrategy').log(`JWT_SECRET loaded, first 5 chars: "${secret.substring(0, 5)}"`);
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new InactiveUserException();
    }

    if (!user.is_active) {
      throw new InactiveUserException();
    }

    if (!user.is_verified) {
      throw new UnverifiedUserException();
    }

    return user;
  }
}
