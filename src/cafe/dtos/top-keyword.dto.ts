import { Expose } from 'class-transformer';

export class TopKeywordDto {
  @Expose()
  keyword: string;

  @Expose()
  count: number;
}