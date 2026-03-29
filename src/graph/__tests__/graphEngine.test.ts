import { GraphEngine } from '../graphEngine';
import { GraphSizeError, InsufficientGraphError } from '../../types/errors';
import type { Graph, NLPResult, Node, Edge } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeNLPResult(nodeCount: number, edgeCount = 0): NLPResult {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `n${i}`,
    label: `Node ${i}`,
  }));
  const edges = Array.from({ length: edgeCount }, (_, i) => ({
    sourceId: `n${i % nodeCount}`,
    targetId: `n${(i + 1) % nodeCount}`,
  }));
  return { nodes, edges };
}

function emptyGraph(): Graph {
  return { nodes: new Map(), edges: new Map() };
}

// ─── buildFromNLP ─────────────────────────────────────────────────────────────

describe('GraphEngine.buildFromNLP', () => {
  it('builds a graph with correct node count', () => {
    const result = makeNLPResult(3, 2);
    const graph = GraphEngine.buildFromNLP(result);
    expect(graph.nodes.size).toBe(3);
    expect(graph.edges.size).toBe(2);
  });

  it('assigns default weight of 1 to edges with no explicit weight', () => {
    const result: NLPResult = {
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ sourceId: 'a', targetId: 'b' }],
    };
    const graph = GraphEngine.buildFromNLP(result);
    const edge = Array.from(graph.edges.values())[0];
    expect(edge.weight).toBe(1);
  });

  it('preserves explicit edge weight', () => {
    const result: NLPResult = {
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ sourceId: 'a', targetId: 'b', weight: 5 }],
    };
    const graph = GraphEngine.buildFromNLP(result);
    const edge = Array.from(graph.edges.values())[0];
    expect(edge.weight).toBe(5);
  });

  it('throws InsufficientGraphError when fewer than 2 nodes', () => {
    expect(() => GraphEngine.buildFromNLP(makeNLPResult(1))).toThrow(InsufficientGraphError);
    expect(() => GraphEngine.buildFromNLP(makeNLPResult(0))).toThrow(InsufficientGraphError);
  });

  it('throws GraphSizeError when node count exceeds 100', () => {
    expect(() => GraphEngine.buildFromNLP(makeNLPResult(101))).toThrow(GraphSizeError);
  });

  it('accepts exactly 100 nodes without throwing', () => {
    const graph = GraphEngine.buildFromNLP(makeNLPResult(100));
    expect(graph.nodes.size).toBe(100);
  });

  it('throws GraphSizeError when edge count exceeds 500', () => {
    // Need at least 2 nodes; edges reference n0 and n1 cyclically
    const nodes = [{ id: 'n0', label: 'A' }, { id: 'n1', label: 'B' }];
    const edges = Array.from({ length: 501 }, (_, i) => ({
      sourceId: 'n0',
      targetId: 'n1',
    }));
    expect(() => GraphEngine.buildFromNLP({ nodes, edges })).toThrow(GraphSizeError);
  });

  it('accepts exactly 500 edges without throwing', () => {
    const nodes = [{ id: 'n0', label: 'A' }, { id: 'n1', label: 'B' }];
    const edges = Array.from({ length: 500 }, () => ({
      sourceId: 'n0',
      targetId: 'n1',
    }));
    const graph = GraphEngine.buildFromNLP({ nodes, edges });
    expect(graph.edges.size).toBe(500);
  });

  it('skips edges referencing unknown node IDs', () => {
    const result: NLPResult = {
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ sourceId: 'a', targetId: 'UNKNOWN' }],
    };
    const graph = GraphEngine.buildFromNLP(result);
    expect(graph.edges.size).toBe(0);
  });
});

// ─── addNode ──────────────────────────────────────────────────────────────────

describe('GraphEngine.addNode', () => {
  it('adds a node and returns a new graph', () => {
    const graph = emptyGraph();
    const newGraph = GraphEngine.addNode(graph, { label: 'X', position: { x: 0, y: 0 } });
    expect(newGraph.nodes.size).toBe(1);
    expect(graph.nodes.size).toBe(0); // original unchanged
  });

  it('throws GraphSizeError when adding beyond 100 nodes', () => {
    let graph = emptyGraph();
    for (let i = 0; i < 100; i++) {
      graph = GraphEngine.addNode(graph, { label: `N${i}`, position: { x: 0, y: 0 } });
    }
    expect(() =>
      GraphEngine.addNode(graph, { label: 'overflow', position: { x: 0, y: 0 } }),
    ).toThrow(GraphSizeError);
  });

  it('assigns a unique id to the new node', () => {
    const graph = emptyGraph();
    const g1 = GraphEngine.addNode(graph, { label: 'A', position: { x: 0, y: 0 } });
    const g2 = GraphEngine.addNode(g1, { label: 'B', position: { x: 1, y: 1 } });
    const ids = Array.from(g2.nodes.keys());
    expect(new Set(ids).size).toBe(2);
  });
});

