<p align="center">
  <img src="public/logo.svg" alt="Meeplix Logo" width="150" />
</p>

É um gerenciador de coleções de jogos de tabuleiro, criado para você organizar, explorar e acompanhar todos os seus board games de maneira simples e prática.

## 📋 Funcionalidades

### Área Pública
- Visualização da coleção em grid responsivo
- Busca por título, designer, editora, mecânica
- Filtros: jogadores, duração, complexidade, mecânicas
- Ordenação: nome, ano, notas, complexidade, data
- Detalhes do jogo: capa, stats, ratings, resumo regras, arquivos

### Área Administrativa (/admin)
- Autenticação email/senha
- Dashboard com tabela de jogos
- Upload de capa e arquivos (manual, regras, etc.)
- Tags/mecânicas como chips adicionáveis
- Interface para web scraping (BGG/Ludopedia) - preparado

## 🚀 Stack Tecnológica

- **Framework**: Next.js 16 (App Router, Server Actions)
- **Language**: TypeScript 5
- **UI**: React 19 + Tailwind CSS 3 + shadcn/ui (Radix UI)
- **Database**: PostgreSQL 16 + Prisma ORM 5
- **Auth**: NextAuth v5 (Credentials, JWT)
- **Validation**: Zod + React Hook Form
- **Integrations**: BoardGameGeek XML API2 + scraping da Ludopedia (Cheerio, fast-xml-parser)
- **Container**: Docker + Docker Compose
- **File Storage**: Filesystem local (volume Docker)
- **Tests**: Vitest + Testing Library
- **Quality**: ESLint + SonarQube

## 🐳 Início Rápido com Docker

### Pré-requisitos
- Docker e Docker Compose instalados

### 1. Clone e configure
```bash
git clone <repo>
cd meeplix
cp .env.example .env
# Edite .env com suas configurações (especialmente NEXTAUTH_SECRET)
```

### 2. Gere um NEXTAUTH_SECRET seguro
```bash
openssl rand -base64 32
```

### 3. Suba os containers
```bash
docker compose up -d
```

### 4. Execute migrações e seed
```bash
docker compose exec app npm run db:migrate
docker compose exec app npm run db:seed
```

### 5. Acesse
- **Público**: http://localhost:3000
- **Admin**: http://localhost:3000/admin/login
  - Email: `admin@meeplix.local` (ou o definido no .env)
  - Senha: a definida no .env

## 💻 Desenvolvimento Local

### Pré-requisitos
- Node.js 22+
- PostgreSQL 16+ (ou use apenas o container do DB)

### 1. Instale dependências
```bash
npm install
```

### 2. Configure variáveis de ambiente
```bash
cp .env.example .env
# Edite .env
```

### 3. Suba apenas o PostgreSQL
```bash
docker compose up -d db
```

### 4. Execute migrações e seed
```bash
npm run db:migrate
npm run db:seed
```

### 5. Inicie em modo dev
```bash
npm run dev
```

## 🗄️ Banco de Dados

### Models Principais

**AdminUser**
- id, email (unique), passwordHash, name, createdAt, updatedAt

**Game**
- id, name, originalName, description, year
- minPlayers, maxPlayers, minPlaytime, maxPlaytime
- publisher, designer, artist
- bggRating, ludoRating, bggRank, ludoRank, weight (complexidade)
- bestPlayers, minAge, coverImage, notes
- createdAt, updatedAt
- relations: files[]

**GameFile**
- id, gameId, originalName, displayName, mimeType
- extension, size, path, type (enum), uploadedAt
- relation: game

### Enum FileType
`COVER | MANUAL | RULEBOOK | ERRATA | QUICK_REFERENCE | IMAGE | OTHER`

## 📦 Armazenamento de Arquivos

Arquivos ficam em `storage/games/{gameId}/`:
```
storage/
└── games/
    └── abc123/
        ├── cover.jpg
        ├── manual.pdf
        ├── regras.pdf
        └── referencia.pdf
```

- Metadados no PostgreSQL (GameFile)
- Validação: MIME type, extensão, tamanho (100MB max)
- Proteção contra path traversal
- Nomes sanitizados + UUID

## 🔐 Segurança

- Autenticação apenas área admin (`/admin/*`)
- Middleware protege rotas admin
- Senhas com bcrypt (cost 12)
- JWT tokens HttpOnly, Secure, SameSite
- Validação Zod em todas as entradas
- Upload: whitelist MIME, size limit, sanitização
- Path traversal protection
- Variáveis sensíveis apenas via .env
- Error boundaries sem stack traces

## 📦 Build de Produção

```bash
# Build da imagem Docker
docker compose build

# Ou build local
npm run build
npm start
```

### Variáveis de Produção Obrigatórias
- `DATABASE_URL` - PostgreSQL production
- `NEXTAUTH_SECRET` - Chave forte (32+ chars)
- `NEXTAUTH_URL` - URL pública (ex: https://meeplix.local)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` - Credenciais iniciais

## 💾 Backup e Restore

### Backup
```bash
# Database
docker compose exec db pg_dump -U postgres meeplix > backup_$(date +%Y%m%d).sql

# Arquivos (volume storage)
docker run --rm -v meeplix_storage:/data -v $(pwd):/backup alpine tar czf /backup/storage_backup_$(date +%Y%m%d).tar.gz -C /data .
```

### Restore
```bash
# Database
docker compose exec -T db psql -U postgres meeplix < backup_20240115.sql

# Arquivos
docker run --rm -v meeplix_storage:/data -v $(pwd):/backup alpine tar xzf /backup/storage_backup_20240115.tar.gz -C /data
```

## 🔄 Migrações de Banco

```bash
# Desenvolvimento
npm run db:migrate

# Produção (aplicar migrações existentes)
npx prisma migrate deploy
```

## 📝 Licença

Este projeto está licenciado sob a licença MIT.