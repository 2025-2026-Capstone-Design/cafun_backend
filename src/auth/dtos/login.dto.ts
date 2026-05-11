import { Expose } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

export class LoginReqDto {
  @IsEmail({}, { message: '유효한 이메일 형식이 아닙니다.' })
  @IsString()
  email: string;

  @IsString()
  password: string;
}

export class LoginResDto {
  @Expose()
  accessToken: string;
  @Expose()
  id: number;
}