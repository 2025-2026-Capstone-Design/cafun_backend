import {
    Entity,
    PrimaryColumn,
    Column,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { Cafe } from './cafe.entity';

@Entity('cafe_metadata')
export class CafeMetadata {
    @PrimaryColumn({ name: 'cafe_id', type: 'varchar', comment: '카페 ID (PK 겸 FK)' })
    cafeId: string;

    @Column({ name: 'keyword_counts', type: 'jsonb', comment: '리뷰 추출 키워드 개수' })
    keywordCounts: Record<string, number>;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;

    // 1:1 관계 설정 (소유측: 외래키를 가지는 쪽)
    @OneToOne(() => Cafe, (cafe) => cafe.cafeMetadata, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cafe_id' })
    cafe: Cafe;
}