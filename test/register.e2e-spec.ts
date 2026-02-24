import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module'; // 실제 루트 모듈 경로에 맞게 수정 필요

describe('UserController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/users/register (POST)', () => {
    it('성공 케이스: 유효한 데이터로 회원가입 시 201 Created와 올바른 DTO를 반환한다', async () => {
      // given: 회원가입 요청 데이터
      const registerReqDto = {
        email: 'e2e_test@example.com',
        password: 'Password123!',
        nickname: 'e2eTester',
      };

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