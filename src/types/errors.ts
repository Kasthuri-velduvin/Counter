/**
 * Typed error classes for Algorithm Visual Soul.
 * All errors carry a human-readable `message` suitable for direct display.
 * Errors never mutate application state — they are thrown before any write occurs.
 */

// ─── NLP errors ──────────────────────────────────────────────────────────────

/** Thrown when the NLP engine cannot extract any meaningful tasks from input. */
export class NLPExtractionError extends Error {
  readonly name = 'NLPExtractionError';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, NLPExtractionError.prototype);
  }
}

/** Thrown when NLP extraction exceeds the 3 000 ms timeout budget. */
export class NLPTimeoutError extends Error {
  readonly name = 'NLPTimeoutError';
  constructor(message = 'NLP extraction timed out. Please try again.') {
    super(message);
    Object.setPrototypeOf(this, NLPTimeoutError.prototype);
  }
}

// ─── Graph errors ─────────────────────────────────────────────────────────────

/** Thrown when adding a node or edge would exceed the 100-node / 500-edge limits. */
export class GraphSizeError extends Error {
  readonly name = 'GraphSizeError';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, GraphSizeError.prototype);
  }
}

/** Thrown when an NLPResult yields fewer than 2 nodes, making a graph impossible. */
export class InsufficientGraphError extends Error {
  readonly name = 'InsufficientGraphError';
  constructor(
    message = 'The input did not yield enough structure to form a graph. Please provide more detail.',
  ) {
    super(message);
    Object.setPrototypeOf(this, InsufficientGraphError.prototype);
  }
}

/** Thrown when the Graph Serializer receives malformed or invalid JSON. */
export class DeserializationError extends Error {
  readonly name = 'DeserializationError';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, DeserializationError.prototype);
  }
}

// ─── Algorithm errors ─────────────────────────────────────────────────────────

/** Thrown for a disconnected source node or invalid graph state during algorithm execution. */
export class AlgorithmError extends Error {
  readonly name = 'AlgorithmError';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, AlgorithmError.prototype);
  }
}
