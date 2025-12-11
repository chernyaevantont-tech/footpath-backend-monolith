# Footpath Path API - Полная документация

Это руководство описывает REST API для генерации персонализированных пешеходных маршрутов в системе Footpath. API позволяет создавать маршруты на основе параметров времени, дистанции, скорости ходьбы и предпочтений пользователя. Система автоматически подбирает интересные места, строит оптимальный путь и предоставляет пошаговую навигацию.

**Базовый URL:** `https://api.footpath.com/api`  
**Формат:** JSON  
**Аутентификация:** JWT Bearer Token

Все запросы требуют токен авторизации в заголовке:
```http
Authorization: Bearer <your_jwt_token>
```

Токен получается через `/auth/login` или `/auth/register`.


## Генерация маршрута

Основной эндпоинт для создания персонализированного пешеходного маршрута.

**POST** `/paths/generate`

Этот метод анализирует ваши параметры (время, дистанцию, скорость), находит подходящие места в указанной области, строит оптимальный маршрут используя жадный алгоритм ближайшего соседа, запрашивает у OSRM геометрию пешеходного пути и возвращает полный маршрут с пошаговой навигацией.

### Параметры запроса

Все параметры передаются в теле запроса в формате JSON:

**Обязательные поля:**

- `totalTime` (number) - Общее время прогулки в минутах. Должно быть не меньше 15. Включает время ходьбы, время на местах (по 15 минут на каждое) и буфер 15 минут.

- `maxDistance` (number) - Максимальная дистанция маршрута в километрах. Должна быть положительным числом. Рассчитывается по формуле: `(доступное_время_ходьбы / 60) × скорость_ходьбы`.

- `walkingSpeed` (number) - Скорость ходьбы в км/ч. Диапазон: от 2.0 до 10.0. Средняя скорость взрослого человека - 4-5 км/ч.

**Опциональные поля:**

- `startLatitude` (number) - Широта начальной точки (от -90 до 90). Требуется либо эта пара координат, либо `startPlaceId`.

- `startLongitude` (number) - Долгота начальной точки (от -180 до 180).

- `startPlaceId` (string UUID) - ID существующего места как точка старта. Альтернатива координатам.

- `endLatitude` (number) - Широта конечной точки. Если не указана, маршрут заканчивается в последнем выбранном месте.

- `endLongitude` (number) - Долгота конечной точки.

- `endPlaceId` (string UUID) - ID места как конечная точка.

- `isCircular` (boolean) - Круговой маршрут (вернуться к старту). По умолчанию `false`. Когда `true`, конечная точка автоматически становится равной начальной.

- `maxPlaces` (number) - Максимальное количество мест для посещения. Диапазон: 1-20, по умолчанию 10. **Примечание:** При указании координат старта/финиша (`startLatitude`/`startLongitude` или `endLatitude`/`endLongitude`) или кругового маршрута можно построить маршрут даже с 1 местом. Без явных координат старта/финиша требуется минимум 2 места.

- `tags` (string[]) - Фильтр по тегам мест, например `["park", "museum"]`. Место включается если имеет хотя бы один из указанных тегов.

- `includedPlaceIds` (string[] UUID) - Обязательные места, которые должны быть включены в маршрут.

- `name` (string) - Название маршрута. Если не указано, генерируется автоматически.

- `description` (string) - Описание маршрута.

### Пример запроса

```json
{
  "totalTime": 120,
  "maxDistance": 2.25,
  "walkingSpeed": 4.5,
  "startLatitude": 55.7558,
  "startLongitude": 37.6173,
  "isCircular": false,
  "maxPlaces": 5,
  "tags": ["park", "museum"],
  "name": "Вечерняя прогулка"
}
```

### Ответ (201 Created)

