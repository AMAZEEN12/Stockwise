# Stockwise service image (deploy-plan §2). Build: docker build -t stockwise-service service/
FROM eclipse-temurin:25-jdk AS build
WORKDIR /src
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -ntp -q dependency:go-offline
COPY src/ src/
# Tests run in CI (ci.yml) before this image is built; the image build only packages.
RUN ./mvnw -B -ntp -q package -DskipTests

FROM eclipse-temurin:25-jre
WORKDIR /app
RUN useradd --system --uid 10001 stockwise
COPY --from=build /src/target/stockwise-service-*.jar app.jar
USER stockwise
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
