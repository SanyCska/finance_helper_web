# Финансовый Telegram Mini App — план реализации

> **Замечание об исполнении:** план исполняется автором в той же сессии, где написана
> спека, поэтому код не дублируется в markdown целиком — вместо этого у каждой задачи
> зафиксированы точные файлы, интерфейсы и критерии приёмки. Шаги отмечаются чекбоксами.

**Цель:** Telegram Mini App, который принимает CSV из Дзен-мани через бота, показывает
траты и сальдо по месяцам, динамику категорий и сравнение плана с фактом.

**Архитектура:** Python-бэкенд (FastAPI + Postgres) хранит транзакции, курсы валют, доходы
и планы; агрегации считаются чистыми функциями над выборкой месяца. Next.js-фронтенд —
Telegram Mini App, ходит в API с `initData` в заголовке. Бот на aiogram отдаёт CSV в API
и присылает отчёт об импорте.

**Стек:** Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL 16, aiogram 3, pytest;
Next.js 15, TypeScript, Tailwind v4, TanStack Query, Vitest; docker-compose.

## Глобальные ограничения

- Базовая валюта — USD, настраивается через `BASE_CURRENCY`.
- Категории хранятся дословно из CSV, без нормализации и склейки.
- Категория `Correction` исключается из агрегатов (`EXCLUDED_CATEGORIES`).
- Дедупликация импорта — по `zen_created_at`, повторный импорт даёт 0 новых строк.
- Импорт не падает при недоступности API курсов: `amount_base = NULL`, `fx_status = pending`.
- Внешних CDN в рантайме фронтенда нет, шрифт Archivo подключается через `next/font`.
- Язык интерфейса — русский.
- Все денежные поля — `numeric`/`Decimal`, не `float`.

---

## Часть A — Бэкенд

### Задача A1: Скелет проекта и конфигурация

**Файлы:**
- Создать: `pyproject.toml`, `app/__init__.py`, `app/config.py`, `app/db.py`, `app/main.py`
- Создать: `.env.example`, `.gitignore`, `tests/conftest.py`

**Производит:** `Settings` (pydantic-settings) с полями `database_url`, `bot_token`,
`base_currency`, `allowed_telegram_ids: list[int]`, `excluded_categories: list[str]`,
`internal_token`, `dev_bypass_auth`, `dev_telegram_id`, `env`, `api_base_url`,
`webapp_url`, `fx_api_base`. Фабрика `get_settings()` с `lru_cache`.
`app/db.py`: `engine`, `SessionLocal`, `Base`, зависимость `get_db()`.

- [ ] Создать структуру, зависимости, `Settings`
- [ ] Тест: `Settings` читает `EXCLUDED_CATEGORIES` из строки через запятую
- [ ] Тест проходит, коммит

### Задача A2: Модели и миграции

**Файлы:**
- Создать: `app/models/__init__.py`, `app/models/user.py`, `app/models/transaction.py`,
  `app/models/fx.py`, `app/models/budget.py` (monthly_income, plans, plan_lines),
  `app/models/imports.py`
- Создать: `alembic.ini`, `migrations/env.py`, первая ревизия

**Производит:** `User`, `Transaction`, `FxRate`, `MonthlyIncome`, `Plan`, `PlanLine`,
`ImportBatch`; енамы `Direction`, `FxStatus`, `TxSource`.

Модели портируемы на SQLite (без PG-специфичных типов, кроме `JSON`), чтобы тесты шли
без Postgres.

- [ ] Модели по схеме из спеки, уникальные индексы
- [ ] Alembic-миграция, `alembic upgrade head` на пустой БД
- [ ] Тест: создание таблиц на SQLite, вставка двух транзакций с одинаковым
      `zen_created_at` падает с `IntegrityError`
- [ ] Коммит

### Задача A3: Парсер CSV Дзен-мани

**Файлы:**
- Создать: `app/services/zen_csv.py`, `tests/test_zen_csv.py`

**Производит:**
```python
@dataclass(frozen=True)
class ParsedRow:
    date: date
    category_name: str
    account_name: str
    payee: str | None
    comment: str | None
    direction: Direction
    amount_original: Decimal
    currency: str
    zen_created_at: datetime | None
    zen_changed_at: datetime | None

@dataclass(frozen=True)
class ParseResult:
    rows: list[ParsedRow]
    skipped_transfers: int
    errors: list[ParseError]   # ParseError(line_no: int, message: str, raw: str)

def parse_zen_csv(content: bytes) -> ParseResult: ...
```

**Тесты:** BOM в первой строке; расход; доход; перевод (обе суммы > 0) → `skipped_transfers`;
обе суммы нулевые → ошибка; дробная сумма `1234.56`; пустая категория сохраняется как `''`;
битая дата → ошибка с номером строки; отсутствующая колонка → понятное исключение.

- [ ] Тесты, реализация, зелёный прогон, коммит

