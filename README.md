# 📱 Instagram Content Scheduler — Especificação Completa

> Sistema web para gerenciamento, organização e agendamento de publicação de vídeos em múltiplas contas do Instagram, com foco em escalabilidade, isolamento lógico das contas, observabilidade e experiência mobile.

---

# 1. VISÃO GERAL

O sistema será uma plataforma SaaS/web para gerenciamento de múltiplas contas do Instagram.

O usuário poderá:

- cadastrar contas do Instagram;
- conectar contas através dos mecanismos oficiais disponíveis;
- organizar vídeos;
- criar filas de conteúdo;
- agendar publicações;
- definir horários;
- associar vídeos a contas específicas;
- acompanhar status das publicações;
- visualizar histórico;
- receber notificações de erros;
- repetir publicações que falharam;
- administrar várias contas em um único painel;
- utilizar o sistema pelo computador ou celular.

O sistema deverá ser construído como uma aplicação web responsiva.

O usuário não deverá precisar manter o computador ligado para que os agendamentos funcionem.

A execução dos agendamentos deverá ocorrer no backend através de workers/filas.

---

# 2. OBJETIVO PRINCIPAL

Cada recurso deverá estar associado explicitamente ao `account_id`.

---

# 3. ISOLAMENTO LÓGICO POR CONTA

Todo recurso (mídia, post, agendamento, log) deve estar amarrado a uma conta específica.
O sistema nunca deve inferir a conta a partir de estado global.



# 5. ARQUITETURA

Arquitetura recomendada:

```
                    ┌──────────────────────┐
                    │      FRONTEND        │
                    │ React / Next.js      │
                    │                      │
                    │ Desktop + Mobile     │
                    └──────────┬───────────┘
                               │
                              API
                               │
                    ┌──────────▼───────────┐
                    │      BACKEND         │
                    │                      │
                    │ Auth                 │
                    │ Accounts             │
                    │ Media                │
                    │ Scheduler            │
                    │ Publishing           │
                    │ Analytics            │
                    └───────┬───────┬──────┘
                            │       │
                    ┌───────▼──┐ ┌──▼─────────┐
                    │ Database │ │ Redis/Queue│
                    └──────────┘ └────┬───────┘
                                      │
                                ┌─────▼─────┐
                                │  Workers  │
                                └─────┬─────┘
                                      │
                              Instagram/Meta
```

---

# 6. STACK SUGERIDA

## Frontend

Preferencialmente:

- React
- Next.js
- TypeScript
- Tailwind CSS

Alternativamente:

- React
- Vite
- TypeScript

## Backend

Pode ser:

- Node.js + TypeScript

ou:

- Python + FastAPI

O backend deverá possuir arquitetura modular.

## Banco

PostgreSQL.

## Cache/Fila

Redis.

## Storage

Utilizar storage de objetos:

- S3;
- Cloudflare R2;
- ou equivalente.

Nunca armazenar grandes vídeos diretamente no PostgreSQL.

---

# 7. AUTENTICAÇÃO DA PLATAFORMA

O sistema deverá possuir autenticação própria.

Campos mínimos:

```
User
- id
- name
- email
- password_hash
- status
- created_at
- updated_at
```

Nunca armazenar senha em texto puro.

Utilizar:

- Argon2id
- ou bcrypt

Preferencialmente Argon2id.

---

# 8. SESSÃO DO USUÁRIO

A autenticação web deverá utilizar:

- cookies HttpOnly;
- Secure;
- SameSite adequado;
- expiração configurável.

Não armazenar tokens sensíveis em:

```
localStorage
sessionStorage
```

quando houver alternativa mais segura.

---

# 9. CONTAS DO INSTAGRAM

Tabela:

```
instagram_accounts
```

Campos sugeridos:

```
id
user_id
platform
username
display_name
profile_picture_url
external_account_id
access_token_encrypted
token_expires_at
status
connection_status
created_at
updated_at
last_sync_at
```

---

# 10. STATUS DA CONTA

Estados possíveis:

```
CONNECTED
DISCONNECTED
TOKEN_EXPIRED
REAUTH_REQUIRED
ERROR
SUSPENDED
```

O frontend deverá exibir o estado claramente.

Exemplo:

- 🟢 Conectada
- 🟡 Reautenticação necessária
- 🔴 Erro

---

# 11. TOKENS

Tokens nunca devem ser armazenados em texto puro.

Utilizar criptografia no banco.

Exemplo conceitual:

```
access_token_encrypted
```

A chave de criptografia deverá estar em variável de ambiente/secret manager.

Nunca:

```
console.log(access_token)
```

Nunca incluir tokens em:

- logs;
- respostas da API;
- analytics;
- Sentry;
- URLs;
- mensagens de erro.

---

# 12. BIBLIOTECA DE VÍDEOS

O usuário deverá possuir uma biblioteca de mídia.

Exemplo:

```
📁 Biblioteca
├── Vídeo 01
├── Vídeo 02
├── Vídeo 03
├── Vídeo 04
└── Vídeo 05
```

Cada mídia:

```
media
- id
- user_id
- file_url
- storage_key
- filename
- mime_type
- size_bytes
- duration_seconds
- width
- height
- thumbnail_url
- status
- created_at
```

---

# 13. UPLOAD

