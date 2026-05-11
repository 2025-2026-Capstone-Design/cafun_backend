import { Module } from '@nestjs/common';
import { CafeController } from './cafe.controller';
import { CafeService } from './cafe.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cafe } from './entities/cafe.entity';
import { Menu } from './entities/menu.entity';
import { AI_RECOMMENDATION_PORT } from './ai-recommendation.port';
import { LocalAiRecommendationAdapter } from './local-ai-recommendation.adapter';
import { Review } from './entities/review.entity';
import { CafeRecommendationCacheService } from './cafe-recommendation-cache.service';
import { CafeAspectVector } from './entities/cafe-aspect-vector.entity';
import { CafeMetadata } from './entities/cafe-metadata.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cafe, Menu, Review, CafeAspectVector, CafeMetadata]),
    AuthModule,
  ],
  controllers: [CafeController],
  providers: [CafeService, {
    provide: AI_RECOMMENDATION_PORT,
    useClass: LocalAiRecommendationAdapter,
  },
  CafeRecommendationCacheService,
]
})
export class CafeModule {}
