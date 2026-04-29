import {
    Entity,
    PrimaryColumn,
    Column,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
  } from 'typeorm';
  import { Cafe } from './cafe.entity';
  
  @Entity('cafe_aspect_vectors')
  export class CafeAspectVector {
    @PrimaryColumn({ name: 'cafe_id', type: 'varchar', comment: '카페 ID (PK 겸 FK)' })
    cafeId: string;
  
    // PostgreSQL 기본 배열 타입을 사용합니다. (만약 DB에 pgvector를 설치했다면 type: 'vector'로 변경)
    @Column({ type: 'float', array: true, comment: '12차원 측면 기반 추천 벡터' })
    vector: number[];
  
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
  
    // 부모 엔티티와의 관계 설정 및 제약조건 추가
    @OneToOne(() => Cafe, (cafe) => cafe.cafeAspectVector, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'cafe_id' })
    cafe: Cafe;
  }