При успешной генерации возвращается полный объект маршрута со всей информацией:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Вечерняя прогулка",
  "description": null,
  "totalDistance": 2.1,
  "estimatedTime": 115,
  "startPoint": {
    "latitude": 55.7558,
    "longitude": 37.6173
  },
  "endPoint": {
    "latitude": 55.7612,
    "longitude": 37.6208
  },
  "isCircular": false,
  "difficulty": "easy",
  "createdAt": "2025-12-11T10:30:00.000Z",
  "updatedAt": "2025-12-11T10:30:00.000Z",
  "creator": {
    "id": "user-123",
    "username": "ivan_petrov",
    "email": "ivan@example.com"
  },
  "places": [
    {
      "id": "place-1",
      "name": "Парк Зарядье",
      "description": "Современный парк в центре Москвы",
      "location": {
        "latitude": 55.7515,
        "longitude": 37.6289
      },
      "rating": 4.7,
      "category": "park",
      "tags": ["park", "nature"],
      "visitOrder": 0,
      "timeSpent": 15,
      "photoUrl": "https://example.com/zaryadye.jpg"
    },
    {
      "id": "place-2",
      "name": "Кремль",
      "description": "Исторический комплекс в центре Москвы",
      "location": {
        "latitude": 55.7520,
        "longitude": 37.6175
      },
      "rating": 4.9,
      "category": "museum",
      "tags": ["museum", "history"],
      "visitOrder": 1,
      "timeSpent": 15,
      "photoUrl": "https://example.com/kremlin.jpg"
    }
  ],
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [37.6173, 55.7558],
      [37.6289, 55.7515],
      [37.6175, 55.7520],
      [37.6208, 55.7612]
    ]
  },
  "steps": [
    {
      "distance": 450,
      "duration": 324,
      "instruction": "Идите прямо по улице Ильинка",
      "name": "Ильинка",
      "maneuver": {
        "type": "depart",
        "modifier": "straight",
        "location": [37.6173, 55.7558]
      }
    },
    {
      "distance": 320,
      "duration": 230,
      "instruction": "Поверните направо на Красную площадь",
      "name": "Красная площадь",
      "maneuver": {
        "type": "turn",
        "modifier": "right",
        "location": [37.6208, 55.7539]
      }
    }
  ]
}
```

### Структура ответа

**Основные поля маршрута:**

- `id` - Уникальный UUID маршрута
- `name` - Название маршрута
- `description` - Описание (может быть null)
- `totalDistance` - Общая дистанция в километрах (реальное расстояние по дорогам от OSRM)
- `estimatedTime` - Общее время прохождения в минутах
- `startPoint` / `endPoint` - Координаты начала и конца маршрута
- `isCircular` - Круговой маршрут или нет
- `difficulty` - Сложность: `"easy"`, `"moderate"` или `"hard"` (рассчитывается на основе дистанции и скорости)
- `createdAt` / `updatedAt` - Временные метки в ISO 8601

**Информация о создателе (`creator`):**

- `id` - UUID пользователя
- `username` - Имя пользователя
- `email` - Email

**Места на маршруте (`places`):**

Массив мест в порядке посещения. Каждое место содержит:

- `id` - UUID места
- `name` - Название
- `description` - Описание (может быть null)
- `location` - Координаты (`latitude`, `longitude`)
- `rating` - Рейтинг от 0 до 5 (может быть null)
- `category` - Категория места (может быть null)
- `tags` - Массив тегов, например `["park", "nature"]`
- `visitOrder` - Порядок посещения (0, 1, 2...)
- `timeSpent` - Планируемое время на месте в минутах (по умолчанию 15)
- `photoUrl` - Ссылка на фото (может быть null)

**Геометрия маршрута (`geometry`):**

GeoJSON LineString с координатами пешеходного пути по дорогам от OSRM:

- `type` - Всегда `"LineString"`
- `coordinates` - Массив координат в формате `[longitude, latitude]` (сначала долгота!)

Важно: OSRM возвращает координаты в формате [lon, lat], а не [lat, lon]. При отрисовке на картах учитывайте это.

**Маршрут включает:**
- Начальную точку (если указаны `startLatitude`/`startLongitude`)
- Все выбранные места в оптимальном порядке
- Конечную точку (если указаны `endLatitude`/`endLongitude` и `isCircular=false`)

Первая координата в `geometry.coordinates` - это точка старта маршрута, последняя - точка финиша.

**Пошаговая навигация (`steps`):**

Массив инструкций для навигации. Каждый шаг содержит:

- `distance` - Расстояние в метрах
- `duration` - Время прохождения в секундах
- `instruction` - Текстовая инструкция на русском ("Поверните налево...")
- `name` - Название улицы/дороги
- `maneuver` - Объект с информацией о маневре:
  - `type` - Тип маневра: `"turn"`, `"depart"`, `"arrive"`, `"continue"`
  - `modifier` - Модификатор: `"left"`, `"right"`, `"straight"`, `"slight left"`, `"sharp right"` и т.д. (может быть null)
  - `location` - Координаты маневра `[longitude, latitude]`

### Ошибки

**400 Bad Request** - Неверные параметры или невозможно построить маршрут:

```json
{
  "statusCode": 400,
  "message": [
    "totalTime must not be less than 15",
    "walkingSpeed must not be greater than 10"
  ],
  "error": "Bad Request"
}
```

**400 - Недостаточно мест:**

```json
{
  "statusCode": 400,
  "message": "Unable to generate route: not enough places found within the specified constraints. Try increasing totalTime, maxDistance, or reducing maxPlaces.",
  "error": "Bad Request"
}
```

Эта ошибка возникает когда алгоритм нашел недостаточно мест в указанной области с учетом всех ограничений (время, дистанция, теги). 

**Минимальное количество мест:**
- С координатами старта/финиша или круговым маршрутом: **минимум 1 место**
- Без явных координат: **минимум 2 места**

**Решение:** увеличьте `totalTime` или `maxDistance`, уменьшите `maxPlaces`, уберите фильтры `tags`, или выберите другую локацию.

**400 - Нет мест в области:**

```json
{
  "statusCode": 400,
  "message": "No places found matching your criteria",
  "error": "Bad Request"
}
```

**401 Unauthorized** - Отсутствует или невалидный токен:

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**503 Service Unavailable** - OSRM сервис недоступен:

```json
{
  "statusCode": 503,
  "message": "Failed to calculate route. OSRM service may be starting up.",
  "error": "Service Unavailable"
}
```

При получении 503 повторите запрос через несколько секунд.


## Другие эндпоинты

### Получить все маршруты пользователя

**GET** `/paths`

Возвращает список всех маршрутов текущего пользователя. Ответ - массив объектов маршрутов (структура такая же как при генерации). Может вернуть пустой массив если у пользователя еще нет маршрутов.

**Пример ответа (200 OK):**

```json
[
  {
    "id": "path-1",
    "name": "Утренняя прогулка",
    "totalDistance": 2.5,
    "estimatedTime": 45,
    "isCircular": true,
    "difficulty": "easy",
    "createdAt": "2025-12-09T08:00:00.000Z",
    "places": [...],
    "geometry": {...}
  },
  {
    "id": "path-2",
    "name": "Вечерний маршрут",
    "totalDistance": 5.2,
    "estimatedTime": 90,
    "isCircular": false,
    "difficulty": "moderate",
    "createdAt": "2025-12-09T18:30:00.000Z",
    "places": [...],
    "geometry": {...}
  }
]
```

### Получить маршрут по ID

**GET** `/paths/{id}`

Возвращает детальную информацию о конкретном маршруте. Параметр `id` - UUID маршрута.

**Ошибки:**

- **404 Not Found** если маршрут не существует:
  ```json
  {
    "statusCode": 404,
    "message": "Path not found",
    "error": "Not Found"
  }
  ```

### Удалить маршрут

**DELETE** `/paths/{id}`

Удаляет маршрут. Только создатель маршрута может его удалить.

**Успешный ответ (200 OK):**

```json
{
  "message": "Path deleted successfully"
}
```

**Ошибки:**

- **403 Forbidden** если пользователь не создатель маршрута
- **404 Not Found** если маршрут не существует

### Получить доступные теги

**GET** `/places/tags`

Возвращает список всех доступных тегов для фильтрации мест.

**Пример ответа (200 OK):**

```json
[
  "park",
  "museum",
  "cafe",
  "restaurant",
  "monument",
  "theater",
  "cinema",
  "shopping",
  "nature",
  "history",
  "architecture",
  "art",
  "entertainment",
  "sports",
  "education"
]
```


## Алгоритм генерации маршрута

Понимание внутренней логики поможет правильно выбирать параметры запроса и обрабатывать ответы.

### Расчет временных ограничений

Система использует фиксированные константы для расчета доступного времени:

- **BUFFER_TIME** = 15 минут (запас на непредвиденные задержки)
- **TIME_PER_PLACE** = 15 минут (время на каждое место)

Формула доступного времени для ходьбы:

```
maxWalkingTime = totalTime - BUFFER_TIME - (maxPlaces × TIME_PER_PLACE)
```

Затем рассчитывается максимальная дистанция:

```
maxDistance = (maxWalkingTime / 60) × walkingSpeed
```

**Пример:** Вы хотите прогулку на 2 часа (120 мин), посетить 5 мест, скорость 4.5 км/ч:

```
maxWalkingTime = 120 - 15 - (5 × 15) = 120 - 15 - 75 = 30 мин
maxDistance = (30 / 60) × 4.5 = 0.5 × 4.5 = 2.25 км
```

Если maxWalkingTime получается отрицательным или нулевым, сервер вернет ошибку 400. Решение: увеличьте `totalTime` или уменьшите `maxPlaces`.

### Поиск подходящих мест

После расчета ограничений система выполняет пространственный запрос к базе данных PostgreSQL с PostGIS:

1. **Радиус поиска:** `searchRadius = maxDistance / 2` (чтобы была возможность вернуться к старту или конечной точке)

2. **SQL запрос:** Использует `ST_DWithin` для поиска мест в радиусе от стартовой точки. Если указаны теги, применяется фильтр `tags @> selectedTags` (место должно иметь хотя бы один из указанных тегов).

3. **Сортировка:** По рейтингу (выше лучше) и релевантности.

4. **Результат:** Набор мест-кандидатов для построения маршрута.

Если не найдено ни одного места, возвращается ошибка 400 "No places found matching your criteria".

### Оптимизация порядка посещения

Используется **жадный алгоритм ближайшего соседа** (Greedy Nearest Neighbor):

```
1. Текущая позиция = startPoint
2. Список непосещенных мест = все найденные места
3. Маршрут = []
4. Накопленная дистанция = 0
5. Накопленное время = BUFFER_TIME

