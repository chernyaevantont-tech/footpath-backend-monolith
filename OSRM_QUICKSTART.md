# OSRM Quick Start

## Для чего нужен OSRM?

OSRM добавляет в ответы API поле `geometry` с координатами маршрута для отрисовки на карте:

```json
{
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [37.6173, 55.7558],
      [37.6175, 55.7560]
    ]
  }
}
```

## Быстрый старт

### 1️⃣ Подготовка данных (ОДИН РАЗ, 30-60 минут)

**Windows:**
```powershell
.\setup-osrm.ps1
```

**Linux/Mac:**
```bash
chmod +x setup-osrm.sh
./setup-osrm.sh
```

### 2️⃣ Запуск приложения

```bash
docker-compose up -d
```

Готово! Все endpoint'ы paths теперь возвращают `geometry`.

## Что делает скрипт?

1. Скачивает карту России (~3.5GB)
2. Обрабатывает данные для пешеходных маршрутов
3. Сохраняет в `osrm-data/`

Данные нужно скачать **только один раз**. При повторных запусках `docker-compose up` они используются из кэша.

## Покрытие

✅ Вся Россия (включая Крым, Дальний Восток, Сибирь, Калининград)  
❌ СНГ и другие страны

## Troubleshooting

**OSRM не запускается:**
```bash
docker-compose logs osrm
```

**Нет файла russia-latest.osrm:**
```bash
# Запустите скрипт подготовки
.\setup-osrm.ps1
```

**Хочу заново скачать данные:**
```bash
# Удалите папку и запустите скрипт снова
rm -rf osrm-data
.\setup-osrm.ps1
```