O upload deverá ser feito diretamente para o storage sempre que possível.

Fluxo:

```
Frontend
   ↓
Backend gera URL assinada
   ↓
Frontend envia vídeo
   ↓
Storage
   ↓
Backend recebe confirmação
   ↓
Worker processa mídia
```

Evitar:

```
Frontend → Backend → Storage
```

para arquivos grandes, se não for necessário.

---

# 14. PROCESSAMENTO DE VÍDEO

Após upload:

```
UPLOADING
PROCESSING
READY
FAILED
```

O worker deverá:

- validar formato;
- validar tamanho;
- extrair duração;
- extrair resolução;
- gerar thumbnail;
- verificar integridade;
- eventualmente gerar versões compatíveis.

---

# 15. REGRAS DE MÍDIA

O sistema deverá validar:

- extensão;
- MIME type;
- tamanho;
- duração;
- resolução;
- proporção.

As regras exatas deverão ser configuráveis conforme os requisitos atuais da API oficial.

Não assumir que uma especificação permanecerá permanente.

Criar um módulo:

```
PlatformMediaRules
```

para centralizar essas regras.

---

# 16. LEGENDA

Cada publicação poderá possuir:

```
caption
```

O usuário poderá escrever:

```
Legenda do vídeo...

#marketing
#negocios
```

A legenda deverá ser armazenada separadamente da mídia.

Isso permite reutilizar o mesmo vídeo com legendas diferentes.

---

# 17. PUBLICAÇÃO

Criar entidade:

```
posts
```

Campos:

```
id
user_id
instagram_account_id
media_id
caption
scheduled_at
status
published_at
external_post_id
error_code
error_message
attempt_count
created_at
updated_at
```

---

# 18. STATUS DO POST

Estados:

```
DRAFT
SCHEDULED
QUEUED
PROCESSING
PUBLISHING
PUBLISHED
FAILED
CANCELLED
RETRYING
```

Fluxo normal:

```
DRAFT → SCHEDULED → QUEUED → PROCESSING → PUBLISHING → PUBLISHED
```

Em caso de erro:

```
PUBLISHING → FAILED → RETRYING → PUBLISHING
```

---

# 19. AGENDAMENTO

O usuário deverá escolher:

```
Conta
Vídeo
Legenda
Data
Hora
Timezone
```

Exemplo:

```
Conta: @conta01
Vídeo: video_001.mp4
Data: 25/08/2026
Hora: 18:30
Timezone: America/Fortaleza
```

---

# 20. TIMEZONE

Nunca armazenar horário sem contexto de timezone.

O sistema deverá trabalhar internamente preferencialmente com UTC.

Exemplo:

```
scheduled_at_utc
```

E armazenar a timezone do usuário:

```
timezone = America/Fortaleza
```

Frontend converte:

```
UTC → timezone do usuário
```

---

# 21. REGRAS DE AGENDAMENTO

Não permitir:

- agendamento no passado;
- publicação para conta desconectada;
- publicação de mídia ainda processando;
- publicação duplicada acidental;
- publicação sem mídia;
- publicação sem conta.

Antes de agendar:

```
Account.status === CONNECTED
Media.status === READY
scheduled_at > now
```

---

# 22. CONFLITO DE HORÁRIOS

Se duas publicações forem agendadas para a mesma conta no mesmo instante:

O sistema deverá permitir ou bloquear conforme configuração.

Configuração:

```
allow_same_time_posts = false
```

Se estiver desativado:

```
Post A → 18:00
Post B → 18:00
```

Mostrar:

```
"Já existe uma publicação agendada para esta conta neste horário."
```

---

# 23. FILA

O scheduler deverá encontrar posts:

```
status = SCHEDULED
scheduled_at <= now
```

E colocar na fila.

Nunca publicar diretamente dentro do processo do frontend.

Errado:

```
Frontend → POST /publish → Instagram
```

Correto:

```
Frontend → POST /schedule → Database → Scheduler → Queue → Worker → Instagram
```

---

# 24. IDEMPOTÊNCIA

Essa é uma regra crítica.

O mesmo post nunca deve ser publicado duas vezes devido a:

- timeout;
- retry;
- restart;
- worker duplicado;
- webhook duplicado;
- erro de rede.

Cada publicação deverá possuir:

```
idempotency_key
```

Exemplo:

```
publish:{post_id}
```

Antes de iniciar:

```
check if already published
```

---

# 25. WORKERS

Workers deverão ser processos independentes.

Exemplo:

```
worker-scheduler
worker-publisher
worker-media
worker-notifications
```

Pode começar com um worker único e posteriormente separar.

---

# 26. REDIS QUEUE

Exemplo:

```
queue:scheduled_posts
queue:publish_posts
queue:media_processing
queue:notifications
```

Cada job deverá conter somente IDs.

Exemplo:

```json
{
  "post_id": 123
}
```

Não colocar:

- access token;
- senha;
- arquivos;
- dados sensíveis.

---

# 27. RETRY

Erros temporários deverão possuir retry.

Exemplos:

```
timeout
network_error
5xx
temporary_api_error
```

Utilizar exponential backoff.

Exemplo:

```
1ª tentativa → imediato
2ª → 30s
3ª → 2min
4ª → 10min
5ª → 30min
```

