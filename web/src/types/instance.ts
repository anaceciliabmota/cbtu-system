export interface InstanceParams {
  num_trains: number;
  num_trips: number[];
  time_intervals: number[][];
  num_points: number;
  stations: number[];
  crossings: number[];
  depots: number[];
  initial_point: number;
  routes: number[][];
  service_time_min: number[];
  service_time_max: number[];
  cost_matrix: number[][];
  demands: number[][];
  max_time: number;
  alpha: number;
}

export interface InstanceRead {
  id: number;
  name: string;
  created_at: string;
  params: InstanceParams;
}

export interface Stop {
  point: number;
  arrival: number;
  departure: number;
}

export interface Trip {
  id: number;
  stops: Stop[];
}

export interface TrainSolution {
  id: number;
  trips: Trip[];
}

export interface SolutionResult {
  total_time: number;
  solution_value: number;
  trains: TrainSolution[];
}

export interface SolutionRead {
  id: number;
  instance_id: number;
  created_at: string;
  status: string;
  result: SolutionResult;
}

export interface Connection {
  from: number;
  cost: number;
  to: number;
}

export interface FormDefaults {
  num_trains: number | null;
  num_routes: number | null;
  num_points: number | null;
  num_intervals: number | null;
  num_trips: number[];
  routes: number[][];
  service_time_min: number[];
  service_time_max: number[];
  cost_matrix: number[][];
  demands: number[][];
  time_intervals: string[][];
  max_time: string;
  stations: string;
  crossings: string;
  depots: string;
  initial_point: number | null;
  alpha: number | null;
}
