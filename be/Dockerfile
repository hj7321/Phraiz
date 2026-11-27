# 1단계: Gradle 빌드 스테이지 (ARM64 / AMD64 모두 지원)
FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /workspace

COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew

COPY src ./src
RUN ./gradlew bootJar -x test --no-daemon \
    && find build/libs -maxdepth 1 -name '*.jar' ! -name '*-plain.jar' -exec cp {} /workspace/app.jar \;

# 2단계: 경량 JRE 실행 스테이지
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

COPY --from=builder /workspace/app.jar app.jar
EXPOSE 8080

# OOM 방지를 위한 JVM 메모리 제한 옵션
ENTRYPOINT ["java", "-Xms256m", "-Xmx512m", "-XX:MetaspaceSize=128m", "-XX:MaxMetaspaceSize=256m", "-jar"]
CMD ["app.jar"]