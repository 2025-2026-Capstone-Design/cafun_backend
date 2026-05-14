import { Injectable } from '@nestjs/common';
import { AiRecommendationPort } from './ai-recommendation.port';

@Injectable()
export class MockAiRecommendationAdapter implements AiRecommendationPort {
  async getRecommendedCafeIds(aspectVector: number[]): Promise<string[]> {
    return ['cafe_id_1', 'cafe_id_2', 'cafe_id_3'];
  }
  async getRecommendedCafeIdsWithKeywords(aspectVector: number[], keywords: string[], conveniences: string[]): Promise<string[]> {
    return ['cafe_id_1', 'cafe_id_2', 'cafe_id_3'];
  }
}