// ─── removeNode ───────────────────────────────────────────────────────────────

describe('GraphEngine.removeNode', () => {
  it('removes the node and returns a new graph', () => {
    let graph = emptyGraph();
    graph = GraphEngine.addNode(graph, { label: 'A', position: { x: 0, y: 0 } });
    const nodeId = Array.from(graph.nodes.keys())[0];
    const newGraph = GraphEngine.removeNode(graph, nodeId);
    expect(newGraph.nodes.has(nodeId)).toBe(false);
    expect(graph.nodes.has(nodeId)).toBe(true); // original unchanged
  });

  it('cascade-deletes incident edges when a node is removed', () => {
    const nlp: NLPResult = {
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      edges: [
        { sourceId: 'a', targetId: 'b' },
        { sourceId: 'b', targetId: 'c' },
        { sourceId: 'a', targetId: 'c' },
      ],
    };
    const graph = GraphEngine.buildFromNLP(nlp);
    // Find the node that corresponds to 'b' (middle node with 2 incident edges)
    const bNode = Array.from(graph.nodes.values()).find((n) => n.label === 'B')!;
    const newGraph = GraphEngine.removeNode(graph, bNode.id);

    expect(newGraph.nodes.has(bNode.id)).toBe(false);
    // Edges involving B should be gone; only a→c should remain
    for (const edge of newGraph.edges.values()) {
      expect(edge.sourceId).not.toBe(bNode.id);
      expect(edge.targetId).not.toBe(bNode.id);
    }
    expect(newGraph.edges.size).toBe(1);
  });

  it('is a no-op for a non-existent node id', () => {
    const graph = emptyGraph();
    const newGraph = GraphEngine.removeNode(graph, 'nonexistent');
    expect(newGraph.nodes.size).toBe(0);
  });
});

// ─── addEdge ──────────────────────────────────────────────────────────────────

describe('GraphEngine.addEdge', () => {
  it('adds an edge and returns a new graph', () => {
    let graph = emptyGraph();
    graph = GraphEngine.addNode(graph, { label: 'A', position: { x: 0, y: 0 } });
    graph = GraphEngine.addNode(graph, { label: 'B', position: { x: 1, y: 0 } });
    const [idA, idB] = Array.from(graph.nodes.keys());
    const newGraph = GraphEngine.addEdge(graph, {
      sourceId: idA,
      targetId: idB,
      weight: 3,
      label: '3',
    });
    expect(newGraph.edges.size).toBe(1);
    expect(graph.edges.size).toBe(0); // original unchanged
  });

  it('defaults weight to 1 when not provided', () => {
    let graph = emptyGraph();
    graph = GraphEngine.addNode(graph, { label: 'A', position: { x: 0, y: 0 } });
    graph = GraphEngine.addNode(graph, { label: 'B', position: { x: 1, y: 0 } });
    const [idA, idB] = Array.from(graph.nodes.keys());
    const newGraph = GraphEngine.addEdge(graph, {
      sourceId: idA,
      targetId: idB,
      weight: 1,
      label: '1',
    });
    const edge = Array.from(newGraph.edges.values())[0];
    expect(edge.weight).toBe(1);
  });

  it('throws GraphSizeError when adding beyond 500 edges', () => {
    const nlp: NLPResult = {
      nodes: [{ id: 'n0', label: 'A' }, { id: 'n1', label: 'B' }],
      edges: Array.from({ length: 500 }, () => ({ sourceId: 'n0', targetId: 'n1' })),
    };
    let graph = GraphEngine.buildFromNLP(nlp);
    const [idA, idB] = Array.from(graph.nodes.keys());
    expect(() =>
      GraphEngine.addEdge(graph, { sourceId: idA, targetId: idB, weight: 1, label: '1' }),
    ).toThrow(GraphSizeError);
  });
});

// ─── removeEdge ───────────────────────────────────────────────────────────────

describe('GraphEngine.removeEdge', () => {
  it('removes the edge and returns a new graph', () => {
    const nlp: NLPResult = {
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ sourceId: 'a', targetId: 'b' }],
    };
    const graph = GraphEngine.buildFromNLP(nlp);
    const edgeId = Array.from(graph.edges.keys())[0];
    const newGraph = GraphEngine.removeEdge(graph, edgeId);
    expect(newGraph.edges.has(edgeId)).toBe(false);
    expect(graph.edges.has(edgeId)).toBe(true); // original unchanged
  });

  it('does not remove nodes when removing an edge', () => {
    const nlp: NLPResult = {
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ sourceId: 'a', targetId: 'b' }],
    };
    const graph = GraphEngine.buildFromNLP(nlp);
    const edgeId = Array.from(graph.edges.keys())[0];
    const newGraph = GraphEngine.removeEdge(graph, edgeId);
    expect(newGraph.nodes.size).toBe(2);
  });
});

