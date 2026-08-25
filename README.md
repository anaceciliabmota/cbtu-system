# CBTU Solver — Guia Completo

Este documento explica como instalar, rodar e usar o sistema CBTU Solver — tanto para quem vai desenvolver quanto para quem só quer usar a interface.

---

## O que é este sistema?

O CBTU Solver é uma aplicação web que permite:

1. **Criar instâncias** — conjuntos de dados de entrada que descrevem um problema de escalonamento de trens
2. **Executar o solver** — um algoritmo que recebe esses dados e calcula a melhor solução
3. **Ver os resultados** — as rotas e horários gerados para cada trem

A aplicação tem duas partes:
- **Backend (API)**: recebe os dados, salva no banco, **compila** o modelo visual da linha e executa o solver
- **Frontend (interface visual)**: estúdio React em `Line Planner/` para desenhar a linha, rotas, frota e demanda

---

## Pré-requisitos

- **Python 3.12 ou superior** instalado na máquina
- **Node.js 20.19+** (Vite 8). Se o `node -v` mostrar v18, use o nvm: `nvm use` dentro de `Line Planner/`
- Acesso ao terminal (Prompt de Comando no Windows, Terminal no Linux/Mac)

Para verificar se o Python está instalado:

```bash
python3 --version
```

Se aparecer algo como `Python 3.12.x`, está ok.

---

## Instalação

### 1. Abra o terminal na pasta do projeto

```bash
cd /caminho/para/cbtu
```

### 2. Crie um ambiente virtual (faz o Python usar as dependências apenas deste projeto)

```bash
python3 -m venv .venv
```

### 3. Ative o ambiente virtual

**Linux / Mac:**
```bash
source .venv/bin/activate
```

**Windows:**
```bash
.venv\Scripts\activate
```

Você saberá que funcionou quando aparecer `(.venv)` no início da linha do terminal.

### 4. Instale as dependências

```bash
pip install -r frontend/requirements.txt
```

Isso pode demorar alguns minutos na primeira vez.

---

## Como rodar o sistema

O sistema precisa de **dois terminais abertos ao mesmo tempo** — um para o backend e outro para o frontend.

### Terminal 1 — Backend (API)

```bash
uvicorn main:app --reload
```

Você verá algo como:

```
INFO: Uvicorn running on http://127.0.0.1:8000
INFO: Application startup complete.
```

Isso significa que o backend está rodando. **Mantenha este terminal aberto.**

### Terminal 2 — Frontend React (interface principal)

Na primeira vez, instale as dependências do frontend:

```bash
cd "Line Planner"
nvm use          # Node 22 — o Vite 8 não roda no Node 18 do sistema
npm install
cp .env.example .env   # opcional; padrão aponta para http://localhost:8000
```

Depois, em qualquer sessão:

```bash
cd "Line Planner"
nvm use
npm run dev
```

