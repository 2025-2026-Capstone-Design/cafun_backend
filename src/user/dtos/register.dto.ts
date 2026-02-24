import { Exclude, Expose } from 'class-transformer';
import {
    IsEmail,
    IsString,
    MinLength,
    MaxLength,
    Matches,
} from 'class-validator';

// Base DTO: 회원가입 도메인의 핵심 입력 데이터 정의
export class RegisterBaseDto {
    @IsString()
    @IsEmail({}, { message: '유효한 이메일 형식이 아닙니다.' })
    email: string;

    @IsString()
    @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' })
    @Matches(/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
        message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
    })
    password: string;

    @IsString()
    @MinLength(2, { message: '닉네임은 2자 이상이어야 합니다.' })
    @MaxLength(20, { message: '닉네임은 20자 이하이어야 합니다.' })
    nickname: string;
}

export class RegisterReqDto extends RegisterBaseDto {
}

@Exclude()
export class RegisterResDto {
    @Expose()
    id: number;

    @Expose()
    email: string;

    @Expose()
    nickname: string;

    @Expose()
    role: 'USER' | 'ADMIN';

    @Expose()
    createdAt: Date;
}