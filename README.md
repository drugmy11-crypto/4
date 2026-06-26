# Звіт по проєкту: crypto-trading-tma

## Верстка (Frontend)

### 🛠 Технології
У проєкті використовується сучасний стек для швидкої та масштабованої розробки:
* `React 19`
* `Vite`
* `TypeScript`
* `Zustand`
* `SCSS`
* `lightweight-charts`
* `react-router-dom`

---

### 🗺 Маршрути (18)
Нижче наведена структура маршрутизації додатку:

| Маршрут | Сторінка |
| :--- | :--- |
| `/` | `HomePage` |
| `/trade` | `TradePage` |
| `/pairs` | `ChoosePairPage` |
| `/signals` | `SignalsPage` |
| `/history` | `TransactionHistoryPage` |
| `/top` | `TopTradersPage` |
| `/profile` | `ProfilePage` |
| `/deposit` | `DepositPage` |
| `/deposit-details` | `DepositDetailsPage` |
| `/withdraw` | `WithdrawPage` |
| `/faq`, `/support` | `FAQPage` |
| `/settings` | `SettingsPage` |
| `/users` | `UsersPage` |
| `/users/:userId` | `UserDetailPage` |
| `/admin` | `AdminProfilePage` |
| `/admin/users` | `AdminUsersPage` |
| `/admin/users/:userId`| `AdminUserDetailsPage` |

---

### 🧩 Компоненти (30+)
Компоненти логічно розділені за своїм призначенням:

* **Layout:** `AppShell`, `BottomNavigation`
* **Trading:** `TradingChart`, `TradePanel`, `ChartControls`, `CoinGrid`, `CryptoPairCard`, `MarketCard`, `SignalCard`, `TransactionRow`
* **Profile:** `ProfileRow`, `ProfileCard`, `BalanceCard`
* **UI:** `Button`, `Card`, `Input`, `Tabs`, `Badge`, `Modal`, `ActionButtons`
* **Admin:** `AdminShell`, `AdminIcon`

---

### ⚡ Що працює на реальних даних
Наразі реалізовано наступний функціонал із реальними даними:
* **Графік:** Отримує реальні дані з Binance через WebSocket (`binanceMarketData.ts`).
* **Локалізація (i18n):** Автоматичне визначення мови з Telegram/WebApp (підтримуються `ru` та `en`).

---

### 🎭 Що на моках (все інше)
Для тестування інтерфейсу тимчасово використовуються заглушки (mock-дані):
* `mockUser` — дані користувача та топ-трейдерів
* `mockAssets` — активи та баланси
* `mockSignals` — AI-сигнали для трейдингу
* `mockTrades` — торгові угоди (сделки)
* `mockTransactions` — історія транзакцій (вводи/виводи)
* `mockAdmin` — дані для панелі адміністратора

## Бекенд (Backend)

### 🚫 Поточний стан
Наразі серверна частина проєкту повністю **відсутня**:
* Немає жодного серверного коду.
* Усі API-сервіси реалізовані як клієнтські функції, які повертають заглушки (моки) зі штучною затримкою за допомогою утиліти `mockDelay.ts`.

---

### 🚀 Що потрібно для реалізації реального бекенду

#### 1. База даних (Database)
Для збереження користувачів, балансів та історії операцій необхідно підключити хмарну БД:
* **Supabase** (оптимально, оскільки надає готовий PostgreSQL та підтримку Realtime)
* **Firebase**
* **Vercel Postgres**

#### 2. Автентифікація (Authentication)
* Вхід та ідентифікація користувачів мають відбуватися через **Telegram WebApp initData**.
* Безпека забезпечується шляхом обов'язкової хеш-перевірки (валидації підпису даних за допомогою секретного токена Telegram-бота) на стороні сервера.

#### 3. API-ендпоінти
Для повноцінної роботи додатку необхідно реалізувати такі маршрути:
* `GET/POST /api/user` — отримання та оновлення даних профілю користувача.
* `GET /api/wallet` — перегляд поточного балансу.
* `POST /api/deposit` та `POST /api/withdraw` — створення та обробка транзакцій (депозити/виводи).
* `GET /api/trades` — історія торгових угод (сделок).
* `GET /api/signals` — отримання AI-сигналів для торгівлі.
* `GET/POST /api/admin/*` — панель адміністратора (керування користувачами, статистика тощо).

#### 4. Потокові дані (Live-ціни)
* Організація роботи з WebSocket для відображення графіків у реальному часі.
* Можливе пряме підключення клієнта до Binance або створення проксі-сервера на бекенді для оптимізації трафіку.

---

### 💎 Готовність до інтеграції
Незважаючи на відсутність сервера, архітектура frontend-частини повністю готова до підключення реального API:
* **Структура типів повністю готова:** Усі сутності (`User`, `Wallet`, `Transaction`, `Asset`, `Signal`, `Trade`, `AdminUser`) вже описані в TypeScript.
* Клієнтські сервіси спроєктовані таким чином, що їх можна переключити з мокових даних на реальні HTTP/WebSocket запити **без необхідності змінювати код UI-компонентів**.


## Telegram Mini App frontend

Mobile-first demo frontend for a crypto/trading Telegram Mini App. The project contains mock data only: there is no backend, real trading, payment, wallet, or blockchain logic.

## Stack

- React, Vite, TypeScript
- React Router
- Zustand
- SCSS Modules
- TradingView Lightweight Charts

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
npm run preview
```

The layout is centered at a maximum width of 430px and includes Telegram WebApp initialization. A production backend must validate Telegram `initData`; client-side `initDataUnsafe` must never be used for authorization.