Os valores deverão ser configuráveis.

---

# 28. ERROS PERMANENTES

Não fazer retry infinito.

Exemplos:

```
invalid_token
permission_denied
invalid_media
account_disconnected
invalid_request
```

Nestes casos:

```
FAILED
```

e notificar o usuário.

---

# 29. LIMITE DE TENTATIVAS

Exemplo:

```
MAX_ATTEMPTS = 5
```

Após isso:

```
FAILED_PERMANENTLY
```

O usuário poderá clicar:

```
Tentar novamente
```

criando uma nova execução controlada.

---

# 30. LOCK DISTRIBUÍDO

Para impedir dois workers publicando o mesmo post:

```
distributed lock
```

Exemplo:

```
lock:publish:{post_id}
```

Com TTL.

Se o lock já existir:

```
skip
```

---

# 31. RESTART DO SERVIDOR

O sistema deve sobreviver a:

- restart;
- deploy;
- crash;
- atualização;
- worker morto.

Nunca depender de:

```
setTimeout()
setInterval()
```

para armazenar o estado dos agendamentos.

Errado:

```javascript
setTimeout(() => publish(post), delay)
```

Isso perde o agendamento quando o processo reinicia.

O estado deve estar no PostgreSQL.

---

# 32. SCHEDULER

O scheduler pode executar a cada 5 ou 10 segundos e procurar tarefas pendentes.

Exemplo:

```sql
SELECT *
FROM posts
WHERE status = 'SCHEDULED'
AND scheduled_at <= NOW()
ORDER BY scheduled_at
LIMIT 100;
```

Depois deverá realizar uma operação atômica para reservar os posts.

---

# 33. CONCORRÊNCIA

Nunca deixar:

```
Worker A → Post 123
Worker B → Post 123
```

ao mesmo tempo.

Utilizar:

- transaction;
- row locking;
- distributed lock;
- idempotency.

---

# 34. ISOLAMENTO ENTRE CONTAS

Cada execução deve utilizar explicitamente:

```
post.account_id
```

Nunca utilizar:

```
currentAccount
```

global.

Nunca utilizar estado global para definir a conta.

---

# 35. CONFIGURAÇÃO POR CONTA

Cada conta poderá possuir:

```
timezone
default_caption
default_hashtags
posting_enabled
notifications_enabled
```

Exemplo:

```
Account A
Timezone: America/Fortaleza
Publicação: habilitada

Account B
Timezone: America/Sao_Paulo
Publicação: desabilitada
```

---

# 36. PAUSA DE CONTA

Usuário poderá clicar:

```
⏸ Pausar conta
```

Quando pausada:

- novos posts não devem ser publicados;
- posts podem continuar agendados;
- scheduler deverá ignorar posts dessa conta;
- usuário poderá reativar posteriormente.

---

# 37. CANCELAMENTO

Post agendado (`SCHEDULED`) pode ser cancelado.

Depois:

```
CANCELLED
```

Não deverá ser publicado.

Se já estiver `PUBLISHING`, não garantir cancelamento.

Frontend deverá informar:

```
"Esta publicação já está em processamento."
```

---

# 38. CALENDÁRIO

Criar calendário:

```
Mês
Semana
Dia
Lista
```

Cada publicação deverá aparecer com:

- thumbnail;
- conta;
- horário;
- status.

Exemplo:

```
18:30
[thumbnail]
@conta01
🟡 Agendado
```

---

# 39. DRAG & DROP

No calendário:

```
Post A → 18:00
```

usuário arrasta para:

```
20:00
```

Backend deverá atualizar:

```
scheduled_at
```

Nunca atualizar somente frontend.

---

# 40. DUPLICAÇÃO

Usuário poderá clicar em `Duplicar`.

Sistema cria um **novo post**.

Nunca copiar o mesmo `id`.

---

# 41. POSTAR NOVAMENTE

Após uma publicação (`PUBLISHED`), o botão `Reutilizar` deverá criar um novo agendamento.

Nunca alterar o post histórico original.

---

# 42. HISTÓRICO

Página: `Histórico`

Filtros:

```
Conta
Data
Status
Vídeo
```

Exemplo:

```
25/08 | @conta01 | Vídeo 001 | Publicado | 18:30
```

---

# 43. LOG DE EXECUÇÃO

Cada tentativa deverá gerar:

```
publication_attempts
```

Campos:

```
id
post_id
attempt_number
started_at
finished_at
status
error_code
error_message
external_response_id
```

Nunca armazenar tokens.

---

# 44. DASHBOARD

Dashboard deverá apresentar:

```
Contas conectadas
Posts agendados
Posts publicados
Posts com erro
Posts hoje
Posts esta semana
```

Exemplo:

```
CONTAS      12
AGENDADOS   47
PUBLICADOS  193
ERROS       3
```

---

# 45. NOTIFICAÇÕES

Notificar quando:

- publicação foi realizada;
- publicação falhou;
- conta perdeu autorização;
- token expirou;
- mídia falhou;
- agendamento foi cancelado;
- erro crítico ocorreu.

Canais possíveis:

```
In-app
Email
Push notification
Telegram
```

Telegram pode ser implementado posteriormente.

---

# 46. CENTRAL DE ERROS

Criar página: `Erros`

Exemplo:

