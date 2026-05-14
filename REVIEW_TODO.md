# 리뷰 기능 연결 TODO

> 기준일: 2026-05-14  
> 백엔드 배포 경로: EC2 (`secrets.EC2_HOST`:3000)  
> 관련 파일: `cafe_front/my-app/app/review/write/page.tsx`, `cafe_front/my-app/lib/api.ts`

---

## 🔴 필수 (연결 안 되면 동작 자체가 안 됨)

### 1. 리뷰 작성 API 실제 호출 미연결
- **파일**: `app/review/write/page.tsx` → `handleSubmit`
- **현재**: mock (1초 딜레이 후 리다이렉트만)
- **필요**: `postReview(cafeId, data, token)` 실제 호출로 교체
- **참고**: `lib/api.ts`에 함수는 이미 구현되어 있음

### 2. JWT 토큰 주입
- **파일**: `app/review/write/page.tsx`
- **현재**: token을 어디서도 가져오지 않음
- **필요**: 로그인 상태에서 저장된 JWT 토큰을 꺼내 `postReview()` 세 번째 인자로 전달
- **필요**: 비로그인 상태면 로그인 페이지로 리다이렉트 처리

### 3. aspect 값 변환 로직
- **파일**: `app/review/write/page.tsx` → `handleSubmit`
- **현재**: `"positive" | "negative" | "neutral" | null` 그대로 전송
- **필요**: 백엔드는 `@IsIn([1, 2, 3])` 정수만 허용
  ```
  "positive" → 1
  "neutral"  → 2
  "negative" → 3
  null       → undefined (전송 제외)
  ```

---

## 🟡 수정 필요 (보내도 에러 나거나 데이터 깨짐)

### 4. overall 별점(1~5) 처리 방식 결정
- **현재**: 프론트 overall rating 1~5 수집 중
- **문제**: 백엔드 Review entity에 overall rating 필드 없음
- **선택지**:
  - A. 백엔드에 `overall_rating` 컬럼 추가 + DTO/마이그레이션 작업
  - B. overall rating을 `reviewText` 앞에 텍스트로 포함시켜 우회

### 5. userId 타입 불일치
- **파일**: `lib/api.ts` → `ApiReview` 인터페이스
- **현재**: `userId: string`
- **백엔드**: `user_id` int 타입
- **필요**: `userId: number`로 수정

---

## 🟢 나중에 (기능은 되지만 미완성)

### 6. 이미지 업로드 미구현
- **현재**: 프론트 form에 사진 업로드 UI 있음 (최대 5장)
- **문제**: 백엔드 Review entity에 이미지 필드 없음 → 저장 불가
- **필요**: S3 or 로컬 스토리지 연동 + `image_urls` 컬럼 추가

### 7. 리뷰 목록 빈 배열 처리
- **파일**: `components/cafe-detail/CafeDetailReviews.tsx`
- **현재**: 리뷰 없으면 mock 데이터로 폴백
- **필요**: "아직 리뷰가 없습니다" 빈 상태 UI로 교체

---

## 체크리스트

- [ ] `handleSubmit`에 `postReview()` 실제 호출 추가
- [ ] JWT 토큰 주입 + 비로그인 리다이렉트
- [ ] aspect `"positive"/"negative"/"neutral"` → `1/2/3` 변환
- [ ] overall rating 처리 방식 결정 및 구현
- [ ] `ApiReview.userId` 타입 `string` → `number`
- [ ] 이미지 업로드 백엔드 연동
- [ ] 빈 리뷰 목록 UI 처리
