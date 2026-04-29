import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Cafe } from './cafe.entity';
import { User } from '../../user/entities/user.entity';

@Entity('reviews')
export class Review {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'cafe_id', type: 'varchar' })
    cafeId: string;

    @Column({ name: 'user_id', type: 'int' })
    userId: number;

    @Column({ name: 'review_text', type: 'text', nullable: true })
    reviewText: string;

    // --- 1. 식음료 (Main Menu) ---
    @Column({ name: 'coffee_beverage', type: 'int', nullable: true })
    coffeeBeverage: number;

    @Column({ name: 'bakery_bread', type: 'int', nullable: true })
    bakeryBread: number;

    @Column({ type: 'int', nullable: true })
    cake: number;

    @Column({ name: 'cookie_baked', type: 'int', nullable: true })
    cookieBaked: number;

    @Column({ name: 'bingsu_fruit', type: 'int', nullable: true })
    bingsuFruit: number;

    @Column({ name: 'other_dessert', type: 'int', nullable: true })
    otherDessert: number;

    // --- 2. 공간 및 경험 (Space & Experience) ---
    @Column({ name: 'space_facility', type: 'int', nullable: true })
    spaceFacility: number;

    @Column({ name: 'atmosphere_vibe', type: 'int', nullable: true })
    atmosphereVibe: number;

    @Column({ type: 'int', nullable: true })
    service: number;

    // --- 3. 기타 정보 (Info & Value) ---
    @Column({ name: 'price_value', type: 'int', nullable: true })
    priceValue: number;

    @Column({ name: 'gift_packaging', type: 'int', nullable: true })
    giftPackaging: number;

    @Column({ name: 'crowd_waiting', type: 'int', nullable: true })
    crowdWaiting: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    // --- 관계 매핑 (Relations) ---
    @ManyToOne(() => Cafe, (cafe) => cafe.reviews, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cafe_id' })
    cafe: Cafe;

    @ManyToOne(() => User, (user) => user.reviews, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}