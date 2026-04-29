import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { LoginReqDto, LoginResDto } from './dtos/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) { }

    async login(reqDto: LoginReqDto): Promise<LoginResDto> {
        const { email, password } = reqDto;

        const user = await this.userService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('존재하지 않는 이메일입니다.');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
        }

        const payload = { sub: user.id, role: user.role };
        const accessToken = await this.jwtService.signAsync(payload);

        return {
            accessToken,
            id: user.id
        };
    }


}
