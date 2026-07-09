# Pro Clubs — EA FC 26

Monorepo com três camadas:

- **API** (`services/api`) — FastAPI, PostgreSQL, scraper on-demand
- **Packages** — cliente EA, ingestão e schemas compartilhados
- **Frontend** (`apps/web`) — Next.js (substitui o Streamlit como app principal)

## Arquitetura

```
Browser → Next.js (3000) → FastAPI (8000) → PostgreSQL (externo)
                              ↓                    ↑
                        EA Pro Clubs API      Redis (externo)
```

- **Free:** `GET /clubs/{id}/matches` retorna as **últimas 5 partidas** sincronizadas
- **Autenticado:** `GET /clubs/{id}/matches/history` retorna histórico acumulado no DB
- **Sync:** `POST /clubs/{id}/sync` busca na EA e faz upsert (dedup por `match_id`)

A EA não expõe paginação de histórico — ver [docs/EA_API_LIMITS.md](docs/EA_API_LIMITS.md).

## Deploy (Coolify / produção)

Ver [docs/COOLIFY.md](docs/COOLIFY.md).

Se a EA retornar **403** no VPS, use o proxy gratuito na Vercel: [docs/VERCEL.md](docs/VERCEL.md).

## Quick start (Docker)

```bash
cp .env.example .env
# Edite .env se for produção (senhas, domínio, secrets)

docker compose --project-directory . -f infra/docker-compose.yml up --build
# Portas localhost: cp infra/docker-compose.override.example.yml infra/docker-compose.override.yml
```

Todas as variáveis ficam no `.env` da raiz — o compose e o Coolify usam as **mesmas chaves** (ver `.env.example`).

- Web: http://localhost:3000
- API: http://localhost:8000/docs
- Postgres e Redis: **externos** via `DATABASE_URL` e `REDIS_URL`

## Desenvolvimento local

### Backend

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install packages/ea-client packages/shared packages/ingest -r services/api/requirements.txt

# Postgres e Redis no seu servidor (ou local para dev)
export DATABASE_URL=postgresql://usuario:senha@localhost:5432/proclubs
export REDIS_URL=redis://localhost:6379/0
export JWT_SECRET=dev-secret

cd services/api
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd apps/web
npm install
export NEXT_PUBLIC_API_URL=http://localhost:8000
export NEXTAUTH_URL=http://localhost:3000
export NEXTAUTH_SECRET=dev-nextauth-secret
npm run dev
```

### CLI de extração (legado)

```bash
python extract_data.py --club-name "Real Madrid"
```

### Testes

```bash
pytest tests/ -m "not integration"
```

### Probe da API EA

```bash
python packages/ea-client/scripts/probe_history.py --club-id 240 --json
```

## Estrutura

```
proclubs/
├── packages/
│   ├── ea-client/       # Cliente unificado EA
│   ├── ingest/          # Parsing + sync
│   └── shared/          # Schemas Pydantic
├── services/api/        # FastAPI + Alembic
├── apps/web/            # Next.js
├── infra/docker-compose.yml
├── dashboard/           # Streamlit legado (referência)
└── docs/
```

## Endpoints principais

| Método | Rota | Acesso |
|--------|------|--------|
| GET | `/clubs/search?name=` | Público |
| GET | `/clubs/{id}` | Público |
| GET | `/clubs/{id}/matches` | Público (últimas 5) |
| GET | `/clubs/{id}/matches/history` | Autenticado |
| POST | `/clubs/{id}/sync` | Autenticado |
| POST | `/users/me/clubs/{id}/track` | Autenticado |
| POST | `/auth/login` | Público |
| POST | `/auth/register` | Público |
| POST | `/auth/google` | Público |

## Licença

MIT — ver [LICENSE.md](LICENSE.md)