Пока есть непосещенные места И ограничения не превышены:
  a) Найти ближайшее непосещенное место к текущей позиции
  b) Рассчитать расстояние до него
  c) Проверить: дистанция + расстояние ≤ maxDistance
  d) Проверить: время + timePerPlace + время_ходьбы ≤ totalTime
  e) Если проверки пройдены:
     - Добавить место в маршрут
     - Обновить текущую позицию = координаты места
     - Удалить место из непосещенных
     - Обновить накопленные значения
  f) Иначе: завершить цикл

6. Если isCircular = true: добавить возврат к startPoint
7. Если указан endPoint (координаты или placeId): добавить финальный переход к этой точке

**Важно:** Начальная и конечная точки (если указаны как координаты) участвуют в построении маршрута OSRM, но НЕ учитываются как "места для посещения" при расчете времени и ограничений.
```

Этот алгоритм быстрый (O(n²)), но не гарантирует глобально оптимального решения. Он находит локально оптимальный маршрут.

После оптимизации проверяется минимальное количество мест:
- Если указаны координаты старта/финиша (`startLatitude`/`startLongitude` или `endLatitude`/`endLongitude`) или `isCircular=true`: **допустимо 1 место**
- Иначе требуется минимум 2 места

Если мест недостаточно, возвращается ошибка 400 "Unable to generate route: not enough places found".

### Запрос геометрии от OSRM

OSRM (Open Source Routing Machine) - это движок построения маршрутов на основе реальной дорожной сети. Система отправляет координаты всех точек маршрута в OSRM API в следующем порядке:

**Порядок координат для OSRM:**
1. Начальная точка (если указаны `startLatitude`/`startLongitude`, а не `startPlaceId`)
2. Первое выбранное место
3. Второе выбранное место
4. ... остальные места ...
5. Конечная точка (если указаны `endLatitude`/`endLongitude`, не `endPlaceId`, и `isCircular=false`)

Формат запроса:
```
GET http://osrm:5000/route/v1/foot/{lon1},{lat1};{lon2},{lat2};{lon3},{lat3}?overview=full&geometries=geojson&steps=true
```

Параметры:
- `foot` - профиль пешехода
- Координаты в формате `longitude,latitude` (именно в таком порядке!)
- `overview=full` - полная геометрия маршрута
- `geometries=geojson` - формат GeoJSON
- `steps=true` - пошаговая навигация

OSRM возвращает:

1. **geometry** - GeoJSON LineString с точным пешеходным путем по тротуарам и дорогам (от реальной начальной точки до реальной конечной)
2. **distance** - реальная дистанция в метрах (обычно больше чем расстояние по прямой)
3. **duration** - время прохождения в секундах
4. **steps** - массив навигационных инструкций с поворотами и названиями улиц

**Примеры:**

Запрос с координатами старта и финиша:
```json
{
  "startLatitude": 55.7504,
  "startLongitude": 37.6083,
  "endLatitude": 55.7524,
  "endLongitude": 37.6103,
  "totalTime": 90,
  "maxDistance": 3.75,
  "walkingSpeed": 5.0
}
```
→ OSRM получит: `[37.6083, 55.7504] → место1 → место2 → [37.6103, 55.7524]`

Запрос с placeId старта (без координат):
```json
{
  "startPlaceId": "uuid-place-1",
  "endLatitude": 55.7524,
  "endLongitude": 37.6103
}
```
→ OSRM получит: `координаты_место1 → место2 → место3 → [37.6103, 55.7524]`

Круговой маршрут:
```json
{
  "startLatitude": 55.7504,
  "startLongitude": 37.6083,
  "isCircular": true
}
```
→ OSRM получит: `[37.6083, 55.7504] → место1 → место2 → [37.6083, 55.7504]` (конец = начало)

Если OSRM недоступен, возвращается 503 "Service Unavailable".

### Финальная валидация

После получения данных от OSRM выполняется финальная проверка:

```
actualWalkingTime = (osrm_duration / 60)  // секунды → минуты
totalCalculatedTime = actualWalkingTime + (places.length × 15) + 15

