// Vercel 서버리스 함수: /api/naver-rating?query=...
// 네이버 통합검색 결과 페이지를 스크래핑 — 별도 키 불필요.
'use strict';

const { fetchNaverRating } = require('../lib/proxy-core');

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const query = url.searchParams.get('query') || '나홍진 호프 영화 평점';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const data = await fetchNaverRating(query);
    res.end(JSON.stringify(data));
  } catch (err) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: true, message: '네이버 검색 요청 실패: ' + err.message }));
  }
};