Abra a URL que o Vite imprimir (em geral **http://localhost:8080** ou **http://localhost:3000**).

Variável opcional em `Line Planner/.env`:

```
VITE_API_URL=http://localhost:8000
```

O backend aceita requisições do frontend via CORS. Por padrão as origens `http://localhost:5173`, `http://localhost:8080` e `http://localhost:3000` estão liberadas. Para outras origens (produção), defina `CORS_ORIGINS` ao subir o uvicorn, por exemplo:

```bash
CORS_ORIGINS=http://localhost:8080,https://seu-dominio.com uvicorn main:app --reload
```

### Frontend legado (Streamlit)

A interface antiga em Streamlit ainda está disponível, mas **não é mais a interface recomendada**:

```bash
source .venv/bin/activate   # Linux/Mac
streamlit run frontend/app.py
```

Abre em `http://localhost:8501`.

---

## Como usar a interface

### Passo 1 — Crie ou abra um cenário

Na tela inicial, use **Novo cenário** (ou **Carregar exemplo** para o Metrô Recife). Cada cartão é um cenário salvo no backend.

### Passo 2 — Modele a linha

No editor, a aba **1 · Linha** deixa você:

- adicionar pontos, nomes, funções (estação, cruzamento, depósito) e tempos de parada
- informar a distância de cada trecho
- escolher o depósito inicial e o horizonte do dia (início e fim)

### Passo 3 — Defina rotas

Em **2 · Rotas**, monte a sequência de pontos de cada padrão de serviço. A rota precisa começar e terminar em depósito; inversão de sentido só em cruzamento.

### Passo 4 — Frota e demanda

Em **3 · Frota e demanda**:

- cadastre os trens e o máximo de viagens de cada um
- desenhe os períodos de demanda no dia
- preencha quantos trens devem partir de cada ponto/sentido em cada período
- ajuste o espaçamento mínimo (**alpha**) entre partidas

### Passo 5 — Execute o solver

O cenário é salvo automaticamente no backend. Em **4 · Executar**, clique em **Executar solver**. O backend:

1. Compila o modelo visual para a matriz 2N, rotas em vértices e demandas por intervalo (`compiler/`)
2. Normaliza os horários para o horizonte começar em 0s
3. Roda o solver e devolve a grade de horários

### Passo 6 — Veja os resultados

A aba **Resultados** mostra valor objetivo, tempo de execução, linhas de tempo por trem e o diagrama espaço-tempo. Os horários voltam para o relógio do dia (não o tempo relativo do solver).

---

## Executar os testes

**Compilador** (sem servidor):

```bash
python3 tests/test_line_map.py
python3 tests/test_visual_compile.py
```

**Backend** (com o servidor rodando):

```bash
pytest tests/
# ou
python3 tests/test_api.py
```

**Build de produção do frontend:**

```bash
cd "Line Planner"
npm run build
```

Sirva a pasta gerada pelo Vite (`.output` / `dist`) com nginx ou outro servidor; configure `VITE_API_URL` para a URL pública da API no momento do build.

---

## Estrutura do projeto

```
cbtu/
├── main.py                    # ponto de entrada do backend
├── database.py                # configuração do banco de dados (SQLite)
├── frontend/requirements.txt  # dependências Python
├── tests/                     # testes automatizados da API e do compilador
│
├── Line Planner/              # frontend React (interface principal)
│   ├── src/
│   └── package.json
│
├── compiler/
│   ├── line_map.py            # tradução linha nomeada → vértices 2N / cost matrix
│   └── visual.py              # modelo visual do Line Planner → InstanceParams
│
├── solver/
│   └── solver.py              # algoritmo do solver (isolado do restante)
│
├── models/
│   ├── instance.py            # estrutura dos dados de uma instância
│   └── solution.py            # estrutura dos dados de uma solução
│
├── services/
│   └── solver_service.py      # conecta a API ao solver
│
├── routers/
│   ├── instances.py           # endpoints de instâncias
│   └── solutions.py           # endpoints de soluções
│
└── frontend/                  # frontend legado (Streamlit)
    ├── app.py
    ├── api.py
    └── components.py
```

---

## Endpoints da API

A API também pode ser usada diretamente (sem a interface visual), por exemplo via terminal ou outro programa.

A documentação interativa fica disponível em: **http://localhost:8000/docs** (com o backend rodando)

### Instâncias

| Método | Rota | O que faz |
|--------|------|-----------|
| `POST` | `/instances/` | Cria uma instância (`params` compilados **ou** `line` visual) |
| `GET` | `/instances/` | Lista todas as instâncias (inclui `line` e `last_run`) |
| `GET` | `/instances/{id}` | Retorna uma instância pelo ID |
| `PUT` | `/instances/{id}` | Atualiza uma instância existente |
| `DELETE` | `/instances/{id}` | Exclui uma instância e suas soluções |
| `GET` | `/instances/{id}/solutions` | Lista as soluções desta instância |
| `POST` | `/instances/{id}/run` | Compila o modelo visual (se houver) e executa o solver |

### Soluções

| Método | Rota | O que faz |
|--------|------|-----------|
| `GET` | `/solutions/` | Lista todas as soluções |
| `GET` | `/solutions/{id}` | Retorna uma solução pelo ID |

---

## Integrar o solver real

O solver está isolado em `solver/solver.py`. Para substituir o placeholder pelo algoritmo real, edite apenas a função `solve`:

```python
def solve(params: dict) -> dict:
    # implemente o algoritmo aqui
    return {
        "total_time": ...,       # tempo de execução em segundos
        "solution_value": ...,   # valor da função objetivo
        "trains": [...]          # lista de trens com viagens e paradas
    }
```

O solver não tem nenhuma dependência da API ou do banco de dados — pode ser desenvolvido e testado de forma completamente independente:

```bash
python -c "from solver.solver import solve; print(solve({'num_trains': 2, ...}))"
```

---

## Problemas comuns

**`styleText` / `EBADENGINE` / Node v18 ao rodar o frontend**
O Vite 8 precisa de Node 20.19+. Este computador tem o Node 22 no nvm, mas o terminal pode estar no Node 18 do sistema. Na pasta `Line Planner/`:

```bash
source ~/.nvm/nvm.sh
nvm use
node -v    # deve mostrar v22.x
npm run dev
```

**`Cannot find native binding` do Rolldown**
O `npm install` foi feito no Node 18 e pulou o binário nativo. Com o Node 22 ativo:

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**"Connection refused" ou erro de rede no frontend**
O backend não está rodando. Certifique-se de que o Terminal 1 com `uvicorn` está ativo e que `VITE_API_URL` aponta para ele.

**Erro de CORS no navegador**
Inclua a origem do frontend em `CORS_ORIGINS` ao iniciar o backend (veja seção "Como rodar o sistema").

**"Module not found"**
O ambiente virtual não está ativado. Execute `source .venv/bin/activate` (Linux/Mac) ou `.venv\Scripts\activate` (Windows).

**Erro 400 ao executar o solver**
O modelo visual ainda está incompleto (faltam pontos, rotas, depósitos, cruzamentos ou demanda). A mensagem da API descreve o que falta.

**Erro 422 ao salvar via API com `params`**
Algum campo obrigatório do payload compilado está vazio ou com tipo errado.