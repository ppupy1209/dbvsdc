# 멀티스테이지: JDK17로 빌드 → JRE17로 실행 (로컬 Java 버전과 무관)
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
# 의존성 캐시 레이어 (소스 변경 시 재다운로드 방지)
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests clean package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=sample
ENTRYPOINT ["java", "-jar", "app.jar"]
