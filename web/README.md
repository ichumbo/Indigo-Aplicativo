# DragonCorp Web — Portal Profissional para Personal Trainers

Portal Web de alta produtividade para Personal Trainers do ecossistema DragonCorp, integrado ao aplicativo mobile e ao backend central unificado.

---

## 1. Arquitetura

O sistema é estruturado em duas camadas totalmente desacopladas com backend central compartilhado:

```text
/web
│
├── frontend               # React 19 + TypeScript + Vite + Vanilla CSS Tokens
│   ├── dist/              # Bundle estático de produção
│   └── src/
│       ├── api/           # Cliente Axios com interceptors de autenticação Sanctum
│       ├── components/    # Layout, Sidebar, Topbar, Modais, Tabelas, Estados Vazios
│       ├── context/       # AuthContext (Sessão do Personal e controle de acesso)
│       ├── pages/         # Dashboard, Alunos, Montador de Treino, Avaliações, etc.
│       ├── styles/        # Design System DragonCorp (#0D0D0E, #E50914)
│       └── types/         # Tipagem sincronizada com o Mobile
│
└── backend                # Laravel 11 (PHP 8.5) REST API v1
    ├── app/
    │   ├── Http/Controllers/Api/V1/  # Auth, Alunos, Treinos, Avaliações, Sync
    │   └── Models/                   # Eloquent Models (Users, Plans, Prescriptions)
    ├── database/
    │   ├── migrations/               # Esquema de banco de dados
    │   └── seeders/                  # Seeders com credenciais e catálogo mobile
    └── routes/api.php                # Endpoints RESTful versionados (/api/v1/...)
```

### Fluxo de Dados Unificado (Web ↔ Backend ↔ Mobile)

```text
       PORTAL WEB PERSONAL
                │
                ▼ REST API /api/v1
       LARAVEL BACKEND CENTRAL
                │
       BANCO DE DADOS CENTRAL
                │
                ▲ Sincronização Bidirecional (/api/v1/sync)
       APLICATIVO MOBILE (Aluno / Personal)
```

1. O Personal monta o treino pelo computador no Portal Web.
2. O treino é persistido de forma transacional no backend Laravel.
3. O Aluno abre o aplicativo DragonCorp no celular e recebe a notificação com a ficha atualizada.
4. O Aluno registra execuções e cargas durante o treino.
5. O Personal visualiza as novas cargas e gráficos de progressão na página de Evolução da Web.

---

## 2. Credenciais de Acesso Unificadas

Utilize o mesmo login e senha cadastrados no aplicativo móvel:

- **Treinador / Personal Trainer (Demo):**
  - **E-mail:** `treinador@dragoncorp.app`
  - **Senha:** `123456`
  - **Status:** CREF Verificado (`CREF 123456-G/SP`), Plano PRO ativo.

- **Aluno (Demo):**
  - **E-mail:** `aluno@dragoncorp.app`
  - **Senha:** `123456`

---

## 3. Instalação e Execução Local

### Pré-requisitos
- PHP 8.2+
- Composer 2.x
- Node.js 18+ e npm

### 3.1 Backend Laravel

```bash
cd web/backend

# Instalar dependências (caso necessário)
composer install

# Configurar ambiente
cp .env.example .env
php artisan key:generate

# Executar migrations e seeders oficiais
php artisan migrate:fresh --seed

# Iniciar servidor da API (porta 8000)
php artisan serve --port=8000
```

### 3.2 Frontend React

```bash
cd web/frontend

# Instalar dependências (caso necessário)
npm install

# Iniciar servidor de desenvolvimento (porta 5173)
npm run dev
```

Acesse no navegador: `http://localhost:5173`.

---

## 4. Testes Automatizados

### Backend (PHPUnit / Pest)
```bash
cd web/backend
php artisan test
```
*Valida autenticação, isolamento de alunos entre personal trainers (proteção contra IDOR com HTTP 403), criação transacional de treinos com Bi-sets e endpoints de sincronização.*

### Frontend (Build & Testes de Integração)
```bash
cd web/frontend
npm run test
npm run build
```
*Valida conformidade do bundle de produção, tags de SEO, tokens do Design System DragonCorp e integridade das rotas.*

### Integração Web ↔ Mobile & Suíte Completa
```bash
# Na raiz do repositório:
npm test
```
*Executa todos os 180 testes: 177 testes de regressão do mobile + 3 cenários de sincronização ponta a ponta.*

---

## 5. Variáveis de Ambiente

### Frontend (`web/frontend/.env`)
| Variável | Valor Padrão | Descrição |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000/api/v1` | URL base da API REST do Laravel |
| `VITE_APP_TITLE` | `DragonCorp Web` | Título da aplicação |

### Backend (`web/backend/.env`)
| Variável | Valor Padrão | Descrição |
| :--- | :--- | :--- |
| `DB_CONNECTION` | `sqlite` | Conexão do banco (suporta `mysql`) |
| `SANCTUM_STATEFUL_DOMAINS` | `localhost:5173,127.0.0.1:5173` | Domínios autorizados para SPA |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Origens autorizadas para CORS |

---

## 6. Produção e Deploy

- **Frontend:** Pode ser publicado em qualquer CDN/serviço estático (Cloudflare Pages, Vercel, AWS S3 + CloudFront) apontando para o diretório `web/frontend/dist` gerado via `npm run build`.
- **Backend:** Preparado para servidores PHP padrão (Forge, Nginx, Docker, Vapor) configurando `APP_ENV=production`, `APP_DEBUG=false`, caches do Laravel (`php artisan config:cache && php artisan route:cache`) e banco MySQL/PostgreSQL.
