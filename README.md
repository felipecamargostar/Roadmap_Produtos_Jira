# Starbem Roadmap

Ferramenta de roadmap conectada ao Jira, compartilhada a cada 15 dias com CEO e CPTO.
O ciclo exibido acompanha a data de hoje (ver Calendario de ciclos).

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
| 630 | HR Experience | **HR Foundation** |
| 629 | Jornada do Profissional | Jornada do Profissional |
| 67  | Jornada do Parceiro | Jornada do Parceiro |

Na timeline, HR Foundation aparece logo abaixo de HR Experience.

Os nomes exibidos ficam em `SQUAD_LABELS` (`lib/transform.ts`). As chaves internas
continuam iguais ao campo Team do Jira — renomear um Team no Jira exige atualizar a
chave; trocar so o rotulo da tela exige mudar apenas `SQUAD_LABELS`.

## Calendario de ciclos

O calendario e derivado da data de hoje, nao e uma lista fixa (antes parava na
Sprint 8 do Ciclo 2, em 14/08/2026).

- Sprint: comeca na segunda e termina na sexta da semana seguinte (11 dias corridos).
- A sprint seguinte comeca 14 dias apos o inicio da anterior.
- Um ciclo tem 8 sprints (112 dias corridos); os ciclos se sucedem sem intervalo.
- Ancora: `2026-04-27` = Sprint 1 do Ciclo 2 (`SPRINT_ANCHOR` em `lib/transform.ts`).

Dai saem o numero do ciclo, sua janela e as 8 sprints exibidas. Exemplo: o Ciclo 3
vai de 17/08/2026 a 04/12/2026, e o Ciclo 4 comeca em 07/12/2026.

Se o calendario oficial mudar (pausa entre ciclos, ciclo com outro tamanho),
ajuste a ancora e as constantes no topo de `lib/transform.ts`.

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
do roadmap**.

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
