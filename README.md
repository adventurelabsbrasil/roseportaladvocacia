# Rose Portal Advocacia — Relatório Diário Marketing

Dashboard de relatório diário de marketing em **Next.js** (Vercel), com dados no **Supabase** e integração **Meta Ads** + Messenger/WhatsApp. Tema dark, métricas em BRL e gráfico de leads por campanha.

**URL do relatório:** `roseportaladvocacia.adventurelabs.com.br/marketing`

## Stack

- **Next.js 14+** (App Router), **TypeScript**, **Tailwind CSS**
- **Supabase** (dados)
- **Vercel** (deploy)
- **Meta Marketing API** (insights) e **Messaging Insights** (conversas iniciadas)

## Como rodar

1. **Clone e instale dependências**

```bash
npm install
```

2. **Variáveis de ambiente**

Copie o exemplo e preencha no `.env.local`:

```bash
cp .env.example .env.local
```

Obrigatórias para o sync e o dashboard:

- `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto Supabase (ex.: `https://ypyuzjczokfrvtndnoem.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — Service Role Key do Supabase (para escrita no sync e leitura no server)
- `META_ACCESS_TOKEN` — Token de acesso do usuário (Meta)
- `META_AD_ACCOUNT_ID` — ID da conta de anúncios (ex.: `499901480052479`)
- `META_BUSINESS_ID` — ID do negócio (ex.: `1731482393692848`)

Opcional (conversas iniciadas via Page Insights):

- `META_PAGE_ID` — ID da página do Facebook/Meta para métricas de conversas

3. **Banco de dados (Supabase)**

Rode a migration no **Supabase SQL Editor** (ou via CLI):

- Arquivo: `supabase/migrations/20250212000000_initial_marketing.sql`

Isso cria as tabelas `channels`, `campaigns`, `ads`, `daily_metrics` e insere o canal **Meta Ads**.

4. **Dev**

```bash
npm run dev
```

Acesse:

- Raiz: [http://localhost:3000](http://localhost:3000)
- Relatório: [http://localhost:3000/marketing](http://localhost:3000/marketing)

## Como disparar o sync

O relatório usa dados do **dia anterior** (“ontem”, timezone America/Sao_Paulo).

- **Manual:** no dashboard em `/marketing`, clique em **“Sincronizar ontem”**.  
  Isso chama `POST /api/sync/meta` e busca dados do Meta para ontem, gravando no Supabase.

- **Data específica (opcional):**  
  `POST /api/sync/meta?date=YYYY-MM-DD`  
  Ex.: `date=2025-02-11` para sincronizar só esse dia.

Depois de sincronizar, altere a data no filtro da página e/ou recarregue para ver os dados.

## Deploy (Vercel)

- Configure as mesmas variáveis de ambiente no projeto Vercel.
- Domínio: `roseportaladvocacia.adventurelabs.com.br` (configurar no dashboard da Vercel).

### Se der 404 após o build

No dashboard do projeto Vercel → **Settings** → **General**:

1. **Framework Preset:** deve ser **Next.js** (não "Other" nem outro).
2. **Root Directory:** deixe **vazio** (ou `.`). Se estiver preenchido com outra pasta, o deploy não acha o app.
3. **Build Command:** deixe o padrão (`npm run build` ou em branco).
4. **Output Directory:** deixe **vazio** (Next.js usa `.next`; a Vercel cuida disso).

Salve e faça um novo deploy (Deployments → ⋮ no último → Redeploy).

## Fase 2 — Histórico

Hoje o sync cobre **um único dia** (ontem ou a data passada em `?date=`).

**Futuro:** botão no dashboard para **“Puxar histórico até anteontem”**, que:

1. Chama a mesma API de sync em loop para cada dia desde uma data inicial até “anteontem”.
2. Ex.: de `dataInicial` até `ontem - 1` dia, um request por dia:  
   `POST /api/sync/meta?date=YYYY-MM-DD`

Assim o gráfico “Leads por dia por campanha” passa a ter vários pontos no tempo.

## Estrutura relevante

- `app/marketing/` — Página do relatório e layout
- `app/api/sync/meta/` — Sync Meta → Supabase
- `app/api/marketing/` — Leitura dos dados do dashboard (filtro por data e canal)
- `app/api/channels/` — Lista de canais (dropdown)
- `lib/supabase/server.ts` — Cliente Supabase (service role)
- `lib/meta/ads.ts` — Meta Marketing API (campanhas, anúncios, insights)
- `lib/meta/conversations.ts` — Conversas iniciadas (Page Insights, opcional)
- `lib/marketing/load-dashboard.ts` — Agregação para o dashboard
- `supabase/migrations/` — SQL das tabelas
