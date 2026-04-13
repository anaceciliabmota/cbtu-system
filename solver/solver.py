"""
Isolated solver module.
Receives instance params and returns a result dict.
No dependency on the API or database layers.
"""


from solver.data import Data
from solver.model import ModelTrainTimetabling
from solver.heuristic import Heuristic

SOLVER = "GUROBI"
THREADS = 1

def solve(params: dict) -> dict:

    data = Data()
    data.read_data_from_dict(params)
    # data.print_data()

    # call model to solve the problem
    # model = ModelTrainTimetabling(data, THREADS, 21600, 21600, SOLVER)
    # model.initialize()
    # model.execute_solver_for_full_model()
    # model.current_solution.display_solution(data, "model")

    # call heuristic to solve the problem
    heuristic = Heuristic(data, THREADS, 21600, 21600, SOLVER)
    total_time = heuristic.execute_heuristic()

    return heuristic.overall_best_sol.get_solution(data, round(total_time, 2))
