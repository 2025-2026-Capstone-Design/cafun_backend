import { Expose, Transform } from 'class-transformer';

export class CafeBasicInfo {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  category!: string;

  @Expose()
  roadAddress!: string;

  @Expose()
  imageUrls!: string[];

  @Expose()
  description!: string;

  @Expose()
  @Transform(({ value }) => value != null ? parseFloat(value) : null)
  lat: number;

  @Expose()
  @Transform(({ value }) => value != null ? parseFloat(value) : null)
  lon: number;
}