# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS builder
WORKDIR /source
COPY global.json ./
COPY backend/Directory.Build.props backend/Directory.Build.props
COPY backend/src/PgeStudy.Domain/PgeStudy.Domain.csproj backend/src/PgeStudy.Domain/
COPY backend/src/PgeStudy.Application/PgeStudy.Application.csproj backend/src/PgeStudy.Application/
COPY backend/src/PgeStudy.Infrastructure/PgeStudy.Infrastructure.csproj backend/src/PgeStudy.Infrastructure/
COPY backend/src/PgeStudy.Host/PgeStudy.Host.csproj backend/src/PgeStudy.Host/
RUN dotnet restore backend/src/PgeStudy.Host/PgeStudy.Host.csproj
COPY backend/src backend/src
RUN dotnet publish backend/src/PgeStudy.Host/PgeStudy.Host.csproj -c Release --no-restore -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runner
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080 DataProtection__KeysPath=/keys
USER root
RUN mkdir /keys && chown app:app /keys
COPY --from=builder --chown=app:app /app ./
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "PgeStudy.Host.dll"]
