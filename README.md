# CBTU Solver — Guia Completo

Este documento explica como instalar, rodar e usar o sistema CBTU Solver — tanto para quem vai desenvolver quanto para quem só quer usar a interface.

---

## O que é este sistema?

O CBTU Solver é uma aplicação web que permite:

1. **Criar instâncias** — conjuntos de dados de entrada que descrevem um problema de escalonamento de trens
2. **Executar o solver** — um algoritmo que recebe esses dados e calcula a melhor solução
3. **Ver os resultados** — as rotas e horários gerados para cada trem

A aplicação tem duas partes:
- **Backend (API)**: recebe os dados, salva no banco e executa o solver
- **Frontend (interface visual)**: formulário para preencher os dados e ver os resultados

---

## Pré-requisitos

- **Python 3.12 ou superior** instalado na máquina
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
pip install -r requirements.txt
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

### Terminal 2 — Frontend (Interface visual)

Abra um novo terminal, ative o ambiente virtual novamente e execute:

```bash
source .venv/bin/activate   # Linux/Mac
# ou
.venv\Scripts\activate      # Windows

streamlit run frontend/app.py
```

O navegador abrirá automaticamente em `http://localhost:8501` com a interface do sistema.

---

## Como usar a interface

### Passo 1 — Escolha ou crie uma instância

No topo da página há um campo chamado **"Instância"**. Você pode:

- Selecionar uma instância já existente (se houver)
- Deixar em **"Nova instância"** para criar uma do zero

### Passo 2 — Preencha o nome

O primeiro campo é o nome da instância. Use um nome descritivo, por exemplo: `linha-1-cenario-A`.

### Passo 3 — Preencha os campos base

Estes três campos desbloqueiam o restante do formulário:

| Campo | O que significa |
|-------|----------------|
| **Número de trens** | Quantos trens existem no problema |
| **Número de pontos** | Quantos nós (pontos) existem na linha |
| **Número de intervalos** | Quantos intervalos de tempo o problema considera |

Assim que estes campos forem preenchidos, os demais campos aparecem automaticamente.

### Passo 4 — Preencha os campos dinâmicos

**Dependentes do número de trens:**
- **Máx. viagens por trem**: para cada trem, informe o máximo de viagens que ele pode fazer
- **Rotas**: para cada trem, informe a sequência de nós que ele percorre (separados por espaço), ex: `0 1 2 3 4 9 8 7 6 5 0`

**Dependentes do número de pontos:**
- **Service time mínimo**: tempo mínimo de parada em cada ponto (em segundos)
- **Service time máximo**: tempo máximo de parada em cada ponto (em segundos)
- **Cost matrix**: matriz de custos entre os nós — os valores representam o custo de ir de um nó ao outro; `-1` significa que não há ligação direta
- **Demands**: demanda em cada nó (o número de passageiros ou unidades a atender)

**Dependentes do número de intervalos:**
- **Intervalos de tempo**: para cada intervalo, informe o segundo de início e o segundo de fim

**Campos livres (sempre visíveis):**
- **initial_point**: nó onde todos os trens começam
- **max_time**: horizonte de tempo máximo do problema (em segundos)
- **alpha**: parâmetro interno do algoritmo
- **stations**: índices dos nós que são estações (separados por vírgula), ex: `0, 4, 2, 1, 3`
- **crossings**: índices dos nós que são cruzamentos, ex: `0, 4, 2`
- **depots**: índices dos nós que são depósitos, ex: `0, 4`

### Passo 5 — Salve a instância

Dois botões estão disponíveis:

- **Salvar como nova instância**: cria uma nova entrada no banco com os dados preenchidos
- **Salvar alterações**: atualiza a instância que foi selecionada no início (só aparece habilitado se uma instância existente foi selecionada)

Após salvar, uma mensagem de confirmação aparece com o ID da instância salva.

### Passo 6 — Execute o solver

Após salvar (ou selecionar uma instância existente), o botão **"▶ Executar Solver"** fica disponível.

Clique nele. O sistema pode demorar alguns minutos dependendo do tamanho do problema. Uma animação de carregamento aparece enquanto o solver trabalha.

### Passo 7 — Veja os resultados

A solução é exibida logo abaixo com:

- **Solution value**: valor da função objetivo da solução encontrada
- **Tempo de execução**: quantos segundos o solver levou para rodar
- Por trem: uma seção expansível com todas as viagens e paradas, incluindo horário de chegada e partida em cada ponto

---

## Executar os testes

Com o backend rodando (Terminal 1 ativo), abra um terceiro terminal e execute:

```bash
python test_api.py
```

Isso testa automaticamente todos os endpoints da API e imprime OK ou FALHOU para cada um.

---

## Estrutura do projeto

```
cbtu/
├── main.py                    # ponto de entrada do backend
├── database.py                # configuração do banco de dados (SQLite)
├── requirements.txt           # lista de dependências Python
├── test_api.py                # script de testes da API
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
└── frontend/
    ├── app.py                 # página principal da interface
    ├── api.py                 # chamadas ao backend
    └── components.py          # seções do formulário e visualização
```

---

## Endpoints da API

A API também pode ser usada diretamente (sem a interface visual), por exemplo via terminal ou outro programa.

A documentação interativa fica disponível em: **http://localhost:8000/docs** (com o backend rodando)

### Instâncias

| Método | Rota | O que faz |
|--------|------|-----------|
| `POST` | `/instances/` | Cria uma instância |
| `GET` | `/instances/` | Lista todas as instâncias |
| `GET` | `/instances/{id}` | Retorna uma instância pelo ID |
| `PUT` | `/instances/{id}` | Atualiza uma instância existente |
| `POST` | `/instances/{id}/run` | Executa o solver para esta instância |

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

**"Connection refused" ao rodar o frontend**
O backend não está rodando. Certifique-se de que o Terminal 1 com `uvicorn` está ativo.

**"Module not found"**
O ambiente virtual não está ativado. Execute `source .venv/bin/activate` (Linux/Mac) ou `.venv\Scripts\activate` (Windows).

**Campos do formulário não aparecem**
Preencha primeiro os campos base: número de trens, número de pontos e número de intervalos.

**Erro 422 ao salvar**
Algum campo obrigatório está vazio ou com tipo errado. Verifique se todos os campos foram preenchidos corretamente.

## Ideia de melhoria

Em vez de uma matriz, ser um campo onde a pessoa vai adicionando ligacoes (ja q é uma matriz esparsa)