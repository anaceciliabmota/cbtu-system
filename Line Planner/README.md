# Line Planner

Frontend do CBTU Solver (estúdio visual da linha, rotas, frota e resultados).

## Node.js 22

Este app **não roda no Node 18**. É preciso **Node 22** (mínimo 20.19). O arquivo `.nvmrc` nesta pasta fixa a versão `22`.

```bash
nvm install 22          # só na primeira vez
nvm use                 # ativa o Node 22 (lê o .nvmrc)
node -v                 # deve mostrar v22.x
```

Se o `nvm` não existir neste terminal: `source ~/.nvm/nvm.sh && nvm use 22`.

Instale as dependências **já com o Node 22**. Um `npm install` no Node 18 quebra o Vite/Rolldown depois.

## Desenvolvimento

Na raiz do repositório, o backend precisa estar no ar (`uvicorn main:app --reload`, porta 8000).

```bash
nvm use
npm install
cp .env.example .env    # VITE_API_URL=http://localhost:8000
npm run dev
```

Abre em **http://localhost:8080/**.

Instruções completas (Python, API, testes e problemas comuns) estão no [README da raiz](../README.md).
