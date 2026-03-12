# Equilibra Que Dá!

> Rastreador de questões do ENEM para alunos do IFRN – Campus Nova Cruz.

**Equilibra Que Dá!** é uma iniciativa do **Prof. Me. Igor Gacheiro da Silva** (IFRN – Campus Nova Cruz), desenvolvida por **Giovanni Vasconcelos de Medeiros**. A aplicação permite que estudantes acompanhem seu desempenho na resolução de questões do ENEM, registrando sessões de estudo por matéria, visualizando estatísticas detalhadas e identificando os principais motivos de erro — tudo sem necessidade de cadastro ou conexão com servidor externo.

---

## ✨ Funcionalidades

- 📝 **Registro de sessões** por matéria (Matemática, Linguagens, Ciências da Natureza, Ciências Humanas e suas subdisciplinas).
- � **Histórico paginado** com filtro por matéria, exclusão e **duplicação rápida** de registros.
- ⚡ **Edição Ágil** via modais integrados, sem necessidade de navegação entre páginas.
- 📊 **Dashboard analítico** com KPIs, gráficos de barras, doughnut, linha e radar.
- 🎯 **Metas diária e semanal** configuráveis pelo usuário.
- 💾 **Persistência local** via `localStorage` — os dados ficam no dispositivo do aluno, sem necessidade de conta.
- ☁️ **Sincronização Cloud via Google Drive** — o aluno usa sua conta Google para salvar e recuperar o progresso entre dispositivos, sem criar conta adicional. Os dados são armazenados em uma pasta isolada e privada (`appDataFolder`) no Google Drive do próprio aluno. Nenhum dado transita por servidores do projeto (**LGPD**).
  - Sincronização automática com **debounce de 5 s** para otimização de banda.
  - Sincronização manual disponível na página de Configurações.
  - Merge inteligente: sessões são unidas por ID; `localStorage` é sempre a fonte da verdade primária.
- 🌐 PWA (Progressive Web App) — instalável no celular para uso como aplicativo nativo.
- 🌐 **100% client-side** — nenhuma requisição para backend externo.
- 🎨 **Tema escuro customizado** (`enemDark`) integrado ao Vuetify 3.
- ✅ **Validação de formulários** com Zod — regras de negócio garantidas em tempo de compilação e em runtime.
- 💾 **Portabilidade Total** — Sistema de Backup e Restauração via arquivos `.json` com validação de integridade.
- 🚀 Onboarding Interativo — tutorial guiado para novos usuários.

---

## 📖 Requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | `^24.x` (recomendado via `.tool-versions`) |
| npm | `^10.x` |
| jq | `^1.6` (necessário para o `release.sh`) |
| driver.js | `^1.4.0` (tour de onboarding) |
| remotestoragejs | removido em v1.3.0 — substituído por Google Identity Services nativo |

