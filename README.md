# Nintendo Switch 게임 데이터베이스 수집기

IGDB API에서 Nintendo Switch 게임 정보를 수집하여 CSV로 저장합니다.

## 빠른 시작

### 1. 설치
```bash
npm install
```

### 2. 설정
`.env` 파일 생성:
```
IGDB_CLIENT_ID=your_client_id_here
IGDB_CLIENT_SECRET=your_client_secret_here
```

### 3. 실행
```bash
npm start
```

## 출력 데이터

CSV 파일에 다음 정보가 포함됩니다:
- 게임명
- 지원 플랫폼
- 전체 첫 발매일 / 스위치 발매일
- 한글화 여부 (음성/자막/인터페이스)
- 포팅/리마스터 여부
- PC 지원 여부

약 25,000개 게임 수집 (3-5분 소요)