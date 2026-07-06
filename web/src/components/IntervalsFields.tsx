interface IntervalPair {
  start: string;
  end: string;
}

interface IntervalsFieldsProps {
  numIntervals: number;
  intervals: IntervalPair[];
  onChange: (index: number, field: "start" | "end", value: string) => void;
}

export function IntervalsFields({
  numIntervals,
  intervals,
  onChange,
}: IntervalsFieldsProps) {
  return (
    <>
      <h2>Intervalos de tempo</h2>
      {Array.from({ length: numIntervals }, (_, i) => (
        <div key={i} className="row">
          <div className="field">
            <label htmlFor={`int_start_${i}`}>Intervalo {i} — início</label>
            <input
              id={`int_start_${i}`}
              type="time"
              value={intervals[i]?.start ?? "00:00"}
              onChange={(e) => onChange(i, "start", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={`int_end_${i}`}>Intervalo {i} — fim</label>
            <input
              id={`int_end_${i}`}
              type="time"
              value={intervals[i]?.end ?? "00:00"}
              onChange={(e) => onChange(i, "end", e.target.value)}
            />
          </div>
        </div>
      ))}
    </>
  );
}
