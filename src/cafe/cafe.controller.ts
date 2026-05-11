import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CafeService } from './cafe.service';
import { SearchCafesByNameRequestDto, SearchCafesRequestDto, SearchCafesResponseDto, SearchCafesWithKeywordsRequestDto } from './dtos/search-cafe.dto';
import { plainToInstance } from 'class-transformer';
import { CafeDetailResponseDto } from './dtos/cafe-detail.dto';
import { CreateReviewRequestDto, ReviewListResponseDto, ReviewResponseDto } from './dtos/review.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('cafe')
export class CafeController {
    constructor(private readonly cafeService: CafeService) { }

    @Get('search')
    async searchCafes(
        @Query() query: SearchCafesRequestDto,
    ): Promise<SearchCafesResponseDto> {
        const result = await this.cafeService.searchCafesByAspect(
            query.aspectVector,
            query.page,
            query.limit,
        );
        return plainToInstance(
            SearchCafesResponseDto,
            result,
            { excludeExtraneousValues: true },
        );
    }

    @Get('search/advanced')
    async searchCafesWithKeywords(
        @Query() query: SearchCafesWithKeywordsRequestDto,
    ): Promise<SearchCafesResponseDto> {
        const result = await this.cafeService.searchCafesByAspectAndKeyword(
            query.aspectVector,
            query.keywords, // 추가된 키워드 배열 파라미터
            query.page,
            query.limit,
        );
        
        return plainToInstance(
            SearchCafesResponseDto,
            result,
            { excludeExtraneousValues: true },
        );
    }

    @Get('search/name')
    async searchCafesByName(
        @Query() query: SearchCafesByNameRequestDto,
    ): Promise<SearchCafesResponseDto> {
        // 서비스 레이어의 pg_trgm 유사도 검색 로직 호출
        const result = await this.cafeService.searchCafesByName(
            query.name,
            query.page,
            query.limit,
        );
        
        // 응답 직렬화: 측면/키워드 검색과 완벽히 동일한 응답 규격(Top 10 키워드 포함) 보장
        return plainToInstance(
            SearchCafesResponseDto,
            result,
            { excludeExtraneousValues: true },
        );
    }

    @Get(':id')
    async getCafeDetail(
        @Param('id') id: string,
    ): Promise<CafeDetailResponseDto> {
        // 1. 서비스로부터 엔티티와 총 개수를 분리해서 제공받음
        const [cafe, totalCount] = await this.cafeService.getCafeDetail(id);

        // 2. DTO 매핑 불일치 해결: 컨트롤러 단에서 DTO 명세에 맞게 새 객체 구조로 조립
        const rawDataForDto = {
            ...cafe,
            reviews: {
                reviews: cafe.reviews, // 엔티티에 들어있는 리뷰 배열 
                totalCount: totalCount, // 별도로 받아온 카운트
            },
        };

        // 3. 조립된 객체를 바탕으로 P2I 직렬화 수행 (불필요한 값 제거)
        return plainToInstance(
            CafeDetailResponseDto,
            rawDataForDto,
            { excludeExtraneousValues: true }
        );
    }

    @Get(':cafeId/reviews')
    async getReviews(
        @Param('cafeId') cafeId: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 20,
    ): Promise<ReviewListResponseDto> {
        // 쿼리 파라미터는 문자열로 들어오므로 숫자형 변환(+ 연산자) 후 서비스 호출
        const reviews = await this.cafeService.getReviews(cafeId, +page, +limit);

        // totalCount를 undefined로 설정하여 응답 구조 유지 및 불필요한 데이터 제외
        const rawData = {
            reviews: reviews,
            totalCount: undefined,
        };

        // 3. P2I 변환 및 반환 (화이트리스트 필터링 적용)
        return plainToInstance(
            ReviewListResponseDto,
            rawData,
            { excludeExtraneousValues: true }
        );
    }

    @Post(':cafeId/reviews')
    @UseGuards(JwtAuthGuard)
    async createReview(
        @Param('cafeId') cafeId: string,
        @Body() createReviewDto: CreateReviewRequestDto,
        @Req() req: any,
    ): Promise<ReviewResponseDto> {
        const userId = req.user.id;
        const savedReview = await this.cafeService.createReview(cafeId, userId, createReviewDto);

        return plainToInstance(ReviewResponseDto, savedReview, {
            excludeExtraneousValues: true,
        });
    }
}