```
🔴 @conta01
Não foi possível publicar.
Código: TOKEN_EXPIRED
Ação: Reconectar conta
```

---

# 47. RECONEXÃO

Quando uma conta precisar de autorização (`REAUTH_REQUIRED`), mostrar:

```
⚠ Reconectar Instagram
```

Ao reconectar:

```
status = CONNECTED
```

Posts futuros voltam a funcionar.

---

# 48. MULTI-TENANCY

O sistema deverá suportar múltiplos usuários.

Nunca permitir que `User A` acesse dados de `User B`.

IDs de recursos não são suficientes.

Toda query deverá considerar:

```
WHERE user_id = current_user.id
```

---

# 49. AUTORIZAÇÃO

Criar camada: `AuthorizationService`

Exemplo:

```
canViewAccount()
canEditAccount()
canDeleteAccount()
canPublish()
canSchedule()
```

---

# 50. RATE LIMIT DA API

Backend deverá possuir rate limit.

Exemplo:

```
POST /api/posts → 10 requests/min
```

Valores configuráveis.

---

# 51. SEGURANÇA

Implementar:

- HTTPS;
- CSRF protection quando aplicável;
- CORS restrito;
- CSP;
- rate limiting;
- validação de entrada;
- SQL injection protection;
- XSS protection;
- upload validation;
- secret management.

---

# 52. UPLOAD SEGURO

Nunca confiar apenas na extensão (`video.mp4`).

Validar MIME real.

Também verificar `file signature` e processar arquivos em ambiente seguro.

---

# 53. ANTIVÍRUS

Opcionalmente utilizar `ClamAV` ou serviço equivalente.

Arquivos enviados pelo usuário podem ser escaneados antes do processamento.

---

# 54. STORAGE

Estrutura:

```
/users/{user_id}/media/{media_id}/original
/users/{user_id}/media/{media_id}/thumbnail
```

Nunca:

```
/uploads/video.mp4
```

sem isolamento.

---

# 55. CDN

Vídeos e thumbnails poderão ser distribuídos por CDN.

Exemplo:

```
Cloudflare R2 + Cloudflare CDN
```

---

# 56. THUMBNAILS

Após upload (`video.mp4`), o worker gera `thumbnail.jpg`.

A thumbnail aparece no dashboard.

---

# 57. BUSCA

Biblioteca deverá possuir busca por `nome` e filtros:

```
data
status
duração
conta
```

---

# 58. TAGS

Vídeos poderão possuir tags:

```
marketing
fitness
money
viral
produto
```

Isso facilita organização.

---

# 59. PASTAS

Usuário poderá criar:

```
📁 Janeiro
📁 Fevereiro
📁 Clientes
📁 Produtos
📁 Shorts
```

---

# 60. AGENDAMENTO EM MASSA

Usuário poderá selecionar `10 vídeos` e:

```
Conta: @conta01
Primeiro horário: 18:00
Intervalo: 2 horas
```

Sistema cria:

```
18:00 → vídeo 1
20:00 → vídeo 2
22:00 → vídeo 3
00:00 → vídeo 4
...
```

Antes de salvar, mostrar preview.

---

# 61. REGRAS DO AGENDAMENTO EM MASSA

Se houver conflito: não sobrescrever automaticamente.

Mostrar:

```
3 horários conflitantes.
```

Usuário poderá:

```
Cancelar
Ajustar automaticamente
Continuar
```

---

# 62. RECORRÊNCIA

Futuramente permitir:

```
Todo dia
Segunda a sexta
Toda segunda
Todo sábado
```

Exemplo:

```
@conta01 → Todo dia às 18:30
```

**Importante:** Não criar milhões de registros antecipadamente. Criar ocorrências conforme necessário.

---

# 63. CONTENT QUEUE

Além de calendário: **Fila de conteúdo**

Exemplo:

```
1. video001
2. video002
3. video003
4. video004
```

Configuração:

```
Conta A
Horário padrão: 18:30
```

O sistema agenda automaticamente.

---

# 64. ROTINA DE PUBLICAÇÃO

Exemplo:

```
Segunda  18:00
Terça    18:00
Quarta   18:00
Quinta   18:00
Sexta    18:00
```

---

# 65. REGRAS DE NEGÓCIO

- **Regra 1** — Uma publicação deve pertencer a exatamente uma conta.
- **Regra 2** — Uma publicação deve possuir exatamente uma mídia principal.
- **Regra 3** — Uma conta desconectada não pode iniciar publicação.
- **Regra 4** — Uma mídia não pronta não pode ser publicada.
- **Regra 5** — Posts publicados são imutáveis no histórico.
- **Regra 6** — Retries não criam novas publicações.
- **Regra 7** — Restart do servidor não pode perder agendamentos.
- **Regra 8** — Worker duplicado não pode publicar duas vezes.
- **Regra 9** — Usuário não pode acessar recursos de outro usuário.
- **Regra 10** — Tokens nunca aparecem no frontend.

---

# 66. API

Estrutura sugerida:

```
/api/auth
/api/users
/api/instagram
/api/accounts
/api/media
/api/posts
/api/schedules
/api/calendar
/api/analytics
/api/notifications
```

---

# 67. ENDPOINTS — Accounts

