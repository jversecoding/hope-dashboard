// Vercel 서버리스 함수: /api/naver-news?query=...&display=4
// NAVER_CLIENT_ID / NAVER_CLIENT_SECRET은 Vercel 프로젝트 환경변수에서만 읽는다.
'use strict';

const { fetchNaverNews } = require('../lib/proxy-core');

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const query = url.searchParams.get('query') || '나홍진 호프 박스오피스';
  const display = Math.min(Number(url.searchParams.get('display')) || 4, 10);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const data = await fetchNaverNews(query, display, process.env.NAVER_CLIENT_ID, process.env.NAVER_CLIENT_SECRET);
    res.end(JSON.stringify(data));
  } catch (err) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: true, message: '네이버 뉴스 API 요청 실패: ' + err.message }));
  }
};
