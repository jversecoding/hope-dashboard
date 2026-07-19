# HOPE 호프 실시간 박스오피스 대시보드

나홍진 감독 영화 '호프(HOPE)'의 실시간 박스오피스를 모니터링하는 ATU Partners 투자자용 대시보드입니다.
KOBIS(영화관입장권통합전산망) 오픈 API 데이터를 기반으로 KPI, 일자별 추이 차트, 손익분기점(BEP) 진행률,
실시간 뉴스, 실시간 평점 등을 제공합니다.

## 접속 비밀번호

페이지 접속 시 비밀번호(`0712`) 입력 화면이 먼저 뜹니다. `index.html`의 `DASHBOARD_PASSCODE` 상수를 수정하면 비밀번호를 바꿀 수 있습니다.
같은 브라우저 탭 세션 동안은 재입력 없이 유지되며(`sessionStorage`), 탭을 닫거나 새 탭에서 열면 다시 입력해야 합니다.

**주의**: 이 잠금은 HTML/JS 소스에 비밀번호가 그대로 들어있는 클라이언트 사이드 간이 잠금입니다. 브라우저 개발자 도구로 소스를 보면 우회할 수 있으므로, 민감한 접근 제어가 필요하면 서버 사이드 인증으로 별도 구현해야 합니다.

## 아키텍처

```
hope-dashboard/
├── index.html          # 대시보드 전체 (CSS/JS 인라인, CONFIG + MANUAL_DATA 포함)
├── server.js           # 로컬 실행용 Node 프록시 서버 (의존성 0개)
├── lib/proxy-core.js   # KOBIS·네이버 프록시/스크래핑 공용 로직 (server.js와 api/*.js가 공유)
├── api/
│   ├── kobis.js         # Vercel 서버리스 함수: KOBIS 오픈 API 프록시
│   ├── naver-news.js     # Vercel 서버리스 함수: 네이버 뉴스 검색 오픈API 프록시
│   └── naver-rating.js   # Vercel 서버리스 함수: 네이버 평점 스크래핑
├── atu-logo.jpg         # 헤더에 표시되는 ATU Partners 로고
├── .env.example         # 필요한 환경변수 목록 (실제 값은 미포함)
└── README.md
```

API 키(KOBIS_API_KEY, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET)는 **모두 서버 환경변수로만** 관리되며, `index.html`/`server.js` 소스에는 절대 하드코딩하지 않습니다. 로컬에서는 `server.js`가, 배포 환경에서는 `api/*.js`(Vercel 서버리스 함수)가 이 환경변수를 읽어 각 외부 API를 대신 호출합니다 — 브라우저는 키를 전혀 알지 못합니다.

## 실행 방법 (로컬)

1. 프로젝트 루트에 `.env.example`을 복사해 `.env`를 만들고 실제 키를 채웁니다.

```bash
cp .env.example .env
```

```env
KOBIS_API_KEY=발급받은_KOBIS_키
NAVER_CLIENT_ID=발급받은_네이버_Client_ID
NAVER_CLIENT_SECRET=발급받은_네이버_Client_Secret
```

2. 서버 실행 (Node 20.6+ 의 `--env-file` 플래그로 별도 패키지 설치 없이 `.env`를 로드합니다):

```bash
cd hope-dashboard
node --env-file=.env server.js
```

3. 브라우저에서 `http://localhost:3000` 접속.