### Задача A4: Курсы валют

**Файлы:**
- Создать: `app/services/fx.py`, `tests/test_fx.py`

**Производит:**
```python
class FxClient:                       # httpx, ретраи, таймаут
    def fetch_day(self, day: date) -> dict[str, Decimal] | None: ...

class FxService:
    def ensure_rates(self, days: Iterable[date]) -> None: ...
    def convert(self, amount: Decimal, currency: str, day: date) -> tuple[Decimal | None, Decimal | None, FxStatus]: ...
    def backfill(self) -> int: ...     # добивает pending-транзакции
```

Ответ API — курсы `usd → X`, храним `rate_to_usd = 1 / x`. `USD → USD` = 1.
`approx` — курс с ближайшей даты в пределах 7 дней. Сеть недоступна → `pending`.

**Тесты:** точное совпадение даты; ближайшая дата назад/вперёд → `approx`;
за пределами окна → `pending`; недоступность сети не выбрасывает исключение;
курс `USD` всегда 1; повторный `ensure_rates` не делает лишних запросов (кэш в БД).
HTTP мокается через `httpx.MockTransport`.

- [ ] Тесты, реализация, зелёный прогон, коммит

### Задача A5: Импортёр

**Файлы:**
- Создать: `app/services/importer.py`, `tests/test_importer.py`

**Производит:**
```python
@dataclass
class ImportReport:
    rows_total: int
    rows_new: int
    rows_duplicate: int
    rows_error: int
    skipped_transfers: int
    pending_fx: int
    errors: list[str]

def import_csv(db: Session, user: User, filename: str, content: bytes) -> ImportReport: ...
```

Порядок: парсинг → `ensure_rates` по уникальным датам → выборка существующих
`zen_created_at` одним запросом → вставка новых → запись `ImportBatch`.

**Тесты:** импорт трёх строк → `rows_new == 3`; повторный импорт того же файла →
`rows_new == 0, rows_duplicate == 3`; ручные транзакции не затрагиваются;
битые строки не мешают остальным; `ImportBatch` записан с верными счётчиками.

- [ ] Тесты, реализация, зелёный прогон, коммит

### Задача A6: Агрегации

**Файлы:**
- Создать: `app/services/stats.py`, `tests/test_stats.py`

**Производит:** чистые функции над `list[Transaction]`:
```python
def month_summary(txs, income_manual: Decimal) -> MonthSummary
def category_breakdown(txs, prev_txs) -> list[CategorySlice]   # с delta_pct
def category_dynamics(txs_by_month) -> list[MonthPoint]
def compare_months(a_txs, b_txs) -> list[CategoryDiff]
```
Плюс запросные хелперы `fetch_month(db, user, month)`.

`MonthSummary`: `income_total`, `income_manual`, `income_from_csv`, `outcome_total`,
`saldo`, `spent_share`, `tx_count`, `pending_count`.

**Тесты:** сальдо; исключение `Correction`; исключение `pending`; дельта категории при
нулевом прошлом месяце → `None`; пустой месяц → нули, без деления на ноль;
доли категорий суммируются в 100% с точностью до цента; сортировка по убыванию суммы.

- [ ] Тесты, реализация, зелёный прогон, коммит

### Задача A7: Авторизация

**Файлы:**
- Создать: `app/auth.py`, `tests/test_auth.py`

**Производит:** `validate_init_data(init_data: str, bot_token: str, max_age_s: int) -> dict`,
зависимость `current_user(...)` — валидация подписи, проверка вайтлиста, создание
пользователя при первом входе, поддержка `X-Internal-Token` для бота и `DEV_BYPASS_AUTH`.

**Тесты:** валидная подпись (генерируется в тесте тем же алгоритмом); испорченный `hash`;
протухший `auth_date`; telegram_id вне вайтлиста → 403; `DEV_BYPASS_AUTH` в проде игнорируется.

- [ ] Тесты, реализация, зелёный прогон, коммит

### Задача A8: HTTP API

**Файлы:**
- Создать: `app/schemas/*.py`, `app/api/__init__.py`, `app/api/meta.py`,
  `app/api/transactions.py`, `app/api/stats.py`, `app/api/budget.py`, `app/api/imports.py`
- Создать: `tests/test_api_*.py`

Все ручки из спеки. Правка и удаление — только для `source = manual` (иначе 409:
импорт перезальёт изменение). Ручное добавление конвертирует валюту через `FxService`.

**Тесты:** каждая ручка — успешный сценарий и главный отказ (404 на несуществующий месяц,
409 на правку csv-транзакции, 422 на кривые параметры, 401 без заголовка).

- [ ] Тесты, реализация, зелёный прогон, коммит

### Задача A9: Бот

**Файлы:**
- Создать: `app/bot/__init__.py`, `app/bot/main.py`, `app/bot/handlers.py`,
  `app/bot/scheduler.py`, `tests/test_bot_handlers.py`