Если totalCalculatedTime > totalTime:
  Возможно убрать последние места или скорректировать параметры
```

Также рассчитывается сложность маршрута:

```typescript
function calculateDifficulty(distance: number, estimatedTime: number): string {
  const avgSpeed = (distance / estimatedTime) * 60; // км/ч
  
  if (avgSpeed <= 3 || distance < 3) return 'easy';
  if (avgSpeed <= 5 || distance < 7) return 'moderate';
  return 'hard';
}
```

### Сохранение в базу данных

Успешный маршрут сохраняется в PostgreSQL:

1. **Path** entity - основная запись маршрута (id, name, totalDistance, estimatedTime и т.д.)
2. **PathPlace** entities - связи многие-ко-многим между маршрутом и местами с полем `visitOrder`
3. **geometry** - GeoJSON в формате JSONB
4. **steps** - навигационные инструкции в JSONB

После сохранения возвращается полный объект маршрута со статусом 201 Created.


## Практические примеры и рекомендации

### Валидация параметров перед отправкой

Проверяйте параметры на клиенте до отправки запроса, чтобы избежать ненужных запросов к серверу:

```kotlin
data class PathGenerationValidator(
    private val bufferTime: Int = 15,
    private val timePerPlace: Int = 15
) {
    fun validate(
        totalTime: Int,
        maxPlaces: Int,
        walkingSpeed: Double
    ): ValidationResult {
        // Проверка базовых ограничений
        if (totalTime < 15) {
            return ValidationResult.Error("Минимальное время: 15 минут")
        }
        
        if (walkingSpeed < 2.0 || walkingSpeed > 10.0) {
            return ValidationResult.Error("Скорость должна быть от 2 до 10 км/ч")
        }
        
        if (maxPlaces < 1 || maxPlaces > 20) {
            return ValidationResult.Error("Количество мест: от 1 до 20")
        }
        
        // Проверка достаточности времени
        val requiredTime = bufferTime + (maxPlaces * timePerPlace)
        if (totalTime < requiredTime) {
            return ValidationResult.Error(
                "Для $maxPlaces мест нужно минимум $requiredTime минут. " +
                "Уменьшите количество мест или увеличьте время."
            )
        }
        
        // Расчет доступного времени ходьбы
        val walkingTime = totalTime - requiredTime
        val maxDistance = (walkingTime / 60.0) * walkingSpeed
        
        if (maxDistance < 0.5) {
            return ValidationResult.Warning(
                "Доступная дистанция очень мала (${String.format("%.2f", maxDistance)} км). " +
                "Возможно, не удастся найти маршрут."
            )
        }
        
        return ValidationResult.Success(
            walkingMinutes = walkingTime,
            estimatedDistance = maxDistance
        )
    }
}

