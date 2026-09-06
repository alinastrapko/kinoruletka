// Netlify Function-прокси для картинок TMDB (постеры, кадры, фон).
//
// Зачем это нужно: у нас уже был прокси для самих запросов к TMDB API
// (tmdb.js) — он нужен, потому что api.themoviedb.org иногда не достучаться
// напрямую из браузера пользователя (блокировки на уровне провайдера/страны).
// Но картинки (image.tmdb.org) — это ОТДЕЛЬНЫЙ домен, и раньше браузер
// пользователя обращался к нему напрямую, в обход прокси. Из-за этого могла
// возникать ситуация "данные о фильме загрузились (через прокси), а постер —
// нет" — именно потому что для API есть защита, а для картинок её не было.
// Эта функция закрывает и картинки тем же способом: идём на image.tmdb.org
// с сервера Netlify, а не из браузера.
//
// Использование с фронтенда:
//   /.netlify/functions/tmdb-image?path=/t/p/w500/abc123.jpg
// Параметр "path" — это путь после https://image.tmdb.org, картинка
// отдаётся как есть (бинарно), с кэшированием на стороне браузера/CDN.

exports.handler = async (event) => {
  const { path } = event.queryStringParameters || {};

  if (!path) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Не передан параметр 'path', например path=/t/p/w500/abc123.jpg" })
    };
  }

  // На всякий случай не даём параметру увести запрос на посторонний домен —
  // path должен быть обычным путём, а не абсолютным URL.
  if (!path.startsWith("/") || path.includes("://")) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Некорректный path" })
    };
  }

  const targetUrl = `https://image.tmdb.org${path}`;

  try {
    const imgRes = await fetch(targetUrl);

    if (!imgRes.ok) {
      return {
        statusCode: imgRes.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: `TMDB image вернул ${imgRes.status}` })
      };
    }

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64Body = Buffer.from(arrayBuffer).toString("base64");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable", // неделя — постеры не меняются
        "Access-Control-Allow-Origin": "*"
      },
      isBase64Encoded: true,
      body: base64Body
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Не удалось достучаться до image.tmdb.org с сервера", details: String(err) })
    };
  }
};
