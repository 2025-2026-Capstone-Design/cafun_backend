import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { RegisterReqDto } from './dtos/register.dto';
import * as bcrypt from 'bcrypt';
import { Review } from 'src/cafe/entities/review.entity';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Review) private reviewRepository: Repository<Review>,
    ) { }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { email } });
    }

    async getMyReviews(userId: number, page: number, limit: number): Promise<{ reviews: Review[]; totalCount: number }> {
        const [reviews, totalCount] = await this.reviewRepository.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { reviews, totalCount };
    }

    async checkEmailDuplicate(email: string): Promise<void> {
        const isExist = await this.userRepository.existsBy({ email });
        if (isExist) {
            throw new ConflictException('이미 사용 중인 이메일입니다.');
        }
    }

    async register(reqDto: RegisterReqDto): Promise<User> {
        const { email, password, nickname } = reqDto;

        await this.checkEmailDuplicate(email);
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 엔티티 인스턴스 생성
        const newUser = this.userRepository.create({
            email,
            password: hashedPassword,
            nickname,
            // role은 기본값 USER로 설정
        });

        // DB 저장 및 동시성 에러 처리
        try {
            return await this.userRepository.save(newUser);
        } catch (error) {
            // Race Condition에 의한 UNIQUE 제약조건 위반 방어 (MySQL 1062 / PostgreSQL 23505)
            if (error.code === '23505' || error.errno === 1062) {
                throw new ConflictException('이미 사용 중인 이메일입니다.');
            }
            throw new InternalServerErrorException('회원가입 처리 중 데이터베이스 오류가 발생했습니다.');
        }
    }
}