```http
GET    /api/accounts
POST   /api/accounts/connect
GET    /api/accounts/:id
PATCH  /api/accounts/:id
DELETE /api/accounts/:id
POST   /api/accounts/:id/reconnect
POST   /api/accounts/:id/pause
POST   /api/accounts/:id/resume
```

---

# 68. ENDPOINTS — Media

```http
GET    /api/media
POST   /api/media/upload-url
GET    /api/media/:id
DELETE /api/media/:id
PATCH  /api/media/:id
```

---

# 69. ENDPOINTS — Posts

```http
GET    /api/posts
POST   /api/posts
GET    /api/posts/:id
PATCH  /api/posts/:id
DELETE /api/posts/:id
POST   /api/posts/:id/cancel
POST   /api/posts/:id/retry
POST   /api/posts/:id/duplicate
POST   /api/posts/:id/reuse
```

---

# 70. ENDPOINTS — Calendário

```http
GET /api/calendar
```

Query:

```
from
to
account_id
status
```

---

# 71. WEBSOCKETS

Opcional. Utilizar para:

- progresso de upload;
- mudança de status;
- publicação concluída;
- erros;
- notificações.

Exemplo:

```
POST_PUBLISHED
POST_FAILED
MEDIA_READY
ACCOUNT_DISCONNECTED
```

---

# 72. MOBILE FIRST

A aplicação deverá ser responsiva. Não simplesmente "desktop que diminui".

No celular — Bottom Navigation:

```
🏠 Dashboard
📅 Agenda
🎥 Mídia
➕ Criar
⚙️ Configurações
```

---

# 73. DESKTOP

No desktop — Sidebar:

```
Dashboard
Calendário
Conteúdo
Contas
Histórico
Analytics
Configurações
```

---

# 74. MOBILE UPLOAD

O usuário deverá conseguir selecionar vídeo da galeria ou gravar/selecionar vídeo, dependendo das capacidades do navegador.

---

# 75. PWA

Transformar o web app em PWA.

Permitir `Adicionar à tela inicial` e posteriormente `Push Notifications`.

---

# 76. DARK MODE

Interface deverá suportar:

```
Dark
Light
System
```

---

# 77. UX

Toda ação assíncrona deverá possuir feedback.

Exemplo:

```
Uploading...
Processing...
Scheduling...
Publishing...
```

Nunca deixar o usuário olhando para uma tela aparentemente travada.

---

# 78. CONFIRMAÇÕES

Ações destrutivas devem pedir confirmação:

```
Excluir conta
Excluir vídeo
Cancelar publicação
```

---

# 79. BULK ACTIONS

Permitir selecionar vários itens:

```
☑ video1
☑ video2
☑ video3
```

Ações:

```
Excluir
Agendar
Mover
Adicionar tag
```

---

# 80. ANALYTICS

Inicialmente:

```
Posts publicados
Posts falhos
Posts agendados
```

Posteriormente:

```
views
likes
comments
shares
reach
engagement
```

Dependendo dos dados disponibilizados pela API oficial.

---

# 81. AUDITORIA

Criar `audit_logs`.

Registrar:

```
user_id
action
resource_type
resource_id
timestamp
ip
user_agent
```

Exemplos:

```
ACCOUNT_CONNECTED
POST_CREATED
POST_SCHEDULED
POST_CANCELLED
ACCOUNT_DELETED
```

Nunca registrar segredos.

---

# 82. OBSERVABILIDADE

Utilizar:

- structured logging;
- metrics;
- tracing;
- error tracking.

Ferramentas possíveis:

```
Sentry
OpenTelemetry
Prometheus
Grafana
```

---

# 83. LOG FORMAT

Preferencialmente JSON:

```json
{
  "level": "info",
  "event": "post_published",
  "post_id": 123,
  "account_id": 5,
  "timestamp": "2026-08-18T20:30:00Z"
}
```

---

# 84. HEALTH CHECK

Endpoints:

```http
GET /health
GET /ready
```

Health:

```
database
redis
storage
workers
```

---

# 85. WORKER HEALTH

Dashboard administrativo deverá mostrar:

```
Scheduler: 🟢
Publisher Worker: 🟢
Media Worker: 🟢
Redis: 🟢
Postgres: 🟢
Storage: 🟢
```

---

# 86. ADMIN PANEL

Criar área administrativa separada.

Admin poderá visualizar:

```
Usuários
Contas conectadas
Posts
Erros
Workers
Jobs
Logs
Storage
```

---

# 87. ADMIN NÃO DEVE VER TOKENS

Mesmo administrador não deve visualizar `access_token` ou `refresh_token` no painel.

---

# 88. BILLING — FUTURO

Arquitetar para permitir planos.

Exemplo:

```
FREE
PRO
BUSINESS
AGENCY
```

Limites:

```
contas
posts
storage
usuários
```

---

# 89. FEATURE FLAGS

Criar sistema de feature flags.

Exemplo:

```
ENABLE_ANALYTICS
ENABLE_BULK_SCHEDULING
ENABLE_RECURRING_POSTS
ENABLE_PWA
```

---

# 90. CONFIGURAÇÕES

Configurações devem estar centralizadas.

Nunca espalhar `MAX_RETRIES = 5` por dezenas de arquivos.

Criar `config/`.

---

# 91. ENVIRONMENT

Separar:

```
development
staging
production
```

Nunca compartilhar banco de produção com desenvolvimento.

---

# 92. DATABASE MIGRATIONS

Utilizar migrations.

Exemplo:

```
001_create_users
002_create_instagram_accounts
003_create_media
004_create_posts
005_create_publication_attempts
```

Nunca alterar banco de produção manualmente sem migration versionada.

---

# 93. BACKUPS

- PostgreSQL: backup diário
- Storage: versionamento

Definir `RPO` e `RTO`.

---

# 94. TRANSAÇÕES

Operações críticas deverão utilizar transaction.

Exemplo — criar post:

```
BEGIN
  create post
  create audit log
COMMIT
```

---

# 95. CONSISTÊNCIA

Nunca atualizar `post.status = PUBLISHED` antes de possuir confirmação suficiente da publicação.

Mas também não assumir que timeout significa automaticamente "não publicado".

Em caso de resultado desconhecido: `UNKNOWN`, e realizar reconciliação quando possível.

---

# 96. RECONCILIATION JOB

Criar worker periódico: `reconciliation-worker`

Ele verifica:

```
posts em estado inconsistente
jobs antigos
publicações presas
tokens expirados
```

Exemplo: `PUBLISHING` há mais de 30 minutos deve ser investigado.

---

# 97. DEAD LETTER QUEUE

Jobs que falharam definitivamente deverão ir para `dead_letter_queue`.

Admin poderá analisar.

---

# 98. TIMEOUTS

Todo request externo deverá possuir timeout.

Nunca:

```
await externalRequest()
```

sem limite.

Exemplo: 30 segundos, configurável.

---

# 99. CIRCUIT BREAKER

Se a API externa estiver apresentando falhas massivas, um Circuit Breaker poderá evitar sobrecarga.

---

# 100. FEATURE: POST PREVIEW

Antes de agendar, mostrar preview:

```
[Vídeo]
@conta
Legenda
Data / Hora

Botão: Agendar publicação
```

---

# 101. FEATURE: QUICK POST

Botão: `+ Criar publicação`

Fluxo rápido:

```
Selecionar conta → Selecionar vídeo → Legenda → Data/hora → Agendar
```

---

# 102. FEATURE: DUPLICATE ACCOUNT SETTINGS

Permitir copiar configurações de uma conta para outra.

Nunca copiar tokens, IDs externos ou credenciais.

Somente:

```
timezone
configurações de publicação
preferências
```

---

# 103. FEATURE: ACCOUNT GROUPS

Usuário poderá agrupar contas:

```
Grupo: Clientes
├── Cliente A
├── Cliente B
└── Cliente C
```

---

# 104. FEATURE: CONTENT GROUPS

Vídeos também podem possuir grupos:

```
Money
Fitness
Gaming
Marketing
```

---

# 105. FEATURE: SCHEDULE TEMPLATES

Criar templates:

```
Template: Post diário
Horário: 18:30
Conta: @conta01
```

---

# 106. FEATURE: NOTIFICATION CENTER

Ícone: 🔔

Mostrar:

```
✓ Post publicado
⚠ Conta precisa reconectar
✕ Post falhou
```

---

# 107. FEATURE: GLOBAL SEARCH

Busca: `Ctrl + K`

Pesquisar:

```
contas
vídeos
posts
```

---

# 108. FEATURE: KEYBOARD SHORTCUTS

Desktop:

```
N → novo post
C → calendário
M → mídia
A → contas
```

---

# 109. DESIGN SYSTEM

Criar componentes reutilizáveis:

```
Button, Input, Select, Modal, Drawer, Dropdown,
Badge, Card, Table, Calendar, Toast, Skeleton, EmptyState
```

---

# 110. STATUS BADGES

Exemplo:

```
SCHEDULED  → azul
PROCESSING → amarelo
PUBLISHED  → verde
FAILED     → vermelho
CANCELLED  → cinza
```

As cores devem respeitar acessibilidade.

---

# 111. EMPTY STATES

Nunca deixar uma tela vazia.

Exemplo:

```
Você ainda não possui vídeos.
[Enviar primeiro vídeo]
```

---

# 112. LOADING STATES

Utilizar skeletons. Evitar spinner em toda a tela.

---

# 113. PAGINAÇÃO

Listas grandes deverão utilizar cursor pagination quando apropriado.

---

# 114. DATABASE INDEXES

Criar indexes para:

```
posts(user_id)
posts(account_id)
posts(status)
posts(scheduled_at)
media(user_id)
instagram_accounts(user_id)
```

Index composto para o scheduler:

```
(account_id, status, scheduled_at)
```

---

# 115. SOFT DELETE

Para recursos importantes usar `deleted_at` em vez de delete físico imediato.

Especialmente: `accounts`, `media`, `posts`.

---

# 116. RETENÇÃO

Definir política para:

```
logs
audit logs
failed jobs
deleted media
```

---

# 117. GDPR / LGPD

Como haverá dados de usuários brasileiros, implementar:

- política de privacidade;
- exclusão de conta;
- exportação de dados;
- consentimento quando necessário;
- minimização de dados;
- proteção de dados.

---

# 118. EXCLUSÃO DE CONTA

Ao excluir conta do usuário:

