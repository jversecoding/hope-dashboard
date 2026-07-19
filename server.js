// 의존성 0개 Node 프록시 서버 (로컬 실행용)
// - http://localhost:3000/                → index.html 정적 서빙
// - http://localhost:3000/api/kobis        → KOBIS 오픈 API 프록시
// - http://localhost:3000/api/naver-news    → 네이버 뉴스 검색 오픈API 프록시
// - http://localhost:3000/api/naver-rating  → 네이버 통합검색 결과 페이지에서 평점 스크래핑
//
// 키는 환경변수로만 읽는다 (코드에 하드코딩하지 않음 — 공개 저장소에 올라가도 안전).
// 로컬 실행 시: node --env-file=.env server.js  (Node 20.6+)
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { fetchKobis, fetchNaverNews, fetchNaverRating } = require('./lib/proxy-core');

const PORT = process.env.PORT || 3000;
const KOBIS_API_KEY = process.env.KOBIS_API_KEY || '';
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || '';
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = filePath.split('?')[0];
  const fullPath = path.join(__dirname, filePath);

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

async function handleKobis(req, res) {
  const reqUrl = new URL(req.url, 'http://localhost');
  const endpoint = reqUrl.searchParams.get('endpoint');
  if (!endpoint) {
    sendJson(res, 400, { error: true, message: 'endpoint 파라미터가 필요합니다.' });
    return;
  }
  const params = {};
  for (const [k, v] of reqUrl.searchParams) {
    if (k !== 'endpoint') params[k] = v;
  }
  try {
    const data = await fetchKobis(endpoint, params, KOBIS_API_KEY);
    sendJson(res, 200, data);
  } catch (err) {
    sendJson(res, 502, { error: true, message: 'KOBIS 프록시 요청 실패: ' + err.message });
  }
}

async function handleNaverNews(req, res) {
  const reqUrl = new URL(req.url, 'http://localhost');
  const query = reqUrl.searchParams.get('query') || '나홍진 호프 박스오피스';
  const display = Math.min(Number(reqUrl.searchParams.get('display')) || 4, 10);
  try {
    const data = await fetchNaverNews(query, display, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET);
    sendJson(res, 200, data);
  } catch (err) {
    sendJson(res, 502, { error: true, message: '네이버 뉴스 API 요청 실패: ' + err.message });
  }
}

async function handleNaverRating(req, res) {
  const reqUrl = new URL(req.url, 'http://localhost');
  const query = reqUrl.searchParams.get('query') || '나홍진 호프 영화 평점';
  try {
    const data = await fetchNaverRating(query);
    sendJson(res, 200, data);
  } catch (err) {
    sendJson(res, 502, { error: true, message: '네이버 검색 요청 실패: ' + err.message });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.url.startsWith('/api/kobis')) return handleKobis(req, res);
  if (req.url.startsWith('/api/naver-news')) return handleNaverNews(req, res);
  if (req.url.startsWith('/api/naver-rating')) return handleNaverRating(req, res);

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`HOPE 대시보드 서버 실행 중: http://localhost:${PORT}`);
  if (!KOBIS_API_KEY) console.warn('[경고] KOBIS_API_KEY 환경변수가 설정되지 않았습니다.');
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) console.warn('[경고] NAVER_CLIENT_ID/NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.');
});
