import { GraphSerializer } from '../graphSerializer';
import { DeserializationError } from '../../types/errors';
import type { Graph } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGraph(): Graph {
  return {
    nodes: new Map([
      ['node-1', { id: 'node-1', label: 'Task A', position: { x: 10, y: 20 } }],
      ['node-2', { id: 'node-2', label: 'Task B', position: { x: 30, y: 40 } }],
    ]),
    edges: new Map([
      [
        'edge-1',
        { id: 'edge-1', sourceId: 'node-1', targetId: 'node-2', weight: 5, label: '5' },
      ],
    ]),
  };
}

function graphsEqual(a: Graph, b: Graph): boolean {
  if (a.nodes.size !== b.nodes.size) return false;
  for (const [id, node] of a.nodes) {
    const other = b.nodes.get(id);
    if (!other) return false;
    if (
      node.label !== other.label ||
      node.position.x !== other.position.x ||
      node.position.y !== other.position.y
    )
      return false;
  }
  if (a.edges.size !== b.edges.size) return false;
  for (const [id, edge] of a.edges) {
    const other = b.edges.get(id);
    if (!other) return false;
    if (
      edge.sourceId !== other.sourceId ||
      edge.targetId !== other.targetId ||
      edge.weight !== other.weight ||
      edge.label !== other.label
    )
      return false;
  }
  return true;
}

// ─── serialize ────────────────────────────────────────────────────────────────

describe('GraphSerializer.serialize', () => {
  it('produces valid JSON', () => {
    const json = GraphSerializer.serialize(makeGraph());
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes all nodes with correct fields', () => {
    const json = GraphSerializer.serialize(makeGraph());
    const parsed = JSON.parse(json);
    expect(parsed.nodes).toHaveLength(2);
    const nodeA = parsed.nodes.find((n: { id: string }) => n.id === 'node-1');
    expect(nodeA).toEqual({ id: 'node-1', label: 'Task A', position: { x: 10, y: 20 } });
  });

  it('includes all edges with correct fields', () => {
    const json = GraphSerializer.serialize(makeGraph());
    const parsed = JSON.parse(json);
    expect(parsed.edges).toHaveLength(1);
    expect(parsed.edges[0]).toEqual({
      id: 'edge-1',
      sourceId: 'node-1',
      targetId: 'node-2',
      weight: 5,
      label: '5',
    });
  });

  it('serializes an empty graph', () => {
    const empty: Graph = { nodes: new Map(), edges: new Map() };
    const json = GraphSerializer.serialize(empty);
    const parsed = JSON.parse(json);
    expect(parsed.nodes).toEqual([]);
    expect(parsed.edges).toEqual([]);
  });
});

// ─── deserialize ─────────────────────────────────────────────────────────────

describe('GraphSerializer.deserialize', () => {
  it('reconstructs a graph from valid JSON', () => {
    const original = makeGraph();
    const restored = GraphSerializer.deserialize(GraphSerializer.serialize(original));
    expect(graphsEqual(original, restored)).toBe(true);
  });

  it('round-trips: deserialize(serialize(g)) equals g', () => {
    const g = makeGraph();
    const roundTripped = GraphSerializer.deserialize(GraphSerializer.serialize(g));
    expect(roundTripped.nodes.size).toBe(g.nodes.size);
    expect(roundTripped.edges.size).toBe(g.edges.size);
    for (const [id, node] of g.nodes) {
      const rt = roundTripped.nodes.get(id)!;
      expect(rt.label).toBe(node.label);
      expect(rt.position).toEqual(node.position);
    }
    for (const [id, edge] of g.edges) {
      const rt = roundTripped.edges.get(id)!;
      expect(rt.sourceId).toBe(edge.sourceId);
      expect(rt.targetId).toBe(edge.targetId);
      expect(rt.weight).toBe(edge.weight);
      expect(rt.label).toBe(edge.label);
    }
  });

  it('deserializes an empty graph', () => {
    const empty: Graph = { nodes: new Map(), edges: new Map() };
    const restored = GraphSerializer.deserialize(GraphSerializer.serialize(empty));
    expect(restored.nodes.size).toBe(0);
    expect(restored.edges.size).toBe(0);
  });

  // ─── Error cases ────────────────────────────────────────────────────────────

  it('throws DeserializationError on non-JSON string', () => {
    expect(() => GraphSerializer.deserialize('not json')).toThrow(DeserializationError);
  });

  it('throws DeserializationError on JSON array at root', () => {
    expect(() => GraphSerializer.deserialize('[]')).toThrow(DeserializationError);
  });

  it('throws DeserializationError when "nodes" is missing', () => {
    expect(() => GraphSerializer.deserialize(JSON.stringify({ edges: [] }))).toThrow(
      DeserializationError,
    );
  });

  it('throws DeserializationError when "edges" is missing', () => {
    expect(() => GraphSerializer.deserialize(JSON.stringify({ nodes: [] }))).toThrow(
      DeserializationError,
    );
  });

  it('throws DeserializationError when a node is missing "id"', () => {
    const bad = JSON.stringify({
      nodes: [{ label: 'X', position: { x: 0, y: 0 } }],
      edges: [],
    });
    expect(() => GraphSerializer.deserialize(bad)).toThrow(DeserializationError);
  });

  it('throws DeserializationError when a node is missing "label"', () => {
    const bad = JSON.stringify({
      nodes: [{ id: 'n1', position: { x: 0, y: 0 } }],
      edges: [],
    });
    expect(() => GraphSerializer.deserialize(bad)).toThrow(DeserializationError);
  });

  it('throws DeserializationError when a node has invalid position', () => {
    const bad = JSON.stringify({
      nodes: [{ id: 'n1', label: 'X', position: { x: 'bad', y: 0 } }],
      edges: [],
    });
    expect(() => GraphSerializer.deserialize(bad)).toThrow(DeserializationError);
  });

  it('throws DeserializationError when an edge is missing "weight"', () => {
    const bad = JSON.stringify({
      nodes: [
        { id: 'n1', label: 'A', position: { x: 0, y: 0 } },
        { id: 'n2', label: 'B', position: { x: 1, y: 1 } },
      ],
      edges: [{ id: 'e1', sourceId: 'n1', targetId: 'n2', label: '1' }],
    });
    expect(() => GraphSerializer.deserialize(bad)).toThrow(DeserializationError);
  });

  it('throws DeserializationError when an edge is missing "label"', () => {
    const bad = JSON.stringify({
      nodes: [
        { id: 'n1', label: 'A', position: { x: 0, y: 0 } },
        { id: 'n2', label: 'B', position: { x: 1, y: 1 } },
      ],
      edges: [{ id: 'e1', sourceId: 'n1', targetId: 'n2', weight: 1 }],
    });
    expect(() => GraphSerializer.deserialize(bad)).toThrow(DeserializationError);
  });

  it('does not mutate state on failure — returns DeserializationError, not partial graph', () => {
    const bad = 'totally invalid';
    let thrown: unknown;
    try {
      GraphSerializer.deserialize(bad);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(DeserializationError);
  });
});
