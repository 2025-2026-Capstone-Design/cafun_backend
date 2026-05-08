import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import * as path from 'path';
/*
차후 프로젝트 구조 수정시 app module의 typeorm module과 통합 필요성 있음
또한 마이그레이션 로직이 우선은 단순하니 검증 로직 생략
*/
const envPath = process.env.NODE_ENV 
  ? `.env.${process.env.NODE_ENV}` 
  : '.env';

dotenv.config({ path: path.resolve(process.cwd(), envPath) });

console.log(`Current Environment: ${process.env.NODE_ENV}`);

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'my_database',
    
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: true,
});