sealed class ValidationResult {
    data class Success(
        val walkingMinutes: Int,
        val estimatedDistance: Double
    ) : ValidationResult()
    
    data class Warning(val message: String) : ValidationResult()
    data class Error(val message: String) : ValidationResult()
}
```

### Расчет рекомендованного времени

Помогите пользователю выбрать реалистичные параметры:

```kotlin
fun recommendTotalTime(
    desiredPlaces: Int,
    desiredDistance: Double,
    walkingSpeed: Double
): Int {
    val bufferTime = 15
    val timePerPlace = 15
    
    // Время на ходьбу
    val walkingMinutes = (desiredDistance / walkingSpeed) * 60
    
    // Время на местах
    val placesMinutes = desiredPlaces * timePerPlace
    
    // Общее время (округляем вверх до 5 минут)
    val total = walkingMinutes + placesMinutes + bufferTime
    return (ceil(total / 5.0) * 5).toInt()
}

// Пример: хочу пройти 5 км и посетить 8 мест со скоростью 4 км/ч
val recommended = recommendTotalTime(
    desiredPlaces = 8,
    desiredDistance = 5.0,
    walkingSpeed = 4.0
)
// Результат: 210 минут (3.5 часа)
// Расчет: (5/4)*60 + 8*15 + 15 = 75 + 120 + 15 = 210
```

### Обработка ошибки "not enough places found"

Когда получаете ошибку о недостаточном количестве мест, предложите пользователю решения:

```kotlin
suspend fun handlePathGenerationError(error: ApiError, params: PathParams): UserAction {
    return when {
        error.message.contains("not enough places found") -> {
            // Предложить варианты решения
            val suggestions = buildList {
                // Можно ли увеличить дистанцию?
                if (params.maxDistance < 10.0) {
                    add(UserAction.IncreasedDistance(params.maxDistance * 1.5))
                }
                
                // Можно ли увеличить время?
                if (params.totalTime < 180) {
                    add(UserAction.IncreaseTime(params.totalTime + 30))
                }
                
                // Можно ли уменьшить места?
                if (params.maxPlaces > 3) {
                    add(UserAction.ReducePlaces(max(3, params.maxPlaces - 2)))
                }
                
                // Есть ли фильтры которые можно убрать?
                if (params.tags.isNotEmpty()) {
                    add(UserAction.RemoveFilters)
                }
                
                // Предложить сменить локацию
                add(UserAction.ChangeLocation)
            }
            
            UserAction.ShowSuggestions(suggestions)
        }
        
        error.message.contains("No places found") -> {
            // Проверить, есть ли вообще места в этой области
            val nearbyPlaces = checkNearbyPlaces(
                lat = params.startLatitude,
                lon = params.startLongitude,
                radius = params.maxDistance * 1000
            )
            
            if (nearbyPlaces.isEmpty()) {
                UserAction.ShowMessage(
                    "В этой области нет зарегистрированных мест. " +
                    "Попробуйте выбрать другую локацию."
                )
            } else {
                UserAction.ShowMessage(
                    "Найдено мест: ${nearbyPlaces.size}. " +
                    "Увеличьте время или расстояние для построения маршрута."
                )
            }
        }
        
        error.statusCode == 503 -> {
            UserAction.RetryAfterDelay(delaySeconds = 5)
        }
        
        else -> UserAction.ShowError(error.message)
    }
}
```

### Оптимальные параметры по умолчанию

Начальные значения для разных сценариев:

```kotlin
object PathDefaults {
    // Быстрая прогулка (30-60 мин)
    val quickWalk = PathParams(
        totalTime = 45,
        maxDistance = 2.0,
        walkingSpeed = 4.5,
        maxPlaces = 3
    )
    
