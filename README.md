# Starbem Roadmap

Ferramenta de roadmap conectada ao Jira para acompanhamento do Ciclo 2 (Abr–Ago 2026), compartilhada a cada 15 dias com CEO e CPTO.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Jira REST API v3** (POST `/rest/api/3/search/jql`)

## Deploy

Hospedado na Vercel → `https://starbem-roadmap.vercel.app`

## Configuracao local

1. Instale as dependencias:
   ```bash
   npm install
   ```

2. Crie o arquivo `.env.local` com:
   ```
   JIRA_BASE_URL=https://starbemapp.atlassian.net
   JIRA_EMAIL=seu-email@starbem.app
   JIRA_API_TOKEN=seu_token_jira
   JIRA_PROJECT_KEY=ID
   ```

3. Rode o servidor local:
   ```bash
   npm run dev
   ```

## Estrutura

```
app/
  page.tsx              # Pagina principal (tabs: Roadmap, OKRs, Squads)
  api/roadmap/route.ts  # Endpoint que busca dados do Jira
components/
  RoadmapTimeline.tsx   # Gantt horizontal por squad/sprint
  OKRDashboard.tsx      # Graficos de concentracao por OKR
  SquadDashboard.tsx    # Comparativo por squad
lib/
  jira.ts               # Cliente Jira (paginacao por cursor)
  transform.ts          # Transforma epics Jira -> RoadmapEpic
types/
  index.ts              # Interfaces TypeScript
```

## Squads monitorados

| Board ID | Squad |
|----------|-------|
| 628 | Jornada do Paciente |
| 629 | Jornada do Profissional |
| 630 | HR Experience |
| 67  | Jornada do Parceiro |

## Calendario — Ciclo 2

| Sprint | Periodo |
|--------|---------|
| S1 | 27 abr – 08 mai |
| S2 | 11 mai – 22 mai |
| S3 | 25 mai – 05 jun |
| S4 | 08 jun – 19 jun |
| S5 | 22 jun – 03 jul |
| S6 | 06 jul – 17 jul |
| S7 | 20 jul – 31 jul |
| S8 | 03 ago – 14 ago |

## OKRs — Ciclo 2

Objetivo pai: **[OBJECTIVE] Crescimento e Profundidade do Ecossistema Starbem** (ID-2666)

| Key | Descricao |
|-----|-----------|
| KR1 | Elevar uso de 2+ servicos conectados |
| KR2 | Lancar StarBrain Health Coach |
| KR3 | Consolidar WhatsApp como canal estrategico |
| KR4 | NPS >= 80 entre profissionais |
| KR5 | Portal RH Enterprise (60% acesso mensal) |

## Deteccao de Squad

Ordem de prioridade para atribuir squad a um epico:

1. **BoardId do sprint** — `customfield_10020[].boardId` (mais confiavel)
2. **Nome do sprint** — regex como fallback
3. **KR do epico** — para epicos sem sprint atribuido (KR5->HR Experience, KR4->Profissional, KR3->Parceiro, KR1/KR2->Paciente)

## Variaveis de ambiente (Vercel)

Configurar no painel da Vercel em Settings > Environment Variables:

- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_PROJECT_KEY`

## Deploy para producao

```bash
npx vercel --prod --yes
```
.