- revogar integrações quando aplicável;
- cancelar jobs;
- remover dados conforme política;
- remover arquivos;
- registrar auditoria;
- impedir acesso posterior.

---

# 119. API VERSIONING

Usar `/api/v1` ou `/api/v2`.

Nunca quebrar clientes existentes sem versionamento.

---

# 120. TESTES

Obrigatório possuir:

**Unit Tests** — Scheduler, Retry, Permissions, Validation, Idempotency, Timezone.

**Integration Tests** — Database, Redis, Storage, API.

**E2E** — Login, Connect account, Upload, Schedule, Cancel, History.

---

# 121. TESTE CRÍTICO — server restart

Fluxo:

```
1. Criar post para daqui 1 minuto.
2. Derrubar worker.
3. Reiniciar worker.
4. Verificar se post continua agendado.
5. Confirmar execução.
```

Esse teste é obrigatório.

---

# 122. TESTE DE DUPLICAÇÃO

Simular `Worker A` e `Worker B` processando o mesmo post simultaneamente.

Resultado esperado: **somente uma publicação**.

---

# 123. TESTE DE TIMEOUT

Simular API timeout.

Resultado: retry, sem criar publicação duplicada.

---

# 124. TESTE DE TOKEN EXPIRADO

Simular `TOKEN_EXPIRED`.

Resultado: `REAUTH_REQUIRED` e notificação.

---

# 125. TESTE DE USUÁRIO

`User A` não pode:

```
GET /api/posts/{post_do_user_B}
```

Resultado: `404` preferencialmente, para não vazar existência do recurso.

---

# 126. DOCKER

Ambiente local: `docker-compose`

Serviços:

```
frontend
backend
worker
scheduler
postgres
redis
```

Opcional: `minio` para simular S3 localmente.

---

# 127. DEPLOY

Produção (podem ser separados):

```
Frontend
Backend
Worker
Scheduler
Postgres
Redis
Object Storage
```

---

# 128. ESCALABILIDADE

Inicialmente:

```
1 backend
1 scheduler
1 worker
```

Posteriormente:

```
N backend
N publisher workers
N media workers
```

O sistema deve ser stateless no backend.

---

# 129. AUTOSCALING

Worker pode escalar conforme `queue depth`.

Exemplo:

```
0 jobs    → 1 worker
1000 jobs → 5 workers
```

---

# 130. REGRA DE NÃO DUPLICAÇÃO

Escalar workers NÃO pode resultar em publicação duplicada.

Isso depende de:

```
idempotency + locks + database state
```

---

# 131. SEGURANÇA DE SECRETOS

Secrets:

```
DATABASE_URL
REDIS_URL
ENCRYPTION_KEY
META_CLIENT_ID
META_CLIENT_SECRET
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
```

Nunca colocar no Git.

---

# 132. .ENV

Criar `.env.example` mas nunca `.env` no Git.

---

# 133. CI/CD

Pipeline:

```
Lint → Typecheck → Unit tests → Integration tests → Build → Deploy
```

---

# 134. MIGRATION CHECK

Antes do deploy, database migrations devem executar de maneira controlada.

Nunca rodar migration destrutiva automaticamente sem confirmação.

---

# 135. FRONTEND STATE

Separar:

```
server state
client state
form state
```

Sugestão:

```
TanStack Query
Zustand
React Hook Form
```

---

# 136. API CLIENT

Não espalhar `fetch()` por todos os componentes.

Criar `services/`.

Exemplo:

```
accountsService
postsService
mediaService
calendarService
```

---

# 137. BACKEND MODULES

Estrutura sugerida:

```
src/
  modules/
    auth/
    accounts/
    media/
    posts/
    scheduler/
    publishing/
    notifications/
    analytics/
    billing/
  shared/
    database/
    queue/
    storage/
    security/
```

---

# 138. WORKER MODULES

```
workers/
  scheduler.worker
  publisher.worker
  media.worker
  notification.worker
  reconciliation.worker
```

---

# 139. PRINCÍPIO

Frontend nunca deve conhecer o Instagram access token.

Frontend apenas conhece `account_id`.

---

# 140. PRINCÍPIO

Backend deve ser o único responsável por:

```
credenciais
integrações
publicação
retry
queue
```

---

# 141. PRINCÍPIO

Scheduler não publica diretamente.

Scheduler apenas **detecta + enfileira**.

Publisher **consome + publica**.

---

# 142. PRINCÍPIO

Media Worker não agenda posts. Media Worker apenas **processa mídia**.

---

# 143. PRINCÍPIO

Notification Worker não altera publicação. Apenas **envia notificações**.

---

# 144. PRINCÍPIO

Cada responsabilidade deve possuir um único dono.

---

# 145. FLUXO COMPLETO

```
USER
 │ upload vídeo
 ▼
STORAGE
 ▼
MEDIA WORKER
 ▼
MEDIA READY
 │
USER
 │ cria agendamento
 ▼
POST
 ▼
SCHEDULED
 │ chega horário
 ▼
SCHEDULER
 ▼
REDIS QUEUE
 ▼
PUBLISHER WORKER
 ├── valida conta
 ├── valida mídia
 ├── valida token
 ├── adquire lock
 ▼
PUBLICAÇÃO OFICIAL
```

---

# 146. PRIMEIRA VERSÃO — MVP

