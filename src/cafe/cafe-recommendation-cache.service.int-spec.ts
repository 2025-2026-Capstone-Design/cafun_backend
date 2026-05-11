import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CafeRecommendationCacheService } from './cafe-recommendation-cache.service';
import { Logger } from '@nestjs/common';

describe('CafeRecommendationCacheService (Integration)', () => {
  let service: CafeRecommendationCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        // 1. 환경 변수 로드
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
        }),
        
        // 2. DataSource 주입을 위한 DB 커넥션 설정
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
            autoLoadEntities: true, // 테스트 컨텍스트에서 엔티티 자동 로드
            synchronize: false,     // 마스터 데이터 보존을 위해 동기화 방지
          }),
        }),
      ],
      providers: [CafeRecommendationCacheService],
    })
    .setLogger(new Logger())
    .compile();

    service = module.get<CafeRecommendationCacheService>(CafeRecommendationCacheService);
  });

  afterAll(async () => {
    // [추가] 모듈을 종료하여 TypeORM DB 커넥션 풀 및 할당된 메모리 리소스 해제
    if (module) {
      await module.close();
    }
  });

  describe('loadDataIntoMemory', () => {
    it('해피패스: 마스터 데이터를 파싱하여 인메모리 구조(Float32Array, Map)에 올바른 크기와 타입으로 적재한다', async () => {
      // when
      await service.loadDataIntoMemory();

      // then
      const totalCafesLoaded = service.cafeMetadataMap.size;
      expect(totalCafesLoaded).toBeGreaterThan(0);
      expect(service.aspectVectors.length).toBe(totalCafesLoaded * 12);

      const sampleCafeId = Array.from(service.cafeMetadataMap.keys())[0];
      const sampleCafeMeta = service.cafeMetadataMap.get(sampleCafeId);

      expect(sampleCafeMeta).toBeDefined();
      expect(sampleCafeMeta).toEqual(
        expect.objectContaining({
          index: expect.any(Number),
          keywordCounts: expect.any(Object),
        })
      );

      const keywordCounts = sampleCafeMeta!.keywordCounts;
      for (const [key, value] of Object.entries(keywordCounts)) {
        expect(typeof key).toBe('string');
        expect(typeof value).toBe('number');
      }

      expect(sampleCafeMeta!.index % 12).toBe(0);
    });
  });
});