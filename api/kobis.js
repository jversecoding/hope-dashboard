// Vercel 서버리스 함수: /api/kobis?endpoint=movie/searchMovieList.json&movieNm=...
// KOBIS_API_KEY는 Vercel 프로젝트 환경변수에서만 읽는다 (클라이언트에는 절대 노출하지 않음).
'use strict';

const { fetchKobis } = require('../lib/proxy-core');

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const endpoint = url.searchParams.get('endpoint');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (!endpoint) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: true, message: 'endpoint 파라미터가 필요합니다.' }));
    return;
  }

  const params = {};
  for (const [k, v] of url.searchParams) {
    if (k !== 'endpoint') params[k] = v;
  }

  try {
    const data = await fetchKobis(endpoint, params, process.env.KOBIS_API_KEY);
    res.end(JSON.stringify(data));
  } catch (err) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: true, message: 'KOBIS 프록시 요청 실패: ' + err.message }));
  }
};
