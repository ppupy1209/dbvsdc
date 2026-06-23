# dbvsdc API

Spring Boot backend for the DB vs DC retirement pension simulator.

## Requirements

- Java 17
- Maven
- MySQL only for the `live` profile

## Run in default sample mode

Default mode serves the same sample market returns used by the frontend and does not require MySQL or external API keys.

```bash
mvn spring-boot:run
```

Endpoint:

```text
GET http://localhost:8080/api/index-returns
```

## Run in live mode

Live mode enables MySQL, JPA, Flyway, and the scheduled refresh skeleton.

```bash
SPRING_PROFILES_ACTIVE=live \
DB_URL='jdbc:mysql://host:3306/dbvsdc?serverTimezone=Asia/Seoul&characterEncoding=utf8' \
DB_USER='dbvsdc' \
DB_PASSWORD='...' \
mvn spring-boot:run
```

PowerShell:

```powershell
$env:SPRING_PROFILES_ACTIVE='live'
$env:DB_URL='jdbc:mysql://host:3306/dbvsdc?serverTimezone=Asia/Seoul&characterEncoding=utf8'
$env:DB_USER='dbvsdc'
$env:DB_PASSWORD='...'
mvn spring-boot:run
```

## Environment variables

- `PORT`: server port, defaults to `8080`
- `DB_URL`: MySQL JDBC URL for `live`
- `DB_USER`: MySQL username for `live`
- `DB_USERNAME`: alternate MySQL username env var for `live`
- `DB_PASSWORD`: MySQL password for `live`
- `DATA_GO_KR_KEY`: data.go.kr service key placeholder
- `KRX_API_KEY`: KRX API key placeholder
- `KIS_APP_KEY`: Korea Investment Securities app key placeholder
- `KIS_APP_SECRET`: Korea Investment Securities app secret placeholder

No secrets should be committed. External data ingestion is pending; the current `live` profile can read cached `index_return_yearly` rows from MySQL and falls back to sample data if the cache is empty or incomplete.

## Profiles

- default / `sample`: in-memory sample market data, no DataSource/JPA/Flyway startup.
- `live`: MySQL, Flyway schema migration, JPA repositories, and a daily 18:00 KST scheduled refresh skeleton.

## Notes

`GET /api/index-returns` returns:

```json
{
  "asOf": "YYYY-MM-DD",
  "source": "sample",
  "depositRate": 0.03,
  "years": [1995],
  "returns": {
    "sp": [34.0],
    "nq": [40.0],
    "dj": [33.0],
    "ks": [-14.0],
    "kq": [0.0]
  }
}
```

The full sample response includes yearly values for 1995 through 2024.
