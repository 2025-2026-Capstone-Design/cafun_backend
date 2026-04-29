import { Module } from '@nestjs/common';
import { CafeController } from './cafe.controller';
import { CafeService } from './cafe.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cafe } from './entities/cafe.entity';
import { Menu } from './entities/menu.entity';
import { AI_RECOMMENDATION_PORT } from './ai-recommendation.port';
import { MockAiRecommendationAdapter } from './mock-ai-recommendation.adapter';
import { Review } from './entities/review.entity';
import { CafeRecommendationCacheService } from './cafe-recommendation-cache.service.ts';
import { CafeAspectVector } from './entities/cafe-aspect-vector.entity';
import { CafeMetadata } from './entities/cafe-metadata.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cafe, Menu, Review, CafeAspectVector, CafeMetadata])],
  controllers: [CafeController],
  providers: [CafeService, {
    provide: AI_RECOMMENDATION_PORT,
    useClass: MockAiRecommendationAdapter,
  },
  CafeRecommendationCacheService,
]
})
export class CafeModule {}
