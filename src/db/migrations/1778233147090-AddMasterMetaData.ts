import { MigrationInterface, QueryDeepPartialEntity, QueryRunner } from "typeorm";
import * as path from 'path';
import * as fs from 'fs';
import { CafeAspectVector } from "src/cafe/entities/cafe-aspect-vector.entity";
import { CafeMetadata } from "src/cafe/entities/cafe-metadata.entity";

export class AddMasterMetaData1778233147090 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const batchSize = 500;
        // =========================================================
        // 1. 카페 측면 벡터 (Cafe Aspect Vectors) 데이터 적재
        // =========================================================
        const scoresFilePath = path.join(process.cwd(), 'data', 'cafe_scores.json');
        if (!fs.existsSync(scoresFilePath)) {
            console.warn(`[Warning] Scores file not found: ${scoresFilePath}`);
            return;
        }
        const scoresRawData = fs.readFileSync(scoresFilePath, 'utf-8');
        const scoresData: Record<string, number[]> = JSON.parse(scoresRawData);

        const aspectVectors: QueryDeepPartialEntity<CafeAspectVector>[] = [];

        // JSON 객체의 Key(cafe_id)와 Value(vector 배열)를 순회
        for (const [cafeId, vector] of Object.entries(scoresData)) {
            aspectVectors.push({
                cafeId: cafeId, // 엔티티 변수명 매핑
                vector: vector
            });
        }

        // 벡터 데이터 Batch Insert
        for (let i = 0; i < aspectVectors.length; i += batchSize) {
            const batch = aspectVectors.slice(i, i + batchSize);
            await queryRunner.manager.createQueryBuilder()
                .insert()
                .into(CafeAspectVector)
                .values(batch)
                .orIgnore() // 이미 존재하는 데이터 건너뛰기
                .execute();
        }
        console.log(`✅ 벡터 데이터 삽입 완료: 총 ${aspectVectors.length}건`);

        // =========================================================
        // 2. 카페 메타데이터 (Cafe Metadata - 키워드 카운트) 데이터 적재
        // =========================================================
        const keywordsDir = path.join(process.cwd(), 'data', 'cafe_keywords');
        if (!fs.existsSync(keywordsDir)) {
            console.warn(`[Warning] Keywords directory not found: ${keywordsDir}`);
            return;
        }
        const files = fs.readdirSync(keywordsDir).filter(file => file.endsWith('_keywords.json'));
        const metadataList: QueryDeepPartialEntity<CafeMetadata>[] = [];

        for (const file of files) {
            // 파일명에서 cafe_id 추출 (예: '12345_keywords.json' -> '12345')
            const cafeId = file.replace('_keywords.json', '');

            const filePath = path.join(keywordsDir, file);
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const parsedData = JSON.parse(rawData);

            const cleanKeywordCounts: Record<string, number> = {};
            for (const [key, value] of Object.entries(parsedData)) {
                // 값이 숫자인 경우에만 순수 키워드 카운트로 인정하여 저장
                if (typeof value === 'number') {
                    cleanKeywordCounts[key] = value;
                }
            }

            metadataList.push({
                cafeId: cafeId,
                keywordCounts: cleanKeywordCounts
            });
        }

        // 메타데이터 Batch Insert
        for (let i = 0; i < metadataList.length; i += batchSize) {
            const batch = metadataList.slice(i, i + batchSize);
            await queryRunner.manager.createQueryBuilder()
                .insert()
                .into(CafeMetadata)
                .values(batch)
                .orIgnore()
                .execute();
        }
        console.log(`✅ 메타데이터 삽입 완료: 총 ${metadataList.length}건`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM cafe_aspect_vectors;`);
        await queryRunner.query(`DELETE FROM cafe_metadata;`);
    }

}
