interface TrainFieldsProps {
  numTrains: number;
  numRoutes: number;
  numTrips: (number | "")[];
  routeTexts: string[];
  onTripChange: (index: number, value: number | "") => void;
  onRouteChange: (index: number, value: string) => void;
}

export function TrainFields({
  numTrains,
  numRoutes,
  numTrips,
  routeTexts,
  onTripChange,
  onRouteChange,
}: TrainFieldsProps) {
  return (
    <>
      <h2>Máx. viagens por trem</h2>
      <div className="grid-trips">
        {Array.from({ length: numTrains }, (_, i) => (
          <div key={i} className="field">
            <label htmlFor={`trip_${i}`}>Trem {i}</label>
            <input
              id={`trip_${i}`}
              type="number"
              min={0}
              placeholder="ex: 6"
              value={numTrips[i] ?? ""}
              onChange={(e) =>
                onTripChange(
                  i,
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
          </div>
        ))}
      </div>
      <h2>Rotas (nós separados por espaço)</h2>
      {Array.from({ length: numRoutes }, (_, i) => (
        <div key={i} className="field" style={{ marginBottom: "0.5rem" }}>
          <label htmlFor={`route_${i}`}>Rota {i}</label>
          <input
            id={`route_${i}`}
            type="text"
            placeholder="ex: 0 1 2 3 4 9 8 7 6 5 0"
            value={routeTexts[i] ?? ""}
            onChange={(e) => onRouteChange(i, e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
      ))}
    </>
  );
}
