import { IsInt, IsOptional, IsString, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Expose, Type } from 'class-transformer';

// 1. 공통 리뷰 Fragment (Base)
export class ReviewFragment {
    @Expose() // 응답 직렬화 시 포함
    @IsOptional()
    @IsString()
    reviewText?: string;
  
    // --- 1. 식음료 (Main Menu) ---
    @Expose()
    @IsOptional()
    @IsInt()
    @IsIn([1, 2, 3])
    coffeeBeverage?: number;
  
    @Expose()
    @IsOptional()
    @IsInt()
    @IsIn([1, 2, 3])
    bakeryBread?: number;
  
    @Expose()
    @IsOptional()
    @IsInt()
    @IsIn([1, 2, 3])
    cake?: number;
  
    @Expose()
    @IsOptional()
    @IsInt()
    @IsIn([1, 2, 3])
    cookieBaked?: number;
  
    @Expose()
    @IsOptional()
    @IsInt()
    @IsIn([1, 2, 3])
    bingsuFruit?: number;
  
    @Expose()
    @IsOptional()
    @IsInt()
    @IsIn([1, 2, 3])
    otherDessert?: number;
  
    // --- 2. 공간 및 경험 (Space & Experience) ---
    @Expose()
    @IsOptional()
    @IsInt()
    @IsIn([1, 2, 3])
    spaceFacility?: number;
  
    @Expose()
    @IsOptional()
    @IsInt()
    @IsIn([1, 2, 3])
    atmosphereVibe?: number;
  
    @Expose()
    @IsOptional()
    @IsInt()
    @IsIn([1, 2, 3])
    service?: number;
  
    // --- 3. 기타 정보 (Info & Value) ---
    @Expose()
    @IsOptional()
    @IsInt()
    @IsIn([1, 2, 3])
    priceValue?: number;
  
    @Expose()
    @IsOptional()
    @IsInt()
    @IsIn([1, 2, 3])
    giftPackaging?: number;
  
    @Expose()
    @IsOptional()
    @IsInt()
    @IsIn([1, 2, 3])
    crowdWaiting?: number;
  }
  
  // 2. Request DTO (리뷰 생성용)
  export class CreateReviewRequestDto extends ReviewFragment {
    // @Expose가 포함되어 있어도 입력(Validation) 단계에서는 무시되거나
    // ValidationPipe의 옵션에 따라 정상 동작하므로 구조 상속에 문제가 없습니다.
  }
  
  // 3. Response DTO (단일 리뷰 조회용)
  export class ReviewResponseDto extends ReviewFragment {
    @Expose() // 추가
    id: number;
  
    @Expose() // 추가
    cafeId: string;
  
    @Expose() // 추가
    userId: number;
  
    @Expose() // 추가
    createdAt: Date;
  }

// 4. List Response DTO (리뷰 리스트 조회용)
export class ReviewListResponseDto {
  @Expose()
  @Type(() => ReviewResponseDto)
  reviews: ReviewResponseDto[];

  @Expose()
  totalCount?: number; // undefined일 경우 응답에서 생략되거나 null 처리됨
}