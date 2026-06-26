# ТЗ Backend — Crypto Trading TMA

## Загальна інформація

**Стек:**
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
- **Фронтенд:** React + Vite (вже є)
- **Деплой фронту:** Vercel (вже налаштовано)
- **Деплой бекенду:** Supabase Cloud (безкоштовний тариф)
- **Авторизація:** Telegram WebApp + Supabase Auth
- **Оплати:** Особисті перекази (без платіжної системи)

**Безкоштовні ліміти Supabase Free:**
- 500 MB бази даних
- 1 GB файлового сховища
- 500,000 rows reads/day
- 50,000 rows writes/day
- 500K Edge Function invocations/month
- Realtime: 200 одночасних з'єднань

---

## 1. Модель бази даних

### Таблиця `profiles` (замість users)

Розширяє Supabase Auth — кожен користувач Telegram отримує запис при вході.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  balance NUMERIC(12,2) DEFAULT 0 NOT NULL CHECK (balance >= 0),
  currency TEXT DEFAULT 'USDT' NOT NULL,
  role TEXT DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'manager', 'admin')),
  win_probability NUMERIC(5,2) DEFAULT 50.00 CHECK (win_probability BETWEEN 0 AND 100),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### Таблиця `manager_permissions`

Права менеджерів — що саме може робити менеджер.

```sql
CREATE TABLE manager_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN (
    'view_users',
    'edit_balance',
    'view_signals',
    'manage_signals',
    'view_trades',
    'manage_win_probability',
    'view_transactions'
  )),
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(manager_id, permission)
);
```

### Таблиця `transactions`

Усі фінансові операції (депозити, виводи, зміна балансу адміном).

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'admin_credit', 'admin_debit', 'trade_win', 'trade_loss')),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'USDT' NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### Таблиця `trades`

Угоди користувачів.

```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pair TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  amount NUMERIC(12,2) NOT NULL,
  entry_price NUMERIC(12,4) NOT NULL,
  exit_price NUMERIC(12,4),
  profit NUMERIC(12,2),
  status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'won', 'lost', 'cancelled')),
  opened_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  closed_at TIMESTAMPTZ
);
```

### Таблиця `signals`

Торгові сигнали.

```sql
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  confidence NUMERIC(5,2) NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  entry_price NUMERIC(12,4) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'won', 'lost', 'expired')),
  profit NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### Таблиця `assets`

Криптоактиви для торгівлі.

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  symbol TEXT UNIQUE NOT NULL,
  icon TEXT,
  price NUMERIC(12,4) DEFAULT 0,
  change_24h NUMERIC(6,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true NOT NULL,
  sort_order INT DEFAULT 0
);
```

---

## 2. Авторизація

### Як працює

1. Користувач відкриває Telegram WebApp
2. Фронтенд отримує `initData` від Telegram
3. Фронтенд надсилає `initData` в Edge Function `/auth/telegram`
4. Edge Function верифікує підпис `initData` через `HMAC-SHA256` з `BOT_TOKEN`
5. Якщо валідно — створює Supabase user (або знаходить існуючого за `telegram_id`)
6. Повертає `access_token` + `refresh_token`

### Edge Function: `auth/telegram`

```typescript
// Псевдокод
const { initData } = request.body
const botToken = Deno.env.get('BOT_TOKEN')

// 1. Верифікація підпису
const dataCheckString = initData
  .split('\n')
  .filter(line => !line.startsWith('hash='))
  .sort()
  .join('\n')
const secretKey = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode('WebAppData'),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign']
)
const hmac = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(botToken))
const secret = new TextDecoder().decode(hmac)

const key = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(secret),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign']
)
const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(dataCheckString))
const hash = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')

if (hash !== parsedHash) throw new Error('Invalid signature')

// 2. Знаходимо або створюємо користувача
const telegramUser = parse(initData).user
let { data: profile } = await supabase.from('profiles').select().eq('telegram_id', telegramUser.id).single()

if (!profile) {
  const { data: authUser } = await supabase.auth.admin.createUser({
    email: `tg_${telegramUser.id}@app.local`,
    email_confirm: true,
    user_metadata: { telegram_id: telegramUser.id }
  })
  await supabase.from('profiles').insert({
    id: authUser.id,
    telegram_id: telegramUser.id,
    username: telegramUser.username,
    first_name: telegramUser.first_name,
    last_name: telegramUser.last_name,
    avatar_url: telegramUser.photo_url
  })
}

// 3. Видаємо токени
const { access_token, refresh_token } = await supabase.auth.signInWithOAuth({
  provider: 'email',
  options: { scopes: 'openid' }
})
// або використовуємо service role для створення сесії напряму
```

