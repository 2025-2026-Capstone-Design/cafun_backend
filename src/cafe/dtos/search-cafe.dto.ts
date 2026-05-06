import { Expose, Transform, Type } from 'class-transformer';
import { IsArray, ArrayMinSize, ArrayMaxSize, IsInt, Min, Max, IsOptional, IsString } from 'class-validator';
import { CafeBasicInfo } from './cafe-basic-info.fragment';
import { TopKeywordDto } from './top-keyword.dto';

export class SearchCafesRequestDto {
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(Number);
    return value;
  })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(1, { each: true })
  aspectVector: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class SearchCafesWithKeywordsRequestDto extends SearchCafesRequestDto {
  // URL 예시: ?keywords=아메리카노,조용한&aspectVector=1,0...
  @Transform(({ value }) => value.split(','))
  @IsArray()
  @IsString({ each: true })
  keywords: string[];
}

export class CafeSearchItemDto extends CafeBasicInfo {
  @Expose()
  @Type(() => TopKeywordDto)
  topKeywords: TopKeywordDto[];

  @Expose()
  aspectVector: number[];
}

export class SearchCafesResponseDto {
  @Expose()
  @Type(() => CafeSearchItemDto)
  cafes: CafeSearchItemDto[];

  @Expose()
  totalCount: number;

  @Expose()
  totalPages: number;
}