> O arquivo [`.tool-versions`](.tool-versions) permite gerenciar a versão do Node.js com [asdf](https://asdf-vm.com/) ou [mise](https://mise.jdx.dev/).

---

## 🏗️ Arquitetura

### Nuxt 3 + Nitro Engine (Sistema Autossuficiente)

A aplicação é construída sobre o **Nuxt 3**, que utiliza o **Nitro** como engine de servidor universal. A principal decisão arquitetural é que **não existe backend externo**. Toda a lógica reside no próprio bundle gerado pelo Nuxt.

```
┌─────────────────────────────────────────────────────┐
│                  Nuxt 3 Application                  │
│                                                      │
│  ┌──────────────┐   ┌──────────────────────────────┐ │
│  │  Vue 3 SPA   │   │     Nitro Engine (SSR/SG)    │ │
│  │              │   │                              │ │
│  │  pages/      │   │  server/api/   (endpoints)   │ │
│  │  components/ │   │  server/routes/ (rotas HTTP) │ │
│  │  composables/│   │  server/middleware/ (hooks)  │ │
│  │  stores/     │   │                              │ │
│  └──────────────┘   └──────────────────────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │              Pinia Store (persistedstate)         │ │
│  │         localStorage key: enem-tracker-data      │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### Por que não há backend externo?

O perfil do usuário (estudante do ensino médio/técnico) e o escopo do projeto dispensam autenticação e banco de dados centralizado. O Nitro viabiliza, se necessário no futuro, a adição de **Server Routes** (`server/api/*.ts`) que rodam no mesmo processo — ou como funções serverless em plataformas como Vercel e Netlify — sem alterar a estrutura do projeto.

#### Renderização: SPA pura (`ssr: false`)

O `nuxt.config.ts` define `ssr: false`, o que significa que a aplicação é gerada como **Single Page Application**. Não há hidratação no servidor; o HTML inicial é mínimo e todo o rendering ocorre no cliente. Essa escolha é adequada para uma aplicação de uso pessoal que opera exclusivamente com dados locais.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
    ssr: false,          // SPA pura — sem server-side rendering
    compatibilityDate: '2024-04-03',
    // ...
})
```

#### Nitro Server Routes (capacidade futura)

Caso seja necessário adicionar persistência remota, o Nitro permite criar endpoints sem nenhuma dependência externa. Um arquivo em `server/api/sessions.get.ts` é automaticamente exposto como `GET /api/sessions`:

```ts
// server/api/sessions.get.ts  (exemplo de extensão futura)
export default defineEventHandler(async (event) => {
    // lógica executada no servidor Nitro ou como função serverless
    return { sessions: [] }
})
```

---

### Camadas da Aplicação

| Camada | Diretório | Responsabilidade |
|---|---|---|
| **Tipos e Schemas** | `types/index.ts` | Enums, schemas Zod, tipos TypeScript |
| **Estado Global** | `stores/study.ts` | Pinia store com persistência em `localStorage` |
| **Sincronização Cloud** | `composables/useSync.ts` | remoteStorage: upload, download, merge offline-first |
| **Componentes** | `components/` | Elementos de interface desacoplados e reutilizáveis |
| **Lógica de Negócio** | `composables/useStatistics.ts` | Cálculos de estatísticas e datasets para gráficos |
| **Interface (Páginas)** | `pages/`, `layouts/` | Telas orchestradoras da aplicação |
| **Plugins** | `plugins/` | Inicialização de Vuetify, Pinia, Chart.js e SyncStudy |

### Tipos e Validação (Zod)

Todos os contratos de dados são definidos em [`types/index.ts`](types/index.ts) com [Zod](https://zod.dev/). A principal inovação é a **Lógica de Erro Zero**, implementada via `.superRefine()` no `SessionSchema`:

```ts
export const SessionSchema = z.object({
    id:                  z.string().uuid(),
    date:                z.string().min(1),
    subject:             Materia,
    totalQuestions:      z.number().int().min(1),
    wrongQuestions:      z.number().int().min(0),
    correctQuestions:    z.number().int().min(0),
    primaryErrorReason:  MotivoErro.nullable(), // Suporta Erro Zero
}).superRefine((data, ctx) => {
    // Se houver erros, o motivo é obrigatório
    if (data.wrongQuestions > 0 && data.primaryErrorReason === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Se houver erros, selecione o motivo.', path: ['primaryErrorReason'] })
    }
    // Se não houver erros, o motivo deve ser nulo
    if (data.wrongQuestions === 0 && data.primaryErrorReason !== null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Sessões sem erros não devem ter motivo.', path: ['primaryErrorReason'] })
    }
})
```

---

### Sincronização Cloud — Arquitetura Offline-First

A sincronização é uma **camada opcional** sobre o `localStorage`. O fluxo respeita o **princípio offline-first**:

```
localStorage  ←──(fonte da verdade)──→  Google Drive (appDataFolder)
      │                                        │
      │  uploadData(data)  ──────────────────► │
      │                                        │
      │◄────────────────── downloadAndMerge()  │
      │  (merge por ID: local ganha conflito)  │
```

**Fluxo de merge (`_mergeSessions`):**
1. Monta um `Map<id, Session>` com todas as sessões remotas.
2. Sobrescreve com as sessões locais (local ganha em caso de conflito de ID).
3. Sessões exclusivas do remoto são incorporadas (recuperação de dados de outros dispositivos).

**Debounce de 5 s:** O plugin `syncStudy.client.ts` subscreve ao `$subscribe` do Pinia e agenda o upload com 5 segundos de atraso. Edições rápidas em sequência resultam em um único upload.

**Falha silenciosa:** Se o Google Drive ou a autenticação falhar, a store continua operando normalmente a partir do `localStorage`. O erro é exibido apenas na página de Configurações.

**Timeout de segurança {
  "error": {
    "code": 403,
    "message": "Google Drive API has not been used in project 445002403787 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=445002403787 then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.",
    "errors": [
      {
        "message": "Google Drive API has not been used in project 445002403787 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=445002403787 then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.",
        "domain": "usageLimits",
        "reason": "accessNotConfigured",
        "extendedHelp": "https://console.developers.google.com"
      }
    ],
    "status": "PERMISSION_DENIED",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "reason": "SERVICE_DISABLED",
        "domain": "googleapis.com",
        "metadata": {
          "serviceTitle": "Google Drive API",
          "containerInfo": "445002403787",
          "service": "drive.googleapis.com",
          "activationUrl": "https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=445002403787",
          "consumer": "projects/445002403787"
        }
      },
      {
        "@type": "type.googleapis.com/google.rpc.LocalizedMessage",
        "locale": "en-US",
        "message": "Google Drive API has not been used in project 445002403787 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=445002403787 then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry."
      },
      {
        "@type": "type.googleapis.com/google.rpc.Help",
        "links": [
          {
            "description": "Google developers console API activation",
            "url": "https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=445002403787"
          }
        ]
      }
    ]
  }
}
(15 s):** A função `connect()` dispara um `setTimeout` de 15 segundos após chamar `requestAccessToken()`. Se o popup OAuth não resolver neste intervalo (popup bloqueado, rede indisponível), o estado `isConnecting` é resetado e uma mensagem de erro acionável é exibida ao usuário.

#### Google Drive API Nativa

A sincronização é implementada diretamente contra a **Google Drive REST API v3** usando o SDK oficial **Google Identity Services (GIS)**, sem bibliotecas de abstração intermediárias.

| Aspecto | Detalhe |
|---|---|
| **Autenticação** | Google Identity Services (`https://accounts.google.com/gsi/client`) — OAuth 2.0 via popup, sem redirecionamento de página |
| **Token** | `access_token` armazenado em `sessionStorage` (expira ao fechar a aba); expiry epoch rastreado para evitar uso de tokens válidos quase-expirados |
| **Escopo** | `https://www.googleapis.com/auth/drive.appdata` — acesso exclusivo à pasta oculta do app, sem tocar nos arquivos pessoais |
| **Upload** | Multipart POST na criação; PATCH mídia na atualização; re-criação automática se o arquivo for deletado externamente (404 → POST) |
| **Download** | GET com `alt=media` para obter o conteúdo diretamente, após `list` para resolver o ID do arquivo |
| **Token Expiry** | Respostas 401 da Drive API invocam `_handleAuthExpiry()`, que limpa o token e pede nova autenticação |

```ts
// Inicialização (composables/useSync.ts)
const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.appdata',
    callback: (tokenResponse) => { /* armazena token e atualiza syncState */ },
    error_callback: (err) => { /* popup fechado, bloqueado, etc. */ },
})
```

#### Soberania de Dados (LGPD)

- O único nó que processa os dados é o servidor escolhido pelo próprio usuário.
- O projeto não tem acesso a nenhum token OAuth, nenhum dado de sessão, nenhum metadado de uso.
- A conexão é 100% opcional; remover a funcionalidade do ar não afeta nenhum dado de nenhum aluno.
- O token OAuth fica em `localStorage` do dispositivo do aluno — não em cookies, não em banco de dados externo.

#### Privacidade no Google Drive (`drive.appdata`)

Quando o aluno conecta com uma conta Google, a integração nativa com o Google Drive utiliza exclusivamente o escopo **`drive.appdata`**, que dá acesso apenas a uma pasta oculta e isolada criada especificamente para este aplicativo (`appDataFolder`). Isso garante que:

- O aplicativo **não pode ler, modificar ou excluir** nenhum arquivo pessoal do usuário no Google Drive.
- A pasta do aplicativo fica invisível no Google Drive normal do aluno — não aparece na listagem de arquivos.
- O aluno pode revogar o acesso a qualquer momento em [Configurações da Conta Google → Aplicativos de terceiros](https://myaccount.google.com/permissions).
- O projeto não armazena, não transita e não tem acesso a nenhum token de autenticação Google.

> **Para produtores do projeto:** O Client ID OAuth está em `composables/useSync.ts` (constante `CLIENT_ID`). Ele deve ser gerado no [Google Cloud Console](https://console.cloud.google.com/) com escopo restrito a `https://www.googleapis.com/auth/drive.appdata` e as origens autorizadas configuradas para o domínio de produção.

