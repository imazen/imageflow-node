// Wire-format graph types matching imageflow JSON API

import type { Node } from './nodes.js';

export interface Edge {
  from: number;
  to: number;
  kind: string;
}

export interface Graph {
  nodes: Record<string, Node>;
  edges: Edge[];
}

export type Framewise =
  | { graph: Graph }
  | { steps: Node[] };
