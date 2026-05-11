import { MigrationInterface, QueryRunner } from "typeorm";

export class LowerPgTrgmThreshold1778477847513 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const dbName = queryRunner.connection.options.database;
        // word_similarity_threshold (%> 연산자 기준): 기본값 0.6 -> 0.3으로 하향
        await queryRunner.query(`ALTER DATABASE ${dbName} SET pg_trgm.word_similarity_threshold = 0.3;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const dbName = queryRunner.connection.options.database;
        await queryRunner.query(`ALTER DATABASE ${dbName} SET pg_trgm.word_similarity_threshold = 0.6;`);
    }

}
