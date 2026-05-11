import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // 테스트에 사용할 고정 데이터
  const testUserEmail = 'login_e2e_test@example.com';
  const testUserPassword = 'Password123!';
  const testUserNickname = 'loginE2ETester';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get<DataSource>(DataSource);

    // 멱등성 및 환경 세팅: 로그인에 사용할 유저 데이터 사전 생성
    // 비밀번호 해싱 로직이 정상 적용되도록 실제 회원가입 API를 통해 적재
    await request(app.getHttpServer())
      .post('/users/register')
      .send({
        email: testUserEmail,
        password: testUserPassword,
        nickname: testUserNickname,
      });
  });

  afterAll(async () => {
    // 멱등성 보장: 테스트가 종료된 후 E2E 테스트로 생성된 데이터를 명시적으로 삭제 (Hard Delete)
    if (dataSource && dataSource.isInitialized) {
      await dataSource.query(`DELETE FROM users WHERE email = $1`, [testUserEmail]);
    }
    
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('성공 케이스: 유효한 자격 증명으로 로그인 시 accessToken과 id를 반환한다', async () => {
      // given: 로그인 요청 데이터
      const loginReqDto = {
        email: testUserEmail,
        password: testUserPassword,
      };

      // when: API 호출
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginReqDto);

      // then: 응답 검증
      expect(response.status).toBe(201);

      // 응답 바디 구조 및 데이터 검증 (LoginResDto 구조 일치 여부)
      expect(response.body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          id: expect.any(Number),
        }),
      );
    });
  });
});