/**
 * Smoke tests for shared types and error classes.
 * Validates that all interfaces and error classes are correctly defined
 * and that error instances have the expected names and messages.
 */

import {
  NLPExtractionError,
  NLPTimeoutError,
  GraphSizeError,
  InsufficientGraphError,
  DeserializationError,
  AlgorithmError,
} from '../errors';

import type {
  Node,
  Edge,
  Graph,
  NLPResult,
  AlgorithmStep,
  AlgorithmResult,
  Insight,
  SessionRecord,
  AlgorithmType,
} from '../index';

// ─── Error class tests ────────────────────────────────────────────────────────

describe('NLPExtractionError', () => {
  it('is an instance of Error', () => {
    const err = new NLPExtractionError('could not extract tasks');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NLPExtractionError);
  });

  it('has the correct name and message', () => {
    const err = new NLPExtractionError('could not extract tasks');
    expect(err.name).toBe('NLPExtractionError');
    expect(err.message).toBe('could not extract tasks');
  });
});

describe('NLPTimeoutError', () => {
  it('uses default message when none provided', () => {
    const err = new NLPTimeoutError();
    expect(err.name).toBe('NLPTimeoutError');
    expect(err.message).toContain('timed out');
  });

  it('accepts a custom message', () => {
    const err = new NLPTimeoutError('custom timeout');
    expect(err.message).toBe('custom timeout');
  });
});

describe('GraphSizeError', () => {
  it('has the correct name and message', () => {
    const err = new GraphSizeError('Node limit of 100 exceeded');
    expect(err.name).toBe('GraphSizeError');
    expect(err.message).toBe('Node limit of 100 exceeded');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('InsufficientGraphError', () => {
  it('uses default message when none provided', () => {
    const err = new InsufficientGraphError();
    expect(err.name).toBe('InsufficientGraphError');
    expect(err.message).toContain('enough structure');
  });

  it('accepts a custom message', () => {
    const err = new InsufficientGraphError('need more nodes');
    expect(err.message).toBe('need more nodes');
  });
});

describe('DeserializationError', () => {
  it('has the correct name and message', () => {
    const err = new DeserializationError('invalid JSON');
    expect(err.name).toBe('DeserializationError');
    expect(err.message).toBe('invalid JSON');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('AlgorithmError', () => {
  it('has the correct name and message', () => {
    const err = new AlgorithmError('source node is disconnected');
    expect(err.name).toBe('AlgorithmError');
    expect(err.message).toBe('source node is disconnected');
    expect(err).toBeInstanceOf(Error);
  });
});

// ─── Type shape smoke tests ───────────────────────────────────────────────────

describe('Type shapes', () => {
  it('can construct a valid Node object', () => {
    const node: Node = { id: 'n1', label: 'Task A', position: { x: 0, y: 0 } };
    expect(node.id).toBe('n1');
    expect(node.label).toBe('Task A');
  });

  it('can construct a valid Edge object', () => {
    const edge: Edge = {
      id: 'e1',
      sourceId: 'n1',
      targetId: 'n2',
      weight: 1,
      label: '1',
    };
    expect(edge.weight).toBe(1);
  });

  it('can construct a valid Graph with Maps', () => {
    const graph: Graph = {
      nodes: new Map(),
      edges: new Map(),
    };
    expect(graph.nodes.size).toBe(0);
    expect(graph.edges.size).toBe(0);
  });

  it('can construct a valid NLPResult', () => {
    const result: NLPResult = {
      nodes: [{ id: 'n1', label: 'Task A' }],
      edges: [{ sourceId: 'n1', targetId: 'n2' }],
    };
    expect(result.nodes).toHaveLength(1);
    expect(result.edges[0].weight).toBeUndefined();
  });

  it('can construct a valid AlgorithmStep', () => {
    const step: AlgorithmStep = {
      stepIndex: 0,
      activeNodeId: 'n1',
      visitedNodeIds: ['n1'],
      traversedEdgeIds: [],
    };
    expect(step.stepIndex).toBe(0);
  });

  it('can construct a valid AlgorithmResult', () => {
    const result: AlgorithmResult = {
      algorithm: 'dijkstra',
      steps: [],
    };
    expect(result.algorithm).toBe('dijkstra');
  });

  it('AlgorithmType accepts dijkstra and dfs', () => {
    const a: AlgorithmType = 'dijkstra';
    const b: AlgorithmType = 'dfs';
    expect(a).toBe('dijkstra');
    expect(b).toBe('dfs');
  });

  it('can construct a valid Insight', () => {
    const insight: Insight = {
      type: 'critical_path',
      message: 'The critical path is A → B → C',
      affectedNodeIds: ['n1', 'n2', 'n3'],
    };
    expect(insight.type).toBe('critical_path');
  });

  it('can construct a valid SessionRecord', () => {
    const session: SessionRecord = {
      id: 'sess-1',
      createdAt: Date.now(),
      label: 'My session',
      graphJson: '{}',
      algorithm: 'dfs',
      sourceNodeId: 'n1',
      algorithmResult: { steps: [] },
      insights: [],
    };
    expect(session.algorithm).toBe('dfs');
  });
});
