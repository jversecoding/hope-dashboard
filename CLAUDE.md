# HOPE 대시보드 — 프로젝트 메모

나홍진 감독 영화 '호프(HOPE)' 실시간 박스오피스 대시보드. ATU Partners 투자자용.
전체 사용법/API 발급/배포 방법은 README.md 참고. 이 파일은 코드만 봐서는 안 보이는
운영상의 함정과 결정 배경만 기록한다.

## 배포 링크

- GitHub(퍼블릭): https://github.com/jversecoding/hope-dashboard
- Vercel(프로덕션): https://hope-dashboard-gamma.vercel.app

## 아키텍처 핵심

- `index.html` 하나로 전체 UI/CSS/JS. 빌드 도구 없음.
- `server.js`는 **로컬 실행 전용**이다. Vercel 배포에는 포함되지 않는다(`.vercelignore`).
- `lib/proxy-core.js`가 KOBIS/네이버 호출 로직의 단일 진실 소스. `server.js`와
  `api/*.js`(Vercel 서버리스 함수)가 이 파일을 그대로 `require`해서 쓴다.
  로직을 고치면 반드시 이 파일만 고치면 되고, 두 곳에 중복 반영할 필요 없다.
- API 키(KOBIS_API_KEY, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET)는 **환경변수로만** 존재한다.
  `index.html`/`server.js`/`api/*.js` 어디에도 절대 하드코딩하지 말 것 — 이 저장소는 퍼블릭이다.
  로컬은 `.env`(gitignore됨), 배포는 Vercel 프로젝트 환경변수.

## 겪었던 함정 (재발 방지용)

1. **Vercel이 `server.js`를 앱 엔트리포인트로 오인함.** 처음 배포 시 `server.js`가
   있다는 이유만으로 프레임워크를 "Node 서버"로 자동 감지해 `index.html` 정적 서빙이
   404 나거나 빌드가 아예 실패했다. 해결: `.vercelignore`에 `server.js` 추가 +
   `vercel.json`에 `{"framework": null}`로 자동 감지를 꺼야 정적 파일 + `api/*.js`
   서버리스 함수 조합으로 정상 인식한다.
2. **네이버 평점 스크래핑은 검색어 문구에 따라 성공/실패가 갈린다.** 예: "나홍진 호프
   박스오피스 평점"은 실패, "나홍진 호프 영화 평점"은 성공 — 네이버가 쿼리 의도에 따라
   평점 위젯 대신 다른 위젯(박스오피스 랭킹 등)을 띄우기 때문. 현재
   `NAVER_RATING_QUERY = "나홍진 호프 영화 평점"`으로 고정해뒀다. 이 쿼리를 바꾸려면
   먼저 curl로 여러 번 반복 호출해 안정적으로 위젯이 뜨는지 확인부터 할 것.
3. **CGV 골든에그 지수·왓챠피디아 평점은 스크래핑 시도 결과 403으로 접근 자체가 막혀있다.**
   더 시도할 가치 없음 — `MANUAL_DATA.ratings`에 수동으로 유지.
4. **로컬 테스트 후 정리할 때 `taskkill /F /IM node.exe`로 전체 프로세스를 끄면 안 된다.**
   사용자가 별도로 띄워둔 서버까지 같이 죽어서 "실시간 조회 실패"로 오인하게 만든 적
   있음. 반드시 `tasklist`로 확인한 특정 PID만 `taskkill /F /PID <pid>`로 종료할 것.
5. **비밀번호 게이트(`0712`)는 클라이언트 사이드 코드에 그대로 노출돼 있어 실질적 보안이
   아니다.** 소스보기만 해도 우회 가능. "URL 모르면 못 들어옴" 수준의 캐주얼한 방어일
   뿐이라고 안내할 것 — 사용자에게 실제 보안으로 오해시키지 말 것.
6. **KOBIS 검증 기준치는 지시서(333,899명)와 실제 라이브 데이터(333,900명)가 1명
   차이난다.** `CONFIG.VERIFY_OPEN_DAY_AUDI_CNT`는 라이브 값(333900) 기준으로 맞춰져
   있음 — 사용자 확인 후 반영한 값이니 임의로 지시서 값으로 되돌리지 말 것.
7. **`/api/kobis`, `/api/naver-news`, `/api/naver-rating`은 인증 없는 공개 프록시다.**
   대시보드 UI를 거치지 않고 URL만 알면 누구나 직접 호출 가능 — 남용되면 KOBIS(일
   3,000회)/네이버(일 25,000회) 할당량이 소진돼 대시보드 전체가 먹통이 될 수 있다.
   레이트리밋이나 origin 체크를 추가하고 싶다면 `lib/proxy-core.js`가 아니라 각
   `api/*.js`/`server.js`의 핸들러 레벨에서 처리하는 게 맞다.

## 검증 방법

- 로컬: `node --env-file=.env server.js` → `http://localhost:3000`
- 배포 확인: Playwright 헤드리스로 실제 접속 → 비밀번호(0712) 입력 → 콘솔 에러 0건 +
  `[검증]` 로그가 "일치"로 뜨는지 확인. curl만으로는 클라이언트 JS 실행 여부를 알 수
  없으므로 화면 렌더링 확인에는 항상 헤드리스 브라우저를 쓸 것.
