# Equilibra Que Dá!

> Rastreador de questões do ENEM para alunos do IFRN – Campus Nova Cruz.

**Equilibra Que Dá!** é uma iniciativa do **Prof. Me. Igor Gacheiro da Silva** (IFRN – Campus Nova Cruz), desenvolvida por **Giovanni Vasconcelos de Medeiros**. A aplicação permite que estudantes acompanhem seu desempenho na resolução de questões do ENEM, registrando sessões de estudo por matéria, visualizando estatísticas detalhadas e identificando os principais motivos de erro — tudo sem necessidade de cadastro ou conexão com servidor externo.

---

## ✨ Funcionalidades

- 📝 **Registro de sessões** por matéria (Matemática, Linguagens, Ciências da Natureza, Ciências Humanas e suas subdisciplinas).
- 📊 **Dashboard analítico** com KPIs, gráficos de barras, doughnut, linha e radar.
- 📋 **Histórico paginado** com filtro por matéria e exclusão de registros.
- 🎯 **Metas diária e semanal** configuráveis pelo usuário.
- 💾 **Persistência local** via `localStorage` — os dados ficam no dispositivo do aluno, sem necessidade de conta.
- 🌐 **100% client-side** — nenhuma requisição para backend externo.
- 🎨 **Tema escuro customizado** (`enemDark`) integrado ao Vuetify 3.
- ✅ **Validação de formulários** com Zod — regras de negócio garantidas em tempo de compilação e em runtime.

---

## 📖 Requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | `^24.x` (recomendado via `.tool-versions`) |
| npm | `^10.x` |

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
| **Lógica de Negócio** | `composables/useStatistics.ts` | Cálculos de estatísticas e datasets para gráficos |
| **Interface** | `pages/`, `layouts/` | Telas Vue 3 com Vuetify 3 |
| **Plugins** | `plugins/` | Inicialização de Vuetify, Pinia e Chart.js |

### Tipos e Validação (Zod)

Todos os contratos de dados são definidos em [`types/index.ts`](types/index.ts) com [Zod](https://zod.dev/). O schema `SessionSchema` é a fonte única de verdade para uma sessão de estudo:

```ts
export const SessionSchema = z.object({
    id:                  z.string().uuid(),
    date:                z.string().min(1),
    subject:             Materia,           // enum validado
    totalQuestions:      z.number().int().min(1),
    wrongQuestions:      z.number().int().min(0),
    correctQuestions:    z.number().int().min(0),
    primaryErrorReason:  MotivoErro,        // enum validado
}).refine(
    data => data.wrongQuestions <= data.totalQuestions,
    { message: 'Questões erradas não pode ser maior que o total' },
)
```

### Estado Global (Pinia + persistedstate)

O [`stores/study.ts`](stores/study.ts) é a única store da aplicação. Ela é configurada com o plugin `pinia-plugin-persistedstate`, que serializa e desserializa automaticamente o estado em `localStorage` sob a chave `enem-tracker-data`.

```ts
export const useStudyStore = defineStore('study', () => {
    const sessions = ref<Session[]>([])
    const goal     = ref<Goal>({ dailyTarget: 30, weeklyTarget: 150 })
    // ...
}, {
    persist: {
        storage: localStorage,
        key: 'enem-tracker-data',
    },
})
```

### Composable de Estatísticas

O [`composables/useStatistics.ts`](composables/useStatistics.ts) encapsula toda a lógica de cálculo e a preparação dos datasets para o Chart.js. Utiliza `computed` reativo para que os gráficos e KPIs sejam atualizados automaticamente sempre que a store muda.

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
| `/registrar` | `pages/registrar.vue` | Formulário de registro/edição de sessão |
| `/historico` | `pages/historico.vue` | Listagem com filtro e exclusão de registros |

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
├── nuxt.config.ts              # Configuração do Nuxt 3 / Nitro
├── package.json
├── tsconfig.json
├── .tool-versions              # Versão do Node.js (asdf/mise)
│
├── types/
│   └── index.ts                # Enums, schemas Zod e tipos TypeScript
│
├── stores/
│   └── study.ts                # Pinia store — estado global com persistência
│
├── composables/
│   └── useStatistics.ts        # Lógica de cálculo e datasets para Chart.js
│
├── pages/
│   ├── index.vue               # Dashboard de desempenho
│   ├── registrar.vue           # Registro/edição de sessão de estudo
│   └── historico.vue           # Histórico de registros
│
├── layouts/
│   └── default.vue             # Layout principal (AppBar, Navigation Drawer, Footer)
│
├── plugins/
│   ├── vuetify.ts              # Inicialização do Vuetify 3 com tema customizado
│   ├── pinia.ts                # Inicialização do Pinia com persistedstate
│   └── chartjs.client.ts       # Registro dos componentes do Chart.js (client-only)
│
├── public/
│   └── assets/images/          # Logos e imagens estáticas
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
