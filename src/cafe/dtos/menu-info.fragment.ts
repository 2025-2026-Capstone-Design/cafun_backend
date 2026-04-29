import { Expose } from 'class-transformer';

export class MenuInfo {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  price: number;

  @Expose()
  description: string;

  @Expose()
  images: string[];
}