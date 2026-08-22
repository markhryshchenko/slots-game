# Slot Engine — учебный контекст проекта

## Назначение документа

Этот файл является **контекстом для дальнейшей разработки и обучения**. При продолжении проекта нужно придерживаться описанного ниже стиля: объяснять архитектурные решения, двигаться небольшими шагами, не усложнять проект преждевременными абстракциями и сохранять server-authoritative архитектуру.

---

# 1. Цель проекта

Мы изучаем разработку полноценного slot engine на **TypeScript** начиная с максимально простого классического **Slot 3×3**.

Цель — не просто сделать визуально работающий слот, а понять:

- архитектуру игрового движка;
- RNG;
- reel strips;
- grid;
- paylines;
- paytable;
- win evaluation;
- RTP;
- volatility;
- математическое моделирование;
- server-authoritative архитектуру;
- последующее расширение до 5×3, Wild, Scatter, Free Spins, Cascades, Ways/Megaways и других механик.

---

# 2. Ключевое архитектурное требование

В будущем весь игровой движок должен работать на **backend**.

Клиент отвечает только за визуальное отображение:

- барабанов;
- анимаций spin;
- win popup;
- эффектов;
- звуков;
- UI баланса и ставок.

Клиент **не должен самостоятельно определять результат spin**.

Схема:

```text
CLIENT
  │
  │ Spin request
  ▼
BACKEND
  │
  ├── RNG
  ├── Reel strips
  ├── Math configuration
  ├── Grid generation
  ├── Paylines
  ├── Win evaluation
  ├── Balance / bet validation
  └── Spin result
  │
  ▼
CLIENT
  │
  ├── animate reels
  ├── display symbols
  ├── highlight wins
  └── show win popup
```

Игровой engine не должен зависеть от:

- React;
- React Native;
- PixiJS;
- HTML/CSS;
- DOM;
- HTTP;
- WebSocket.

Это отдельный domain/game layer.

---

# 3. Текущая концепция Slot 3×3

Игровое поле:

```text
┌────────┬────────┬────────┐
│        │        │        │
│ Reel 1 │ Reel 2 │ Reel 3 │
│        │        │        │
├────────┼────────┼────────┤
│        │        │        │
│ Reel 1 │ Reel 2 │ Reel 3 │
│        │        │        │
├────────┼────────┼────────┤
│        │        │        │
│ Reel 1 │ Reel 2 │ Reel 3 │
│        │        │        │
└────────┴────────┴────────┘
```

Изначально используются 5 символов:

```text
CHERRY
LEMON
BELL
STAR
SEVEN
```

Пока без Wild и Scatter.

---

# 4. Главная математическая идея: Reel Strips

Не используем простой случайный выбор символа:

```ts
Math.random() > 0.5 ? 'CHERRY' : 'SEVEN';
```

Вместо этого каждый барабан имеет **reel strip** — последовательность позиций.

Пример:

```ts
const reelStrip = [
  'CHERRY',
  'LEMON',
  'LEMON',
  'BELL',
  'CHERRY',
  'STAR',
  'LEMON',
  'SEVEN',
  'CHERRY',
  'BELL',
];
```

Здесь:

```text
CHERRY × 3
LEMON  × 3
BELL   × 2
STAR   × 1
SEVEN  × 1
```

Поэтому вероятность символов задаётся самим strip.

---

# 5. Разные Reel Strips — ключ к управлению математикой

Три барабана **не обязаны иметь одинаковые strips**.

Например:

```text
Reel 1 → 20 positions
Reel 2 → 24 positions
Reel 3 → 22 positions
```

Или:

```text
Reel 1 → SEVEN 5%
Reel 2 → SEVEN 4%
Reel 3 → SEVEN 2%
```

Тогда вероятность `777` определяется произведением вероятностей на каждом барабане.

Это позволяет тонко управлять:

- RTP;
- частотой выигрышей;
- распределением выигрышей;
- volatility;
- вероятностью крупных комбинаций.

**Важно:** `RTP` нельзя реализовывать как условие вроде `Math.random() < 0.96`. RTP является долгосрочным математическим ожиданием выплат.

---

# 6. Math Profiles

Математика игры должна быть отделена от игрового engine.

Концепция:

