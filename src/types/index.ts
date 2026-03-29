// ─── Primitive ID aliases ────────────────────────────────────────────────────

export type NodeId = string; // UUID v4
export type EdgeId = string; // UUID v4

// ─── Algorithm type ──────────────────────────────────────────────────────────

export type AlgorithmType = 'dijkstra' | 'dfs';

// ─── Graph data model ────────────────────────────────────────────────────────

export interface Node {
  id: NodeId;
  label: string;
  position: { x: number; y: number };
}

export interface Edge {
  id: EdgeId;
  sourceId: NodeId;
  targetId: NodeId;
  /** Positive number; defaults to 1 when not derivable from input (req 2.2) */
  weight: number;
  /** Defaults to weight.toString() */
  label: string;
}

export interface Graph {
  nodes: Map<NodeId, Node>;
  edges: Map<EdgeId, Edge>;
}

// ─── NLP ─────────────────────────────────────────────────────────────────────

export interface NLPResult {
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{
    sourceId: string;
    targetId: string;
    weight?: number;
    label?: string;
  }>;
}

// ─── Algorithm ───────────────────────────────────────────────────────────────

export interface AlgorithmStep {
  /** 0-based index */
  stepIndex: number;
  activeNodeId: NodeId;
  visitedNodeIds: NodeId[];
  traversedEdgeIds: EdgeId[];
  /** Dijkstra only; Infinity for unreachable nodes */
  distanceMap?: Record<NodeId, number>;
}

export interface AlgorithmResult {
  algorithm: AlgorithmType;
  steps: AlgorithmStep[];
  /** Dijkstra: nodeId → ordered path of nodeIds from source */
  shortestPaths?: Map<NodeId, NodeId[]>;
  /** DFS: ordered node visit sequence */
  visitOrder?: NodeId[];
}

// ─── Insight ─────────────────────────────────────────────────────────────────

export interface Insight {
  type: 'critical_path' | 'cycle_detected' | 'isolated_node' | 'general';
  message: string;
  affectedNodeIds?: NodeId[];
  affectedEdgeIds?: EdgeId[];
}

// ─── History / Session ───────────────────────────────────────────────────────

export interface SessionRecord {
  /** UUID v4 */
  id: string;
  /** Unix ms timestamp */
  createdAt: number;
  /** User-editable display name */
  label: string;
  /** JSON.stringify(SerializedGraph) */
  graphJson: string;
  algorithm: AlgorithmType;
  sourceNodeId: string;
  algorithmResult: {
    steps: AlgorithmStep[];
    shortestPaths?: Record<NodeId, NodeId[]>;
    visitOrder?: NodeId[];
  };
  insights: Insight[];
}

// ─── Serialized Graph (JSON schema) ──────────────────────────────────────────

export interface SerializedNode {
  id: string;
  label: string;
  position: { x: number; y: number };
}

export interface SerializedEdge {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
  label: string;
}

export interface SerializedGraph {
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}
