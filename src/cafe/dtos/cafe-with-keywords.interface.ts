import { Cafe } from '../entities/cafe.entity';

export interface TopKeyword {
    keyword: string;
    count: number;
}

export interface CafeWithTopKeywords extends Cafe {
    topKeywords: TopKeyword[];
}