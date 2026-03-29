import type { Graph, SerializedGraph, SerializedNode, SerializedEdge } from '../types';
import { DeserializationError } from '../types/errors';

export interface GraphSerializer {
  serialize(graph: Graph): string;
  deserialize(json: string): Graph;
}

export const GraphSerializer: GraphSerializer = {
  serialize(graph: Graph): string {
    const nodes: SerializedNode[] = Array.from(graph.nodes.values()).map((n) => ({
      id: n.id,
      label: n.label,
      position: { x: n.position.x, y: n.position.y },
    }));

    const edges: SerializedEdge[] = Array.from(graph.edges.values()).map((e) => ({
      id: e.id,
      sourceId: e.sourceId,
      targetId: e.targetId,
      weight: e.weight,
      label: e.label,
    }));

    const serialized: SerializedGraph = { nodes, edges };
    return JSON.stringify(serialized);
  },

  deserialize(json: string): Graph {
    let parsed: unknown;

    try {
      parsed = JSON.parse(json);
    } catch {
      throw new DeserializationError('Invalid JSON: input could not be parsed.');
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new DeserializationError('Invalid graph: root must be a JSON object.');
    }

    const obj = parsed as Record<string, unknown>;

    if (!Array.isArray(obj['nodes'])) {
      throw new DeserializationError('Invalid graph: "nodes" must be an array.');
    }
    if (!Array.isArray(obj['edges'])) {
      throw new DeserializationError('Invalid graph: "edges" must be an array.');
    }

    const nodes = new Map<string, import('../types').Node>();
    for (const raw of obj['nodes'] as unknown[]) {
      const n = raw as Record<string, unknown>;
      if (typeof n['id'] !== 'string' || !n['id']) {
        throw new DeserializationError('Invalid graph: each node must have a string "id".');
      }
      if (typeof n['label'] !== 'string') {
        throw new DeserializationError(`Invalid graph: node "${n['id']}" must have a string "label".`);
      }
      const pos = n['position'] as Record<string, unknown> | undefined;
      if (
        typeof pos !== 'object' ||
        pos === null ||
        typeof pos['x'] !== 'number' ||
        typeof pos['y'] !== 'number'
      ) {
        throw new DeserializationError(
          `Invalid graph: node "${n['id']}" must have a "position" with numeric x and y.`,
        );
      }
      nodes.set(n['id'] as string, {
        id: n['id'] as string,
        label: n['label'] as string,
        position: { x: pos['x'] as number, y: pos['y'] as number },
      });
    }

    const edges = new Map<string, import('../types').Edge>();
    for (const raw of obj['edges'] as unknown[]) {
      const e = raw as Record<string, unknown>;
      if (typeof e['id'] !== 'string' || !e['id']) {
        throw new DeserializationError('Invalid graph: each edge must have a string "id".');
      }
      if (typeof e['sourceId'] !== 'string' || !e['sourceId']) {
        throw new DeserializationError(`Invalid graph: edge "${e['id']}" must have a string "sourceId".`);
      }
      if (typeof e['targetId'] !== 'string' || !e['targetId']) {
        throw new DeserializationError(`Invalid graph: edge "${e['id']}" must have a string "targetId".`);
      }
      if (typeof e['weight'] !== 'number') {
        throw new DeserializationError(`Invalid graph: edge "${e['id']}" must have a numeric "weight".`);
      }
      if (typeof e['label'] !== 'string') {
        throw new DeserializationError(`Invalid graph: edge "${e['id']}" must have a string "label".`);
      }
      edges.set(e['id'] as string, {
        id: e['id'] as string,
        sourceId: e['sourceId'] as string,
        targetId: e['targetId'] as string,
        weight: e['weight'] as number,
        label: e['label'] as string,
      });
    }

    return { nodes, edges };
  },
};