    // Средняя прогулка (1-2 часа)
    val normalWalk = PathParams(
        totalTime = 90,
        maxDistance = 4.0,
        walkingSpeed = 5.0,
        maxPlaces = 5
    )
    
    // Длинная прогулка (2-3 часа)
    val longWalk = PathParams(
        totalTime = 150,
        maxDistance = 6.0,
        walkingSpeed = 5.0,
        maxPlaces = 7
    )
    
    // Адаптивный выбор на основе доступных мест
    fun adaptive(availablePlaces: Int, userTime: Int): PathParams {
        return when {
            availablePlaces < 3 -> PathParams(
                totalTime = userTime,
                maxDistance = 10.0,  // Большой радиус
                walkingSpeed = 5.0,
                maxPlaces = availablePlaces
            )
            availablePlaces < 10 -> PathParams(
                totalTime = userTime,
                maxDistance = 5.0,
                walkingSpeed = 5.0,
                maxPlaces = min(5, availablePlaces)
            )
            else -> PathParams(
                totalTime = userTime,
                maxDistance = 5.0,
                walkingSpeed = 5.0,
                maxPlaces = 8
            )
        }
    }
}
```

### Предварительная проверка области

Перед генерацией маршрута проверьте доступность мест:

```kotlin
suspend fun generatePathWithValidation(params: PathParams): Result<PathResponse> {
    // Сначала проверяем, есть ли места в области
    val nearbyPlaces = apiService.getPlaces(
        latitude = params.startLatitude,
        longitude = params.startLongitude,
        radius = (params.maxDistance * 1000).toInt()  // км → метры
    )
    
    when {
        nearbyPlaces.total < 2 -> {
            return Result.Error(
                "В радиусе ${params.maxDistance} км найдено только ${nearbyPlaces.total} мест. " +
                "Увеличьте радиус поиска или выберите другую локацию."
            )
        }
        
        nearbyPlaces.total < params.maxPlaces -> {
            // Показать предупреждение но продолжить
            showWarning(
                "В области всего ${nearbyPlaces.total} мест, " +
                "запрошено ${params.maxPlaces}. " +
                "Маршрут будет содержать меньше мест."
            )
        }
    }
    
    // Теперь генерируем маршрут
    return try {
        val path = apiService.generatePath(params)
        Result.Success(path)
    } catch (e: HttpException) {
        when (e.code()) {
            400 -> handleBadRequest(e, params)
            503 -> Result.RetryLater("Сервис маршрутизации временно недоступен")
            else -> Result.Error(e.message())
        }
    }
}
```

### Отрисовка маршрута на карте

Пример работы с геометрией GeoJSON и координатами:

```kotlin
fun drawPathOnMap(map: GoogleMap, pathResponse: PathResponse) {
    // ВАЖНО: GeoJSON использует [longitude, latitude], а LatLng наоборот
    val geometry = pathResponse.geometry ?: return
    
    // Конвертация координат
    val latLngPoints = geometry.coordinates.map { coord ->
        LatLng(
            coord[1],  // latitude - второй элемент
            coord[0]   // longitude - первый элемент
        )
    }
    
    // Рисуем линию маршрута
    val polyline = map.addPolyline(
        PolylineOptions()
            .addAll(latLngPoints)
            .width(10f)
            .color(Color.BLUE)
            .geodesic(true)
    )
    
    // Добавляем маркеры мест
    pathResponse.places.sortedBy { it.visitOrder }.forEachIndexed { index, place ->
        map.addMarker(
            MarkerOptions()
                .position(LatLng(place.location.latitude, place.location.longitude))
                .title("${index + 1}. ${place.name}")
                .snippet("${place.timeSpent} мин")
                .icon(BitmapDescriptorFactory.defaultMarker(
                    when (index) {
                        0 -> BitmapDescriptorFactory.HUE_GREEN  // Старт
                        pathResponse.places.size - 1 -> BitmapDescriptorFactory.HUE_RED  // Финиш
                        else -> BitmapDescriptorFactory.HUE_AZURE  // Промежуточные
                    }
                ))
        )
    }
    
    // Центрируем карту на маршрут
    val bounds = LatLngBounds.builder()
    latLngPoints.forEach { bounds.include(it) }
    map.animateCamera(CameraUpdateFactory.newLatLngBounds(bounds.build(), 100))
}
```

### Пошаговая навигация

Отображение навигационных инструкций:

```kotlin
fun createNavigationSteps(steps: List<NavigationStep>): List<NavigationItem> {
    return steps.mapIndexed { index, step ->
        NavigationItem(
            stepNumber = index + 1,
            instruction = step.instruction,
            streetName = step.name,
            distanceMeters = step.distance,
            distanceText = formatDistance(step.distance),
            durationSeconds = step.duration,
            durationText = formatDuration(step.duration),
            icon = getManeuverIcon(step.maneuver?.type, step.maneuver?.modifier)
        )
    }
}

