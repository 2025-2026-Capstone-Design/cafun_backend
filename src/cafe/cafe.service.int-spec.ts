import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
import { CafeService } from './cafe.service';
import { CafeRecommendationCacheService } from './cafe-recommendation-cache.service';
import { CafeModule } from './cafe.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { Cafe } from './entities/cafe.entity';
import { Review } from './entities/review.entity';

describe('CafeService (Integration) - searchCafesByName', () => {
    let service: CafeService;
    let module: TestingModule;
    let dataSource: DataSource;

    // 상태 복구를 위한 원본 레포지토리 참조 보관
    let originalCafeRepository: Repository<Cafe>;
    let originalReviewRepository: Repository<Review>;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
                    isGlobal: true,
                }),
                TypeOrmModule.forRootAsync({
                    imports: [ConfigModule],
                    inject: [ConfigService],
                    useFactory: (configService: ConfigService) => ({
                        type: 'postgres',
                        host: configService.get<string>('DB_HOST'),
                        port: configService.get<number>('DB_PORT'),
                        username: configService.get<string>('DB_USERNAME'),
                        password: configService.get<string>('DB_PASSWORD'),
                        database: configService.get<string>('DB_DATABASE'),
                        autoLoadEntities: true,
                        synchronize: false, // 마스터 데이터 보존
                    }),
                }),
                CafeModule,
            ],
        })
            .overrideProvider(CafeRecommendationCacheService)
            .useValue({
                // enrich 로직에서 참조하는 속성들을 빈 값으로 강제
                aspectVectors: new Float32Array(0),
                cafeMetadataMap: {
                    get: jest.fn().mockReturnValue(undefined), // 항상 메타데이터가 없는(null/undefined) 상태로 반환
                },
                // 만약 다른 곳에서 호출될 경우를 대비한 더미 함수
                loadDataIntoMemory: jest.fn(),
            })
            .setLogger(new Logger())
            .compile();

        dataSource = module.get<DataSource>(DataSource);
        service = module.get<CafeService>(CafeService);
        // 다른 하위 describe 블록에 영향을 주지 않기 위해, 주입된 원본 레포지토리를 백업해둡니다.
        originalCafeRepository = (service as any).cafeRepository;
        originalReviewRepository = (service as any).reviewRepository;
    });

    afterAll(async () => {
        if (module) {
            await module.close();
        }
    });

    describe('searchCafesByName', () => {
        it('케이스 1: 의미 없는 문자열 검색 시 빈 배열과 카운트 0을 반환한다', async () => {
            const searchWord = 'sdfljsfjs';

            const result = await service.searchCafesByName(searchWord, 1, 20);

            expect(result.cafes).toEqual([]);
            expect(result.totalCount).toBe(0);
            expect(result.totalPages).toBe(0);
        });

        it('케이스 2: 부분 일치(ILIKE) 매칭 검증 - "타벅" 검색 시 관련 지점들이 반환된다', async () => {
            const searchWord = '타벅';

            const result = await service.searchCafesByName(searchWord, 1, 20);

            // 최소 1개 이상 검색되어야 함 (마스터 데이터 기준 성수역점, 서울숲역점, 성수낙낙점 등 존재)
            expect(result.totalCount).toBeGreaterThan(0);
            expect(result.cafes.length).toBeGreaterThan(0);

            // 반환된 결과 중 실제 '스타벅스'라는 이름을 가진 카페가 존재하는지 교차 검증
            const hasStarbucks = result.cafes.some(cafe => cafe.name.includes('스타벅스'));
            expect(hasStarbucks).toBe(true);

            // enrich 로직이 타서 topKeywords 배열이 존재하는지 구조 검증
            expect(result.cafes[0]).toHaveProperty('topKeywords');
        });

        it('케이스 3: pg_trgm 유사도(%>) 및 거리 정렬(<->>) 검증 - 오타("스타벙스") 검색 시 "스타벅스"가 상위에 노출된다', async () => {
            const searchWord = '스타벙스 ';

            const result = await service.searchCafesByName(searchWord, 1, 20);

            // 유사도 검색에 의해 데이터가 잡혀야 함
            expect(result.totalCount).toBeGreaterThan(0);

            // 상위 5개 결과 안에 '스타벅스' 관련 매장이 매칭되어 올라왔는지 확인
            const top5Names = result.cafes.slice(0, 5).map(cafe => cafe.name);
            const isSimulatedMatchSuccessful = top5Names.some(name => name.includes('스타벅스'));

            expect(isSimulatedMatchSuccessful).toBe(true);
        });

        it('케이스 4: pg_trgm 유사도 추가 검증 - 오타("어니언 성슈") 검색 시 "어니언 성수"가 반환된다', async () => {
            const searchWord = '어니언 성슈';

            const result = await service.searchCafesByName(searchWord, 1, 5);

            expect(result.totalCount).toBeGreaterThan(0);

            const topNames = result.cafes.map(cafe => cafe.name);
            expect(topNames).toContain('어니언 성수');
        });
    });

    describe('getCafeDetail (트랜잭션 격리 적용)', () => {
        let queryRunner: QueryRunner;

        beforeAll(async () => {
            // 1. 현재 describe 블록만을 위한 전용 트랜잭션 시작
            queryRunner = dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            // 2. 서비스 내부의 레포지토리를 현재 트랜잭션이 바인딩된 레포지토리로 교체 (핵심)
            (service as any).cafeRepository = queryRunner.manager.getRepository(Cafe);
            (service as any).reviewRepository = queryRunner.manager.getRepository(Review);

            const testCafeId = '1700801654';

            // 리뷰 작성을 위한 더미 유저 삽입 (트랜잭션 내에서만 존재)
            const userResult = await queryRunner.query(
                `INSERT INTO users (email, password, nickname, role) VALUES ($1, $2, $3, $4) RETURNING id`,
                ['detail_tx_test@example.com', 'dummy_hash', 'detailTxTester', 'USER']
            );
            const testUserId = userResult[0].id;

            // 15개의 더미 리뷰 시간 역순 삽입
            for (let i = 1; i <= 15; i++) {
                const createdAt = new Date();
                createdAt.setMinutes(createdAt.getMinutes() - i);
                await queryRunner.query(
                    `INSERT INTO reviews (cafe_id, user_id, review_text, created_at) VALUES ($1, $2, $3, $4)`,
                    [testCafeId, testUserId, `트랜잭션 리뷰 내용 ${i}`, createdAt]
                );
            }
        });

        afterAll(async () => {
            // 4. 트랜잭션 롤백: 시드 데이터와 테스트 중 발생한 모든 변경사항 증발
            if (queryRunner) {
                await queryRunner.rollbackTransaction();
                await queryRunner.release();
            }

            // 5. 다음 describe(예: 리뷰 작성)를 위해 서비스의 레포지토리를 다시 원상복구
            (service as any).cafeRepository = originalCafeRepository;
            (service as any).reviewRepository = originalReviewRepository;
        });

        it('해피패스: 메뉴를 포함한 카페 정보를 정상 조회하고, 리뷰는 최신순으로 상위 10개만 반환한다', async () => {
            const testCafeId = '1700801654';
            const [cafe, totalCount] = await service.getCafeDetail(testCafeId);

            // 1. 마스터 데이터의 연관 관계 메뉴 로딩 검증
            expect(cafe.menus).toBeDefined();
            expect(cafe.menus.length).toBeGreaterThan(0);

            const menuNames = cafe.menus.map(menu => menu.name);
            expect(menuNames).toContain('피스타치오');
            expect(menuNames).toContain('솔티드 카라멜');
            expect(menuNames).toContain('딸기크림');

            // 2. 리뷰 페이지네이션 및 최신순 정렬 검증 (기존 동일)
            expect(totalCount).toBeGreaterThanOrEqual(15);
            expect(cafe.reviews).toBeDefined();
            expect(cafe.reviews.length).toBeLessThanOrEqual(10);

            if (cafe.reviews.length > 1) {
                const firstReviewTime = new Date(cafe.reviews[0].createdAt).getTime();
                const secondReviewTime = new Date(cafe.reviews[1].createdAt).getTime();
                expect(firstReviewTime).toBeGreaterThanOrEqual(secondReviewTime);
            }

            // 3. enrich 로직 통과 검증
            expect(cafe).toHaveProperty('topKeywords');
        });
    });

    describe('createReview (물리적 Insert/Delete 기반 최적화)', () => {
        let testUserId: number;
        const testCafeId = '1700801654'; // 마스터 데이터 (봉땅 서울숲점)

        // beforeAll: describe 블록 진입 시 단 한 번만 물리적으로 유저 삽입
        beforeAll(async () => {
            const userResult = await dataSource.query(
                `INSERT INTO users (email, password, nickname, role) VALUES ($1, $2, $3, $4) RETURNING id`,
                ['create_physical_test@example.com', 'dummy_hash', 'physicalTester', 'USER']
            );
            testUserId = userResult[0].id;
        });

        // afterAll: 테스트 종료 후 물리적으로 유저 삭제
        // 팩트체크: DB 외래키 CASCADE 설정에 의해, 이 유저가 작성한 리뷰도 함께 증발하여 멱등성이 보장됨
        afterAll(async () => {
            if (dataSource && dataSource.isInitialized) {
                await dataSource.query(`DELETE FROM users WHERE id = $1`, [testUserId]);
            }
        });

        it('케이스 1: 존재하지 않는 유저 ID(FK 위반)로 리뷰 작성 시 DB 에러가 발생하며 BadRequestException으로 변환된다', async () => {
            const invalidUserId = 999999999;
            const createReviewDto = { reviewText: '유령 유저', coffeeBeverage: 1 };

            await expect(
                service.createReview(testCafeId, invalidUserId, createReviewDto as any)
            ).rejects.toThrow(new BadRequestException('유효하지 않은 참조입니다.'));
        });

        it('케이스 2: 유효한 유저와 카페 ID로 요청 시 리뷰가 정상적으로 생성 및 반환된다 (해피패스)', async () => {
            const createReviewDto = {
                reviewText: '분위기도 좋고 도넛도 맛있습니다.',
                atmosphereVibe: 1,
            };

            const savedReview = await service.createReview(testCafeId, testUserId, createReviewDto as any);

            expect(savedReview).toBeDefined();
            expect(savedReview.id).toEqual(expect.any(Number));
            expect(savedReview.userId).toBe(testUserId);
            expect(savedReview.reviewText).toBe(createReviewDto.reviewText);
        });
    });
});