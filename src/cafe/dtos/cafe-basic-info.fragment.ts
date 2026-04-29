import { Expose } from 'class-transformer';

export class CafeBasicInfo {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  category: string;

  @Expose()
  roadAddress: string;

  @Expose()
  imageUrls: string[];

  @Expose()
  description: string;
}