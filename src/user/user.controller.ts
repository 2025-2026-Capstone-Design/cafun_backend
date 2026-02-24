import { Controller, Post, Body } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { UserService } from './user.service';
import { RegisterReqDto, RegisterResDto } from './dtos/register.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() reqDto: RegisterReqDto): Promise<RegisterResDto> {
    const savedUser = await this.userService.register(reqDto);

    return plainToInstance(RegisterResDto, savedUser, {
      excludeExtraneousValues: true,
    });
  }
}