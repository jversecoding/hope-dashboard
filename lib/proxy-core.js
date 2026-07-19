// KOBIS/네이버 프록시·스크래핑 공용 로직.
// server.js(로컬 Node 서버)와 api/*.js(Vercel 서버리스 함수)가 동일한 코드를 공유한다.
'use strict';

const https = require('https');
const http = require('http');

const KOBIS_HOST = 'kobis.or.kr';
const KOBIS_BASE_PATH = '/kobisopenapi/webservice/rest';

function httpGet(options) {
  return new Promise((resolve, reject) => {
    const lib = options.port === 443 ? https : http;
    const req = lib.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
    req.on('error', reject);
    req.end();
  });
}

// KOBIS 오픈 API 프록시. apiKey는 서버 환경변수(KOBIS_API_KEY)에서만 전달받는다 — 클라이언트는 키를 모른다.
async function fetchKobis(endpoint, params, apiKey) {
  if (!apiKey) {
    return { error: true, message: 'KOBIS_API_KEY가 서버에 설정되지 않았습니다.' };
  }
  const qs = new URLSearchParams({ ...params, key: apiKey }).toString();
  const body = await httpGet({ hostname: KOBIS_HOST, port: 80, path: `${KOBIS_BASE_PATH}/${endpoint}?${qs}`, method: 'GET' });
  try {
    return JSON.parse(body);
  } catch (e) {
    return { error: true, message: 'KOBIS 응답 파싱 실패' };
  }
}

// 네이버 뉴스 검색 오픈API 프록시. Client ID/Secret은 서버 환경변수에서만 전달받는다.
async function fetchNaverNews(query, display, clientId, clientSecret) {
  if (!clientId || !clientSecret) {
    return { error: true, message: 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET이 서버에 설정되지 않았습니다.' };
  }
  const qs = new URLSearchParams({ query, display: String(display), sort: 'date' }).toString();
  const body = await httpGet({
    hostname: 'openapi.naver.com',
    port: 443,
    path: `/v1/search/news.json?${qs}`,
    method: 'GET',
    headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
  });
  try {
    return JSON.parse(body);
  } catch (e) {
    return { error: true, message: '네이버 뉴스 응답 파싱 실패' };
  }
}

// 네이버 통합검색 결과 페이지(SSR)에서 "실관람객 평점"/"네티즌 평점" 숫자를 정규식으로 추출.
// 공식 API가 아니라 페이지 스크래핑이므로, 네이버가 마크업 구조를 바꾸면 언제든 깨질 수 있다.
function extractNaverRatingValue(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped + '[\\s\\S]{0,200}?</strong>[\\s\\S]{0,150}?(?:this_text_bold|area_star_number)"[^>]*>([0-9.]+)');
  const m = html.match(re);
  return m ? parseFloat(m[1]) : null;
}

async function fetchNaverRating(query) {
  const qs = new URLSearchParams({ query }).toString();
  const html = await httpGet({
    hostname: 'search.naver.com',
    port: 443,
    path: `/search.naver?${qs}`,
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' },
  });
  const audienceRating = extractNaverRatingValue(html, '실관람객 평점');
  const netizenRating = extractNaverRatingValue(html, '네티즌 평점');
  if (audienceRating === null && netizenRating === null) {
    return { error: true, message: '네이버 검색 결과에서 평점을 찾을 수 없습니다 (페이지 구조 변경 가능성).' };
  }
  return { audienceRating, netizenRating };
}

module.exports = { fetchKobis, fetchNaverNews, fetchNaverRating };