```text
Math Profile
  ├── target RTP
  ├── reel strips
  ├── paylines
  └── paytable
```

В будущем:

```text
classic-96
classic-94
classic-92
```

Один и тот же `SlotMachine` может использовать разные math profiles.

Например:

```text
SlotMachine
    ↓
MathConfig: classic-96
    ↓
Reel strips A/B/C
```

или:

```text
SlotMachine
    ↓
MathConfig: classic-94
    ↓
Reel strips D/E/F
```

Engine при этом не переписывается.

---

# 7. RNG

RNG вынесен в отдельную абстракцию:

```ts
export interface RNG {
  next(): number;
  nextInt(max: number): number;
}
```

Текущая учебная реализация:

```ts
export class MathRNG implements RNG {
  next(): number {
    return Math.random();
  }

  nextInt(max: number): number {
    if (!Number.isInteger(max) || max <= 0) {
      throw new Error('max must be a positive integer');
    }

    return Math.floor(this.next() * max);
  }
}
```

Почему RNG отдельный:

- тесты;
- deterministic/fake RNG;
- воспроизводимые spins;
- симуляции;
- возможность позже заменить реализацию;
- отделение инфраструктуры от domain logic.

Для реального gambling backend `Math.random()` нельзя считать финальной production RNG-реализацией. Сейчас он используется только для обучения архитектуре.

---

# 8. Reel

`Reel` знает:

- свой strip;
- RNG;
- как выбрать stop position;
- как получить символ относительно stop.

Логика:

```text
RNG
 ↓
stop position
 ↓
reel strip
 ↓
верхний / центральный / нижний символ
```

Пример:

```ts
const stop = reel.spin();

reel.getSymbolAt(stop, -1);
reel.getSymbolAt(stop, 0);
reel.getSymbolAt(stop, 1);
```

Reel циклический:

```text
... 8 → 9 → 0 → 1 → 2 ...
```

---

# 9. Grid

Grid строится не случайно. Он получается из **stop positions** всех трёх reels.

Например:

```text
Reel 1 → stop 4
Reel 2 → stop 7
Reel 3 → stop 2
```

После чего сервер получает:

```text
┌─────────┬─────────┬─────────┐
│ CHERRY  │  BELL   │  STAR   │
├─────────┼─────────┼─────────┤
│ LEMON   │ CHERRY  │  LEMON  │
├─────────┼─────────┼─────────┤
│ BELL    │  STAR   │ SEVEN   │
└─────────┴─────────┴─────────┘
```

Выбрана структура:

```ts
grid[row][reel]
```

То есть:

```text
grid[0] → верхний ряд
grid[1] → средний ряд
grid[2] → нижний ряд
```

Это удобно для paylines.

---

# 10. Stop positions — важный результат spin

На сервере фундаментальным результатом RNG являются stop positions:

```json
{
  "stops": [14, 7, 19]
}
```

После них детерминированно строится Grid.

Один и тот же набор:

```text
[14, 7, 19]
```

должен всегда давать одинаковый grid при той же математике.

Это полезно для:

- тестирования;
- replay;
- debugging;
- истории spin;
- расследования спорных результатов;
- математических симуляций.

---

# 11. Paylines

Для первого 3×3 используются 5 линий:

```text
1) [0, 0, 0]
2) [1, 1, 1]
3) [2, 2, 2]
4) [0, 1, 2]
5) [2, 1, 0]
```

Графически:

```text
1) ─────────

2) ─────────

3) ─────────
```

диагонали:

```text
4) ╲

5) ╱
```

Payline описывает **только клетки**, которые нужно проверить. Она не знает размер выплаты.

---

# 12. Paytable

Paytable отдельно описывает выплаты.

Пока:

```text
CHERRY ×3 → 5x
LEMON  ×3 → 10x
BELL   ×3 → 20x
STAR   ×3 → 50x
SEVEN  ×3 → 100x
```

Коэффициенты пока учебные и не являются рассчитанной RTP-моделью.

---

# 13. Ставка

В текущем 5-line line-slot предполагается:

```text
total bet = 1
```

и:

```text
line bet = total bet / number of active paylines
```

При 5 линиях:

```text
$1 total bet
↓
$0.20 per line
```

Поэтому выигрыш `CHERRY ×3` с множителем `5x` даёт:

