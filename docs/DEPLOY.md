# 배포 가이드 (AWS EC2, RDS 미사용)

dbvsdc를 **별도 EC2 t3.micro(프리티어, RAM 1GB)** 한 대에 올린다.
DB는 RDS를 쓰지 않고 **같은 서버의 MySQL 컨테이너**로 운영한다(추가 비용 0).

## 구성 개요

- 이미지는 서버에서 빌드하지 않는다. GitHub Actions(CI/CD)가 빌드해 **GHCR**에 올리고,
  EC2는 그 이미지를 **pull 해서 실행만** 한다. → 서버 부하·빌드 메모리 문제 없음.
  - `ghcr.io/ppupy1209/dbvsdc-api:latest`
  - `ghcr.io/ppupy1209/dbvsdc-web:latest`
- 운영 실행 파일: [docker-compose.prod.yml](../docker-compose.prod.yml)

## 1GB 서버 대비 (안전벨트, 비용 0)

1GB에 api(JVM) + mysql + web(Node)를 같이 올리면 빡빡하다. 두 가지로 보완:

1. **JVM 힙 상한** — `JAVA_OPTS: -Xmx384m` (compose에 설정됨). 메모리 과식 방지.
   - 셋 다 동시에 더 빡빡하면 `-Xmx256m`로 낮춘다.
2. **스왑 2GB** — RAM이 꽉 찼을 때 디스크를 임시 메모리로 쓰는 안전망(별도 요금 없음).

### 스왑 만들기 (최초 1회, EC2에서)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
# 재부팅 후에도 유지
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # Swap 2.0Gi 확인
```

## 배포 단계

```bash
# 1) Docker / compose 설치 (최초 1회)
# 2) GHCR 로그인 (이미지가 private면 필요) — PAT(read:packages) 사용
echo $GHCR_TOKEN | docker login ghcr.io -u ppupy1209 --password-stdin

# 3) 이 저장소를 EC2에 clone 하거나 docker-compose.prod.yml + .env 만 올린다
# 4) 받아서 실행
docker compose -f docker-compose.prod.yml pull
```

### 지금(sample 단계) — DB 없이 가볍게

백엔드가 `sample` 프로필이면 MySQL이 필요 없다. RAM 아끼려면 DB 빼고 띄운다:

```bash
docker compose -f docker-compose.prod.yml up -d --no-deps api web
```

### 나중에(live 단계) — 실데이터 + MySQL

`.env`에 비밀번호/프로필을 넣고 전체 기동:

```bash
# .env
DB_PASSWORD=...
DB_ROOT_PASSWORD=...
SPRING_PROFILES_ACTIVE=live

docker compose -f docker-compose.prod.yml up -d
```

## 갱신(재배포)

main 머지 → CI/CD가 새 이미지 푸시. 서버에서:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

(자동화하려면 watchtower로 주기적 pull/재시작 가능 — 현재는 수동.)

## 포트 / 도메인

- web: `3000`, api: `8080` 노출.
- 도메인·HTTPS는 앞단에 nginx(또는 Caddy) 리버스 프록시를 두고 붙인다. (별도 작업)

## 비용 메모

- t3.micro 1대 24h ≈ 월 $13~15 (컴퓨팅 + 공인 IPv4) → 크레딧에서 차감.
- **RDS 미사용**으로 월 ~$13 추가 지출을 아낀다. 규모가 커지면 그때 RDS 분리 검토.
