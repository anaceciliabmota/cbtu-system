interface FreeFieldsProps {
  initialPoint: number | "";
  maxTime: string;
  alpha: number | "";
  stations: string;
  crossings: string;
  depots: string;
  onChange: (field: string, value: string | number | "") => void;
}

export function FreeFields({
  initialPoint,
  maxTime,
  alpha,
  stations,
  crossings,
  depots,
  onChange,
}: FreeFieldsProps) {
  return (
    <div className="grid-4">
      <div className="field">
        <label htmlFor="initial_point">initial_point</label>
        <input
          id="initial_point"
          type="number"
          min={0}
          placeholder="ex: 0"
          value={initialPoint}
          onChange={(e) =>
            onChange(
              "initial_point",
              e.target.value === "" ? "" : Number(e.target.value),
            )
          }
        />
      </div>
      <div className="field">
        <label htmlFor="max_time">max_time</label>
        <input
          id="max_time"
          type="time"
          value={maxTime}
          onChange={(e) => onChange("max_time", e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="alpha">alpha</label>
        <input
          id="alpha"
          type="number"
          min={0}
          placeholder="ex: 41"
          value={alpha}
          onChange={(e) =>
            onChange("alpha", e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </div>
      <div className="field" style={{ gridColumn: "1 / -1" }}>
        <label htmlFor="stations">stations (vírgula)</label>
        <input
          id="stations"
          type="text"
          placeholder="ex: 0, 4, 2, 1, 3"
          value={stations}
          onChange={(e) => onChange("stations", e.target.value)}
          style={{ width: "100%" }}
        />
      </div>
      <div className="field" style={{ gridColumn: "1 / -1" }}>
        <label htmlFor="crossings">crossings (vírgula)</label>
        <input
          id="crossings"
          type="text"
          placeholder="ex: 0, 4, 2"
          value={crossings}
          onChange={(e) => onChange("crossings", e.target.value)}
          style={{ width: "100%" }}
        />
      </div>
      <div className="field" style={{ gridColumn: "1 / -1" }}>
        <label htmlFor="depots">depots (vírgula)</label>
        <input
          id="depots"
          type="text"
          placeholder="ex: 0, 4"
          value={depots}
          onChange={(e) => onChange("depots", e.target.value)}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