---

### Portabilidade e Backup

Como o estado reside exclusivamente no navegador do aluno, a aplicação implementa um sistema de **Backup e Restauração** via arquivo JSON, garantindo a portabilidade dos dados entre dispositivos.

- **Exportação (`exportData`):** A store Pinia gera um arquivo `.json` contendo as sessões e metas, incluindo um timestamp `exportedAt`.
- **Importação (`importData`):** Valida a integridade do arquivo utilizando `LocalStorageSchema.safeParse` antes de persistir no `localStorage`.
- **Segurança e Integridade:** O uso do Zod garante que dados importados respeitem todas as regras de negócio (ex: total de acertos deve ser coerente com o total de questões).

### Analytics (Estatísticas)

O composable [`composables/useStatistics.ts`](composables/useStatistics.ts) processa os dados para visualização. Para manter a relevância pedagógica, os gráficos de **"Motivos de Erro"** filtram automaticamente entradas onde `primaryErrorReason` é nulo, focando apenas nos pontos de melhoria real.

### Onboarding Interativo

A primeira experiência do usuário é guiada pelo composable [`composables/useOnboarding.ts`](composables/useOnboarding.ts), que utiliza a biblioteca **driver.js**.

- **Persistência:** O status do tour é controlado pela chave `equilibra-onboarding-completo` no `localStorage`.
- **Design:** O tour possui estilização customizada (`.equilibra-popover`) para o tema **enemDark**, com background em tom *surface* (`#434343`) e botões na cor *primary* do IFRN.
- **Tour Manual:** O usuário pode reiniciar o tutorial a qualquer momento através do modal de Configurações.

