import type { SolutionRead } from "@/types/instance";

interface SolutionViewProps {
  solution: SolutionRead;
}

export function SolutionView({ solution }: SolutionViewProps) {
  const result = solution.result;
  return (
    <section className="section">
      <h2>Solução</h2>
      <div className="solution-metrics">
        <div className="metric">
          <span>Solution value</span>
          <strong>{result.solution_value ?? "—"}</strong>
        </div>
        <div className="metric">
          <span>Tempo de execução (s)</span>
          <strong>{result.total_time ?? "—"}</strong>
        </div>
      </div>
      {result.trains?.map((train) => (
        <details key={train.id} className="train-block" open>
          <summary>Trem {train.id}</summary>
          {train.trips?.map((trip) => (
            <div key={trip.id}>
              <p>
                <strong>Viagem {trip.id}</strong>
              </p>
              {trip.stops?.length > 0 && (
                <table className="stops-table">
                  <thead>
                    <tr>
                      <th>Ponto</th>
                      <th>Chegada (s)</th>
                      <th>Partida (s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trip.stops.map((stop, idx) => (
                      <tr key={idx}>
                        <td>{stop.point}</td>
                        <td>{stop.arrival}</td>
                        <td>{stop.departure}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </details>
      ))}
    </section>
  );
}
