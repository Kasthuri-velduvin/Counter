import type { Graph, AlgorithmType, AlgorithmResult, AlgorithmStep, NodeId, EdgeId } from '../types';
import { AlgorithmError } from '../types/errors';

export interface AlgorithmEngine {
  run(graph: Graph, algorithm: AlgorithmType, sourceNodeId: string): AlgorithmResult;
}

// ─── Min-Priority Queue ───────────────────────────────────────────────────────

class MinPriorityQueue {
  private heap: Array<{ id: NodeId; priority: number }> = [];

  enqueue(id: NodeId, priority: number): void {
    this.heap.push({ id, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): { id: NodeId; priority: number } | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return min;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].priority <= this.heap[i].priority) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private sinkDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
      if (right < n && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

// ─── Dijkstra ─────────────────────────────────────────────────────────────────

function runDijkstra(graph: Graph, sourceNodeId: NodeId): AlgorithmResult {
  if (!graph.nodes.has(sourceNodeId)) {
    throw new AlgorithmError(
      `Source node "${sourceNodeId}" is not present in the graph. Please check graph connectivity.`,
    );
  }

  // Build adjacency list: nodeId → [{targetId, edgeId, weight}]
  type AdjEntry = { targetId: NodeId; edgeId: EdgeId; weight: number };
  const adj = new Map<NodeId, AdjEntry[]>();
  for (const nodeId of graph.nodes.keys()) {
    adj.set(nodeId, []);
  }
  for (const [edgeId, edge] of graph.edges) {
    if (!graph.nodes.has(edge.sourceId) || !graph.nodes.has(edge.targetId)) {
      throw new AlgorithmError(
        `Edge "${edgeId}" references a node that does not exist in the graph.`,
      );
    }
    adj.get(edge.sourceId)!.push({ targetId: edge.targetId, edgeId, weight: edge.weight });
  }

  // Initialize distances
  const dist = new Map<NodeId, number>();
  const prev = new Map<NodeId, NodeId | null>();
  const prevEdge = new Map<NodeId, EdgeId | null>();
  for (const nodeId of graph.nodes.keys()) {
    dist.set(nodeId, Infinity);
    prev.set(nodeId, null);
    prevEdge.set(nodeId, null);
  }
  dist.set(sourceNodeId, 0);

  const pq = new MinPriorityQueue();
  pq.enqueue(sourceNodeId, 0);

  const visited = new Set<NodeId>();
  const visitedNodeIds: NodeId[] = [];
  const traversedEdgeIds: EdgeId[] = [];
  const steps: AlgorithmStep[] = [];

  while (!pq.isEmpty()) {
    const { id: currentId } = pq.dequeue()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    visitedNodeIds.push(currentId);

    // Record step snapshot
    const distanceMapSnapshot: Record<NodeId, number> = {};
    for (const [nodeId, d] of dist) {
      distanceMapSnapshot[nodeId] = d;
    }

    steps.push({
      stepIndex: steps.length,
      activeNodeId: currentId,
      visitedNodeIds: [...visitedNodeIds],
      traversedEdgeIds: [...traversedEdgeIds],
      distanceMap: distanceMapSnapshot,
    });

    for (const { targetId, edgeId, weight } of adj.get(currentId) ?? []) {
      if (visited.has(targetId)) continue;
      const newDist = dist.get(currentId)! + weight;
      if (newDist < dist.get(targetId)!) {
        dist.set(targetId, newDist);
        prev.set(targetId, currentId);
        prevEdge.set(targetId, edgeId);
        pq.enqueue(targetId, newDist);
        traversedEdgeIds.push(edgeId);
      }
    }
  }

  // Reconstruct shortest paths
  const shortestPaths = new Map<NodeId, NodeId[]>();
  for (const nodeId of graph.nodes.keys()) {
    if (nodeId === sourceNodeId) {
      shortestPaths.set(nodeId, [sourceNodeId]);
      continue;
    }
    if (dist.get(nodeId) === Infinity) {
      shortestPaths.set(nodeId, []);
      continue;
    }
    const path: NodeId[] = [];
    let cur: NodeId | null = nodeId;
    while (cur !== null) {
      path.unshift(cur);
      cur = prev.get(cur) ?? null;
    }
    shortestPaths.set(nodeId, path);
  }

  return {
    algorithm: 'dijkstra',
    steps,
    shortestPaths,
  };
}

// ─── DFS ──────────────────────────────────────────────────────────────────────

function runDFS(graph: Graph, sourceNodeId: NodeId): AlgorithmResult {
  if (!graph.nodes.has(sourceNodeId)) {
    throw new AlgorithmError(
      `Source node "${sourceNodeId}" is not present in the graph. Please check graph connectivity.`,
    );
  }

  // Build adjacency list
  type AdjEntry = { targetId: NodeId; edgeId: EdgeId };
  const adj = new Map<NodeId, AdjEntry[]>();
  for (const nodeId of graph.nodes.keys()) {
    adj.set(nodeId, []);
  }
  for (const [edgeId, edge] of graph.edges) {
    if (!graph.nodes.has(edge.sourceId) || !graph.nodes.has(edge.targetId)) {
      throw new AlgorithmError(
        `Edge "${edgeId}" references a node that does not exist in the graph.`,
      );
    }
    adj.get(edge.sourceId)!.push({ targetId: edge.targetId, edgeId });
  }

  const visited = new Set<NodeId>();
  const visitOrder: NodeId[] = [];
  const traversedEdgeIds: EdgeId[] = [];
  const steps: AlgorithmStep[] = [];

  // Iterative DFS using a stack
  const stack: Array<{ nodeId: NodeId; edgeId: EdgeId | null }> = [
    { nodeId: sourceNodeId, edgeId: null },
  ];

  while (stack.length > 0) {
    const { nodeId, edgeId } = stack.pop()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    visitOrder.push(nodeId);
    if (edgeId !== null) {
      traversedEdgeIds.push(edgeId);
    }

    steps.push({
      stepIndex: steps.length,
      activeNodeId: nodeId,
      visitedNodeIds: [...visitOrder],
      traversedEdgeIds: [...traversedEdgeIds],
    });

    // Push neighbors in reverse order so we process them in natural order
    const neighbors = adj.get(nodeId) ?? [];
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const { targetId, edgeId: nEdgeId } = neighbors[i];
      if (!visited.has(targetId)) {
        stack.push({ nodeId: targetId, edgeId: nEdgeId });
      }
    }
  }

  return {
    algorithm: 'dfs',
    steps,
    visitOrder,
  };
}

// ─── AlgorithmEngine ──────────────────────────────────────────────────────────

export const AlgorithmEngine: AlgorithmEngine = {
  run(graph: Graph, algorithm: AlgorithmType, sourceNodeId: string): AlgorithmResult {
    if (algorithm === 'dijkstra') {
      return runDijkstra(graph, sourceNodeId);
    } else if (algorithm === 'dfs') {
      return runDFS(graph, sourceNodeId);
    }
    throw new AlgorithmError(`Unknown algorithm: "${algorithm}".`);
  },
};
