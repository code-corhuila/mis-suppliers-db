FROM maven:3.9.9-eclipse-temurin-17 AS dependencies
WORKDIR /build
COPY deploy/pom.xml .
RUN mvn -B -q dependency:copy-dependencies -DincludeScope=runtime -DoutputDirectory=/deps
FROM liquibase/liquibase:4.31.1
COPY --from=dependencies /deps/liquibase-mongodb-4.31.1.jar /liquibase/lib/
COPY --from=dependencies /deps/mongodb-*.jar /liquibase/lib/
COPY --from=dependencies /deps/bson*.jar /liquibase/lib/
COPY --from=dependencies /deps/jackson-*.jar /liquibase/lib/
