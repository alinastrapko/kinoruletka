// Netlify Function-прокси к TMDB.
//
// Зачем это нужно: если делать запросы к api.themoviedb.org прямо из браузера
// пользователя, их может заблокировать провайдер/страна (это и происходило).
// Здесь запрос уходит с сервера Netlify — обычно не подпадает под те же
// блокировки, так что пользователю не нужен VPN.
//
// Заодно API-ключ TMDB больше не лежит в исходном коде сайта, а хранится
// в переменной окружения на Netlify — так безопаснее.
//
// Как настроить (один раз):
// 1. В панели Netlify: Site settings → Environment variables → Add a variable
//    Ключ:     TMDB_API_KEY
//    Значение: ваш ключ TMDB (v3 API key)
// 2. Передеплойте сайт (после добавления переменной нужен новый деплой,
//    чтобы функция её увидела).
//
// Как это используется с фронтенда:
//   /.netlify/functions/tmdb?path=/discover/movie&language=ru-RU&page=1
// Параметр "path" — это путь TMDB API после /3, всё остальное прокидывается
// как есть, а api_key подставляется тут, на сервере.

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
