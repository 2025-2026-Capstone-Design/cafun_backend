import { Expose, Transform, Type } from 'class-transformer';
import { IsArray, ArrayMinSize, ArrayMaxSize, IsInt, Min, Max, IsOptional, IsString, IsNotEmpty, IsNumber } from 'class-validator';
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
  @Transform(({ value }) => {
    if (!value) return [];
    if (typeof value === 'string') return value.split(',').map((s: string) => s.trim()).filter(Boolean);
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  conveniences?: string[] = [];

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

export class SearchCafesByNameRequestDto {
  // 검색할 카페 이름 (예: '스타벅스', '타벅', '스타벙스')
  @IsString()
  @IsNotEmpty({ message: '검색할 카페 이름을 입력해주세요.' })
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
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