`index.html`을 더블클릭(file://)해서 열 수도 있지만, 이 경우 서버 프록시에 연결할 방법이 없어 **실시간 뉴스·실시간 평점은 항상 실패**하고 수동 백업 데이터로만 표시됩니다. KOBIS 데이터도 CORS에 막힐 수 있습니다. 완전 독립 실행이 꼭 필요하면 `index.html` 상단 `CONFIG.KOBIS_API_KEY`에 개인 키를 직접 붙여넣으세요 (이 경우 그 브라우저에서 키가 그대로 보입니다 — 공개 배포본에는 절대 이렇게 하지 마세요).

## 배포 (Vercel)

이 프로젝트는 별도 빌드 설정 없이 Vercel에 그대로 배포됩니다 — 정적 파일(`index.html`, `atu-logo.jpg`)은 그대로 서빙되고, `api/` 폴더의 각 파일은 자동으로 서버리스 함수(Node.js 런타임)로 인식됩니다.

1. Vercel 프로젝트 생성 후 **Settings → Environment Variables**에 아래 3개를 등록합니다 (Production/Preview 모두):
   - `KOBIS_API_KEY`
   - `NAVER_CLIENT_ID`
   - `NAVER_CLIENT_SECRET`
2. GitHub 저장소와 연결하거나 `vercel --prod`로 CLI 배포합니다.
3. 배포된 URL로 접속해 캘린더 클릭, 실시간 기사, 실시간 평점이 모두 동작하는지 확인합니다.

`server.js`는 Vercel에서 사용되지 않습니다 (로컬 실행 전용). Vercel은 `api/*.js`만 서버리스 함수로 실행합니다.

## KOBIS 오픈 API 키 발급 방법

1. https://www.kobis.or.kr/kobisopenapi 접속
2. 우측 상단 회원가입 (이메일 인증, 무료)
3. 로그인 후 [키 발급/관리] 메뉴 → 키 발급 신청
4. 사용 목적 간단히 기재 (예: "투자 영화 박스오피스 모니터링") → 즉시 발급
5. 발급된 키를 `KOBIS_API_KEY` 환경변수에 설정 (로컬 `.env` 또는 Vercel 환경변수)

- 호출 제한: 일 3,000회 (본 대시보드는 localStorage 캐싱으로 하루 수십 회 수준만 사용)
- 서버에 키가 설정되지 않으면 movieCd 조회 단계에서 실패해 화면 상단에 안내 배너와 키 발급 링크가 표시됩니다.

### 주요 API 엔드포인트

| 용도 | 엔드포인트 |
|---|---|
| 일별 박스오피스 | `/boxoffice/searchDailyBoxOfficeList.json?key={KEY}&targetDt=YYYYMMDD` |
| 영화 목록(코드 조회) | `/movie/searchMovieList.json?key={KEY}&movieNm=호프` |
| 영화 상세정보 | `/movie/searchMovieInfo.json?key={KEY}&movieCd={CODE}` |

베이스 URL: `http://kobis.or.kr/kobisopenapi/webservice/rest`

## 실시간 뉴스 — 네이버 뉴스 검색 오픈API 키 발급 방법

핵심 기사 카드는 페이지를 열 때마다 네이버 뉴스 검색 오픈API로 "나홍진 호프 박스오피스" 관련 최신 기사를 실시간 조회합니다 (캐싱하지 않음).

1. https://developers.naver.com/apps/#/register 접속 (네이버 계정 로그인 필요)
2. 애플리케이션 등록 → 사용 API에서 **검색** 체크
3. 비로그인 오픈 API 서비스 환경 → **WEB 설정**에 아무 URL이나 등록 (예: `http://localhost:3000` 또는 배포된 Vercel 도메인)
4. 등록 완료 후 발급된 **Client ID / Client Secret**을 `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` 환경변수에 설정

- 호출 제한: 일 25,000회 (하루 수십~수백 회 수준만 사용하므로 충분)
- 키가 없거나 호출이 실패하면 자동으로 `MANUAL_DATA.newsFallback`(수동 백업 기사 4건)으로 대체되고, 카드 하단에 실패 사유가 표시됩니다.

## 종합 평점 — 네이버 평점 실시간 스크래핑

"종합 평점" 카드의 **네이버 실관람객/네티즌 평점**은 공식 API가 없어서, `api/naver-rating.js`(로컬은 `server.js`)가 `search.naver.com` 통합검색 결과 페이지를 열 때마다 정규식으로 파싱해 가져옵니다. 별도 키 발급 없이 바로 동작합니다.

- **주의**: 공식 API가 아니라 페이지 스크래핑이므로, 네이버가 검색 결과 페이지의 HTML 구조를 바꾸면 언제든 깨질 수 있습니다. 이 경우 `lib/proxy-core.js`의 `extractNaverRatingValue()` 정규식을 새 마크업에 맞게 수정해야 합니다.
- 조회 실패 시 자동으로 `MANUAL_DATA.ratings.naver`(수동 값)로 대체됩니다.
- **CGV 골든에그 지수·왓챠피디아 평점**은 시도해본 결과 사이트 접근 자체가 차단(403)되어 스크래핑이 불가능했습니다. 계속 `MANUAL_DATA.ratings`에 수동으로 값을 채워 넣는 방식입니다.
- **메가박스·롯데시네마 평점, 실시간 예매율/예매 순위**는 네이버 검색 결과에도 없고 공식 API도 없어 대시보드에서 제외했습니다. 예매율 대신 KOBIS 실데이터로 계산 가능한 **"상영 효율 지표"**(회당 평균 관객수, 스크린당 일 상영횟수)로 대체했습니다 — 이 지표는 API 호출 없이 이미 받아온 일별 박스오피스 데이터로 클라이언트에서 바로 계산됩니다.

## movieCd(영화코드) 자동 탐색

영화코드는 하드코딩하지 않고, 최초 실행 시 KOBIS 영화목록 API로 조회해 감독명("나홍진")으로 필터링한 뒤
`localStorage`(`hope_movieCd`)에 저장합니다. 이후 재방문 시에는 캐시된 코드를 재사용합니다.

## MANUAL_DATA 갱신 방법

CGV 골든에그 지수와 왓챠피디아 평점은 스크래핑도 막혀있어(403) 계속 수동으로 관리합니다.
`index.html` 상단의 `MANUAL_DATA` 객체 값을 직접 수정해 갱신합니다.
(기사는 네이버 뉴스 검색 오픈API로, 네이버 평점은 네이버 검색 페이지 스크래핑으로 열 때마다 실시간 조회 — 위 섹션 참고. `ratings.naver`는 그 실시간 조회가 실패했을 때만 쓰이는 백업 값)

```js
const MANUAL_DATA = {
  updatedAt: "2026-07-19",       // 수동 데이터 최종 갱신일
  ratings: { cgv: null, naver: null, watcha: null },
  newsFallback: [ { title: "", press: "", date: "", url: "" } ]  // 실시간 뉴스 조회 실패 시에만 쓰이는 백업 데이터
};
```

- 각 값 옆에 출처 URL을 주석으로 남겨두었습니다 (CGV, 왓챠피디아 등).
- `null`인 항목은 화면에 "데이터 입력 대기"로 표시됩니다.
- 값을 채우고 `updatedAt`을 갱신한 뒤 새로고침하면 자동 반영됩니다.
- 성별/연령 분포, 메가박스·롯데시네마 평점, 실시간 예매율은 공식 출처를 확인할 수 없어 대시보드에서 제외했고, 대신 KOBIS가 실제로 제공하는 "박스오피스 매출 점유율"·"상영 효율 지표" 카드로 대체했습니다.

## 캐싱 정책

- 날짜별 박스오피스 데이터는 `localStorage`의 `hope_daily_YYYYMMDD` 키에 저장됩니다.
- 한 번 조회한 날짜는 재방문/재선택 시 API를 다시 호출하지 않습니다.
- 개봉일부터 선택일까지 순차 호출 시 요청 간 100ms 딜레이를 두며, 캘린더 카드 하단에 로딩 진행률이 표시됩니다.
- 뉴스·평점은 캐싱하지 않고 페이지를 열 때마다 실시간 조회합니다.

## 에러 처리

- 서버에 KOBIS 키 미설정/잘못된 키 → movieCd 조회 실패 시 화면 상단 안내 배너 표시
- 특정 날짜에 호프 레코드가 없음(박스오피스 10위권 밖 등) → 해당 날짜는 skip 처리되고 차트에서는 결측(gap)으로 표시
- 네트워크 실패 → 캐시된 데이터로 폴백하고 "오프라인 데이터" 뱃지 표시
- 실시간 뉴스/평점 조회 실패 → 자동으로 수동 백업 데이터로 대체, 실패 사유 표시

## 검증

- `node --env-file=.env server.js` 실행 후 `http://localhost:3000` 접속 시 콘솔 에러 0건이어야 합니다. (Playwright 헤드리스 브라우저로 실제 렌더링/캘린더 클릭까지 확인 완료, 콘솔 에러 0건)
- 개봉일(2026-07-15) 관객수가 KOBIS 라이브 데이터 기준 333,900명과 일치하는지 브라우저 콘솔 로그(`[검증]` 접두)로 확인합니다.
  - 지시서상 참고치는 333,899명이었으나, 2026-07-19 실제 KOBIS API 조회 결과 333,900명으로 1명 차이가 있어 `CONFIG.VERIFY_OPEN_DAY_AUDI_CNT`를 라이브 값 기준으로 반영했습니다.
