# CBTU Solver API

API REST para criação de instâncias e execução do solver de escalonamento de trens.

## Requisitos

- Python 3.12+

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Rodar o servidor

```bash
uvicorn main:app --reload
```

Swagger UI disponível em: http://localhost:8000/docs

---

## Endpoints

### Instâncias

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/instances/` | Cria uma instância |
| `GET` | `/instances/` | Lista todas as instâncias |
| `GET` | `/instances/{id}` | Retorna uma instância |
| `POST` | `/instances/{id}/run` | Executa o solver e salva a solução |

### Soluções

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/solutions/` | Lista todas as soluções |
| `GET` | `/solutions/{id}` | Retorna uma solução |

---

## Estrutura do projeto

```
cbtu/
├── main.py                  # entry point, registro de routers e init do DB
├── database.py              # engine SQLite e dependência de sessão
├── solver/
│   └── solver.py            # módulo isolado do algoritmo — solve(params) -> dict
├── models/
│   ├── instance.py          # modelos de Instance + schemas de entrada/saída
│   └── solution.py          # modelos de Solution + schemas de entrada/saída
├── services/
│   └── solver_service.py    # orquestra execução do solver e persistência
└── routers/
    ├── instances.py          # rotas de instâncias
    └── solutions.py          # rotas de soluções
```

---

## Schema de entrada (InstanceParams)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `num_trains` | `int` | Número de trens |
| `num_trips` | `list[int]` | Máximo de viagens por trem |
| `time_intervals` | `list[list[int]]` | Intervalos de tempo `[[inicio, fim]]` em segundos |
| `stations` | `list[int]` | Índices dos nós que são estações |
| `crossings` | `list[int]` | Índices dos nós que são cruzamentos |
| `depots` | `list[int]` | Índices dos nós que são depósitos |
| `initial_point` | `int` | Nó inicial de todos os trens |
| `routes` | `list[list[int]]` | Sequência de nós de cada rota |
| `service_time_min` | `list[int]` | Tempo mínimo de serviço por estação (segundos) |
| `service_time_max` | `list[int]` | Tempo máximo de serviço por estação (segundos) |
| `cost_matrix` | `list[list[int]]` | Matriz de custos entre nós (`-1` = sem aresta) |
| `demands` | `list[int]` | Demanda por nó |
| `max_time` | `int` | Horizonte de tempo máximo (segundos) |
| `alpha` | `int` | Parâmetro do algoritmo |

---

## Schema de saída (SolutionResult)

```json
{
  "total_time": 1.84,
  "solution_value": 31922,
  "trains": [
    {
      "id": 0,
      "trips": [
        {
          "id": 0,
          "stops": [
            { "point": 0, "arrival": 142, "departure": 836 },
            { "point": 1, "arrival": 955, "departure": 1573 }
          ]
        }
      ]
    }
  ]
}
```

---

## Integrar o solver real

Edite `solver/solver.py` e implemente a função `solve`:

```python
def solve(params: dict) -> dict:
    # seu algoritmo aqui
    return {
        "total_time": ...,
        "solution_value": ...,
        "trains": [...]
    }
```

O módulo não tem dependência da API ou do banco — pode ser testado isoladamente:

```bash
python -c "from solver.solver import solve; print(solve({...}))"
```
