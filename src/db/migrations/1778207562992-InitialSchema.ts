import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1778207562992 implements MigrationInterface {
    name = 'InitialSchema1778207562992'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "menus" ("id" SERIAL NOT NULL, "cafe_id" character varying NOT NULL, "name" character varying NOT NULL, "price" integer, "description" text, "images" jsonb, CONSTRAINT "PK_3fec3d93327f4538e0cbd4349c4" PRIMARY KEY ("id")); COMMENT ON COLUMN "menus"."images" IS '메뉴 이미지 URL 리스트'`);
        await queryRunner.query(`CREATE TABLE "cafe_metadata" ("cafe_id" character varying NOT NULL, "keyword_counts" jsonb NOT NULL, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4ace0a8ed2ed8d5e14201f28e49" PRIMARY KEY ("cafe_id")); COMMENT ON COLUMN "cafe_metadata"."cafe_id" IS '카페 ID (PK 겸 FK)'; COMMENT ON COLUMN "cafe_metadata"."keyword_counts" IS '리뷰 추출 키워드 개수'`);
        await queryRunner.query(`CREATE TABLE "cafe_aspect_vectors" ("cafe_id" character varying NOT NULL, "vector" double precision array NOT NULL, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c9dec5770546c1adcbbd585f60f" PRIMARY KEY ("cafe_id")); COMMENT ON COLUMN "cafe_aspect_vectors"."cafe_id" IS '카페 ID (PK 겸 FK)'; COMMENT ON COLUMN "cafe_aspect_vectors"."vector" IS '12차원 측면 기반 추천 벡터'`);
        await queryRunner.query(`CREATE TABLE "cafes" ("id" character varying NOT NULL, "name" character varying NOT NULL, "category" character varying, "micro_review" jsonb, "road_address" character varying, "address" character varying, "lat" numeric(11,8), "lon" numeric(11,8), "business_hours" jsonb, "convenience" jsonb, "information_facilitie" jsonb, "payment_info" jsonb, "image_urls" jsonb, "parking_info" jsonb, "virtual_phone_number" character varying, "url" character varying, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1e8e00a60bc4dd368d8d55a1d7e" PRIMARY KEY ("id")); COMMENT ON COLUMN "cafes"."id" IS '외부 데이터 ID'; COMMENT ON COLUMN "cafes"."micro_review" IS '짧은 리뷰 문구 리스트'; COMMENT ON COLUMN "cafes"."business_hours" IS '영업시간, 휴무일, 라스트오더 포함'; COMMENT ON COLUMN "cafes"."convenience" IS '편의시설 리스트'; COMMENT ON COLUMN "cafes"."information_facilitie" IS '시설정보 리스트'; COMMENT ON COLUMN "cafes"."payment_info" IS '결제 수단 리스트'; COMMENT ON COLUMN "cafes"."image_urls" IS '카페 대표 이미지 URL 리스트'; COMMENT ON COLUMN "cafes"."parking_info" IS '주차 정보 (객체 혹은 텍스트)'`);
        await queryRunner.query(`CREATE TABLE "reviews" ("id" SERIAL NOT NULL, "cafe_id" character varying NOT NULL, "user_id" integer NOT NULL, "review_text" text, "coffee_beverage" integer, "bakery_bread" integer, "cake" integer, "cookie_baked" integer, "bingsu_fruit" integer, "other_dessert" integer, "space_facility" integer, "atmosphere_vibe" integer, "service" integer, "price_value" integer, "gift_packaging" integer, "crowd_waiting" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "nickname" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'USER', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_ad02a1be8707004cb805a4b5023" UNIQUE ("nickname"), CONSTRAINT "CHK_cadc365769595bccee67d5c69d" CHECK ("role" IN ('USER', 'ADMIN')), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "menus" ADD CONSTRAINT "FK_75db0528b0beeb4388ac3046a02" FOREIGN KEY ("cafe_id") REFERENCES "cafes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cafe_metadata" ADD CONSTRAINT "FK_4ace0a8ed2ed8d5e14201f28e49" FOREIGN KEY ("cafe_id") REFERENCES "cafes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cafe_aspect_vectors" ADD CONSTRAINT "FK_c9dec5770546c1adcbbd585f60f" FOREIGN KEY ("cafe_id") REFERENCES "cafes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_85865803efbc05105cc0affd1e6" FOREIGN KEY ("cafe_id") REFERENCES "cafes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_85865803efbc05105cc0affd1e6"`);
        await queryRunner.query(`ALTER TABLE "cafe_aspect_vectors" DROP CONSTRAINT "FK_c9dec5770546c1adcbbd585f60f"`);
        await queryRunner.query(`ALTER TABLE "cafe_metadata" DROP CONSTRAINT "FK_4ace0a8ed2ed8d5e14201f28e49"`);
        await queryRunner.query(`ALTER TABLE "menus" DROP CONSTRAINT "FK_75db0528b0beeb4388ac3046a02"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "reviews"`);
        await queryRunner.query(`DROP TABLE "cafes"`);
        await queryRunner.query(`DROP TABLE "cafe_aspect_vectors"`);
        await queryRunner.query(`DROP TABLE "cafe_metadata"`);
        await queryRunner.query(`DROP TABLE "menus"`);
    }

}
