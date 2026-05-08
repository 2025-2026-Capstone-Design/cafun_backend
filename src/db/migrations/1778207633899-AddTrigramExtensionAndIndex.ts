import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTrigramExtensionAndIndex1778207633899 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. pg_trgm 확장 모듈 설치 (DB 당 1회만 필요)
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

        // 2. 카페 이름 컬럼에 GIN 인덱스 생성 (유사도 연산 가속화)
        await queryRunner.query(`
            CREATE INDEX idx_cafes_name_trgm 
            ON cafes USING GIN (name gin_trgm_ops);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 롤백 시 인덱스와 확장 모듈 제거
        await queryRunner.query(`DROP INDEX IF EXISTS idx_cafes_name_trgm;`);
        await queryRunner.query(`DROP EXTENSION IF EXISTS pg_trgm;`);
    }

}