---

## 3. API ендпоінти (Supabase Edge Functions)

Всі функції розташовані у `supabase/functions/`.

### Авторизація

| Функція | Метод | Опис |
|---------|-------|------|
| `auth/telegram` | POST | Верифікація Telegram + вхід/реєстрація |

### Користувачі

| Функція | Метод | Опис |
|---------|-------|------|
| `user/profile` | GET | Отримати профіль поточного користувача |
| `user/profile` | PATCH | Оновити профіль (username, avatar) |
| `user/balance` | GET | Отримати баланс |
| `user/top-traders` | GET | Топ трейдерів (з trades) |

### Торгівля

| Функція | Метод | Опис |
|---------|-------|------|
| `trading/assets` | GET | Список активів |
| `trading/signals` | GET | Активні сигнали |
| `trading/trades` | GET | Торгівля користувача |
| `trading/trade` | POST | Відкрити угоду |

**Логіка відкриття угоди:**
1. Перевірити баланс >= amount
2. Зняти amount з балансу
3. Створити запис у `trades` зі статусом `open`
4. Запустити Edge Function для закриття угоди через N секунд/хвилин
5. При закритті: перевірити `win_probability` користувача, визначити win/loss
6. Якщо win — повернути amount * multiplier (наприклад x1.8)
7. Якщо loss — amount списано

### Гаманець

| Функція | Метод | Опис |
|---------|-------|------|
| `wallet/transactions` | GET | Історія транзакцій |
| `wallet/deposit` | POST | Запит на депозит (створює pending транзакцію) |
| `wallet/withdraw` | POST | Запит на вивід (створює pending транзакцію) |

### Адмінка

| Функція | Метод | Опис | Доступ |
|---------|-------|------|--------|
| `admin/stats` | GET | Статистика (кількість active/inactive) | admin |
| `admin/users` | GET | Список користувачів (фільтр по статусу) | admin, manager (view_users) |
| `admin/users/:id` | GET | Деталі користувача | admin, manager (view_users) |
| `admin/users/:id/credit` | POST | Нарахувати кошти | admin, manager (edit_balance) |
| `admin/users/:id/debit` | POST | Списати кошти | admin, manager (edit_balance) |
| `admin/users/:id/probability` | PATCH | Змінити win_probability (0-100) | admin, manager (manage_win_probability) |
| `admin/users/:id/role` | PATCH | Змінити роль (user/manager/admin) | admin |
| `admin/managers/:id/permissions` | PUT | Оновити права менеджера | admin |
| `admin/transactions` | GET | Усі транзакції системи | admin, manager (view_transactions) |

---

## 4. Row Level Security (RLS) політики

```sql
-- Профілі: користувач бачить свій, адмін — всі
CREATE POLICY "Users view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles"
  ON profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Managers view profiles with permission"
  ON profiles FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM manager_permissions
      WHERE manager_id = auth.uid() AND permission = 'view_users'
    )
  );

-- Баланс: змінювати може тільки функція (service role)
-- Транзакції: читати свій, адмін/менеджер — всі
CREATE POLICY "Users view own transactions"
  ON transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all transactions"
  ON transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Торгівля: свої угоди
CREATE POLICY "Users view own trades"
  ON trades FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own trades"
  ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
```

> **Важливо:** Всі зміни балансу виконуються через Edge Functions з `service role` ключем, щоб обійти RLS і гарантувати атомарність транзакцій.

---

## 5. Структура проєкту

