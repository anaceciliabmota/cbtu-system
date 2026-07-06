import type { Connection } from "@/types/instance";
import { ConnectionsEditor } from "./ConnectionsEditor";

interface PointsFieldsProps {
  numPoints: number;
  numIntervals: number;
  serviceTimeMin: (number | "")[];
  serviceTimeMax: (number | "")[];
  demands: (number | "")[][];
  connections: Connection[];
  onStMinChange: (index: number, value: number | "") => void;
  onStMaxChange: (index: number, value: number | "") => void;
  onDemandChange: (node: number, interval: number, value: number | "") => void;
  onConnectionsChange: (connections: Connection[]) => void;
}

export function PointsFields({
  numPoints,
  numIntervals,
  serviceTimeMin,
  serviceTimeMax,
  demands,
  connections,
  onStMinChange,
  onStMaxChange,
  onDemandChange,
  onConnectionsChange,
}: PointsFieldsProps) {
  const matrixSize = numPoints * 2;

  return (
    <>
      <h2>Service time mínimo (s)</h2>
      <div className="grid-trips">
        {Array.from({ length: numPoints }, (_, i) => (
          <div key={i} className="field">
            <label>{i}</label>
            <input
              type="number"
              min={0}
              placeholder="ex: 142"
              value={serviceTimeMin[i] ?? ""}
              onChange={(e) =>
                onStMinChange(
                  i,
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
          </div>
        ))}
      </div>
      <h2>Service time máximo (s)</h2>
      <div className="grid-trips">
        {Array.from({ length: numPoints }, (_, i) => (
          <div key={i} className="field">
            <label>{i}</label>
            <input
              type="number"
              min={0}
              placeholder="ex: 592"
              value={serviceTimeMax[i] ?? ""}
              onChange={(e) =>
                onStMaxChange(
                  i,
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
          </div>
        ))}
      </div>
      <ConnectionsEditor
        matrixSize={matrixSize}
        connections={connections}
        onChange={onConnectionsChange}
      />
      <h2>
        Demands ({matrixSize} nós × {numIntervals} intervalos)
      </h2>
      <table className="demands-table">
        <thead>
          <tr>
            <th>Nó</th>
            {Array.from({ length: numIntervals }, (_, h) => (
              <th key={h}>Int {h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: matrixSize }, (_, node) => (
            <tr key={node}>
              <td>{node}</td>
              {Array.from({ length: numIntervals }, (_, h) => (
                <td key={h}>
                  <input
                    type="number"
                    min={0}
                    placeholder="11"
                    value={demands[node]?.[h] ?? ""}
                    onChange={(e) =>
                      onDemandChange(
                        node,
                        h,
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
