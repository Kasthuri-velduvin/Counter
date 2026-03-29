import type { Graph, AlgorithmResult, Insight, NodeId } from '../types';

export interface InsightEngine {
  analyse(graph: Graph, result: AlgorithmResult): Insight[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns all node IDs that have no incident edges (degree 0). */
function findIsolatedNodes(graph: Graph): NodeId[] {
  const connected = new Set<NodeId>();
  for (const edge of graph.edges.values()) {
    connected.add(edge.sourceId);
    connected.add(edge.targetId);
  }
  const isolated: NodeId[] = [];
  for (const nodeId of graph.nodes.keys()) {
    if (!connected.has(nodeId)) {
      isolated.push(nodeId);
    }
  }
  return isolated;
}

/**
 * Detect cycles in the graph using DFS with a recursion stack.
 * Works on the full graph (not just the visited subgraph from the algorithm run).
 */
function hasCycle(graph: Graph): boolean {
  // Build adjacency list
  const adj = new Map<NodeId, NodeId[]>();
  for (const nodeId of graph.nodes.keys()) {
    adj.set(nodeId, []);
  }
  for (const edge of graph.edges.values()) {
    adj.get(edge.sourceId)?.push(edge.targetId);
  }

  const visited = new Set<NodeId>();
  const inStack = new Set<NodeId>();

  function dfs(nodeId: NodeId): boolean {
    visited.add(nodeId);
    inStack.add(nodeId);
    for (const neighbor of adj.get(nodeId) ?? []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (inStack.has(neighbor)) {
        return true;
      }
    }
    inStack.delete(nodeId);
    return false;
  }

  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) return true;
    }
  }
  return false;
}

/**
 * For a Dijkstra result, find the node with the highest finite distance
 * (the critical path endpoint) and reconstruct its path.
 */
function buildCriticalPathInsight(result: AlgorithmResult): Insight {
  const shortestPaths = result.shortestPaths!;

  // Find the node with the greatest finite distance from the last step's distanceMap
  const lastStep = result.steps[result.steps.length - 1];
  const distanceMap = lastStep?.distanceMap ?? {};

  let maxDist = -Infinity;
  let criticalEndpoint: NodeId | null = null;

  for (const [nodeId, dist] of Object.entries(distanceMap)) {
    if (dist !== Infinity && dist > maxDist) {
      maxDist = dist;
      criticalEndpoint = nodeId;
    }
  }

  // Fallback: if no distanceMap or all Infinity, use the last visited node
  if (criticalEndpoint === null && result.steps.length > 0) {
    criticalEndpoint = result.steps[result.steps.length - 1].activeNodeId;
  }

  const path: NodeId[] =
    criticalEndpoint !== null ? (shortestPaths.get(criticalEndpoint) ?? []) : [];

  const message =
    path.length > 0
      ? `Critical path identified: ${path.join(' → ')} (total cost: ${maxDist === -Infinity ? 'unknown' : maxDist}). Prioritize tasks along this sequence.`
      : 'Critical path analysis complete. No reachable path found from source.';

  return {
    type: 'critical_path',
    message,
    affectedNodeIds: path,
  };
}

// ─── InsightEngine ────────────────────────────────────────────────────────────

export const InsightEngine: InsightEngine = {
  analyse(graph: Graph, result: AlgorithmResult): Insight[] {
    const insights: Insight[] = [];

    // 1. Algorithm-specific insights
    if (result.algorithm === 'dijkstra') {
      insights.push(buildCriticalPathInsight(result));
    } else if (result.algorithm === 'dfs') {
      if (hasCycle(graph)) {
        insights.push({
          type: 'cycle_detected',
          message:
            'Circular dependency detected in the graph. Review the highlighted nodes to resolve the cycle.',
        });
      }
    }

    // 2. Isolated node insights
    const isolatedIds = findIsolatedNodes(graph);
    for (const nodeId of isolatedIds) {
      const label = graph.nodes.get(nodeId)?.label ?? nodeId;
      insights.push({
        type: 'isolated_node',
        message: `Node "${label}" has no connections. Consider reviewing its relevance or linking it to the graph.`,
        affectedNodeIds: [nodeId],
      });
    }

    // 3. Fallback: guarantee ≥ 1 insight
    if (insights.length === 0) {
      insights.push({
        type: 'general',
        message: 'Algorithm completed successfully. No specific issues detected in the graph.',
      });
    }

    return insights;
  },
};
