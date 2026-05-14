import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: number; // user id
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      // Bearer 토큰 추출
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 토큰 만료 여부 자동 검증
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback_secret_key',
    });
  }

  async validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      role: payload.role,
    };
  }
}