interface BaseFieldsProps {
  numTrains: number | "";
  numRoutes: number | "";
  numPoints: number | "";
  numIntervals: number | "";
  onChange: (field: string, value: number | "") => void;
}

export function BaseFields({
  numTrains,
  numRoutes,
  numPoints,
  numIntervals,
  onChange,
}: BaseFieldsProps) {
  return (
    <div className="grid-4">
      <div className="field">
        <label htmlFor="num_trains">Número de trens</label>
        <input
          id="num_trains"
          type="number"
          min={1}
          placeholder="ex: 2"
          value={numTrains}
          onChange={(e) =>
            onChange(
              "num_trains",
              e.target.value === "" ? "" : Number(e.target.value),
            )
          }
        />
      </div>
      <div className="field">
        <label htmlFor="num_routes">Número de rotas</label>
        <input
          id="num_routes"
          type="number"
          min={1}
          placeholder="ex: 7"
          value={numRoutes}
          onChange={(e) =>
            onChange(
              "num_routes",
              e.target.value === "" ? "" : Number(e.target.value),
            )
          }
        />
      </div>
      <div className="field">
        <label htmlFor="num_points">Número de pontos</label>
        <input
          id="num_points"
          type="number"
          min={1}
          placeholder="ex: 5"
          value={numPoints}
          onChange={(e) =>
            onChange(
              "num_points",
              e.target.value === "" ? "" : Number(e.target.value),
            )
          }
        />
      </div>
      <div className="field">
        <label htmlFor="num_intervals">Número de intervalos</label>
        <input
          id="num_intervals"
          type="number"
          min={1}
          placeholder="ex: 1"
          value={numIntervals}
          onChange={(e) =>
            onChange(
              "num_intervals",
              e.target.value === "" ? "" : Number(e.target.value),
            )
          }
        />
      </div>
    </div>
  );
}
