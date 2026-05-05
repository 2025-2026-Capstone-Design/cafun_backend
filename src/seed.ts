import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.development') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/cafe/entities/*.entity{.ts,.js}', __dirname + '/user/entities/*.entity{.ts,.js}'],
  synchronize: true,
});

async function seed() {
  await dataSource.initialize();
  console.log('DB 연결 완료, 테이블 동기화 중...');

  const scoresPath = path.join(__dirname, 'cafe_scores.json');
  const scores: Record<string, (number | null)[]> = JSON.parse(fs.readFileSync(scoresPath, 'utf-8'));
  const cafeIds = Object.keys(scores);
  console.log(`총 ${cafeIds.length}개 카페 처리 시작\n`);

  let success = 0;
  let skip = 0;

  for (const cafeId of cafeIds) {
    const infoPath = path.join(__dirname, 'cafe_info', `${cafeId}_info.json`);
    if (!fs.existsSync(infoPath)) {
      console.warn(`[SKIP] info 없음: ${cafeId}`);
      skip++;
      continue;
    }
    const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
    if (!info.name) {
      console.warn(`[SKIP] name 없음: ${cafeId}`);
      skip++;
      continue;
    }

    // keywords - convenience 객체 및 숫자 아닌 값 제거
    const keywordsPath = path.join(__dirname, 'cafe_keywords', `${cafeId}_keywords.json`);
    let keywordCounts: Record<string, number> = {};
    if (fs.existsSync(keywordsPath)) {
      const raw = JSON.parse(fs.readFileSync(keywordsPath, 'utf-8'));
      keywordCounts = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => typeof v === 'number'),
      ) as Record<string, number>;
    }

    // 1. cafes
    await dataSource.query(
      `INSERT INTO cafes (id, name, category, micro_review, road_address, address, lat, lon,
         business_hours, convenience, information_facilitie, payment_info, image_urls,
         parking_info, virtual_phone_number, url, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (id) DO NOTHING`,
      [
        cafeId,
        info.name,
        info.category ?? null,
        JSON.stringify(info.micro_review ?? []),
        info.road_address ?? null,
        info.address ?? null,
        info.lat ? parseFloat(info.lat) : null,
        info.lon ? parseFloat(info.lon) : null,
        JSON.stringify(info.business_hours ?? []),
        JSON.stringify(info.convenience ?? {}),
        JSON.stringify(info.Information_facilitie ?? []),
        JSON.stringify(info.payment_info ?? []),
        JSON.stringify(info.image_url ?? []),
        info.parking_info ? JSON.stringify(info.parking_info) : null,
        info.virtual_phone_number ?? null,
        info.url ?? null,
        info.description ?? null,
      ],
    );

    // 2. menus
    for (const menu of info.menu ?? []) {
      await dataSource.query(
        `INSERT INTO menus (cafe_id, name, price, description, images) VALUES ($1,$2,$3,$4,$5)`,
        [
          cafeId,
          menu.name,
          menu.price ? parseInt(menu.price) : null,
          menu.description ?? null,
          JSON.stringify(menu.images ?? []),
        ],
      );
    }

    // 3. cafe_aspect_vectors — null은 0으로 처리
    const vector = scores[cafeId].map(v => (v !== null && v !== undefined ? v : 0));
    const vectorLiteral = `{${vector.join(',')}}`;
    await dataSource.query(
      `INSERT INTO cafe_aspect_vectors (cafe_id, vector) VALUES ($1, $2::float[])
       ON CONFLICT (cafe_id) DO NOTHING`,
      [cafeId, vectorLiteral],
    );

    // 4. cafe_metadata
    await dataSource.query(
      `INSERT INTO cafe_metadata (cafe_id, keyword_counts) VALUES ($1, $2)
       ON CONFLICT (cafe_id) DO NOTHING`,
      [cafeId, JSON.stringify(keywordCounts)],
    );

    console.log(`[OK] ${cafeId} - ${info.name}`);
    success++;
  }

  await dataSource.destroy();
  console.log(`\n시딩 완료: ${success}개 성공, ${skip}개 스킵`);
}

seed().catch(err => {
  console.error('시딩 실패:', err);
  process.exit(1);
});
