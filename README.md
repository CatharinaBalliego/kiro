# Kiro

Plataforma PayFi que transforma vendas em dinheiro imediato. O Kiro atua na intersecção entre o varejo tradicional e a inovação financeira da Web3, conectando lojistas e investidores através da blockchain Stellar.

**Demo em produção:**
- Landing page: https://kiropay.netlify.app
- Dashboard do lojista: https://kiro-merchant-dashboard.netlify.app/resumo

---

## Visão Geral

- **Dashboard do lojista** com saldo, recebimentos, rendimento e antecipação de recebíveis.
- **Integração Stellar** para tokenização e liquidação on-chain.
- **On-ramp / Off-ramp** via Etherfuse (BRL ⇄ token TESOURO).
- **PIX** para recebimentos e saques instantâneos.

---

## Stack

### Frontend (`frontend/kiro-dashboard`)

| Categoria | Tecnologia | Versão |
|-----------|-----------|--------|
| Runtime | Node.js | 20.x |
| Framework | React | 18.3.1 |
| Linguagem | TypeScript | 5.4.5 |
| Build tool | Vite | 5.4.8 |
| Estilização | Tailwind CSS | 3.4.13 |
| Roteamento | React Router DOM | 6.26.2 |
| Gráficos | Recharts | 2.13.0 |
| Ícones | Lucide React | 0.451.0 |
| Stellar SDK | @stellar/stellar-sdk | 12.3.0 |
| Carteiras | @creit.tech/stellar-wallets-kit | 1.1.0 |
| Lint / Format | ESLint 8 / Prettier 3 | — |
| Hospedagem | Netlify | — |

### Backend & Infra

| Categoria | Tecnologia | Versão |
|-----------|-----------|--------|
| Banco de dados | PostgreSQL | 16 (alpine) |
| Admin DB | Adminer | latest |
| Orquestração | Docker Compose | 3.8 |
| Backend container | Custom (porta 8000) | — |

---

## Estrutura do Projeto

```
kiro/
├── backend/                    # Serviço backend (Docker)
│   └── init.sql                # Schema PostgreSQL inicial
├── frontend/
│   └── kiro-dashboard/         # SPA React + Vite
│       ├── netlify/functions/  # Proxy serverless (produção)
│       ├── src/                # Código-fonte do dashboard
│       └── netlify.toml        # Configuração de deploy
├── docker-compose.yml          # DB + Adminer + Backend
└── .env.example                # Variáveis de ambiente
```

---

## Pré-requisitos

- **Node.js** 20.x e **npm** 10.x
- **Docker** e **Docker Compose**
- **Git**

---

## Como Rodar

### 1. Clone e configure variáveis de ambiente

```bash
git clone <repo-url>
cd kiro
cp .env.example .env
cp frontend/kiro-dashboard/.env.example frontend/kiro-dashboard/.env
```

Edite os dois `.env` com seus valores.

#### Variáveis raiz (`.env`)

```env
POSTGRES_USER=kiro
POSTGRES_PASSWORD=<sua-senha>
POSTGRES_DB=kiro
DB_HOST=db
DB_PORT=5432
DB_SSLMODE=disable
STELLAR_NETWORK=TESTNET
```

#### Variáveis do frontend (`frontend/kiro-dashboard/.env`)

```env
VITE_STELLAR_NETWORK=TESTNET
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_TESOURO_CODE=TESOURO
VITE_TESOURO_ISSUER=<asset-issuer-address>

ETHERFUSE_BASE_URL=https://api.sand.etherfuse.com
ETHERFUSE_API_KEY=<sua-chave>
```

> A chave `ETHERFUSE_API_KEY` é lida **apenas pelo proxy server-side** (Vite middleware em dev, Netlify Function em produção) — nunca é exposta ao cliente.

### 2. Suba o backend + banco

Na raiz do projeto:

```bash
docker compose up -d
```

Serviços disponíveis:

- **PostgreSQL** → `localhost:5432`
- **Adminer** (admin do DB) → http://localhost:8080
- **Backend** → http://localhost:8000

### 3. Rode o frontend

```bash
cd frontend/kiro-dashboard
npm install
npm run dev
```

Dashboard disponível em http://localhost:5173.

---

## Scripts do Frontend

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o Vite + proxy Etherfuse em modo dev |
| `npm run build` | Type-check com `tsc -b` e build de produção |
| `npm run preview` | Serve o build localmente |
| `npm run lint` | Roda ESLint (zero warnings) |
| `npm run format` | Formata com Prettier |

---

## Identidade Visual

Paleta principal (ver `src/styles/tokens.css`):

| Token | Hex | Uso |
|-------|-----|-----|
| Verde Kiro | `#00FF87` | CTAs, valores positivos |
| Preto Profundo | `#0A0B10` | Background (dark mode) |
| Roxo Estelar | `#7B2CBF` | Gradientes, acentos |
| Branco Neve | `#FFFFFF` | Tipografia principal |
| Cinza Ardósia | `#8E92A3` | Textos secundários |

**Tipografia:** Space Grotesk / Inter (display & sans), Roboto Mono (valores financeiros).

**Filosofia:** Dark mode first com glassmorphism.

---

## Deploy

- **Landing page:** Netlify — https://kiropay.netlify.app
- **Dashboard:** Netlify — https://kiro-merchant-dashboard.netlify.app/resumo
- **Backend + DB:** Docker Compose.

---

## Rede Stellar

Por padrão o projeto aponta para **Stellar Testnet** (`horizon-testnet.stellar.org`). Para mainnet, ajuste `VITE_STELLAR_NETWORK=PUBLIC` e `VITE_HORIZON_URL=https://horizon.stellar.org`.
