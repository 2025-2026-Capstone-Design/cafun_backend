import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Menu } from './menu.entity';
import { CafeMetadata } from './cafe-metadata.entity';
import { Review } from './review.entity';
import { CafeAspectVector } from './cafe-aspect-vector.entity';

@Entity('cafes')
export class Cafe {
  @PrimaryColumn({ type: 'varchar', comment: '외부 데이터 ID' })
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  category: string;

  @Column({ name: 'micro_review', type: 'jsonb', nullable: true, comment: '짧은 리뷰 문구 리스트' })
  microReview: string[];

  @Column({ name: 'road_address', type: 'varchar', nullable: true })
  roadAddress: string;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  lon: number;

  @Column({ name: 'business_hours', type: 'jsonb', nullable: true, comment: '영업시간, 휴무일, 라스트오더 포함' })
  businessHours: Record<string, any>[];

  @Column({ type: 'jsonb', nullable: true, comment: '편의시설 리스트' })
  convenience: string[];

  @Column({ name: 'information_facilitie', type: 'jsonb', nullable: true, comment: '시설정보 리스트' })
  informationFacilitie: string[];

  @Column({ name: 'payment_info', type: 'jsonb', nullable: true, comment: '결제 수단 리스트' })
  paymentInfo: string[];

  @Column({ name: 'image_urls', type: 'jsonb', nullable: true, comment: '카페 대표 이미지 URL 리스트' })
  imageUrls: string[];

  @Column({ name: 'parking_info', type: 'jsonb', nullable: true, comment: '주차 정보 (객체 혹은 텍스트)' })
  parkingInfo: Record<string, any>;

  @Column({ name: 'virtual_phone_number', type: 'varchar', nullable: true })
  virtualPhoneNumber: string;

  @Column({ type: 'varchar', nullable: true })
  url: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => Menu, (menu) => menu.cafe, { cascade: true })
  menus: Menu[];

  // 카페 메타데이터 (1:1 양방향)
  @OneToOne(() => CafeMetadata, (cafeMetadata) => cafeMetadata.cafe)
  cafeMetadata: CafeMetadata;

  // 카페 측면 벡터 (1:1 양방향)
  @OneToOne(() => CafeAspectVector, (cafeAspectVector) => cafeAspectVector.cafe)
  cafeAspectVector: CafeAspectVector;

  // 리뷰 (1:N 양방향)
  @OneToMany(() => Review, (review) => review.cafe)
  reviews: Review[];
}