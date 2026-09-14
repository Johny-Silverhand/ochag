# Безопасность Очага (Vercel)

Приложение живёт на Vercel. Это не «иммунитет к DDoS датацентра» — CDN и Firewall платформы снимают объём, приложение обязано не отдавать чужие контуры и не принимать бесконечный логин.

## Что сделано в коде

- **Изоляция владельцев.** Филиалы и сотрудники несут `ownerId`. Снимок для владельца / управляющего и для техника в выбранном контуре режется на сервере (`publicSnapshot` + `scopeSnapshot`), не только в UI.
- **Переключатель контура** только у администратора-техника. `actingOwnerId` в JWT. Менеджер/владелец этот API не вызывает.
- **AuthZ на мутациях.** Отказ — `AuthzError` с русским текстом, без стека.
- **Секреты.** В клиентский снимок пароль и PIN не попадают (`publicSnapshot` / `retainSecrets`).
- **Лимит тела** ~1.5 МБ. Фото накладных — тип/размер уже ограничены.
- **Rate limit** входа (IP + логин) и запись. После 8 неверных попыток — пауза 15 минут на учётке.
- **Несколько сессий** на аккаунт. Отзыв инвалидирует JWT (`jti`). IP из `x-forwarded-for` (первый hop).
- **Заголовки:** `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, CSP (`frame-ancestors 'none'`, `object-src 'none'`, script только self + grok.com для брендинга). CORS не отражает чужой `Origin`. Same-origin без `Origin` (серверные вызовы) проходит.
- **Сравнение пароля и PIN** — `timingSafeEqual`, без раннего `===` по строке.
- **PDF отчётов** отдаются из среза контура актора, не из сырого снимка всей базы.
- **Ошибки в production:** английский стек клиенту не отдаём.

## Что включить в кабинете Vercel

1. **Deployment Protection** — по вкусу для preview; production обычно открыт для кафе.
2. **Firewall / WAF** → Custom rules: rate limit на `/api/v1/auth/login` и `/api/v1/auth/pin` (дополнительно к коду).
3. **Attack Mode** при инциденте: Dashboard → Firewall → Attack Mode. Честная капча/challenge, PIN-терминал в зале может пострадать — выключайте после волны.
4. **HSTS** на кастомном домене даёт сам Vercel при HTTPS.

`OCHAG_JWT_SECRET` — в Production и Preview. `OCHAG_APP_ORIGIN` — если нужен явный CORS на отдельный фронт (по умолчанию только same-origin).
