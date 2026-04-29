import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { Cafe } from './cafe.entity';
  
  @Entity('menus')
  export class Menu {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ name: 'cafe_id', type: 'varchar' })
    cafeId: string;
  
    @Column({ type: 'varchar' })
    name: string;
  
    @Column({ type: 'integer', nullable: true })
    price: number;
  
    @Column({ type: 'text', nullable: true })
    description: string;
  
    @Column({ type: 'jsonb', nullable: true, comment: '메뉴 이미지 URL 리스트' })
    images: string[];
  
    @ManyToOne(() => Cafe, (cafe) => cafe.menus, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cafe_id' })
    cafe: Cafe;
  }