import { Test, TestingModule } from '@nestjs/testing';
import { In } from 'typeorm';
import { CafeService } from './cafe.service';
import { AI_RECOMMENDATION_PORT } from './ai-recommendation.port';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Cafe } from './entities/cafe.entity';
import { Review } from './entities/review.entity';
import { CafeRecommendationCacheService } from './cafe-recommendation-cache.service';

// 의존성 주입 대상 클래스들을 모킹하기 위한 타입
const mockAiModelAdapter = () => ({
    getRecommendedCafeIdsWithKeywords: jest.fn(),
});

const mockCafeRepository = () => ({
    find: jest.fn(),
});

const mockCacheService = () => ({
    aspectVectors: new Float32Array(12).fill(0.1), // 12차원 기본 벡터
    cafeMetadataMap: {
        get: jest.fn(),
    },
});

const mockReviewRepository = () => ({
    find: jest.fn(),
    // 의존성 주입용 모킹
});

describe('CafeService', () => {
    let service: CafeService;
    let aiModelAdapter: any;
    let cafeRepository: any;
    let reviewRepository: any;
    let cacheService: any;

    // 테스트용 공통 더미 데이터
    const mockCafes = [
        { id: 'cafe-1', name: '카페 1' },
        { id: 'cafe-2', name: '카페 2' },
        { id: 'cafe-3', name: '카페 3' },
        { id: 'cafe-4', name: '카페 4' },
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CafeService,
                {
                    provide: AI_RECOMMENDATION_PORT,
                    useFactory: mockAiModelAdapter
                },
                {
                    provide: getRepositoryToken(Cafe),
                    useFactory: mockCafeRepository
                },
                {
                    // 추가된 의존성 반영
                    provide: getRepositoryToken(Review),
                    useFactory: mockReviewRepository
                },
                {
                    // 클래스 타입 자체가 토큰인 경우
                    provide: CafeRecommendationCacheService,
                    useFactory: mockCacheService
                },
            ],
        }).compile();

        // 의존성 인스턴스 추출 시에도 등록된 토큰과 정확히 동일한 키를 사용해야 합니다.
        service = module.get<CafeService>(CafeService);
        aiModelAdapter = module.get(AI_RECOMMENDATION_PORT);
        cafeRepository = module.get(getRepositoryToken(Cafe));
        reviewRepository = module.get(getRepositoryToken(Review));
        cacheService = module.get(CafeRecommendationCacheService);

        cacheService.cafeMetadataMap.get.mockReturnValue(undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('searchCafesByAspectAndKeyword - 페이징 및 정렬 (fetchAndSortPaginatedCafes 검증)', () => {
        const dummyVector = [0, 0, 0];
        const dummyKeywords = ['조용한'];

        it('케이스 1: AI 모델이 반환한 카페 ID가 0개일 때, 빈 배열과 카운트 0을 반환한다', async () => {
            aiModelAdapter.getRecommendedCafeIdsWithKeywords.mockResolvedValue([]);

            const result = await service.searchCafesByAspectAndKeyword(dummyVector, dummyKeywords, 1, 3);

            expect(result.cafes).toEqual([]);
            expect(result.totalCount).toBe(0);
            expect(result.totalPages).toBe(0);
            expect(cafeRepository.find).not.toHaveBeenCalled(); // DB 조회가 일어나지 않아야 함
        });

        it('케이스 2: AI 모델이 3개를 반환하고, limit 3인 상태에서 2페이지를 요청하면 빈 배열을 반환한다', async () => {
            aiModelAdapter.getRecommendedCafeIdsWithKeywords.mockResolvedValue(['cafe-1', 'cafe-2', 'cafe-3']);

            const result = await service.searchCafesByAspectAndKeyword(dummyVector, dummyKeywords, 2, 3);

            expect(result.cafes).toEqual([]);
            expect(result.totalCount).toBe(3);
            expect(result.totalPages).toBe(1);
            expect(cafeRepository.find).not.toHaveBeenCalled(); // offset 범위를 벗어나 DB 조회가 생략되어야 함
        });

        it('케이스 3: AI 모델이 4개를 반환하고, limit 3인 상태에서 2페이지를 요청하면 1개의 데이터만 반환한다', async () => {
            aiModelAdapter.getRecommendedCafeIdsWithKeywords.mockResolvedValue(['cafe-1', 'cafe-2', 'cafe-3', 'cafe-4']);
            // 2페이지의 ID는 'cafe-4'
            cafeRepository.find.mockResolvedValue([mockCafes[3]]);

            const result = await service.searchCafesByAspectAndKeyword(dummyVector, dummyKeywords, 2, 3);

            expect(cafeRepository.find).toHaveBeenCalledWith({ where: { id: In(['cafe-4']) } });
            expect(result.cafes).toHaveLength(1);
            expect(result.cafes[0].id).toBe('cafe-4');
            expect(result.totalCount).toBe(4);
            expect(result.totalPages).toBe(2);
        });

        it('케이스 4: limit 4에서 1페이지 요청 시, DB 조회 결과의 순서와 무관하게 AI가 반환한 ID 순서대로 정렬된다', async () => {
            const aiOrderIds = ['cafe-3', 'cafe-1', 'cafe-4', 'cafe-2'];
            aiModelAdapter.getRecommendedCafeIdsWithKeywords.mockResolvedValue(aiOrderIds);

            // DB는 순서를 보장하지 않고 (1, 2, 3, 4) 순서로 반환한다고 가정 (Mocking)
            cafeRepository.find.mockResolvedValue(mockCafes);

            const result = await service.searchCafesByAspectAndKeyword(dummyVector, dummyKeywords, 1, 4);

            expect(result.cafes).toHaveLength(4);
            // AI가 지시한 배열 순서(3 -> 1 -> 4 -> 2)대로 재정렬되었는지 검증
            expect(result.cafes[0].id).toBe('cafe-3');
            expect(result.cafes[1].id).toBe('cafe-1');
            expect(result.cafes[2].id).toBe('cafe-4');
            expect(result.cafes[3].id).toBe('cafe-2');
        });
    });

    describe('searchCafesByAspectAndKeyword - 데이터 가공 (enrichCafesWithTopKeywords 검증)', () => {
        const dummyVector = [0, 0, 0];
        const dummyKeywords = ['조용한'];

        beforeEach(() => {
            // 이 테스트 블록에서는 무조건 1개의 ID가 조회되도록 고정
            aiModelAdapter.getRecommendedCafeIdsWithKeywords.mockResolvedValue(['cafe-1']);
            cafeRepository.find.mockResolvedValue([mockCafes[0]]);
        });

        it('케이스 5: Cache 메타데이터가 null(undefined)일 때 에러 없이 빈 배열로 Fallback 처리한다', async () => {
            cacheService.cafeMetadataMap.get.mockReturnValue(undefined);

            const result = await service.searchCafesByAspectAndKeyword(dummyVector, dummyKeywords, 1, 3);

            expect(result.cafes[0].topKeywords).toEqual([]);
            expect(result.cafes[0].aspectVector).toEqual([]);
        });

        it('케이스 6: 메타데이터가 존재할 때 카운트 기준 내림차순 정렬 후 상위 10개의 키워드만 반환한다', async () => {
            // 15개의 무작위 카운트를 가진 키워드 Mock 데이터
            const mockKeywordCounts = {
                'k1': 5, 'k2': 100, 'k3': 12, 'k4': 1, 'k5': 50,
                'k6': 30, 'k7': 2, 'k8': 75, 'k9': 8, 'k10': 90,
                'k11': 11, 'k12': 25, 'k13': 60, 'k14': 4, 'k15': 80
            };

            // 예상 Top 10 (내림차순): k2(100), k10(90), k15(80), k8(75), k13(60), k5(50), k6(30), k12(25), k3(12), k11(11)
            const expectedTopKeywords = [
                { keyword: 'k2', count: 100 }, { keyword: 'k10', count: 90 },
                { keyword: 'k15', count: 80 }, { keyword: 'k8', count: 75 },
                { keyword: 'k13', count: 60 }, { keyword: 'k5', count: 50 },
                { keyword: 'k6', count: 30 }, { keyword: 'k12', count: 25 },
                { keyword: 'k3', count: 12 }, { keyword: 'k11', count: 11 },
            ];

            cacheService.cafeMetadataMap.get.mockReturnValue({
                index: 0,
                keywordCounts: mockKeywordCounts,
            });

            const result = await service.searchCafesByAspectAndKeyword(dummyVector, dummyKeywords, 1, 3);

            expect(result.cafes[0].topKeywords).toHaveLength(10);
            expect(result.cafes[0].topKeywords).toEqual(expectedTopKeywords);
            // 벡터 값도 정상적으로 할당되었는지 검증 (초기화 시 0.1로 채웠으므로 길이 12 검증)
            expect(result.cafes[0].aspectVector).toHaveLength(12);
        });
    });
});