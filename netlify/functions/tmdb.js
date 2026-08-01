exports.handler = async (event) => {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;

  if (!TMDB_API_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "TMDB_API_KEY не задан в переменных окружения Netlify. Site settings → Environment variables."
      })
    };
  }

  const { path, ...restParams } = event.queryStringParameters || {};

  if (!path) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Не передан параметр 'path', например path=/discover/movie" })
    };
  }

  const params = new URLSearchParams(restParams);
  params.set("api_key", TMDB_API_KEY);

  const targetUrl = `https://api.themoviedb.org/3${path}?${params.toString()}`;

  try {
    const tmdbRes = await fetch(targetUrl);
    const bodyText = await tmdbRes.text();

    return {
      statusCode: tmdbRes.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: bodyText
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Не удалось достучаться до TMDB с сервера", details: String(err) })
    };
  }
};