---

## 🔖 Versionamento e Release

### Automação com `release.sh`

Para manter a consistência do projeto, utilizamos o script [`scripts/release.sh`](scripts/release.sh), que automatiza o ciclo de vida de novas versões:

1. **Bump de Versão:** Atualiza o versionamento no `package.json` seguindo o padrão SemVer.
2. **Registro:** Atualiza o `CHANGELOG.md` com as mudanças recentes.
3. **Git Tag:** Cria uma tag anotada localmente.
4. **Deploy:** Ao realizar o push da tag (`git push --tags`), o **GitHub Actions** dispara automaticamente o build e deploy para produção no branch `main`.

---

## 🗂️ Estrutura do Projeto

```
equilibra-que-da-ifrn/
├── app.vue                     # Entrada da aplicação Vue e Estilos do Driver.js
├── nuxt.config.ts              # Configuração do Nuxt 3 / Nitro (preset: static)
├── vercel.json                 # Headers de cache agressivo para o Edge Network
├── package.json
├── tsconfig.json
├── .tool-versions              # Versão do Node.js (asdf/mise)
│
├── components/                 # Componentes Vue reutilizáveis
│   └── SessionForm.vue         # Lógica centralizada de registro e validação
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD: deploy apenas em tags de release
│
├── types/
│   └── index.ts                # Schemas Zod com Lógica de Erro Zero
│
├── stores/
│   └── study.ts                # Pinia store com exportData/importData
│
├── composables/
│   ├── useStatistics.ts        # Lógica de cálculo (filtros de relevância)
│   └── useOnboarding.ts        # Gerenciamento do Tour de Boas-vindas
│
├── pages/
│   ├── index.vue               # Dashboard de desempenho
│   ├── registrar.vue           # Registro/edição de sessão
│   ├── historico.vue           # Histórico de registros
│   └── ajuda-backup.vue        # Guia detalhado de backup
│
├── layouts/
│   └── default.vue             # Layout com Toolbar e Navigation Drawer
│
├── plugins/
│   ├── vuetify.ts              # Vuetify 3 com @mdi/js (tree-shaking de ícones)
│   ├── pinia.ts                # Inicialização do Pinia com persistedstate
│   └── chartjs.client.ts       # Registro dos componentes do Chart.js (client-only)
│
├── public/
│   └── assets/images/          # Logos e imagens (preferencialmente WebP)
│
└── scripts/
    └── release.sh              # Automação de releases SemVer
```

---

## Middlewares

### Client-side (Vue Router)

