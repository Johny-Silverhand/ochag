# Безопасность RestoPro (Vercel)

Приложение живёт на Vercel + Neon. Это **не** «иммунитет к DDoS датацентра»: край CDN и Firewall снимают объём, приложение обязано не отдавать чужие контуры, не принимать бесконечный логин и не светить секреты.

## Что сделано в коде

### Изоляция данных
- Филиалы и сотрудники несут `ownerId`. Снимок для API режется на **сервере** (`publicSnapshot` + `scopeSnapshot` / `directorySnapshot`), не фильтрами в UI.
- Техник в выбранном контуре (`actingOwnerId` в JWT) видит только этот контур. Чужой филиал на запись — отказ.
- Техник **без** выбранного контура получает справочник (владельцы, филиалы, учётки, журнал/консоль), **без** чужих продаж, склада и долгов.
- `GET /owners` — полный список владельцев только для `tech_admin`. Управляющий получает 403, не пустой список.

### AuthZ
- Каждая мутация требует живой JWT (`jti` привязан к устройству) и проверяет роль на сервере.
- Долги учёта, смена контура, учебный срез и сброс — отдельные запреты для менеджера.
- Абсолютный доступ техника на чувствительных записях (`staff/*`, настройки, филиалы, долги, сброс) пишется в журнал операций.

### Секреты в снимке
- Пароль и PIN в клиентский JSON всегда пустые. `retainSecrets` не даёт пустым полям затереть хранилище.
- Ключи web-push и поле `to` очереди сигналов с клиента сняты.
- Консоль (`opsLogs`) только у техника.

### Шлюз API
- Rate limit: вход / PIN / onboard / bootstrap / simulate-payment — 20/мин с IP, 12/мин на логин.
- Запись: 120/мин на пользователя+IP.
- После **8** неверных паролей/PIN — пауза **15 минут** на учётке (в снимке `authLockedUntil`).
- Тело запроса > ~1.5 МБ — 413. Логин/пароль/PIN длиннее лимита — 400. JSON не-объект — 400.
- Фото накладных: только data-URL JPEG/PNG/WebP/GIF, размер, имя без `../`.

### Сессия
- Несколько устройств на одну учётку (владелец, сотрудник, техник). Каждый вход — свой `jti` в JWT, запись в `ops_state` (устройство, IP, вход, последняя активность).
- Настройки → Профиль → Устройства: список и отзыв. «Отозвать остальные» гасит только другие сессии **этого** логина. Техник в выбранном контуре видит и отзывает сессии владельца и персонала.
- IP — первый публичный hop `x-forwarded-for` / `x-real-ip`. `lastActivity` на живых API-вызовах, не чаще чем раз в 5 минут.
- JWT HS256, TTL 12 ч, заголовок `Authorization: Bearer`. **Cookie не принимается** (нет CSRF-поверхности cookie-сессии).
- В production обязателен `OCHAG_JWT_SECRET`. Ротация: выставить новый секрет и `OCHAG_JWT_SECRET_PREVIOUS` = старый, пока не истекут 12-часовые токены, затем убрать previous.
- Сравнение пароля и PIN — `timingSafeEqual`, без раннего `===` по строке.

### Заголовки (приложение + `vercel.json`)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- CSP: `default-src 'self'`; скрипты `self` + `https://grok.com` (брендинг платформы) + `'unsafe-inline'` (Vite/runtime); стили `'unsafe-inline'`; `object-src 'none'`; `base-uri` / `form-action` `'self'`
- HSTS: `max-age=63072000; includeSubDomains; preload` (Vercel на HTTPS и так шлёт HSTS; дублируем явно)
- CORS: чужой `Origin` не отражается. Нет `Access-Control-Allow-Origin: *`. Same-origin без Origin (сервер-сервер) проходит.

### Ошибки
- В production английский стек и Node-текст клиенту не отдаём (`opaqueApiError` → «Ошибка контура»).

## Что включить в кабинете Vercel (нельзя закоммитить как живой WAF)

Правила Firewall / Attack Mode / Bot Management хранятся в проекте Vercel, не в git. Ниже — что включить руками после деплоя.

1. **Environment**
   - `OCHAG_JWT_SECRET` — Production **и** Preview, длинная случайная строка.
   - При ротации: `OCHAG_JWT_SECRET_PREVIOUS`.
   - Опционально `OCHAG_APP_ORIGIN`, если API когда-нибудь откроют с другого origin.

2. **Firewall → Custom rules** (Dashboard или `vercel firewall rules add`):
   - Rate limit по IP на `/api/v1/auth/login`, `/api/v1/auth/pin`, `/api/v1/auth/onboard`, `/api/v1/auth/bootstrap`, `/api/v1/billing/simulate` — например 30 запросов / 60 с, action `rate_limit` (не `challenge` на PIN: зал бьёт PIN без капчи).
   - Отдельно более жёсткий лимит на `POST /api/v1/auth/login` при всплеске.
   - OWASP / managed WAF оставить включённым, если тариф позволяет.

3. **Bot Management** — по желанию на HTML-страницах. **Не** вешать challenge на `/api/v1/auth/pin`.

4. **Attack Mode** при инциденте: Dashboard → Firewall → Attack Mode (`vercel firewall attack-mode enable --duration 1h`). Честная капча на браузерный трафик; PIN-терминал и превью могут пострадать — выключайте после волны (`attack-mode disable`).

5. **Deployment Protection** — для preview по вкусу; production кафе обычно открыт.

6. **HSTS** на `*.vercel.app` и кастомном домене даёт платформа при HTTPS.

Примеры CLI (нужен доступ к проекту, это не выполняется из репозитория):

```bash
vercel firewall rules add "ochag-auth-ip" \
  --condition '{"type":"path","op":"pre","value":"/api/v1/auth/"}' \
  --action rate_limit \
  --rate-limit-window 60 \
  --rate-limit-requests 30 \
  --rate-limit-keys ip \
  --yes

vercel firewall rules add "ochag-simulate-ip" \
  --condition '{"type":"path","op":"eq","value":"/api/v1/billing/simulate"}' \
  --action rate_limit \
  --rate-limit-window 60 \
  --rate-limit-requests 20 \
  --rate-limit-keys ip \
  --yes
```

После правок: `vercel firewall publish`.

## Честно не покрыто

- Каталог номенклатуры/техкарт в одном `ops_state` пока общий (операционные ряды — по владельцу).
- Пароли в Neon по-прежнему хранятся как есть (не bcrypt); с клиента не уходят.
- Нет отдельного WAF-файла, который Vercel подхватит из git: живые правила — только Dashboard/CLI.
- DDoS «уровня датацентра» закрывает сеть Vercel, не это приложение.
