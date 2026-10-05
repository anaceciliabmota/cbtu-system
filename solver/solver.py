"""
Isolated solver module.
Receives instance params and returns a result dict.
No dependency on the API or database layers.
"""


from solver.data import Data
from solver.model import ModelTrainTimetabling
from solver.heuristic import Heuristic

SOLVER = "HIGHS"
THREADS = 1

def solve(params: dict) -> dict:

    data = Data()
    data.read_data_from_dict(params)
    data.change_scale()

    # call heuristic to solve the problem
    heuristic = Heuristic(data, THREADS, 21600, 3600, SOLVER)
    total_time = heuristic.execute_heuristic()

    return heuristic.overall_best_sol.get_solution(data, round(total_time, 2))
