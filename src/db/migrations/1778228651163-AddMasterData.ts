import { MigrationInterface, QueryDeepPartialEntity, QueryRunner } from "typeorm";
import * as fs from 'fs';
import * as path from 'path';
import { Cafe } from "src/cafe/entities/cafe.entity";
import { Menu } from "src/cafe/entities/menu.entity";

export class AddMasterData1778228651163 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. JSON 디렉토리 절대 경로 설정 (안전한 process.cwd() 사용)
        // 프로젝트 최상단(root) 기준으로 data/cafe_info 폴더를 찾습니다.
        const dataDir = path.join(process.cwd(), 'data', 'cafe_info');
        
        // 경로가 실제로 존재하는지 검증
        if (!fs.existsSync(dataDir)) {
            console.warn(`[Warning] Data directory not found: ${dataDir}`);
            return;
        }

        const files = fs.readdirSync(dataDir).filter(file => file.endsWith('_info.json'));

        // 2. 타입 안정성이 보장된 배열 선언
        const cafes: QueryDeepPartialEntity<Cafe>[] = [];
        const menus: QueryDeepPartialEntity<Menu>[] = [];

        // 3. 파일 순회 및 데이터 파싱 (팩트체크 기반 보정 포함)
        for (const file of files) {
            const filePath = path.join(dataDir, file);
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(rawData);

            if (!data.id) {
                console.error(`[Error] Missing cafe ID in file: ${file}`);
                continue;
            }

            // 카페 데이터 매핑
            cafes.push({
                id: data.id,
                name: data.name || '불량카페',
                category: data.category || null,
                microReview: data.micro_review || null,
                roadAddress: data.road_address || null,
                address: data.address || null,
                lat: data.lon ? parseFloat(data.lon) : -1, // 위경도 보정 및 크롤링 실수 변환
                lon: data.lat ? parseFloat(data.lat) : -1,
                businessHours: data.business_hours || null,
                convenience: data.convenience || null,
                informationFacilitie: data.Information_facilitie || null,
                paymentInfo: data.payment_info || null,
                imageUrls: data.image_url || null,
                parkingInfo: data.parking_info || null,
                virtualPhoneNumber: data.virtual_phone_number || null,
                url: data.url || null,
                description: data.description || null
            });

            // 메뉴 데이터 매핑 (1:N 관계)
            if (data.menu && Array.isArray(data.menu)) {
                for (const item of data.menu) {
                    menus.push({
                        cafeId: data.id, // TypeORM 엔티티 속성명인 cafeId 사용
                        name: item.name,
                        price: parseInt(item.price, 10) || -1,
                        description: item.description || null,
                        images: item.images || []
                    });
                }
            }
        }

        // 4. 카페 데이터 삽입 (Batch 처리 - 파라미터 개수 제한 방지)
        // PostgreSQL의 쿼리당 파라미터 제한(65535개)을 고려하여 500개씩 분할 삽입합니다.
        const batchSize = 500;
        
        for (let i = 0; i < cafes.length; i += batchSize) {
            const batch = cafes.slice(i, i + batchSize);
            await queryRunner.manager.createQueryBuilder()
                .insert()
                .into(Cafe) // 문자열 대신 엔티티 클래스 주입 -> 메타데이터 기반 완벽 매핑
                .values(batch)
                .orIgnore() // 중복 데이터 삽입 무시 (ON CONFLICT DO NOTHING)
                .execute();  
        }

        // 5. 메뉴 데이터 삽입
        for (let i = 0; i < menus.length; i += batchSize) {
            const batch = menus.slice(i, i + batchSize);
            await queryRunner.manager.createQueryBuilder()
            .insert()
            .into(Menu)
            .values(batch)
            .execute();
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. 메뉴 테이블 초기화: 데이터 삭제 및 Auto Increment(Serial) ID를 1로 리셋
        // (주의: PostgreSQL에서 RESTART IDENTITY 옵션을 주어야 시퀀스가 초기화됩니다.)
        await queryRunner.query(`TRUNCATE TABLE menus RESTART IDENTITY;`);

        // 2. 카페 테이블 초기화: id가 varchar이므로 시퀀스 리셋이 필요 없음
        // (menus가 먼저 지워졌으므로 외래키(FK) 제약조건 충돌 없이 안전하게 삭제됨)
        await queryRunner.query(`DELETE FROM cafes;`);
    }

}
