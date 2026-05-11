import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

// Raw Query 결과를 매핑할 인터페이스 정의
interface RawCafeVectorData {
  cafe_id: string;
  vector: number[];
  keyword_counts: Record<string, number> | null;
}

// Map에 저장할 카페별 메타데이터 인터페이스
export interface CafeCacheMetadata {
  index: number; // Float32Array 내 해당 카페 벡터의 시작 인덱스
  keywordCounts: Record<string, number>;
}

@Injectable()
export class CafeRecommendationCacheService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CafeRecommendationCacheService.name);
  
  // 측면 벡터의 차원 수 (고정값 12)
  private readonly DIMENSION = 12;

  // 인메모리 저장소
  public aspectVectors: Float32Array;
  public cafeMetadataMap: Map<string, CafeCacheMetadata>;

  constructor(private readonly dataSource: DataSource) {
    this.aspectVectors = new Float32Array(0);
    this.cafeMetadataMap = new Map();
  }

  // NestJS 애플리케이션 시작 시 자동으로 호출되는 훅
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.loadDataIntoMemory();
    } catch (error) {
      this.logger.error('인메모리 캐시 적재 중 오류가 발생했습니다.', error);
      // 필수 데이터이므로 로드 실패 시 애플리케이션 실행을 중단할지 여부 결정 필요
      throw error; 
    }
  }

  /**
   * DB에서 데이터를 읽어와 인메모리 자료구조에 적재합니다.
   */
  public async loadDataIntoMemory(): Promise<void> {
    this.logger.log('DB에서 카페 벡터 및 메타데이터 조회 시작...');

    const startTime = performance.now();

    // 1. 엔티티 객체 생성 오버헤드를 막기 위한 Raw Query 실행
    // LEFT JOIN을 사용하여 메타데이터가 없는 카페도 벡터 연산에는 포함되도록 보장
    const rawData: RawCafeVectorData[] = await this.dataSource.query(`
      SELECT 
        v.cafe_id, 
        v.vector, 
        m.keyword_counts 
      FROM cafe_aspect_vectors v
      LEFT JOIN cafe_metadata m ON v.cafe_id = m.cafe_id
    `);

    const numCafes = rawData.length;
    if (numCafes === 0) {
      this.logger.warn('조회된 카페 벡터 데이터가 없습니다.');
    }

    const inMemorytTime = performance.now();

    // 2. 1차원 Float32Array 메모리 할당 (카페 수 * 12차원)
    this.aspectVectors = new Float32Array(numCafes * this.DIMENSION);
    
    // 이전 데이터 초기화 (재적재를 대비)
    this.cafeMetadataMap.clear();

    // 3. 데이터 파싱 및 맵핑
    for (let i = 0; i < numCafes; i++) {
      const row = rawData[i];
      const cafeId = row.cafe_id;
      const startIndex = i * this.DIMENSION;

      // 3-1. Float32Array에 12차원 벡터 값 할당
      const vector = row.vector;
      for (let d = 0; d < this.DIMENSION; d++) {
        // pg 드라이버 버전에 따라 string으로 넘어올 수 있으므로 명시적 Number 캐스팅 권장
        this.aspectVectors[startIndex + d] = Number(vector[d]) || 0;
      }

      // 3-2. Map에 메타데이터 할당
      this.cafeMetadataMap.set(cafeId, {
        index: startIndex,
        keywordCounts: row.keyword_counts || {},
      });
    }

    const endTime = performance.now();
    this.logger.log(
      `인메모리 적재 완료: 총 ${numCafes}개 데이터 처리 (${(endTime - startTime).toFixed(2)}ms 소요)`
    );
    this.logger.log(
      `데이터 파싱 소요 시간: ${(endTime - inMemorytTime).toFixed(2)}ms`
    );
  }
}