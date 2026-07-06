import type { Connection } from "@/types/instance";

interface ConnectionsEditorProps {
  matrixSize: number;
  connections: Connection[];
  onChange: (connections: Connection[]) => void;
}

export function ConnectionsEditor({
  matrixSize,
  connections,
  onChange,
}: ConnectionsEditorProps) {
  const nodeOptions = Array.from({ length: matrixSize }, (_, i) => i);

  const update = (index: number, patch: Partial<Connection>) => {
    const next = connections.map((c, i) =>
      i === index ? { ...c, ...patch } : c,
    );
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(connections.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...connections, { from: 0, cost: 0, to: 0 }]);
  };

  return (
    <div>
      <h2>Ligações (de → custo → para)</h2>
      {connections.map((conn, i) => (
        <div key={i} className="connection-row">
          <div className="field">
            <label>De</label>
            <select
              value={conn.from}
              onChange={(e) => update(i, { from: Number(e.target.value) })}
            >
              {nodeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Custo</label>
            <input
              type="number"
              min={0}
              value={conn.cost}
              onChange={(e) => update(i, { cost: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label>Para</label>
            <select
              value={conn.to}
              onChange={(e) => update(i, { to: Number(e.target.value) })}
            >
              {nodeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={() => remove(i)} aria-label="Remover">
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={add}>
        + Adicionar ligação
      </button>
    </div>
  );
}
