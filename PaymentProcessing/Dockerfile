

# Frontend build stage (Node)
FROM node:18 AS frontend-build
WORKDIR /frontend
COPY frontend/package.json ./
COPY frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# Backend build stage (Maven). The frontend build output is copied into Spring's static resources
FROM maven:3.9.4-eclipse-temurin-17 AS build
WORKDIR /workspace

COPY pom.xml ./

COPY src ./src

COPY --from=frontend-build /frontend/build ./src/main/resources/static

# package the application (skip tests to speed up image builds; remove -DskipTests to run tests)
RUN mvn -B -DskipTests package

# Runtime image (smaller JRE)
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /workspace/target/*.jar ./app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