fun formatDistance(meters: Double): String {
    return when {
        meters < 100 -> "${meters.toInt()} м"
        meters < 1000 -> "${(meters / 10).toInt() * 10} м"
        else -> "${String.format("%.1f", meters / 1000)} км"
    }
}

fun formatDuration(seconds: Double): String {
    val minutes = (seconds / 60).toInt()
    return when {
        minutes < 1 -> "< 1 мин"
        minutes == 1 -> "1 мин"
        else -> "$minutes мин"
    }
}

fun getManeuverIcon(type: String?, modifier: String?): Int {
    return when (type) {
        "depart" -> R.drawable.ic_navigation_start
        "arrive" -> R.drawable.ic_navigation_finish
        "turn" -> when (modifier) {
            "left" -> R.drawable.ic_turn_left
            "right" -> R.drawable.ic_turn_right
            "slight left" -> R.drawable.ic_turn_slight_left
            "slight right" -> R.drawable.ic_turn_slight_right
            "sharp left" -> R.drawable.ic_turn_sharp_left
            "sharp right" -> R.drawable.ic_turn_sharp_right
            else -> R.drawable.ic_navigation_continue
        }
        "continue" -> R.drawable.ic_navigation_continue
        else -> R.drawable.ic_navigation_continue
    }
}
```


## Ограничения и справочная информация

### Лимиты API

| Параметр | Минимум | Максимум | По умолчанию |
|----------|---------|----------|--------------|
| totalTime | 15 мин | - | - |
| walkingSpeed | 2.0 км/ч | 10.0 км/ч | - |
| maxPlaces | 1 | 20 | 10 |
| latitude | -90 | 90 | - |
| longitude | -180 | 180 | - |

### Константы алгоритма

- **BUFFER_TIME:** 15 минут - запас на непредвиденные ситуации
- **TIME_PER_PLACE:** 15 минут - стандартное время на каждое место
- **Search radius:** maxDistance / 2 - радиус поиска мест от стартовой точки

### Сложность маршрута

Расчет difficulty:

```
avgSpeed = (totalDistance / estimatedTime) × 60  // км/ч