```text
0.20 × 5 = $1
```

а не `$5`.

Это важно для корректного RTP.

---

# 14. WinEvaluator

`WinEvaluator` получает:

```text
grid
paylines
paytable
line bet
```

и возвращает массив выигрышей.

Пример:

```ts
{
  paylineId: 2,
  symbol: 'CHERRY',
  count: 3,
  multiplier: 5,
  amount: 1
}
```

Сначала реализована только схема:

```text
AAA = win
AAB = no win
ABC = no win
```

Wild, Scatter и другие специальные символы ещё не реализованы.

---

# 15. SpinResult

Базовый результат spin:

```ts
{
  stops,
  grid,
  wins,
  totalWin
}
```

В дальнейшем планируется добавить:

- spinId;
- timestamp;
- bet;
- balance;
- feature state;
- bonus state;
- free spins;
- дополнительные server-side данные.

Но это пока не нужно.

---

# 16. SlotMachine

`SlotMachine` соединяет всё вместе:

```text
spin(bet)
   ↓
validate bet
   ↓
spin all reels
   ↓
get stop positions
   ↓
create grid
   ↓
evaluate wins
   ↓
calculate total win
   ↓
return SpinResult
```

Класс не должен заниматься визуальной частью.

---

# 17. Math Simulator

Отдельно существует Monte Carlo simulator.

Он запускает много настоящих spins:

```text
100 000
1 000 000
10 000 000
```

и считает:

```text
totalBet
totalWin
RTP
hitRate
averageWin
maxWin
```

RTP:

```text
RTP = totalWin / totalBet
```

Simulator нужен для проверки фактического поведения RNG и для сравнения с теоретическими расчётами.

---

# 18. Текущий MathAnalyzer

Следующий текущий этап проекта — сделать **нормальный `MathAnalyzer`**.

Для текущего маленького 3×3 не нужно сразу использовать Monte Carlo для RTP.

Если у нас:

```text
Reel 1 = 10 positions
Reel 2 = 10 positions
Reel 3 = 10 positions
```

общее количество stop combinations:

```text
10 × 10 × 10 = 1000
```

Можно перебрать **все исходы** и получить точный theoretical RTP.

То есть:

```text
MathAnalyzer
    ↓
all possible stop combinations
    ↓
create grid
    ↓
evaluate wins
    ↓
calculate exact expectation
```

---

# 19. Что должен считать MathAnalyzer

Минимальный отчёт:

```text
Profile ID
Total possible outcomes
Theoretical RTP
Expected win per spin
Hit rate
Number of winning outcomes
Average win on hit
Variance
Standard deviation
Max win
Probability symbols on each reel
```

В дальнейшем добавить:

```text
Win distribution
RTP contribution by symbol
RTP contribution by feature
Hit frequency by symbol
Bonus contribution
Free Spins contribution
```

---

# 20. Теоретический RTP

Для ставки 1 RTP равен математическому ожиданию выплаты за spin.

Простая идея:

```text
Probability(combination)
×
Payout(combination)
```

для всех возможных выигрышных событий.

Затем всё суммируется.

Для независимого результата на разных paylines математическое ожидание общей выплаты равно сумме математических ожиданий выплат по линиям, даже если линии пересекаются.

---

# 21. Hit Rate

Hit rate — вероятность получить хотя бы один выигрышный spin.

Пример:

```text
84 winning outcomes
1000 total outcomes
```

Получаем:

```text
84 / 1000 = 8.4%
```

Hit rate не равен RTP.

Можно иметь:

```text
RTP = 96%
Hit Rate = 8%
```

и это нормально.

---

# 22. Volatility

Два слота могут иметь одинаковый RTP:

```text
Slot A → RTP 96%
Slot B → RTP 96%
```

но сильно отличаться по volatility.

Например:

```text
Low volatility
частые небольшие выигрыши

High volatility
редкие крупные выигрыши
```

Поэтому в математическом отчёте нужны variance и standard deviation.

Текущая идея:

```text
Variance = E(X²) - E(X)²
Standard deviation = √Variance
```

Позже будем использовать это для настройки volatility.

---

# 23. Главная цель по RTP

В конфигурации сейчас есть:

```ts
targetRtp: 0.96
```