O Nuxt registra automaticamente arquivos em `middleware/` como guardas de rota do lado do cliente. Eles são executados antes da navegação e têm acesso ao contexto de rota (`to`, `from`). Exemplo de um guard que poderia proteger rotas:

```ts
// middleware/auth.ts  (exemplo)
export default defineNuxtRouteMiddleware((to, from) => {
    // Executado no cliente antes de cada navegação
    // Útil para validar estado da store, redirecionar, etc.
})
```

### Nitro Hooks (Server-side)

Quando `ssr` está habilitado (ou ao usar Server Routes), os **Nitro hooks** permitem interceptar o ciclo de vida de cada requisição no servidor:

```ts
// server/middleware/logger.ts  (exemplo)
export default defineEventHandler((event) => {
    // Executado em toda requisição ao Nitro antes das rotas
    console.log(`[${event.method}] ${getRequestURL(event).pathname}`)
})
```

Na configuração atual (SPA), os middlewares Nitro são relevantes apenas quando Server Routes são utilizadas.

---

## 📦 Instalação

### Ambiente Local

**1. Clone o repositório:**

```bash
git clone https://github.com/vasconcelos-giovanni/equilibra-que-da-ifrn.git
cd equilibra-que-da-ifrn
```

**2. Instale as dependências:**

```bash
npm install
```

> O script `postinstall` executa `nuxt prepare` automaticamente, gerando os tipos TypeScript em `.nuxt/`.

**3. Inicie o servidor de desenvolvimento:**

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

### Build de Produção

**Build padrão (Node.js como servidor Nitro):**

```bash
npm run build
npm run preview   # testa o build localmente
```

**Geração estática (recomendado para deploy simples):**

```bash
npm run generate
```

O comando `generate` produz um diretório `.output/public/` com arquivos HTML/CSS/JS estáticos que podem ser servidos por qualquer CDN ou servidor de arquivos.

### Deploy em Plataformas Serverless

#### Vercel

O Vercel detecta projetos Nuxt 3 automaticamente. Basta conectar o repositório:

```bash
npx vercel
```

O Nitro utilizará o preset `vercel` e cada Server Route será implantada como uma **Vercel Serverless Function** separada.

#### Netlify

```bash
npx netlify deploy --build
```

O preset `netlify` do Nitro converte Server Routes em **Netlify Functions**. Para deploy contínuo, configure `Build command: npm run generate` e `Publish directory: .output/public` no painel do Netlify.

---

## Páginas

| Rota | Arquivo | Descrição |
|---|---|---|
| `/` | `pages/index.vue` | Dashboard com KPIs, gráficos e metas |
| `/registrar` | `pages/registrar.vue` | Container para registro rápido |
| `/historico` | `pages/historico.vue` | Listagem com edição/duplicação via modais |
| `/configuracoes` | `pages/configuracoes.vue` | Sincronização cloud, metas, backup e tutorial |
| `/ajuda-backup` | `pages/ajuda-backup.vue` | Guia de exportação e importação de dados |

---

## ⚡ Otimizações de Performance

### Estratégia de Build: Static Site Generation (SSG)

O Nitro está configurado com `preset: 'static'`. O comando `npm run generate` produz arquivos 100% estáticos em `.output/public/`, que o Vercel serve diretamente pelo **Edge Network (CDN)** — sem disparar nenhuma Serverless Function. Com 150 usuários/mês, a aplicação permanece confortavelmente na camada gratuita Hobby.

```
Usuário → Vercel Edge (CDN) → .output/public/
           ↑
        Cache-Control: max-age=31536000, immutable
        (JS/CSS com hash de conteúdo nunca expiram)
```

### Cache Agressivo (`vercel.json`)

O arquivo [`vercel.json`](vercel.json) configura headers HTTP por padrão de rota:

| Padrão | Cache-Control | Estratégia |
|---|---|---|
| `/_nuxt/**`, `/**/*.js`, `/**/*.css` | `immutable, 1 ano` | Hash de conteúdo muda a cada deploy |
| `/assets/**`, `/**/*.webp` | `immutable, 1 ano` | Assets com hashes |
| `/**/*.html` | `must-revalidate` | HTML sempre revalidado para receber o novo bundle |

### Tree-Shaking de Ícones (`@mdi/js`)

A biblioteca `@mdi/font` carregava um arquivo CSS de ~300 KB com todos os ícones MDI. Ela foi substituída por `@mdi/js`, que exporta cada ícone como uma constante SVG individual.

