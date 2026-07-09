# Deploy no Coolify

Stack: **Postgres + FastAPI + Next.js** via Docker Compose.

## 1. Subir o código no GitHub

Crie um repositório vazio no GitHub (ex: `rbassan/proclubs`) e faça push:

```bash
git remote rename origin upstream   # opcional: mantém referência ao fc26-clubs-api original
git remote add origin https://github.com/SEU_USUARIO/proclubs.git
git push -u origin main
```

## 2. Novo projeto no Coolify

1. **New Resource** → **Docker Compose**
2. Conecte o repositório GitHub
3. **Base Directory**: `/`
4. **Docker Compose location**: `infra/docker-compose.yml`

## 3. Variáveis de ambiente (Coolify)

Configure no painel do Compose (ou em cada serviço):

### `postgres`
| Variável | Valor |
|----------|-------|
| `POSTGRES_USER` | `proclubs` |
| `POSTGRES_PASSWORD` | *(senha forte)* |
| `POSTGRES_DB` | `proclubs` |

### `api`
| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | `postgresql://proclubs:SENHA@postgres:5432/proclubs` |
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

> O browser usa o proxy `/backend` do Next.js — não precisa expor a API publicamente se só o web tiver domínio.

## 4. Domínio e portas

Recomendado no Coolify:

- Aponte o domínio público apenas para o serviço **`web`** (porta 3000)
- Deixe **`api`** e **`postgres`** na rede interna do compose

Se quiser expor a API (Swagger em `/docs`), adicione um segundo domínio para `api:8000`.

## 5. Primeiro deploy

O container `api` roda `alembic upgrade head` automaticamente no start.

Após subir:

1. Acesse `https://seu-dominio.com`
2. Busque um clube — a 1ª busca grava no Postgres
3. Abra o clube — sync incremental com a EA

## 6. Troubleshooting

| Problema | Solução |
|----------|---------|
| Web não conecta na API | Confirme `INTERNAL_API_URL=http://api:8000` |
| Erro de CORS | Inclua o domínio exato em `CORS_ORIGINS` |
| Login Google falha | Configure `NEXTAUTH_URL` + credenciais OAuth |
| DB vazio após restart | Verifique volume `postgres_data` no compose |
