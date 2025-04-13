# Nuvigo Web

O Nuvigo é um assistente meteorológico inteligente que te ajuda a ficar por dentro do tempo com previsões precisas e personalizadas. Desenvolvida com Next.js, nossa interface web é super intuitiva e te permite visualizar as condições do tempo em tempo real e as previsões para os próximos dias.

## 🚀 Primeiros Passos

Primeiro, vamos instalar as dependências do projeto:

```bash
npm install
```

Depois, é só rodar o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador para ver o resultado.

Você pode começar a mexer na página editando o arquivo `app/page.tsx`. A página vai atualizar automaticamente enquanto você faz as alterações.

## 🛠️ Tecnologias que a gente usa

- [Next.js](https://nextjs.org) - Framework React pra produção
- [TypeScript](https://www.typescriptlang.org) - JavaScript com tipagem
- [Tailwind CSS](https://tailwindcss.com) - Framework CSS utilitário
- [SWR](https://swr.vercel.app) - Biblioteca pra gerenciar estado e cache
- [Jest](https://jestjs.io) - Framework de testes
- [Prisma](https://www.prisma.io) - ORM moderno pra banco de dados
- [Fastify](https://www.fastify.io) - Framework web rápido e eficiente
- [Zod](https://zod.dev) - Validação de dados em tempo de execução

## 🌟 O que a gente oferece

- 🌤️ Dados do tempo em tempo real do Tomorrow.io
- 🤖 Respostas naturais com IA
- 🔐 Login seguro com tokens de refresh
- 📧 Verificação de email
- 🔑 Recuperação de senha
- 💬 Histórico de conversas com sessões
- 📝 Documentação Swagger da API
- 🔍 API com validação de tipos
- 🗄️ Banco de dados PostgreSQL com Prisma

## 🎯 O que a gente quer alcançar

O Nuvigo Web tem como objetivo principal te dar uma experiência incrível ao usar nosso assistente meteorológico, garantindo:

- Informações do tempo rápidas e precisas
- Interface fácil de usar e bonita
- Integração perfeita com nossa API
- Performance excelente em qualquer dispositivo
- Segurança e privacidade dos seus dados
- Crescimento sustentável
- Código fácil de manter

## 📚 Documentação

A documentação da nossa API tá disponível no Swagger UI em `/documentation` quando o servidor tá rodando. Lá você encontra:

- Detalhes de todos os endpoints
- Como fazer as requisições
- O que precisa pra autenticar
- Exemplos de como usar
- Área de testes

Você pode acessar a documentação em:
- Desenvolvimento: http://localhost:3333/documentation
- Produção: https://api.nuvigo.com.br/documentation

## 🐳 Rodando com Docker

Se você quiser rodar o projeto usando Docker, é bem tranquilo:

1. **Criar a imagem Docker**:
```bash
docker build -t nuvigo-web .
```

2. **Rodar o container**:
```bash
docker run -p 3000:3000 nuvigo-web
```

3. **Pra desenvolvimento com hot-reload**:
```bash
docker run -p 3000:3000 -v $(pwd):/app nuvigo-web npm run dev
```

4. **Pra produção**:
```bash
docker run -p 3000:3000 -e NODE_ENV=production nuvigo-web npm start
```

### Variáveis de Ambiente

Não esquece de configurar essas variáveis no seu arquivo `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nuvigo"
TOMORROW_API_KEY="sua-chave-api-tomorrow"
OPENAI_API_KEY="sua-chave-api-openai"
JWT_SECRET="sua-chave-secreta-jwt"
```

## 📝 Como o projeto é organizado

```
nuvigo-web/
├── app/                # Pasta principal da aplicação
│   ├── page.tsx        # Página inicial
│   └── layout.tsx      # Layout principal
├── public/             # Arquivos estáticos
├── styles/             # Estilos globais
├── prisma/             # Configuração do Prisma
├── src/                # Código fonte
│   ├── components/     # Componentes React
│   ├── hooks/          # Custom hooks
│   ├── services/       # Serviços e integrações
│   └── types/          # Definições de tipos
└── package.json        # Dependências e scripts
```

## 🤝 Quer ajudar?

Contribuições são sempre bem-vindas! Dá uma olhada no nosso [guia de contribuição](CONTRIBUTING.md) pra saber mais.

## 📄 Licença

Esse projeto usa a licença MIT - confere o arquivo [LICENSE](LICENSE) pra mais detalhes.

# API Nuvigo Weather AI

Uma API moderna e segura em TypeScript que fornece informações meteorológicas com respostas em linguagem natural usando IA. Desenvolvida com Fastify, Prisma e OpenAI.

## 🌟 Recursos

- 🌤️ Dados do tempo em tempo real do Tomorrow.io
- 🤖 Respostas naturais com IA
- 🔐 Login seguro com tokens de refresh
- 📧 Sistema de verificação de email
- 🔑 Recuperação de senha
- 💬 Histórico de conversas com sessões
- 📝 Documentação Swagger da API
- 🔍 API com validação de tipos
- 🗄️ Banco de dados PostgreSQL com Prisma

## 🛠️ Tecnologias

- **Runtime**: Node.js
- **Framework**: Fastify
- **Linguagem**: TypeScript
- **Banco de Dados**: PostgreSQL
- **ORM**: Prisma
- **Autenticação**: JWT com tokens de refresh
- **Documentação**: Swagger/OpenAPI
- **Validação**: Zod
- **IA**: OpenAI
- **Dados Meteorológicos**: API Tomorrow.io

## 📋 Pré-requisitos

- Node.js (v22 ou superior)
- PostgreSQL
- Chave da API Tomorrow.io
- Chave da API OpenAI

## 🔧 Variáveis de Ambiente

Crie um arquivo `.env` na pasta raiz com as seguintes variáveis:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nuvigo"
TOMORROW_API_KEY="sua-chave-api-tomorrow"
OPENAI_API_KEY="sua-chave-api-openai"
JWT_SECRET="sua-chave-secreta-jwt"
GOOGLE_MAPS_API_KEY="sua-chave-secreta-google-maps"
```

## 🚀 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/nuvigo-api.git
cd nuvigo-api
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o banco de dados:
```bash
npm run prisma generate
npm run prisma db push
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

5. Acesse a documentação da API:
```bash
open http://localhost:3333/documentation
```

## 📚 Documentação da API

A documentação da API está disponível através do Swagger UI em `/documentation` quando o servidor está rodando. Esta documentação interativa fornece:

- Descrições detalhadas dos endpoints
- Esquemas de requisição/resposta
- Requisitos de autenticação
- Exemplos de requisições e respostas
- Funcionalidade de teste

Você pode acessar a documentação em:
- Desenvolvimento: http://localhost:3333/documentation
- Produção: https://api.nuvigo.com.br/documentation

## 🔌 Endpoints da API

### Autenticação

- `POST /auth/register` - Cadastrar novo usuário
- `POST /auth/login` - Fazer login com email e senha
- `POST /auth/refresh` - Atualizar token de acesso
- `POST /auth/logout` - Fazer logout e invalidar token de refresh
- `POST /auth/verify-email` - Verificar email do usuário
- `POST /auth/forgot-password` - Solicitar recuperação de senha
- `POST /auth/reset-password` - Redefinir senha com token
- `GET /auth/me` - Obter informações do usuário autenticado

### Usuários

- `POST /users` - Criar novo usuário
- `GET /users` - Listar todos os usuários
- `GET /users/:id` - Obter usuário por ID
- `PUT /users/:id` - Atualizar usuário
- `DELETE /users/:id` - Deletar usuário

### Tempo

- `GET /weather` - Obter informações do tempo para uma localização e salvar a consulta/resposta na sessão de chat ativa
  - Parâmetros:
    - `location`: Nome ou coordenadas da localização
    - `language`: Idioma da resposta (en/pt)

### Sessões de Chat

- `GET /sessions` - Listar todas as sessões de chat do usuário autenticado
- `GET /sessions/:sessionId` - Obter uma sessão específica por ID (inclui mensagens)
- `DELETE /sessions/:sessionId` - Deletar uma sessão específica e todas as suas mensagens

### Mensagens de Chat

- `POST /chats` - Criar nova mensagem em uma sessão (requer `chatSessionId`)
- `GET /chats/:chatId` - Obter uma mensagem específica por ID
- `PUT /chats/:chatId` - Atualizar uma mensagem específica
- `DELETE /chats/:chatId` - Deletar uma mensagem específica

## 🗄️ Esquema do Banco de Dados

### Usuário
- Chave primária UUID
- Email (único)
- Senha (criptografada)
- Nome (opcional)
- Status de verificação de email
- Timestamps
- Relações com sessões de chat e tokens

### SessãoChat
- Chave primária UUID
- Relação com usuário
- Título opcional (ex: gerado da primeira consulta)
- Timestamps (createdAt, updatedAt - usados para atividade da sessão)
- Relação com mensagens da sessão

### Chat
- Chave primária UUID
- Relação com SessãoChat (vincula mensagem a uma sessão)
- Localização
- Temperatura
- Condições do tempo
- Resposta em linguagem natural
- Timestamps

### Tokens
- Tokens de refresh
- Tokens de verificação de email
- Tokens de recuperação de senha
- Todos com expiração e relações com usuário

## 💻 Desenvolvimento

### Estrutura do Projeto

```
nuvigo-api/
├── src/
│   ├── routes/         # Rotas da API
│   ├── services/       # Serviços e lógica de negócio
│   ├── prisma/         # Configuração do Prisma
│   ├── utils/          # Funções utilitárias
│   └── types/          # Definições de tipos
├── tests/              # Testes
└── package.json        # Dependências e scripts
```