**Antes:** `@mdi/font` → ~300 KB (CSS + woff2 com todos os ícones)
**Depois:** `@mdi/js` → apenas os ícones importados entram no bundle

Como usar ícones em componentes Vue:

```vue
<script setup lang="ts">
import { mdiCheckCircleOutline, mdiCloseCircleOutline } from '@mdi/js'
</script>

<template>
  <!-- Ícone inline via SVG path -->
  <v-icon :icon="mdiCheckCircleOutline" color="success" />
  <v-icon :icon="mdiCloseCircleOutline" color="error" />
</template>
```

> Todos os ícones disponíveis estão listados em [@mdi/js no npm](https://www.npmjs.com/package/@mdi/js). O nome segue o padrão camelCase: `mdi-check-circle-outline` → `mdiCheckCircleOutline`.

### Validação do `localStorage` (Anti-CLS)

O `pinia-plugin-persistedstate` hidrata a store a partir do `localStorage` no primeiro carregamento. Dados corrompidos ou de uma versão antiga podem causar erros em runtime e re-renders desnecessários (CLS — Cumulative Layout Shift).

O serializer customizado em [`stores/study.ts`](stores/study.ts) envolve a desserialização com `LocalStorageSchema.safeParse()`. Se os dados forem inválidos, o estado padrão é usado silenciosamente:

```ts
serializer: {
    serialize: JSON.stringify,
    deserialize: (raw) => {
        try {
            const result = LocalStorageSchema.safeParse(JSON.parse(raw))
            if (result.success) return result.data
            return LocalStorageSchema.parse({})  // estado padrão seguro
        } catch {
            return LocalStorageSchema.parse({})
        }
    },
},
```

O `LocalStorageSchema` está definido em [`types/index.ts`](types/index.ts) e valida toda a estrutura do estado persistido:

```ts
export const LocalStorageSchema = z.object({
    sessions: z.array(SessionSchema).default([]),
    goal: GoalSchema.default({ dailyTarget: 30, weeklyTarget: 150 }),
})
```

### Compressão de Assets

O Nitro está configurado com `compressPublicAssets: { brotli: true, gzip: true }`. Todos os arquivos estáticos são pré-comprimidos em formato Brotli e Gzip durante o `npm run generate`.

> **Recomendação:** Converta imagens em `public/assets/images/` para o formato **WebP**. Ferramentas recomendadas: [Squoosh](https://squoosh.app/) ou `npx @squoosh/cli --webp auto public/assets/images/*.png`.

---

## 🔖 Versionamento e Release

### Commits Semânticos

O projeto adota o padrão [Conventional Commits](https://www.conventionalcommits.org/). Cada mensagem de commit deve seguir a estrutura:

```
<tipo>[escopo opcional]: <descrição curta>

[corpo opcional]

[rodapé(s) opcional(is)]
```

#### Tipos Permitidos

| Tipo | Quando usar | Impacto no semver |
|---|---|---|
| `feat` | Nova funcionalidade para o usuário | `minor` |
| `fix` | Correção de bug | `patch` |
| `perf` | Melhoria de performance | `patch` |
| `refactor` | Refatoração sem mudança de comportamento | — |
| `style` | Formatação, espaços em branco | — |
| `test` | Adição ou correção de testes | — |
| `docs` | Alteração na documentação | — |
| `chore` | Tarefas de manutenção (build, deps, CI) | — |
| `ci` | Alterações em pipelines de CI/CD | — |
| `revert` | Reverte um commit anterior | depende |

#### Breaking Changes

Qualquer tipo pode indicar **breaking change** com `!` antes dos dois pontos ou com `BREAKING CHANGE:` no rodapé:

```
feat!: renomeia chave do localStorage para evitar conflito

BREAKING CHANGE: A chave anterior 'enem-tracker-data' foi substituída por
'enem-tracker-v2'. Dados existentes serão perdidos na migração.
```

#### Exemplos

```bash
# Nova funcionalidade
git commit -m "feat(historico): adiciona filtro por intervalo de datas"

# Correção de bug
git commit -m "fix(stats): corrige cálculo de taxa de acerto quando total é zero"

# Atualização de dependência
git commit -m "chore(deps): atualiza nuxt para 3.15.0"

# Documentação
git commit -m "docs: adiciona seção de deploy na Vercel ao README"
```

### CI/CD com GitHub Actions

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) garante que o Vercel só receba um deploy quando uma tag de release é criada — **nenhum push de commit rotineiro consome Build Minutes**.

```
git push origin feat/nova-funcionalidade  → ✗  Sem deploy
git push origin main                      → ✗  Sem deploy
git push origin v1.2.0                    → ✅  Deploy de Produção
```

#### Configuração dos Segredos

Nas configurações do repositório (**Settings → Secrets and variables → Actions**), cadastre:

| Secret | Como obter |
|---|---|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Execute `npx vercel link` → leia `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Idem acima |

#### Fluxo Completo de Release

```bash
# 1. Finalize suas features no branch principal
git checkout main

# 2. Execute o script de release (faz bump, gera CHANGELOG, cria tag)
./scripts/release.sh minor

# 3. Publique a tag — isso dispara o deploy automaticamente
git push origin main --follow-tags
# ou separadamente:
git push origin v1.2.0
```

### Script de Release

O arquivo [`scripts/release.sh`](scripts/release.sh) automatiza todo o processo de release:

1. Valida o estado do repositório Git (branch, working tree).
2. Lê a versão atual do `package.json`.
3. Calcula a próxima versão com base no tipo de bump (`patch`, `minor`, `major`).
4. Gera ou atualiza o `CHANGELOG.md` com os commits desde a última tag.
5. Atualiza a versão no `package.json`.
6. Cria o commit de release e a tag Git anotada.
7. (Opcional) Faz push da tag para o repositório remoto.

#### Uso

```bash
# Tornar o script executável (apenas na primeira vez)
chmod +x scripts/release.sh

# Bump de patch (correções) — ex: 1.0.0 → 1.0.1
./scripts/release.sh patch

# Bump de minor (novas funcionalidades) — ex: 1.0.0 → 1.1.0
./scripts/release.sh minor

# Bump de major (breaking changes) — ex: 1.0.0 → 2.0.0
./scripts/release.sh major

# Pré-release — ex: 1.0.0 → 1.1.0-beta.1
./scripts/release.sh minor --pre beta

# Simula o release sem executar nada (dry-run)
./scripts/release.sh minor --dry-run

# Modo interativo (pergunta o tipo)
./scripts/release.sh
```

---

## 🗂️ Estrutura do Projeto

```
equilibra-que-da-ifrn/
├── app.vue                     # Entrada da aplicação Vue
├── nuxt.config.ts              # Configuração do Nuxt 3 / Nitro (preset: static)
├── vercel.json                 # Headers de cache agressivo para o Edge Network
├── package.json
├── tsconfig.json
├── .tool-versions              # Versão do Node.js (asdf/mise)
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD: deploy apenas em tags de release
│
├── types/
│   └── index.ts                # Enums, schemas Zod, LocalStorageSchema
│
├── stores/
│   └── study.ts                # Pinia store com serializer Zod anti-CLS
│
├── composables/
│   └── useStatistics.ts        # Lógica de cálculo e datasets para Chart.js
│
├── pages/
│   ├── index.vue               # Dashboard de desempenho
│   ├── registrar.vue           # Registro/edição de sessão de estudo
│   ├── historico.vue           # Histórico de registros
│   └── ajuda-backup.vue        # Guia de backup e restauração
│
├── layouts/
│   └── default.vue             # Layout principal (AppBar, Navigation Drawer, Footer)
│
├── plugins/
│   ├── vuetify.ts              # Vuetify 3 com @mdi/js (tree-shaking de ícones)
│   ├── pinia.ts                # Inicialização do Pinia com persistedstate
│   └── chartjs.client.ts       # Registro dos componentes do Chart.js (client-only)
│
├── public/
│   └── assets/images/          # Logos e imagens (preferencialmente WebP)
│
└── scripts/
    └── release.sh              # Automação de releases e geração de CHANGELOG
```

---

## Créditos

| Papel | Nome |
|---|---|
| Idealização | Prof. Me. Igor Gacheiro da Silva — IFRN Campus Nova Cruz |
| Desenvolvimento | Giovanni Vasconcelos de Medeiros |

---

*IFRN – Instituto Federal de Educação, Ciência e Tecnologia do Rio Grande do Norte – Campus Nova Cruz.*
