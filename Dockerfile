# syntax=docker/dockerfile:1

# Spark Web 本地镜像（pnpm monorepo）
# 运行时通过 MYSQL_HOST 等环境变量指向数据库容器，默认连本机 spark-mysql

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@10.33.0 --activate \
  && pnpm config set registry https://registry.npmmirror.com \
  && pnpm config set store-dir /pnpm/store

# ---- 安装依赖并构建 ----
FROM base AS builder
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter @spark/web build

# ---- 生产运行 ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system nodejs && useradd --system --gid nodejs spark

# monorepo standalone 输出保留目录层级，server.js 在 apps/web 下
COPY --from=builder --chown=spark:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=spark:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=spark:nodejs /app/apps/web/public ./apps/web/public

USER spark
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
