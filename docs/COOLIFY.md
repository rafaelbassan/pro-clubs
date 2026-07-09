# Deploy no Coolify

Stack: **FastAPI + Next.js** via Docker Compose. **Postgres e Redis são externos** (configure no `.env`).

## 1. Subir o código no GitHub

```bash
git remote add origin https://github.com/SEU_USUARIO/pro-clubs.git
git push -u origin main
```

## 2. Novo projeto no Coolify

1. **New Resource** → **Docker Compose**
2. Conecte o repositório GitHub
3. **Base Directory**: `/` (raiz do repositório)
4. **Docker Compose location**: `infra/docker-compose.yml`

## 3. Serviços externos

### Postgres

Crie o database `proclubs` no seu Postgres. O container `api` roda `alembic upgrade head` no start.

### Redis

Use sua instância Redis para cache de busca e debounce de sync com a EA.

## 4. Variáveis de ambiente (Coolify)

```env
DATABASE_URL=postgresql://usuario:senha@seu-servidor:5432/proclubs
REDIS_URL=redis://seu-servidor:6379/0
JWT_SECRET=<openssl rand -hex 32>
CORS_ORIGINS=https://seu-dominio.com
INTERNAL_API_URL=http://api:8000
NEXTAUTH_URL=https://seu-dominio.com
NEXTAUTH_SECRET=<openssl rand -hex 32>
```

Opcional: `CACHE_TTL_SECONDS`, `SEARCH_CACHE_TTL_SECONDS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

### Referência por serviço

### `api`
| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | `postgresql://USER:SENHA@HOST:5432/proclubs` |
| `REDIS_URL` | `redis://HOST:6379/0` |
| `JWT_SECRET` | *(string longa aleatória)* |
| `CORS_ORIGINS` | `https://seu-dominio.com` |
| `CACHE_TTL_SECONDS` | `300` |
| `SEARCH_CACHE_TTL_SECONDS` | `3600` |

### `web`
| Variável | Valor |
|----------|-------|
| `INTERNAL_API_URL` | `http://api:8000` |
| `NEXTAUTH_URL` | `https://seu-dominio.com` |
| `NEXTAUTH_SECRET` | *(string longa aleatória)* |
| `GOOGLE_CLIENT_ID` | *(opcional)* |
| `GOOGLE_CLIENT_SECRET` | *(opcional)* |

> O browser usa o proxy `/backend` do Next.js — não precisa expor a API publicamente.

## 5. Domínio e portas

- Aponte o domínio público apenas para o serviço **`web`**
- **`api`** fica na rede interna do compose

## 6. Primeiro deploy

Após subir:

1. Acesse `https://seu-dominio.com`
2. Busque um clube — resultado cacheado no Redis, metadata no Postgres
3. Abra o clube — sync incremental com a EA

Verifique saúde: `GET /health` retorna `{"status":"ok","redis":"ok"}`.

## 7. Troubleshooting

| Problema | Solução |
|----------|---------|
| Web não conecta na API | Confirme `INTERNAL_API_URL=http://api:8000` |
| Erro de CORS | Inclua o domínio exato em `CORS_ORIGINS` |
| Login Google falha | Configure `NEXTAUTH_URL` + credenciais OAuth |
| API não sobe | `DATABASE_URL` e `REDIS_URL` são obrigatórios |
| `redis: unavailable` | Confirme `REDIS_URL` e se o container `api` alcança o host Redis |
| Migrations falham | Confirme que o DB existe e o user tem permissão CREATE TABLE |
