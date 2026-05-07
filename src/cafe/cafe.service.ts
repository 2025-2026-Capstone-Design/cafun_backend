import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cafe } from './entities/cafe.entity';
import { In, Repository } from 'typeorm';
import { AI_RECOMMENDATION_PORT, AiRecommendationPort } from './ai-recommendation.port';
import { Review } from './entities/review.entity';
import { CreateReviewRequestDto, ReviewResponseDto } from './dtos/review.dto';
import { CafeRecommendationCacheService } from './cafe-recommendation-cache.service.ts';
import { CafeWithTopKeywords, TopKeyword } from './dtos/cafe-with-keywords.interface';

@Injectable()
export class CafeService {
    constructor(
        @InjectRepository(Cafe)
        private readonly cafeRepository: Repository<Cafe>,
        @InjectRepository(Review)
        private readonly reviewRepository: Repository<Review>,
        private readonly cacheService: CafeRecommendationCacheService,
        @Inject(AI_RECOMMENDATION_PORT)
        private readonly aiModelAdapter: AiRecommendationPort,
    ) { }

    // 1. 기존: 측면 기반 검색
    async searchCafesByAspect(
        aspectVector: number[],
        page: number = 1,
        limit: number = 20
    ): Promise<{ cafes: CafeWithTopKeywords[]; totalCount: number; totalPages: number }> {
        // AI 어댑터에서 전체 정렬된 ID 리스트를 가져옴
        const allRecommendedIds = await this.aiModelAdapter.getRecommendedCafeIds(aspectVector);

        // A. 공통 조회 및 정렬
        const { cafes, totalCount, totalPages } = await this.fetchAndSortPaginatedCafes(allRecommendedIds, page, limit);

        // B. 데이터 가공 (Top 10 키워드 부착)
        const enrichedCafes = this.enrichCafesWithTopKeywords(cafes);

        return { cafes: enrichedCafes, totalCount, totalPages };
    }

    // 2. 신규: 측면 + 키워드 기반 세부 검색
    async searchCafesByAspectAndKeyword(
        aspectVector: number[],
        keywords: string[],
        page: number = 1,
        limit: number = 20
    ): Promise<{ cafes: CafeWithTopKeywords[]; totalCount: number; totalPages: number }> {
        // AI 어댑터에서 키워드가 반영된 전체 정렬된 ID 리스트를 가져옴
        const allRecommendedIds = await this.aiModelAdapter.getRecommendedCafeIdsWithKeywords(aspectVector, keywords);

        // A. 공통 조회 및 정렬
        const { cafes, totalCount, totalPages } = await this.fetchAndSortPaginatedCafes(allRecommendedIds, page, limit);

        // B. 데이터 가공 (Top 10 키워드 부착)
        const enrichedCafes = this.enrichCafesWithTopKeywords(cafes);

        return { cafes: enrichedCafes, totalCount, totalPages };
    }

    // 3. 공통: 페이지네이션, DB 조회, 순서 복원 로직 분리
    private async fetchAndSortPaginatedCafes(
        allRecommendedIds: string[],
        page: number,
        limit: number
    ): Promise<{ cafes: Cafe[]; totalCount: number; totalPages: number }> {
        const totalCount = allRecommendedIds.length;
        const totalPages = Math.ceil(totalCount / limit);

        if (!allRecommendedIds || totalCount === 0) {
            return { cafes: [], totalCount: 0, totalPages: 0 };
        }

        // 페이지네이션: 요청받은 페이지 분량만큼만 ID 배열 자르기 (Slice)
        const offset = (page - 1) * limit;
        const paginatedIds = allRecommendedIds.slice(offset, offset + limit);

        if (paginatedIds.length === 0) {
            return { cafes: [], totalCount, totalPages };
        }

        // DB에서 해당 페이지의 카페 상세 정보만 조회
        const cafes = await this.cafeRepository.find({
            where: { id: In(paginatedIds) },
        });

        // In-Memory 정렬: DB 조회 결과를 AI 모델이 반환한 ID 순서(paginatedIds)에 맞게 재정렬
        const cafeMap = new Map(cafes.map((cafe) => [cafe.id, cafe]));
        const sortedCafes = paginatedIds
            .map((id) => cafeMap.get(id))
            .filter((cafe): cafe is Cafe => cafe !== undefined);

        return { cafes: sortedCafes, totalCount, totalPages };
    }

