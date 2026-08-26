# CBTU Solver

Sistema de planejamento de horários ferroviários: você desenha a linha no navegador, o backend compila os dados e o solver calcula a grade de cada trem.

- **Backend (API)** — Python / FastAPI em `http://localhost:8000`
- **Frontend** — React (Line Planner) em `http://localhost:8080`

Os dois precisam estar rodando ao mesmo tempo.

---

## Pré-requisitos

| Ferramenta | Versão | Como conferir |
|------------|--------|----------------|
| Python | 3.12 ou superior | `python3 --version` |
| Node.js | **22** (mínimo 20.19) | `node -v` |
| npm | vem com o Node | `npm -v` |

### Node.js — versão obrigatória

O frontend usa **Vite 8**, que **não roda no Node 18**. Se `node -v` mostrar `v18.x`, o `npm run dev` quebra (`styleText` / `Cannot find native binding`).

Este repositório trava a versão em `Line Planner/.nvmrc` (**22**). Use o [nvm](https://github.com/nvm-sh/nvm):

```bash
# instalar o Node 22 (só na primeira vez)
nvm install 22

# em todo terminal, antes de npm install / npm run dev:
cd "Line Planner"
nvm use          # lê o .nvmrc e ativa o Node 22
node -v          # precisa mostrar v22.x
```

Se o `nvm` não for encontrado neste terminal:

```bash
source ~/.nvm/nvm.sh
nvm use 22
```

**Instale as dependências do frontend já com o Node 22 ativo.** Um `npm install` feito no Node 18 pula o binário nativo do Rolldown e o servidor não sobe.

---

## Instalação (primeira vez)

Na raiz do repositório (`cbtu/`):

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r frontend/requirements.txt
```

Frontend:

```bash
cd "Line Planner"
nvm use
npm install
cp .env.example .env               # opcional; padrão: http://localhost:8000
```

O `.env` pode conter:

```
VITE_API_URL=http://localhost:8000
```

---

## Como rodar

Abra **dois terminais**.

### 1 — Backend

```bash
cd /caminho/para/cbtu
source .venv/bin/activate          # Windows: .venv\Scripts\activate
uvicorn main:app --reload
```

Quando estiver ok:

```
INFO: Uvicorn running on http://127.0.0.1:8000
```

Documentação interativa da API: http://localhost:8000/docs

### 2 — Frontend

```bash
cd /caminho/para/cbtu/"Line Planner"
nvm use                            # Node 22
npm run dev
```

Abra **http://localhost:8080/**.

O backend libera CORS para `localhost:8080`, `localhost:3000` e `localhost:5173`. Em outra origem:

```bash
CORS_ORIGINS=http://localhost:8080,https://seu-dominio.com uvicorn main:app --reload
```

---

## Como usar a interface

1. **Cenários** — crie um novo ou carregue o exemplo do Metrô Recife.
2. **1 · Linha** — pontos, funções (estação / cruzamento / depósito), distâncias, depósito inicial e horizonte do dia.
3. **2 · Rotas** — sequência de pontos (começa e termina em depósito; inversão só em cruzamento). Clique para adicionar: trechos não vizinhos são preenchidos automaticamente; não dá para remover um ponto do meio e deixar um pulo (ex.: 1 → 3).
4. **3 · Frota e demanda** — trens, períodos do dia, demanda por ponto/sentido e espaçamento mínimo (alpha).
5. **4 · Executar** — o cenário é salvo no backend, compilado para o formato do solver e processado. A aba Resultados mostra horários, linhas de tempo e o diagrama espaço-tempo.

---

## Testes

Na raiz, com o ambiente virtual ativo:

```bash
python3 tests/test_line_map.py
python3 tests/test_visual_compile.py
```

Com o backend no ar:

```bash
python3 tests/test_api.py
# ou: pytest tests/
```

Build do frontend (também exige Node 22):

```bash
cd "Line Planner"
nvm use
npm run build
```

---

## Estrutura

```
cbtu/
├── main.py                      # API FastAPI
├── compiler/                    # modelo visual → params do solver
├── solver/                      # algoritmo
├── models/  routers/  services/
├── Line Planner/                # frontend (Node 22)
│   ├── .nvmrc                   # 22
│   └── .env.example
├── frontend/                    # Streamlit legado
└── tests/
```

### Frontend legado (Streamlit)

Não é a interface recomendada:

```bash
source .venv/bin/activate
streamlit run frontend/app.py      # http://localhost:8501
```

---

## API

| Método | Rota | O que faz |
|--------|------|-----------|
| `POST` | `/instances/` | Cria instância (`params` compilados **ou** `line` visual) |
| `GET` | `/instances/` | Lista (inclui `line` e `last_run`) |
| `GET` | `/instances/{id}` | Busca por ID |
| `PUT` | `/instances/{id}` | Atualiza |
| `DELETE` | `/instances/{id}` | Exclui instância e soluções |
| `GET` | `/instances/{id}/solutions` | Soluções desta instância |
| `POST` | `/instances/{id}/run` | Compila (se houver `line`) e executa o solver |
| `GET` | `/solutions/` | Lista soluções |
| `GET` | `/solutions/{id}` | Busca solução |

O solver em `solver/solver.py` não depende da API. A função `solve(params) -> dict` devolve `total_time`, `solution_value` e `trains`.

---

## Problemas comuns

**`node -v` mostra v18 / erro `styleText` / `EBADENGINE`**  
O terminal está no Node do sistema. `source ~/.nvm/nvm.sh && cd "Line Planner" && nvm use && node -v` — tem de ser v22.

**`Cannot find native binding` (Rolldown)**  
O `npm install` foi feito no Node 18. Com o 22 ativo:

```bash
cd "Line Planner"
nvm use
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Connection refused no navegador**  
O backend não está no ar, ou `VITE_API_URL` não aponta para `http://localhost:8000`.

**Erro de CORS**  
Inclua a origem do front em `CORS_ORIGINS` ao subir o uvicorn.

**Module not found (Python)**  
Ative o venv: `source .venv/bin/activate`.

**Erro 400 ao executar o solver**  
Linha incompleta (pontos, rotas, depósitos, cruzamentos ou demanda). A mensagem da API diz o que falta.
