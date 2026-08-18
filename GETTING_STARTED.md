# 🚀 Como rodar

Scaffold MVP do **Postador Insta** (Next.js + Prisma + Postgres + Redis + BullMQ).

## 1. Segredos

```bash
cp .env.example .env
# gere segredos reais:
openssl rand -base64 32   # -> AUTH_SECRET
openssl rand -hex 32      # -> ENCRYPTION_KEY
```

No Windows PowerShell, sem openssl:

```powershell
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))          # AUTH_SECRET
-join ((1..32|%{ '{0:x2}' -f (Get-Random -Max 256) }))             # ENCRYPTION_KEY
```

## 2. Subir tudo (docker-compose completo)

```bash
docker compose up -d --build
```

Serviços: `postgres` `redis` `minio` `app` (Next.js :3000) `worker` (scheduler+publisher).
As migrations rodam sozinhas no start do `app` (`prisma migrate deploy`).

## 3. Primeira migration + seed (uma vez)

```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

Login demo: `demo@postador.dev` / `demo12345`

## 4. Desenvolvimento local (sem docker no app)

Sobe só a infra e roda Next + worker na máquina:

```bash
docker compose up -d postgres redis minio
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev        # terminal 1  -> http://localhost:3000
npm run worker     # terminal 2  -> scheduler + publisher
```

## Fluxo já funcional

- Registro/login (Argon2id + sessão em cookie HttpOnly via Auth.js)
- `POST /api/posts` agenda (valida conta CONNECTED, mídia READY, sem passado, sem conflito)
- Scheduler detecta `SCHEDULED` vencidos → enfileira (reserva atômica)
- Publisher consome → lock distribuído + idempotência → publica (stub) → grava tentativa
- Reconciliação: `PUBLISHING` preso > 30min → `UNKNOWN`
- `GET /api/health` → status de DB e Redis

## Onde continuar (TODO por prioridade)

1. **Instagram real** — `src/modules/publishing/instagram.ts` (Graph API oficial) + OAuth em `/api/accounts/connect|callback`.
2. **Upload** — URL assinada no MinIO/S3 + `media.worker` (thumbnail, duração, MIME real).
3. **UI** — calendário, biblioteca de mídia, histórico, central de erros.
4. **Testes** — restart do worker, dupla publicação, timeout, token expirado (README 121-125).

## Arquitetura (resumo)

```
Next.js (app + API)  ->  Postgres (fonte da verdade)
        |                     ^
      BullMQ  ->  Redis  ->  Worker (scheduler / publisher / notifications / reconciliation)
```

Nenhum agendamento depende de memória do processo ou aba do navegador.
Banco = verdade · fila = execução · workers = descartáveis.
