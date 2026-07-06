import type { Connection } from "@/types/instance";

export function matrixToConnections(matrix: number[][]): Connection[] {
  return matrix.flatMap((row, i) =>
    row
      .map((val, j) => (val !== -1 ? { from: i, cost: val, to: j } : null))
      .filter((c): c is Connection => c !== null),
  );
}

export function connectionsToMatrix(
  connections: Connection[],
  size: number,
): number[][] {
  const matrix = Array.from({ length: size }, () => Array(size).fill(-1));
  for (const c of connections) {
    matrix[c.from][c.to] = c.cost;
  }
  return matrix;
}
