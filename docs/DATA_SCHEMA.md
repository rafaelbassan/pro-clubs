# Documentação dos Dados — EA FC 26 Pro Clubs API

Este documento descreve a estrutura dos dados extraídos da API não oficial do EA Sports FC 26 Pro Clubs, baseada no projeto [fc26-clubs-api](https://github.com/1erkandogan/fc26-clubs-api).

## Endpoints

| Endpoint | Função | Parâmetros |
|----------|--------|------------|
| `/api/fc/allTimeLeaderboard/search` | Buscar clube por nome | `platform`, `clubName` |
| `/api/fc/clubs/info` | Detalhes do clube | `platform`, `clubIds` |
| `/api/fc/clubs/matches` | Histórico de partidas | `platform`, `clubIds`, `matchType`, `maxResultCount` |

**Plataforma padrão:** `common-gen5` (PS5 / Xbox Series X|S / PC nova geração)

**Tipos de partida (`matchType`):**
- `friendlyMatch` — Amistosos
- `leagueMatch` — Partidas de liga/divisão
- `playoffMatch` — Playoffs

---

## 1. Busca de Clube (`search`)

Retorna uma lista de clubes que correspondem ao nome pesquisado.

### Campos principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `clubId` | string | ID único do clube |
| `clubName` | string | Nome do clube |
| `wins` | string/int | Vitórias totais |
| `losses` | string/int | Derrotas totais |
| `ties` | string/int | Empates totais |
| `gamesPlayed` | string/int | Jogos disputados |
| `goals` | string/int | Gols marcados |
| `goalsAgainst` | string/int | Gols sofridos |
| `cleanSheets` | string/int | Jogos sem sofrer gols |
| `points` | string/int | Pontos acumulados |
| `currentDivision` | string/int | Divisão atual (1 = mais alta) |
| `bestDivision` | string/int | Melhor divisão alcançada |
| `reputationtier` | string/int | Tier de reputação |
| `promotions` | string/int | Promoções de divisão |
| `relegations` | string/int | Rebaixamentos |
| `platform` | string | Plataforma do clube |

### Objeto aninhado `clubInfo`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `clubInfo.name` | string | Nome do clube |
| `clubInfo.clubId` | int | ID do clube |
| `clubInfo.regionId` | int | ID da região |
| `clubInfo.teamId` | int | ID do time no jogo |
| `clubInfo.customKit.stadName` | string | Nome do estádio |
| `clubInfo.customKit.kitId` | string | ID do uniforme |
| `clubInfo.customKit.crestAssetId` | string | ID do escudo |

---

## 2. Detalhes do Clube (`clubs/info`)

Retorna informações detalhadas indexadas pelo `clubId`.

### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Nome do clube |
| `clubId` | int | ID do clube |
| `regionId` | int | Região |
| `teamId` | int | Time base no FIFA/FC |
| `customKit` | object | Configuração visual do clube |

### `customKit` — Personalização

| Campo | Descrição |
|-------|-----------|
| `stadName` | Nome do estádio |
| `kitId` | Uniforme principal |
| `customKitId` | Kit customizado casa |
| `customAwayKitId` | Kit visitante |
| `customThirdKitId` | Terceiro uniforme |
| `customKeeperKitId` | Uniforme do goleiro |
| `kitColor1`–`kitColor4` | Cores do uniforme (decimal RGB) |
| `crestColor` | Cor do escudo |
| `crestAssetId` | Asset do escudo |

---

## 3. Partidas (`clubs/matches`)

Cada partida contém dados dos dois clubes e estatísticas dos jogadores.

### Campos da partida

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `matchId` | string | ID único da partida |
| `timestamp` | int | Unix timestamp (segundos) |
| `timeAgo` | object | `{ number, unit }` — tempo relativo |
| `clubs` | object | Dados dos dois clubes (chave = clubId) |
| `players` | object | Stats por jogador, agrupadas por clube |
| `aggregate` | object | Agregados da partida |

### Dados por clube em `clubs[clubId]`

| Campo | Descrição |
|-------|-----------|
| `goals` | Gols marcados |
| `goalsAgainst` | Gols sofridos |
| `result` | `1` = vitória, `2` = derrota, `3` = empate |
| `score` | Placar do clube |
| `wins` / `losses` / `ties` | Contadores atualizados |
| `matchType` | Tipo numérico da partida |
| `details.name` | Nome do clube |
| `details.customKit.stadName` | Estádio |

### Stats de jogador (em `players[clubId][playerId]`)

| Campo | Descrição |
|-------|-----------|
| `playername` | Nome do jogador |
| `pos` | Posição |
| `rating` | Nota da partida |
| `goals` | Gols |
| `assists` | Assistências |
| `passesmade` | Passes certos |
| `tacklesmade` | Desarmes |
| `saves` | Defesas (goleiro) |
| `gameTime` | Tempo em campo (segundos) |
| `archetypeid` | Arquétipo do jogador |

---

## 4. Arquivos Gerados pela Extração

O script `extract_data.py` gera:

```
data/extracted/
├── {nome}_{club_id}.json          # Dados completos
├── {nome}_{club_id}_matches.csv   # Partidas tabulares
└── {nome}_{club_id}_summary.csv   # Resumo do clube
```

### Estrutura do JSON exportado

```json
{
  "extracted_at": "2026-07-09T17:00:00Z",
  "club_id": "240",
  "summary": { "name", "wins", "losses", "goals", ... },
  "details": { "name", "clubId", "customKit", ... },
  "matches": [ { "match_id", "date", "opponent_name", "result", ... } ],
  "matches_by_type": {
    "friendlyMatch": [...],
    "leagueMatch": [...],
    "playoffMatch": [...]
  },
  "stats": { "total_matches_extracted", ... }
}
```

### Campos das partidas normalizadas (CSV)

| Campo | Descrição |
|-------|-----------|
| `match_id` | ID da partida |
| `date` | Data/hora convertida |
| `match_type` | friendlyMatch / leagueMatch / playoffMatch |
| `club_name` | Nome do clube analisado |
| `club_goals` | Gols do clube |
| `opponent_name` | Nome do adversário |
| `opponent_goals` | Gols do adversário |
| `result` | V (vitória), D (derrota), E (empate) |
| `score` | Placar formatado (ex: `2-1`) |
| `stadium` | Estádio |

---

## 5. Limitações

- A API é **não oficial** e pode mudar ou bloquear requisições (HTTP 403 sem headers corretos).
- `maxResultCount` limita o histórico a **10 partidas** por tipo por requisição.
- Valores numéricos frequentemente vêm como **strings**.
- Timestamps são Unix em segundos; o offset de fuso é aplicado na extração (+2h por padrão).

---

## 6. Amostras

Exemplos de respostas brutas da API estão em `data/samples/`:
- `raw_search.json`
- `raw_details.json`
- `raw_league_match.json`