`/start` с кнопкой Mini App; приём документа `.csv` → импорт → отчёт;
чужой telegram_id → вежливый отказ; планировщик напоминания в предпоследний день месяца.

**Тесты:** форматирование отчёта об импорте; отказ чужому пользователю;
обработчик документа вызывает импорт с содержимым файла (Bot мокается).

- [ ] Тесты, реализация, зелёный прогон, коммит

### Задача A10: Docker и запуск

**Файлы:**
- Создать: `Dockerfile`, `docker-compose.yml`, `README.md`, `scripts/import_csv.py`

Сервисы: `db`, `api`, `bot`, `web`. Миграции применяются на старте `api`.
CLI-скрипт импорта для локальной заливки дампа без бота.

**Приёмка:** `docker compose up -d db` + `alembic upgrade head` + скрипт импорта реального
дампа → 6608 строк; повторный запуск → 0 новых.

- [ ] Сборка, проверка на реальном дампе, коммит

---

## Часть B — Фронтенд

### Задача B1: Скелет Next.js и дизайн-токены

**Файлы:**
- Создать: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`,
  `app/globals.css`, `lib/format.ts`, `tests/format.test.ts`, `vitest.config.ts`

Токены из мокапа в `globals.css`. Шрифт Archivo через `next/font/google`.
`lib/format.ts`: `formatMoney(cents|Decimal, currency)` с `tabular-nums` и неразрывными
пробелами как в мокапе (`$4 000`, `−$13.89`), `formatMonthTitle('2026-07') => 'Июль 2026'`,
`formatDayTitle` → `31 июля`.

- [ ] Тесты форматтеров, реализация, `next build` зелёный, коммит

### Задача B2: Слой API и Telegram

**Файлы:**
- Создать: `lib/telegram.ts`, `lib/api.ts`, `lib/queries.ts`, `app/providers.tsx`

`lib/telegram.ts` — безопасная обёртка над `window.Telegram.WebApp` с работой вне Telegram.
`lib/api.ts` — типизированный клиент, подставляет `Authorization: tma <initData>`.
`lib/queries.ts` — хуки TanStack Query на все ручки.

- [ ] Реализация, тест: клиент подставляет заголовок и разворачивает ошибку API, коммит

### Задача B3: Общие компоненты и графики

**Файлы:**
- Создать: `components/Screen.tsx`, `components/TabBar.tsx`, `components/MonthTabs.tsx`,
  `components/Donut.tsx`, `components/BarRow.tsx`, `components/MonthlyBars.tsx`,
  `components/States.tsx` (загрузка/ошибка/пусто), `components/FxBanner.tsx`
- Создать: `lib/colors.ts` — детерминированный цвет категории по хешу имени
- Тесты: `tests/donut.test.ts` (геометрия сегментов), `tests/colors.test.ts`

- [ ] Тесты, реализация, коммит

### Задача B4: Главный экран (мокап 2b)

**Файлы:** `app/page.tsx`, `components/home/*`

Переключатель трёх месяцев, сальдо крупно, донат, топ-3 категории с дельтами,
последние операции, кнопка «Добавить трату», таб-бар.

- [ ] Реализация, скриншот против мокапа, коммит

### Задача B5: Транзакции и добавление (2d, 2e)

**Файлы:** `app/transactions/page.tsx`, `app/add/page.tsx`, `components/tx/*`

Группировка по дням с суммой дня, фильтры по категориям и счетам, поиск.
Форма добавления: сумма, валюта, категория, счёт, дата, комментарий.

- [ ] Реализация, скриншоты, коммит

### Задача B6: Аналитика (2f, 2g, 2h)

**Файлы:** `app/categories/page.tsx`, `app/category/[name]/page.tsx`, `app/compare/page.tsx`

- [ ] Реализация, скриншоты, коммит

### Задача B7: План (2i, 2j)

**Файлы:** `app/plan/page.tsx`, `app/plan/vs-fact/page.tsx`, `components/plan/*`

Строки плана с добавлением/удалением, автозаполнение по среднему за 3 месяца,
редактирование дохода месяца, итог и ожидаемое сальдо. План vs факт по итогу.

- [ ] Реализация, скриншоты, коммит

### Задача B8: Сборка и сквозная проверка

- [ ] `next build`, `tsc --noEmit`, `vitest run` зелёные
- [ ] Все восемь экранов открыты в браузере на реальных данных, скриншоты сняты
- [ ] README с инструкцией: BotFather, туннель, переменные окружения
- [ ] Коммит

---

## Порядок исполнения

A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8 → A9 → A10 → B1 → B2 → B3 → B4 → B5 → B6 → B7 → B8.

Бэкенд идёт первым целиком: фронт без работающего API проверить нечем, а реальные данные
из дампа нужны для визуальной сверки с мокапами.