    private enrichCafesWithTopKeywords(cafes: Cafe[]): CafeWithTopKeywords[] {
        return cafes.map(cafe => {
            // 1. 인메모리 Map에서 해당 카페의 키워드 카운트 객체 O(1) 조회
            const metadata = this.cacheService.cafeMetadataMap.get(cafe.id);
            const keywordCounts = metadata?.keywordCounts || {};

            // 2. 객체를 [키, 값] 배열로 변환 -> count 기준 내림차순 정렬 -> 상위 10개 추출
            const topKeywords: TopKeyword[] = Object.entries(keywordCounts)
                .sort(([, countA], [, countB]) => countB - countA)
                .slice(0, 10)
                .map(([keyword, count]) => ({ keyword, count }));

            // 3. 기존 엔티티 데이터에 topKeywords 속성을 병합하여 반환
            return {
                ...cafe,
                topKeywords,
            };
        });
    }

    /**
     * 카페 이름 기반 유사도 검색 (오타 및 부분 일치 지원)
     */
    async searchCafesByName(
        searchWord: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ cafes: CafeWithTopKeywords[]; totalCount: number; totalPages: number }> {
        
        const offset = (page - 1) * limit;

        // QueryBuilder를 이용한 유사도 검색 로직
        const [cafes, totalCount] = await this.cafeRepository.createQueryBuilder('cafe')
            .where('cafe.name ILIKE :exactLike', { exactLike: `%${searchWord}%` }) // 1. 부분 일치 매칭 (예: '스타벅' -> '스타벅스')
            .orWhere('cafe.name % :keyword', { keyword: searchWord }) // 2. pg_trgm 유사도 매칭 (예: '스타벙스' -> '스타벅스')
            .orderBy('cafe.name <-> :keyword', 'ASC') // 3. 검색어와의 거리(Distance)가 가까운 순(ASC)으로 정렬
            .skip(offset)
            .take(limit)
            .getManyAndCount();

        const totalPages = Math.ceil(totalCount / limit);

        if (cafes.length === 0) {
            return { cafes: [], totalCount, totalPages };
        }

        // 4. 기존 로직 재활용: 검색된 카페 엔티티에 Top 10 키워드 부착
        const enrichedCafes = this.enrichCafesWithTopKeywords(cafes);

        return { cafes: enrichedCafes, totalCount, totalPages };
    }

    async getCafeDetail(cafeId: string): Promise<[CafeWithTopKeywords, number]> {
        const cafe = await this.cafeRepository.findOne({
            where: { id: cafeId },
            relations: ['menus'], // 연관된 메뉴 데이터를 조인하여 가져옴
        });

        if (!cafe) {
            throw new NotFoundException(`ID가 ${cafeId}인 카페를 찾을 수 없습니다.`);
        }

        const [latestReviews, totalCount] = await this.reviewRepository.findAndCount({
            where: { cafeId },
            order: { createdAt: 'DESC' },
            take: 10,
        });

        cafe.reviews = latestReviews;
        const [enrichedCafe] = this.enrichCafesWithTopKeywords([cafe]);
        return [enrichedCafe, totalCount];
    }

    async getReviews(
        cafeId: string,
        page: number,
        limit: number
    ): Promise<Review[]> {
        // 1. 해당 카페 존재 여부 확인
        const cafeExists = await this.cafeRepository.exists({ where: { id: cafeId } });
        if (!cafeExists) {
            throw new NotFoundException(`ID가 ${cafeId}인 카페를 찾을 수 없습니다.`);
        }

        // 2. 페이지네이션 적용하여 리뷰 조회
        // skip: 건너뛸 개수, take: 가져올 개수
        return await this.reviewRepository.find({
            where: { cafeId },
            order: { createdAt: 'DESC' }, // 최신순 정렬
            skip: (page - 1) * limit,
            take: limit,
        });
    }

    async createReview(
        cafeId: string,
        userId: number,
        createReviewDto: CreateReviewRequestDto,
    ): Promise<Review> {
        // 1. 카페 존재 여부 검증 (외래키 무결성 보호)
        const cafeExists = await this.cafeRepository.exists({ where: { id: cafeId } });
        if (!cafeExists) {
            throw new NotFoundException(`Cafe with ID ${cafeId} not found.`);
        }

        const newReview = this.reviewRepository.create({
            cafeId,
            userId,
            ...createReviewDto,
        });

        try {
            // 2. DB 저장 시도
            return await this.reviewRepository.save(newReview);

        } catch (error) {
            // 3. PostgreSQL 에러 코드에 따른 예외 처리
            // 23503: foreign_key_violation (예: 탈퇴했거나 없는 userId로 요청한 경우)
            if (error.code === '23503') {
                throw new BadRequestException('유효하지 않은 참조입니다.');
            }

            // 기타 DB 에러 (연결 실패, 데드락 등)
            // 에러 로그는 서버에 남기되, 클라이언트에게는 500 에러로 추상화하여 반환
            console.error('Review Save Error:', error);
            throw new InternalServerErrorException('리뷰 등록 중 서버 오류가 발생했습니다.');
        }
    }
}
