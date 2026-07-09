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

## 3. Postgres e Redis no Coolify

Se o Postgres/Redis foram criados **no Coolify** (não em servidor externo), o hostname interno (ex: `ddc0ab017lg73w1dbdovsac9`) **só funciona** se o compose estiver na mesma rede Docker.

### Passo obrigatório: rede Coolify

O compose já conecta o serviço **`api`** à rede Docker `coolify` (hostnames internos do Postgres/Redis).

Confirme também no painel do compose:

1. **Connect to Predefined Network** — ativado (recomendado)
2. Postgres, Redis e compose no **mesmo projeto**

Se ainda falhar DNS, use a URL **pública** do Postgres no `DATABASE_URL`.

### Mesmo projeto

Postgres, Redis e o Docker Compose devem estar no **mesmo projeto** no Coolify.

### Hostname correto

Use a URL interna que o Coolify mostra no painel do Postgres/Redis. Se não resolver, confira no servidor:

```bash
docker ps --format '{{.Names}}' | grep -i postgres
docker network inspect coolify
```

Às vezes o hostname é só o UUID (ex: `ddc0ab017lg73w1dbdovsac9`), às vezes o nome completo do container.

### Alternativa: URL pública

Se a rede interna continuar falhando, use a **URL pública** do Postgres/Redis no painel do Coolify (IP do servidor + porta exposta). Menos ideal, mas funciona.

O container `api` roda `alembic upgrade head` no start.

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

Verifique saúde:
- `GET /health/live` — API no ar (usado pelo Docker healthcheck)
- `GET /health` — DB + Redis ok (`503` se dependência falhar)
- Via web: `https://seu-dominio.com/backend/health`

## 7. Troubleshooting

| Problema | Solução |
|----------|---------|
| Web não conecta na API | Confirme `INTERNAL_API_URL=http://api:8000` |
| Erro de CORS | Inclua o domínio exato em `CORS_ORIGINS` |
| Login Google falha | Configure `NEXTAUTH_URL` + credenciais OAuth |
| API não sobe | `DATABASE_URL` e `REDIS_URL` são obrigatórios |
| `redis: unavailable` | Confirme `REDIS_URL` e se o container `api` alcança o host Redis |
| `could not translate host name` | Ative **Connect to Predefined Network** no compose; Postgres/Redis no mesmo projeto |
| `port is already allocated` (8000/3000) | Compose não publica portas no host — faça pull do compose atualizado |
| Container `api` unhealthy | Veja logs — migrations ou `DATABASE_URL`; `/health/live` só exige uvicorn |
| `503` na busca | Abra `/backend/health` — se `database` falhar, corrija `DATABASE_URL` |
| EA retorna 403 no servidor | A EA bloqueia IPs de datacenter. O compose sobe um container **Cloudflare WARP** e a API sai por `socks5h://warp:1080` (padrão). Remova `EA_PROXY_BASE_URL`/`EA_PROXY_SECRET` do painel se estiverem setados. Alternativas: `scripts/seed_club.py` no Mac ou proxy residencial em `EA_HTTP_PROXY` |
| Container `warp` não sobe | Host precisa permitir `NET_ADMIN`/TUN. Teste: `docker exec warp curl -x socks5h://localhost:1080 https://cloudflare.com/cdn-cgi/trace` deve mostrar `warp=on` |
| Busca vazia em produção | Popule o Postgres com `python scripts/seed_club.py --club-id 898181 --club-name "Vibe ES"` (rodar localmente) |
| Clube 500 / sync falha | Mesmo caso — seed local ou proxy; a API passa a servir dados do DB quando a EA falha |
| Erro de CORS | `CORS_ORIGINS` deve ser o domínio exato do web (ex: `https://proclubs.vectosports.com`) |
| Traefik / Unhealthy no Coolify | Next.js precisa `HOSTNAME=0.0.0.0` (já no compose); redeploy após pull |
