# Proxy EA na Vercel (plano grátis)

A EA bloqueia IPs de datacenter (VPS/Coolify). Este proxy roda na Vercel e repassa chamadas para `proclubs.ea.com` com os headers corretos.

```
Coolify (API) → Vercel (apps/ea-proxy) → proclubs.ea.com
```

## 1. Criar conta e deploy

1. Acesse [vercel.com](https://vercel.com) e crie conta (GitHub é o mais fácil).
2. **Add New Project** → importe o repositório `pro-clubs`.
3. **Root Directory:** `apps/ea-proxy` (obrigatório).
4. Framework: Next.js (detectado automaticamente).
5. Em **Environment Variables**, adicione:

   | Variável | Valor |
   |----------|--------|
   | `EA_PROXY_SECRET` | Gere com `openssl rand -hex 32` |

6. Clique **Deploy**.

Anote a URL gerada, ex.: `https://proclubs-ea-proxy.vercel.app`

## 2. Testar o proxy

```bash
SECRET="seu-secret-aqui"

curl -sS -H "x-ea-proxy-key: $SECRET" \
  "https://SEU-APP.vercel.app/api/ea/allTimeLeaderboard/search?platform=common-gen5&clubName=vibe" \
  | head -c 200
```

Deve retornar JSON com clubes (HTTP 200).

## 3. Configurar o Coolify (serviço `api`)

No painel do Coolify, no serviço **api**, adicione:

```env
EA_PROXY_BASE_URL=https://SEU-APP.vercel.app/api/ea
EA_PROXY_SECRET=mesmo-valor-do-passo-1
```

Redeploy o compose.

A API passa a chamar a Vercel em vez da EA diretamente. Postgres, Redis e web continuam no Coolify.

## 4. Testar em produção

Dentro do container da API:

```bash
docker exec -it CONTAINER_API python -c "
from app.services.club_service import _ea_client
api = _ea_client()
df = api.search_club_by_name('vibe es')
print('OK' if df is not None and not df.empty else api.last_error)
"
```

## Custos

- **Hobby (grátis):** suficiente para projeto pessoal e tráfego moderado.
- Cada busca/sync conta como invocação serverless.
- Timeout máximo ~10s no Hobby (buscas EA costumam levar 5–10s).

## Segurança

- Sempre defina `EA_PROXY_SECRET` em produção.
- Não exponha o proxy sem secret — qualquer um poderia usar sua cota Vercel.

## Alternativas

| Método | Quando usar |
|--------|-------------|
| Vercel proxy | Sync automático 24/7 no servidor |
| `scripts/seed_club.py` no Mac | Grátis, sync manual ou cron local |
| `EA_HTTP_PROXY` | Proxy residencial pago |
