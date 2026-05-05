import { Injectable } from '@nestjs/common';
import { AiRecommendationPort } from './ai-recommendation.port';
import { CafeRecommendationCacheService } from './cafe-recommendation-cache.service';

const DIMENSION = 12;

@Injectable()
export class LocalAiRecommendationAdapter implements AiRecommendationPort {
  constructor(private readonly cacheService: CafeRecommendationCacheService) {}

  async getRecommendedCafeIds(aspectVector: number[]): Promise<string[]> {
    const results: { cafeId: string; score: number }[] = [];
    const vectors = this.cacheService.aspectVectors;

    for (const [cafeId, metadata] of this.cacheService.cafeMetadataMap) {
      let score = 0;
      const { index } = metadata;

      for (let d = 0; d < DIMENSION; d++) {
        if (aspectVector[d] === 1) {
          score += vectors[index + d];
        }
      }

      if (score > 0) {
        results.push({ cafeId, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .map((r) => r.cafeId);
  }

  async getRecommendedCafeIdsWithKeywords(
    aspectVector: number[],
    keywords: string[],
  ): Promise<string[]> {
    const results: { cafeId: string; keywordScore: number; aspectScore: number }[] = [];
    const vectors = this.cacheService.aspectVectors;

    for (const [cafeId, metadata] of this.cacheService.cafeMetadataMap) {
      const { index, keywordCounts } = metadata;

      let keywordScore = 0;
      for (const keyword of keywords) {
        const count = keywordCounts[keyword];
        if (count) {
          keywordScore += Math.log1p(count) * 0.5;
        }
      }

      let aspectScore = 0;
      for (let d = 0; d < DIMENSION; d++) {
        if (aspectVector[d] === 1) {
          aspectScore += vectors[index + d];
        }
      }

      const totalScore = keywordScore + aspectScore;
      if (totalScore > 0) {
        results.push({ cafeId, keywordScore, aspectScore });
      }
    }

    // 키워드 점수 우선, 동점 시 측면 점수로 결정
    return results
      .sort((a, b) =>
        b.keywordScore !== a.keywordScore
          ? b.keywordScore - a.keywordScore
          : b.aspectScore - a.aspectScore,
      )
      .map((r) => r.cafeId);
  }
}
