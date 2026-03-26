FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install

COPY . .

RUN bunx prisma generate

EXPOSE 4002

CMD ["sh", "-c", "bunx prisma db push && bun run src/main.ts"]
