import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module'; // 실제 루트 모듈 경로에 맞게 수정 필요
import { DataSource } from 'typeorm';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // 테스트에 사용할 고정 데이터
  const testUserEmail = 'e2e_test@example.com';
  const registerReqDto = {
    email: testUserEmail,
    password: 'Password123!',
    nickname: 'e2eTester',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    // DB 정리를 위한 DataSource 추출
    dataSource = app.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    // 멱등성 보장: 테스트가 종료된 후 E2E 테스트로 생성된 데이터를 명시적으로 삭제 (Hard Delete)
    if (dataSource && dataSource.isInitialized) {
      await dataSource.query(`DELETE FROM users WHERE email = $1`, [testUserEmail]);
    }
    
    await app.close();
  });

  describe('/users/register (POST)', () => {
    it('성공 케이스: 유효한 데이터로 회원가입 시 201 Created와 올바른 DTO를 반환한다', async () => {
      // when: API 호출
      const response = await request(app.getHttpServer())
        .post('/users/register')
        .send(registerReqDto);

      // then: 응답 검증
      // 1. HTTP 상태 코드 검증 (201 Created)
      expect(response.status).toBe(201);

      // 2. 응답 바디 구조 및 데이터 검증
      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(Number),          // DB에서 자동 생성된 id가 존재하는지
          email: registerReqDto.email,
          nickname: registerReqDto.nickname,
          role: 'USER',                    // 기본 권한이 USER로 잘 들어갔는지
          createdAt: expect.any(String),   // ISO string 형태의 날짜가 존재하는지
        }),
      );

      // 3. 보안 검증: 컨트롤러의 plainToInstance가 정상 작동하여 password가 응답에서 배제되었는지 확인
      expect(response.body.password).toBeUndefined();
    });
  });
});