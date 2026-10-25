# Multi-stage build (deploy-plan §2): JDK 25 to build, JRE 25 to run.
FROM eclipse-temurin:25-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline
COPY src src
# Tests run in CI (needs Docker for Testcontainers), not inside the image build.
RUN ./mvnw -q -B -DskipTests -DskipITs package

FROM eclipse-temurin:25-jre
RUN useradd --system --uid 10001 stockwise
WORKDIR /app
COPY --from=build /src/target/stockwise-service-*.jar /app/app.jar
USER stockwise
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError" \
    SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
