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

| Board ID | Squad (chave = Team no Jira) | Nome exibido |
|----------|------------------------------|--------------|
| 628 | Jornada do Paciente | **HR Experience** |
| 629 | Jornada do Profissional | Jornada do Profissional |
| 67  | Jornada do Parceiro | Jornada do Parceiro |

O board 630 (`Squad HR Experience` no Jira) nao e mais exibido no roadmap: o Team
nao casa com nenhuma squad conhecida e os epicos ficam ocultos.

Os nomes exibidos ficam em `SQUAD_LABELS` (`lib/transform.ts`). As chaves internas
continuam iguais ao campo Team do Jira — renomear um Team no Jira exige atualizar a
chave; trocar so o rotulo da tela exige mudar apenas `SQUAD_LABELS`.

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

A squad vem do campo **Team** do Jira (`customfield_10001`), que chega como
`Squad <Nome da Jornada>`. O prefixo `Squad ` e removido e o restante e casado
(sem diferenciar maiusculas) contra as chaves conhecidas em `SQUAD_META`.

Epicos cujo Team esta vazio ou nao casa com nenhuma chave conhecida ficam **fora
do roadmap** — e o caso do board 630 (`Squad HR Experience`).

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