if avgSpeed ≤ 3 OR totalDistance < 3 → "easy"
if avgSpeed ≤ 5 OR totalDistance < 7 → "moderate"
else → "hard"
```

### Формат координат

**В запросах:** Отдельные поля `latitude` и `longitude` (любой порядок)

**В ответах (startPoint, endPoint, location):**
```json
{
  "latitude": 55.7558,
  "longitude": 37.6173
}
```

**В geometry.coordinates и maneuver.location:**
```json
[37.6173, 55.7558]  // [longitude, latitude] - формат GeoJSON
```

**Важно:** GeoJSON всегда использует порядок [lon, lat], это стандарт. При работе с Google Maps или другими картами конвертируйте в LatLng(lat, lon).

### Типы маневров OSRM

| Type | Modifier | Описание |
|------|----------|----------|
| depart | straight, left, right | Начало движения |
| arrive | straight, left, right | Прибытие в пункт |
| turn | left, right, slight left, slight right, sharp left, sharp right, uturn | Поворот |
| continue | straight, slight left, slight right | Продолжать движение |
| merge | left, right, slight left, slight right | Слияние дорог |
| roundabout | - | Круговое движение |
| rotary | - | Развязка |
| fork | left, right, slight left, slight right | Развилка |

### Коды статусов HTTP

| Код | Описание | Причина |
|-----|----------|---------|
| 200 | OK | Успешное получение данных (GET) |
| 201 | Created | Маршрут создан (POST /generate) |
| 400 | Bad Request | Некорректные параметры или невозможно построить маршрут |
| 401 | Unauthorized | Отсутствует или невалидный JWT токен |
| 403 | Forbidden | Нет прав (например, удаление чужого маршрута) |
| 404 | Not Found | Маршрут не найден |
| 500 | Internal Server Error | Ошибка сервера |
| 503 | Service Unavailable | OSRM временно недоступен |

### Часто задаваемые вопросы

**Q: Почему coordinates в формате [lon, lat] а не [lat, lon]?**

A: Это стандарт GeoJSON (RFC 7946). GeoJSON следует математической традиции [x, y], где x = longitude (долгота), y = latitude (широта). При работе с картами конвертируйте в нужный формат.

**Q: Можно ли использовать startPlaceId вместо координат?**

A: Да, передайте UUID существующего места в `startPlaceId`. API автоматически возьмет его координаты как точку старта.

**Q: Что делать если OSRM возвращает 503?**

A: OSRM может перезапускаться или временно быть недоступным. Подождите 5-10 секунд и повторите запрос. Добавьте retry логику с экспоненциальной задержкой.

**Q: Почему маршрут содержит меньше мест чем указано в maxPlaces?**

A: Алгоритм не смог вписать больше мест в ограничения по времени и дистанции. Это нормально. maxPlaces - это максимум, а не гарантия.

**Q: Как узнать сколько мест в области до генерации маршрута?**

A: Сделайте запрос GET /places с параметрами location и radius. Проверьте total в ответе.

**Q: Можно ли указать конкретные обязательные места?**

A: Да, используйте массив `includedPlaceIds` с UUID мест, которые обязательно должны быть включены.

**Q: isCircular=true и endPoint - что имеет приоритет?**

A: isCircular. Если указан isCircular=true, endPoint игнорируется и конечная точка = стартовая.

**Q: Какое оптимальное значение walkingSpeed?**

A: Для большинства взрослых людей - 4.5-5.5 км/ч. Медленная прогулка - 3-4 км/ч. Быстрая ходьба - 6-7 км/ч.

## Заключение

Эта документация предоставляет все необходимое для интеграции с Footpath Path API:

✅ **Описание эндпоинтов** с параметрами и ответами  
✅ **Алгоритм генерации** маршрутов  
✅ **Практические примеры** кода на Kotlin  
✅ **Обработка ошибок** и edge cases  
✅ **Работа с геометрией** и навигацией  
✅ **Валидация** и рекомендации

Используйте эту информацию для создания надежного Android-клиента, который корректно работает с API и предоставляет пользователям качественный опыт планирования прогулок.


