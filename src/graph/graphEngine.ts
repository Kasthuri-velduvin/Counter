import { v4 as uuidv4 } from 'uuid';
import type { Graph, NLPResult, Node, Edge } from '../types';
import { GraphSizeError, InsufficientGraphError } from '../types/errors';

const MAX_NODES = 100;
const MAX_EDGES = 500;

export interface GraphEngine {
  buildFromNLP(result: NLPResult): Graph;
  addNode(graph: Graph, node: Omit<Node, 'id'>): Graph;
  removeNode(graph: Graph, nodeId: string): Graph;
  addEdge(graph: Graph, edge: Omit<Edge, 'id'>): Graph;
  removeEdge(graph: Graph, edgeId: string): Graph;
  editNode(graph: Graph, nodeId: string, patch: Partial<Pick<Node, 'label'>>): Graph;
  editEdge(graph: Graph, edgeId: string, patch: Partial<Pick<Edge, 'weight' | 'label'>>): Graph;
}

/** Creates a deep copy of a Graph (new Maps with cloned entries). */
function cloneGraph(graph: Graph): Graph {
  return {
    nodes: new Map(Array.from(graph.nodes.entries()).map(([k, v]) => [k, { ...v, position: { ...v.position } }])),
    edges: new Map(Array.from(graph.edges.entries()).map(([k, v]) => [k, { ...v }])),
  };
}

export const GraphEngine: GraphEngine = {
  buildFromNLP(result: NLPResult): Graph {
    if (result.nodes.length < 2) {
      throw new InsufficientGraphError();
    }
    if (result.nodes.length > MAX_NODES) {
      throw new GraphSizeError(
        `Graph cannot exceed ${MAX_NODES} nodes. Input produced ${result.nodes.length} nodes.`,
      );
    }
    if (result.edges.length > MAX_EDGES) {
      throw new GraphSizeError(
        `Graph cannot exceed ${MAX_EDGES} edges. Input produced ${result.edges.length} edges.`,
      );
    }

    const nodes = new Map<string, Node>();
    const edges = new Map<string, Edge>();

    // Build nodes — assign a stable UUID for each NLP node id
    const idMap = new Map<string, string>(); // nlp id → graph UUID
    result.nodes.forEach((n, index) => {
      const id = uuidv4();
      idMap.set(n.id, id);
      nodes.set(id, {
        id,
        label: n.label,
        position: { x: 0, y: 0 },
      });
    });

    // Build edges
    result.edges.forEach((e) => {
      const sourceId = idMap.get(e.sourceId);
      const targetId = idMap.get(e.targetId);
      if (!sourceId || !targetId) return; // skip edges referencing unknown nodes
      const weight = e.weight != null ? e.weight : 1;
      const id = uuidv4();
      edges.set(id, {
        id,
        sourceId,
        targetId,
        weight,
        label: e.label ?? weight.toString(),
      });
    });

    return { nodes, edges };
  },

  addNode(graph: Graph, node: Omit<Node, 'id'>): Graph {
    if (graph.nodes.size >= MAX_NODES) {
      throw new GraphSizeError(
        `Graph cannot exceed ${MAX_NODES} nodes. Remove a node before adding a new one.`,
      );
    }
    const newGraph = cloneGraph(graph);
    const id = uuidv4();
    newGraph.nodes.set(id, { ...node, position: { ...node.position }, id });
    return newGraph;
  },

  removeNode(graph: Graph, nodeId: string): Graph {
    const newGraph = cloneGraph(graph);
    newGraph.nodes.delete(nodeId);
    // Cascade-delete all incident edges
    for (const [edgeId, edge] of newGraph.edges) {
      if (edge.sourceId === nodeId || edge.targetId === nodeId) {
        newGraph.edges.delete(edgeId);
      }
    }
    return newGraph;
  },

  addEdge(graph: Graph, edge: Omit<Edge, 'id'>): Graph {
    if (graph.edges.size >= MAX_EDGES) {
      throw new GraphSizeError(
        `Graph cannot exceed ${MAX_EDGES} edges. Remove an edge before adding a new one.`,
      );
    }
    const newGraph = cloneGraph(graph);
    const id = uuidv4();
    const weight = edge.weight ?? 1;
    newGraph.edges.set(id, {
      ...edge,
      id,
      weight,
      label: edge.label ?? weight.toString(),
    });
    return newGraph;
  },

  removeEdge(graph: Graph, edgeId: string): Graph {
    const newGraph = cloneGraph(graph);
    newGraph.edges.delete(edgeId);
    return newGraph;
  },

  editNode(graph: Graph, nodeId: string, patch: Partial<Pick<Node, 'label'>>): Graph {
    const existing = graph.nodes.get(nodeId);
    if (!existing) return cloneGraph(graph);
    const newGraph = cloneGraph(graph);
    newGraph.nodes.set(nodeId, { ...existing, ...patch });
    return newGraph;
  },

  editEdge(graph: Graph, edgeId: string, patch: Partial<Pick<Edge, 'weight' | 'label'>>): Graph {
    const existing = graph.edges.get(edgeId);
    if (!existing) return cloneGraph(graph);
    const newGraph = cloneGraph(graph);
    const updated = { ...existing, ...patch };
    // If weight changed but label wasn't explicitly patched, sync label to new weight
    if (patch.weight != null && patch.label == null) {
      updated.label = patch.weight.toString();
    }
    newGraph.edges.set(edgeId, updated);
    return newGraph;
  },
};
