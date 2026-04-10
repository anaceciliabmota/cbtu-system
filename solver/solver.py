"""
Isolated solver module.
Receives instance params and returns a result dict.
No dependency on the API or database layers.
"""

from time import sleep


def solve(params: dict) -> dict:
    # TODO: replace with real algorithm implementation
    sleep(5)
    print(params)
    return {
        "total_time": 0.0,
        "solution_value": 0,
        "trains": [
            {
                "id": 1,
                "trips": [
                    {
                        "id": 1,
                        "stops": [],
                    },
                ],
            },
            {
                "id": 2,
                "trips": [
                    {
                        "id": 1,
                        "stops": [],
                    },
                ],
            },
        ],
    }