Но это пока **только желаемое значение**.

Оно не означает, что реальная игра имеет RTP 96%.

Сначала analyzer должен показать фактический theoretical RTP.

Затем нужно менять:

- reel strips;
- paytable;

до тех пор, пока фактическое значение не приблизится к target.

---

# 24. План настройки Reel Strips

После нормального MathAnalyzer следующий этап:

```text
Target RTP 96%
      ↓
Analyze current math
      ↓
Calculate RTP contribution
      ↓
Change reel strips
      ↓
Recalculate
      ↓
Find suitable distribution
      ↓
Monte Carlo validation
```

Дальше можно создать несколько profiles:

```text
classic-92
classic-94
classic-96
```

И сравнивать их.

---

# 25. Важный учебный стиль

При дальнейшем обучении нужно придерживаться следующих принципов:

### Не прыгать слишком далеко

Сначала довести простой 3×3 до понимания.

Порядок:

```text
RNG
↓
Reel
↓
Grid
↓
Paylines
↓
Paytable
↓
WinEvaluator
↓
SpinResult
↓
MathAnalyzer
↓
Simulator
↓
RTP
↓
Volatility
```

И только потом:

```text
Wild
Scatter
Free Spins
Multipliers
Cascades
Cluster Pays
Hold & Win
5×3
Ways
Megaways
```

### Объяснять перед кодом

Перед добавлением класса/функции объяснять:

1. зачем она нужна;
2. какую проблему решает;
3. почему выбран именно такой подход;
4. как это связано с архитектурой будущего backend.

### Не создавать абстракции без необходимости

Но и не упрощать архитектуру обратно до огромного файла.

Нужный уровень абстракции определяется реальной ответственностью компонентов.

---

# 26. Что сейчас НЕ делаем

Пока не добавляем:

- React;
- PixiJS;
- UI;
- анимации;
- HTTP API;
- WebSocket;
- базу данных;
- авторизацию;
- баланс пользователя;
- Wild;
- Scatter;
- Free Spins;
- бонусные игры;
- 5×3.

Сначала нужно закончить математику и core engine простого 3×3.

---

# 27. Точная точка продолжения

Продолжать нужно с:

## `MathAnalyzer`

Сделать нормальный математический отчёт:

```text
- total outcomes
- theoretical RTP
- expected win
- hit rate
- average win on hit
- variance
- standard deviation
- max win
- symbol probabilities per reel
- win distribution
- RTP contribution by symbol
```

После этого:

## Подбор Reel Strips под Target RTP

Например:

```text
Target = 96%
Current = 61.xx%
```

и начать изменять strips осознанно, наблюдая:

```text
RTP
Hit Rate
Volatility
Max Win
```

Затем использовать Monte Carlo simulator как проверку теоретического результата.

---

# 28. Конечная архитектура, к которой движемся

```text
                CLIENT
                  │
            Spin request
                  │
                  ▼
               BACKEND
                  │
          ┌───────▼────────┐
          │   Game Layer   │
          └───────┬────────┘
                  │
          ┌───────▼────────┐
          │  Slot Engine   │
          ├────────────────┤
          │ RNG            │
          │ Reel           │
          │ Grid           │
          │ Paylines       │
          │ Paytable       │
          │ WinEvaluator   │
          └───────┬────────┘
                  │
          ┌───────▼────────┐
          │  Math Profile  │
          ├────────────────┤
          │ Reel Strips     │
          │ Paytable        │
          │ Paylines        │
          │ Target RTP      │
          └───────┬────────┘
                  │
          ┌───────▼────────┐
          │ Math Analyzer  │
          │ + Simulator    │
          └────────────────┘
```

---

# 29. Главная цель обучения

К концу первого этапа должно быть понятно не только **как написать слот**, но и почему он математически работает.

Нужно уметь ответить на вопросы:

- откуда берётся результат spin;
- почему Reel Strip влияет на RTP;
- как рассчитывается вероятность комбинации;
- как формируется payout;
- чем RTP отличается от hit rate;
- чем RTP отличается от volatility;
- почему разные reel strips позволяют создавать разные math profiles;
- как проверить theoretical RTP через simulation;
- как сервер может авторитетно выдавать клиенту результат spin.

Только после этого переходим к расширенным механикам.
