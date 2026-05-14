export const AI_RECOMMENDATION_PORT = Symbol('AI_RECOMMENDATION_PORT');

export interface AiRecommendationPort {
  /**
   * 12차원 측면 벡터를 받아 추천하는 카페의 ID 리스트를 반환합니다.
   */
  getRecommendedCafeIds(aspectVector: number[]): Promise<string[]>;
  /**
   * 12차원 측면 벡터와 세부 키워드 리스트를 받아 통합 스코어링된 카페의 ID 리스트를 반환합니다.
   */
  getRecommendedCafeIdsWithKeywords(aspectVector: number[], keywords: string[], conveniences: string[]): Promise<string[]>;
}