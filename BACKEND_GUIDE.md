# Backend Developer Guide

## Project: Crypto Trading TMA

Telegram Mini App для криптотрейдингу з адмінкою та ролями.

## Стек

- **Frontend:** React + Vite + TypeScript + Zustand
- **Backend:** Supabase (PostgreSQL + Edge Functions + Auth)
- **Deploy frontend:** Vercel
- **Deploy backend:** Supabase Cloud (free tier)
- **Auth:** Telegram WebApp initData

## Supabase Project

- **URL:** `https://gyvwmquqqtipwgagawyq.supabase.co`
- **Project ref:** `gyvwmquqqtipwgagawyq`
- **Region:** Central EU (Frankfurt)

## Що вже зроблено

1. ✅ SQL міграція запущена (6 таблиць + RLS + seed data)
2. ✅ 11 Edge Functions задеплоєні
3. ✅ Frontend підключений до Supabase ( замінені всі mock API)
4. ✅ .env створений

## Що треба зробити

### 1. Задати BOT_TOKEN

```bash
supabase secrets set BOT_TOKEN=ваш_токен_бота_від_BotFather
```

Отримати токен: [@BotFather](https://t.me/BotFather) → `/newbot`

### 2. Налаштувати Telegram WebApp

В @BotFather:
- `/setmenubutton` → вкажи URL你的 Vercel деплою
- Або в налаштуваннях бота → Web Apps → встав URL

### 3. Створити admin юзера

В Supabase Dashboard → **Authentication** → **Users** → **Add user**:
- Email: `tg_<telegram_id>@app.local`
- Password: `будь-який`
- Confirm: ✅

Потім в **Table Editor** → **profiles** → Insert row:
- `id` = ID щойно створеного юзера (знайди в Auth)
- `telegram_id` = твій Telegram ID (дізнатись: [@userinfobot](https://t.me/userinfobot))
- `username` = твій username
- `first_name` = ім'я
- `balance` = `10000`
- `role` = `admin`
- `win_probability` = `50`
- `is_active` = `true`

### 4. Деплой фронту на Vercel

Додати env variables в Vercel Dashboard:
```
VITE_SUPABASE_URL=https://gyvwmquqqtipwgagawyq.supabase.co
VITE_SUPABASE_ANON_KEY=сюди publishable key з Supabase Dashboard
```

## Структура Edge Functions

```
supabase/functions/
├── auth-telegram/        — Авторизація через Telegram
├── user-profile/         — Отримання профілю
├── user-dashboard/       — Профіль + топ трейдери
├── admin-stats/          — Статистика (active/inactive)
├── admin-users/          — Список/деталі користувачів
├── admin-action/         — Credit/debit/probability/role/permissions
├── trading-assets/       — Список активів
├── trading-signals/      — CRUD сигналів
├── trading-trades/       — Відкриття/список угод
├── trading-close/        — Закриття прострочених угод
└── wallet-transactions/  — Транзакції + депозит/вивід
```

## Модель бази даних

| Таблиця | Опис |
|---------|------|
| `profiles` | Користувачі (розширяє auth.users) |
| `manager_permissions` | Права менеджерів |
| `transactions` | Фінансові операції |
| `trades` | Торгові угоди |
| `signals` | Торгові сигнали |
| `assets` | Криптоактиви |

## Ролі

| Роль | Може |
|------|------|
| `user` | Торгівля, депозит/вивід, свій профіль |
| `manager` | user + обмежені адмін-права (залежить від `manager_permissions`) |
| `admin` | Все |

## Права менеджера

- `view_users` — перегляд користувачів
- `edit_balance` — нарахування/списування коштів
- `view_signals` — перегляд сигналів
- `manage_signals` — створення/редагування сигналів
- `view_trades` — перегляд угод
- `manage_win_probability` — зміна ймовірності виграшу
- `view_transactions` — перегляд транзакцій

## Як працює авторизація

1. Юзер відкриває Telegram WebApp
2. Фронтенд отримує `initData` від Telegram
3. Надсилає на Edge Function `auth-telegram`
4. Верифікація HMAC-SHA256 підпису з `BOT_TOKEN`
5. Знаходиться або створюється профіль
6. Повертаються access_token + refresh_token

## Деплой Edge Functions

```bash
# Змінити код → задеплоїти зміну
supabase functions deploy <назва_функції> --no-verify-jwt

# Наприклад:
supabase functions deploy auth-telegram --no-verify-jwt
supabase functions deploy admin-action --no-verify-jwt
```

## Логіка trading-close

Закриває прострочені угоди:
1. Знаходить open trades старіші за 5 хвилин
2. Бере `win_probability` юзера (0-100)
3. Генерує випадкове число 0-100
4. Якщо < win_probability → win (повертає amount * multiplier 1.7-2.3x)
5. Якщо >= → loss (amount вже списаний)

Можна викликати вручну або налаштувати cron.

## Корисні посилання

- [Supabase Dashboard](https://supabase.com/dashboard/project/gyvwmquqqtipwgagawyq)
- [Edge Functions](https://supabase.com/dashboard/project/gyvwmquqqtipwgagawyq/functions)
- [SQL Editor](https://supabase.com/dashboard/project/gyvwmquqqtipwgagawyq/sql/new)
- [Table Editor](https://supabase.com/dashboard/project/gyvwmquqqtipwgagawyq/editor)
- [Auth Users](https://supabase.com/dashboard/project/gyvwmquqqtipwgagawyq/auth/users)