```
supabase/
├── functions/
│   ├── auth/
│   │   └── telegram/index.ts
│   ├── user/
│   │   ├── profile/index.ts
│   │   └── balance/index.ts
│   ├── trading/
│   │   ├── assets/index.ts
│   │   ├── signals/index.ts
│   │   ├── trades/index.ts
│   │   └── close-trade/index.ts      # Cron / викликається при expir
│   ├── wallet/
│   │   ├── transactions/index.ts
│   │   ├── deposit/index.ts
│   │   └── withdraw/index.ts
│   └── admin/
│       ├── stats/index.ts
│       ├── users/index.ts
│       ├── credit/index.ts
│       ├── debit/index.ts
│       ├── probability/index.ts
│       ├── role/index.ts
│       └── permissions/index.ts
├── migrations/
│   └── 001_initial_schema.sql
└── config.toml
```

---

## 6. Безпека

- `SUPABASE_SERVICE_ROLE_KEY` — тільки в Edge Functions, ніколи на фронті
- Верифікація `initData` від Telegram при кожному запиті авторизації
- RLS на всіх таблицях — користувачі не можуть чужі дані
- Менеджери мають обмежені права через `manager_permissions`
- Всі фінансові операції логуються в `transactions`
- `balance >= 0` constraint — неможливо взяти в мінус

---

## 7. Логіка закриття угод

```
1. User відкриває угоду (amount, direction, pair)
2. Створюється trade з expires_at = now() + duration
3. Після expires_at спрацьовує close-trade function:
   a. Отримує current price з assets
   b. Порівнює з entry_price
   c. Визначає win/loss по напрямку
   d. Додає random factor на основі win_probability:
      - Генерується випадкове число 0-100
      - Якщо < win_probability → win
   e. Якщо win: balance += amount * multiplier
   f. Якщо loss: balance вже списаний
   g. Оновлює статус trade
```

---

## 8. Ролі та права

| Роль | Права |
|------|-------|
| **user** | Торгівля, перегляд свого профілю, депозит/вивід |
| **manager** | Права user + обмежені адмін-права (визначаються через `manager_permissions`) |
| **admin** | Повний доступ до всього |

### Доступні права для менеджера:
- `view_users` — перегляд списку користувачів
- `edit_balance` — нарахування/списування коштів
- `view_signals` — перегляд сигналів
- `manage_signals` — створення/редагування сигналів
- `view_trades` — перегляд угод
- `manage_win_probability` — зміна ймовірності виграшу
- `view_transactions` — перегляд транзакцій

---

## 9. Інтеграція з фронтендом

### Заміна mock API

Поточні API-файли (`userApi.ts`, `walletApi.ts`, `adminApi.ts`, `tradingApi.ts`) замінюються на реальні виклики:

```typescript
// src/services/api/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Приклад заміни userApi.ts

```typescript
// Було:
export const getCurrentUser = (): Promise<User> => withMockDelay(mockUser)

// Стало:
import { supabase } from './supabase'

export const getCurrentUser = async (): Promise<User> => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return profile
}
```

### Змінні середовища (Vercel)

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## 10. Деплой

### Supabase
1. Створити проєкт на [supabase.com](https://supabase.com) (безкоштовно)
2. Запустити міграції через `supabase db push`
3. Розгорнути Edge Functions через `supabase functions deploy`

### Vercel (фронтенд)
1. Вже налаштовано
2. Додати змінні середовища в налаштуваннях проєкту

---

## 11. Що потрібно зробити

### Крок 1: Налаштування Supabase
- [ ] Створити проєкт
- [ ] Запустити SQL міграцію (всі таблиці)
- [ ] Включити Auth з провайдером Email (для service role)
- [ ] Налаштувати RLS політики

### Крок 2: Edge Functions
- [ ] `auth/telegram` — авторизація
- [ ] `user/profile` — профіль
- [ ] `admin/*` — всі адмін-функції
- [ ] `trading/*` — торгівля
- [ ] `wallet/*` — гаманець

### Крок 3: Фронтенд
- [ ] Встановити `@supabase/supabase-js`
- [ ] Створити `supabase.ts` клієнт
- [ ] Замінити mock API на реальні виклики
- [ ] Додати автентифікацію через Telegram
- [ ] Додати змінні середовища у Vercel

### Крок 4: Тестування
- [ ] Реєстрація через Telegram
- [ ] Перегляд профілю
- [ ] Відкриття угоди
- [ ] Адмін-дії (credit, probability, role)
- [ ] Менеджер-дії (обмежені права)
