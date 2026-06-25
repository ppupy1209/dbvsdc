# 멀티스테이지: JDK17로 빌드(Gradle Wrapper) → JRE17로 실행 (로컬 Java/Gradle 버전과 무관)
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
# 의존성 캐시 레이어 (소스 변경 시 재다운로드 방지)
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true
COPY src ./src
RUN ./gradlew --no-daemon clean bootJar -x test

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=sample
# JAVA_OPTS 로 힙 상한 등을 주입 가능 (예: 1GB 서버에서 -Xmx384m). 비우면 JVM 기본값.
ENV JAVA_OPTS=""
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
