import { Expose, Type } from 'class-transformer';
import { CafeBasicInfo } from './cafe-basic-info.fragment';
import { MenuInfo } from './menu-info.fragment';
import { ReviewListResponseDto } from './review.dto';
import { TopKeywordDto } from './top-keyword.dto';

export class CafeDetailResponseDto extends CafeBasicInfo {
  @Expose()
  microReview: string[];

  @Expose()
  address: string;

  @Expose()
  businessHours: Record<string, any>[];

  @Expose()
  convenience: string[];

  @Expose()
  informationFacilitie: string[];

  @Expose()
  paymentInfo: string[];

  @Expose()
  parkingInfo: Record<string, any> | string;

  @Expose()
  virtualPhoneNumber: string;

  @Expose()
  url: string;

  // 카페 엔티티와 1:N 관계로 조인된 메뉴 리스트 매핑
  @Expose()
  @Type(() => MenuInfo)
  menus: MenuInfo[];

  @Expose()
  @Type(() => ReviewListResponseDto)
  reviews: ReviewListResponseDto;

  @Expose()
  @Type(() => TopKeywordDto)
  topKeywords: TopKeywordDto[];

  @Expose()
  aspectVector: number[];
}