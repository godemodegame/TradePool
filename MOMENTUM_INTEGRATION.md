# Momentum DEX Integration Guide

Этот файл содержит пошаговые инструкции по интеграции TradePool с Momentum DEX.

## 📍 Где найти TODO комментарии

Все TODO комментарии находятся в `sources/tradepool.move`:

1. **Строки 1-34**: Общий план интеграции с Momentum
2. **Строки 70-83**: TODO в структуре `Pool` - добавление `momentum_pool_id`
3. **Строки 320-361**: Детальный TODO для `admin_buy_token()` функции
4. **Строки 411-453**: Детальный TODO для `admin_sell_token()` функции

## 🔧 Шаги интеграции

### Шаг 1: Добавить зависимости Momentum

Когда появится официальный репозиторий Momentum, добавьте в `Move.toml`:

```toml
[dependencies]
Momentum = { git = "https://github.com/momentum-dex/contracts.git", subdir = "momentum", rev = "main" }
```

### Шаг 2: Импортировать модули Momentum

В начало `sources/tradepool.move` добавьте:

```move
use momentum::pool::{Self as momentum_pool, Pool as MomentumPool};
use momentum::router::{Self as momentum_router};
```

### Шаг 3: Обновить структуру Pool

Добавьте поле для хранения ID Momentum пула (см. TODO в строке 79):

```move
public struct Pool<phantom TOKEN> has key {
    id: UID,
    name: String,
    sui_balance: Balance<SUI>,
    token_balance: Balance<TOKEN>,
    total_shares: u64,
    momentum_pool_id: ID,  // <-- ДОБАВИТЬ
}
```

### Шаг 4: Обновить create_pool()

Добавьте параметр `momentum_pool_id`:

```move
public fun create_pool<TOKEN>(
    _admin_cap: &AdminCap,
    registry: &mut PoolRegistry,
    name: vector<u8>,
    momentum_pool_id: ID,  // <-- ДОБАВИТЬ
    ctx: &mut TxContext
)
```

### Шаг 5: Заменить логику swap

Найдите секции `// ==================== TODO: REPLACE THIS SECTION ====================` в:

- `admin_buy_token()` (строка 375-389)
- `admin_sell_token()` (строка 467-481)

Замените на вызовы Momentum API (см. детальные инструкции в комментариях).

## 🔍 Альтернативный подход: PTB (Рекомендуется)

Вместо прямой интеграции в контракте, можно использовать **Programmable Transaction Blocks** на стороне клиента:

```typescript
// Пример PTB композиции (TypeScript SDK)
const tx = new TransactionBlock();

// 1. Вызвать admin_buy_token (берем SUI из пула)
const [tokenOut] = tx.moveCall({
  target: `${PACKAGE_ID}::tradepool::admin_buy_token`,
  arguments: [tx.object(ADMIN_CAP), tx.object(POOL), tx.object(SUI_COIN), tx.pure(MIN_OUT)],
  typeArguments: [TOKEN_TYPE],
});

// 2. Немедленно использовать tokenOut для вызова Momentum swap
const [swapResult] = tx.moveCall({
  target: `${MOMENTUM_PACKAGE}::router::swap`,
  arguments: [tx.object(MOMENTUM_POOL), tokenOut, tx.pure(MIN_AMOUNT)],
  typeArguments: [SUI, TOKEN],
});

// 3. Положить результат обратно в пул
tx.moveCall({
  target: `${PACKAGE_ID}::tradepool::deposit`,
  arguments: [tx.object(POOL), swapResult.sui, swapResult.token],
  typeArguments: [TOKEN_TYPE],
});
```

## 📚 Ресурсы

- **Momentum Whitepaper**: https://docs.mmt.finance
- **Sui PTB Documentation**: https://docs.sui.io/concepts/transactions/programmable-transaction-blocks
- **Move Language**: https://move-language.github.io/move/

## ⚠️ Важные замечания

1. **Точные имена функций** Momentum могут отличаться - проверьте их SDK
2. **Комиссии**: Momentum может взимать комиссии - учтите это в расчетах
3. **Slippage protection**: Всегда используйте `min_amount_out` параметр
4. **Тестирование**: Тестируйте на testnet перед деплоем в mainnet
5. **Audits**: Momentum - крупный DEX, но всегда проводите аудит вашего кода

## 🚀 Текущий статус

✅ Архитектура готова для интеграции
✅ TODO комментарии добавлены во всех нужных местах
✅ Generic типы поддерживают любые токены
✅ События отслеживания настроены
⏳ Ожидается документация Momentum API

## 📞 Что делать дальше

1. Следите за релизом Momentum SDK/документации
2. Когда появится - следуйте TODO в коде (строки 320-361, 411-453)
3. Тестируйте интеграцию на testnet
4. Проведите security audit перед mainnet

---

**Последнее обновление**: 2025-12-12
**Контакты Momentum**: https://twitter.com/momentum_dex (проверьте актуальные ссылки)
