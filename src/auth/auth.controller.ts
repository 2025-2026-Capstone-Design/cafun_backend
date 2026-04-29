import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginReqDto, LoginResDto } from './dtos/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() reqDto: LoginReqDto): Promise<LoginResDto> {
        const loginResult = await this.authService.login(reqDto);
        return loginResult;
    }
}