O MVP deverá conter somente:

- **Autenticação** — cadastro, login, logout.
- **Contas** — conectar Instagram, listar, desconectar, reconectar.
- **Mídia** — upload, thumbnail, biblioteca.
- **Posts** — criar, agendar, cancelar, listar.
- **Scheduler** — PostgreSQL, Redis, worker.
- **Histórico** — publicado, falhou, agendado.
- **Dashboard** — métricas básicas.

---

# 147. V2

Adicionar:

```
calendário avançado
bulk scheduling
tags
pastas
recorrência
notificações
PWA
analytics
grupos de contas
```

---

# 148. V3

Adicionar:

```
billing
equipes
permissões
clientes
agência
white-label
múltiplos usuários por workspace
analytics avançado
```

---

# 149. FUTURO — WORKSPACES

Estrutura:

```
Workspace
 ├── Users
 ├── Instagram Accounts
 ├── Media
 ├── Posts
 ├── Schedules
 └── Analytics
```

Roles:

```
OWNER
ADMIN
EDITOR
VIEWER
```

---

# 150. REGRAS DE PERMISSÃO

```
OWNER:  tudo
ADMIN:  contas, posts, media, usuários
EDITOR: posts, media
VIEWER: somente leitura
```

---

# 151. IMPORTANTE SOBRE IP / REDE

A infraestrutura poderá suportar configurações de rede por conta caso exista uma necessidade operacional legítima.



- utilizar IP rotativo para evasão;
- criar fingerprints artificiais;
- simular dispositivos;

A aplicação deve priorizar integrações oficiais.

---

# 152. REQUISITO FUNDAMENTAL

O sistema deve continuar funcionando após:

```
restart
deploy
crash
worker failure
redis restart
backend restart
```

Nenhum agendamento deverá desaparecer.

---

# 153. REQUISITO FUNDAMENTAL

Toda operação crítica deve ser observável.

Para qualquer post deverá ser possível responder:

```
Quem criou?
Qual conta?
Qual vídeo?
Qual horário?
Qual status?
Quantas tentativas?
Qual worker?
Qual erro?
Quando publicou?
Qual ID externo?
```

---

# 154. REQUISITO FUNDAMENTAL

Não confiar no frontend.

Todas as regras deverão ser verificadas no backend.

Mesmo que o frontend esconda um botão `Cancelar`, o backend deverá verificar permissão.

---

# 155. REQUISITO FUNDAMENTAL

Nenhum job deverá depender da memória do processo.

Errado: `setTimeout()`

Correto: `Postgres + Scheduler + Queue`

---

# 156. REQUISITO FUNDAMENTAL

Nenhuma publicação deverá depender de uma aba do navegador aberta.

O usuário pode fechar o navegador, desligar o computador ou ficar sem internet, e o servidor continuará processando os agendamentos.

---

# 157. REQUISITO FUNDAMENTAL

O sistema deve funcionar perfeitamente no celular.

Usuário deverá conseguir:

```
abrir → visualizar agenda → enviar vídeo → criar publicação → agendar → acompanhar resultado
```

sem precisar do computador.

---

# 158. DEFINITION OF DONE

Uma feature só será considerada concluída quando possuir:

```
frontend
backend
validação
tratamento de erros
loading state
empty state
testes
logs
autorização
documentação
migration quando necessária
```

---

# 159. ORDEM DE DESENVOLVIMENTO

```
Fase 1  — Database, Auth, Users
Fase 2  — Instagram Accounts, OAuth, Token encryption
Fase 3  — Storage, Upload, Media Worker
Fase 4  — Posts, Scheduling, Calendar
Fase 5  — Redis, Scheduler, Publisher Worker
Fase 6  — Retry, Idempotency, Locks, Reconciliation
Fase 7  — Dashboard, Notifications, History
Fase 8  — Mobile/PWA
Fase 9  — Analytics, Bulk scheduling, Recurring schedules
Fase 10 — Teams, Billing, Agency, White-label
```

---

# 160. RESULTADO FINAL ESPERADO

O produto final deverá permitir:

```
LOGIN
  ↓
DASHBOARD
  ↓
CONECTAR CONTAS
  ↓
UPLOAD DE VÍDEOS
  ↓
ORGANIZAR CONTEÚDO
  ↓
CRIAR POST
  ↓
ESCOLHER CONTA
  ↓
ESCOLHER DATA/HORA
  ↓
AGENDAR
  ↓
SCHEDULER
  ↓
QUEUE
  ↓
WORKER
  ↓
PUBLICAÇÃO OFICIAL
  ↓
HISTÓRICO
  ↓
ANALYTICS
```

O sistema deve ser:

- ✅ Web
- ✅ Mobile responsive
- ✅ PWA-ready
- ✅ Multi-account
- ✅ Multi-user-ready
- ✅ Queue-based
- ✅ Fault tolerant
- ✅ Idempotente
- ✅ Seguro
- ✅ Observável
- ✅ Escalável
- ✅ Persistente após restart

E principalmente:

> Nenhuma informação crítica de agendamento deve depender da memória do navegador ou do processo do servidor. O banco de dados é a fonte da verdade; a fila é o mecanismo de execução; os workers são descartáveis e podem ser reiniciados a qualquer momento sem perda ou duplicação de tarefas.