// ─── editNode ─────────────────────────────────────────────────────────────────

describe('GraphEngine.editNode', () => {
  it('updates the label of the specified node', () => {
    let graph = emptyGraph();
    graph = GraphEngine.addNode(graph, { label: 'Old', position: { x: 0, y: 0 } });
    const nodeId = Array.from(graph.nodes.keys())[0];
    const newGraph = GraphEngine.editNode(graph, nodeId, { label: 'New' });
    expect(newGraph.nodes.get(nodeId)?.label).toBe('New');
    expect(graph.nodes.get(nodeId)?.label).toBe('Old'); // original unchanged
  });

  it('leaves other nodes unchanged', () => {
    let graph = emptyGraph();
    graph = GraphEngine.addNode(graph, { label: 'A', position: { x: 0, y: 0 } });
    graph = GraphEngine.addNode(graph, { label: 'B', position: { x: 1, y: 0 } });
    const [idA, idB] = Array.from(graph.nodes.keys());
    const newGraph = GraphEngine.editNode(graph, idA, { label: 'A-updated' });
    expect(newGraph.nodes.get(idB)?.label).toBe('B');
  });

  it('is a no-op for a non-existent node id', () => {
    const graph = emptyGraph();
    const newGraph = GraphEngine.editNode(graph, 'nonexistent', { label: 'X' });
    expect(newGraph.nodes.size).toBe(0);
  });
});

// ─── editEdge ─────────────────────────────────────────────────────────────────

describe('GraphEngine.editEdge', () => {
  it('updates the weight of the specified edge', () => {
    const nlp: NLPResult = {
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ sourceId: 'a', targetId: 'b', weight: 1 }],
    };
    const graph = GraphEngine.buildFromNLP(nlp);
    const edgeId = Array.from(graph.edges.keys())[0];
    const newGraph = GraphEngine.editEdge(graph, edgeId, { weight: 7 });
    expect(newGraph.edges.get(edgeId)?.weight).toBe(7);
    expect(graph.edges.get(edgeId)?.weight).toBe(1); // original unchanged
  });

  it('syncs label to new weight when only weight is patched', () => {
    const nlp: NLPResult = {
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ sourceId: 'a', targetId: 'b', weight: 1 }],
    };
    const graph = GraphEngine.buildFromNLP(nlp);
    const edgeId = Array.from(graph.edges.keys())[0];
    const newGraph = GraphEngine.editEdge(graph, edgeId, { weight: 42 });
    expect(newGraph.edges.get(edgeId)?.label).toBe('42');
  });

  it('updates the label independently', () => {
    const nlp: NLPResult = {
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ sourceId: 'a', targetId: 'b', weight: 1 }],
    };
    const graph = GraphEngine.buildFromNLP(nlp);
    const edgeId = Array.from(graph.edges.keys())[0];
    const newGraph = GraphEngine.editEdge(graph, edgeId, { label: 'custom' });
    expect(newGraph.edges.get(edgeId)?.label).toBe('custom');
  });

  it('is a no-op for a non-existent edge id', () => {
    const graph = emptyGraph();
    const newGraph = GraphEngine.editEdge(graph, 'nonexistent', { weight: 5 });
    expect(newGraph.edges.size).toBe(0);
  });
});

// ─── Immutability ─────────────────────────────────────────────────────────────

describe('Immutability', () => {
  it('mutations never modify the original graph', () => {
    const nlp: NLPResult = {
      nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      edges: [{ sourceId: 'a', targetId: 'b' }],
    };
    const original = GraphEngine.buildFromNLP(nlp);
    const originalNodeCount = original.nodes.size;
    const originalEdgeCount = original.edges.size;

    GraphEngine.addNode(original, { label: 'C', position: { x: 0, y: 0 } });
    GraphEngine.removeNode(original, Array.from(original.nodes.keys())[0]);
    GraphEngine.addEdge(original, {
      sourceId: Array.from(original.nodes.keys())[0],
      targetId: Array.from(original.nodes.keys())[1],
      weight: 1,
      label: '1',
    });
    GraphEngine.removeEdge(original, Array.from(original.edges.keys())[0]);

    expect(original.nodes.size).toBe(originalNodeCount);
    expect(original.edges.size).toBe(originalEdgeCount);
  });
});
