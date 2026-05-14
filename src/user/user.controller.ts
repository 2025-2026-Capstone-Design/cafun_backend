import { Controller, Post, Get, Body, Req, Query, UseGuards } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { UserService } from './user.service';
import { RegisterReqDto, RegisterResDto } from './dtos/register.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ReviewListResponseDto, ReviewResponseDto } from 'src/cafe/dtos/review.dto';

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

  @Get('me/reviews')
  @UseGuards(JwtAuthGuard)
  async getMyReviews(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<ReviewListResponseDto> {
    const { reviews, totalCount } = await this.userService.getMyReviews(req.user.id, +page, +limit);
    return plainToInstance(
      ReviewListResponseDto,
      { reviews, totalCount },
      { excludeExtraneousValues: true },
    );
  }
}