# Implementation Plan: Algorithm Visual Soul

## Overview

Implement the Algorithm Visual Soul React Native / Expo application layer by layer: core types and interfaces first, then NLP, graph, algorithm, insight, playback, persistence, and finally the UI/visualizer. Each task wires into the previous, ending with a fully integrated app.

## Tasks

- [ ] 1. Set up project structure, core types, and testing framework
  - Scaffold the Expo / React Native project with TypeScript
  - Create `src/` directory tree matching the design's module layout (`nlp/`, `graph/`, `algorithm/`, `insight/`, `playback/`, `history/`, `ui/`)
  - Define all shared TypeScript interfaces and types (`Node`, `Edge`, `Graph`, `NLPResult`, `AlgorithmStep`, `AlgorithmResult`, `Insight`, `SessionRecord`, `AlgorithmType`)
  - Define all typed error classes (`NLPExtractionError`, `NLPTimeoutError`, `GraphSizeError`, `InsufficientGraphError`, `DeserializationError`, `AlgorithmError`)
  - Install and configure `fast-check` for property-based testing and Jest for unit tests
  - _Requirements: 1.1, 2.1, 3.2, 8.1_

- [ ] 2. Implement Graph Engine
  - [ ] 2.1 Implement `GraphEngine` with all mutation operations
    - Implement `buildFromNLP`, `addNode`, `removeNode`, `addEdge`, `removeEdge`, `editNode`, `editEdge` as pure functions returning new `Graph` instances
    - Enforce 100-node / 500-edge limits, throwing `GraphSizeError` when exceeded
    - Assign default weight of 1 to edges with no explicit weight
    - `removeNode` must cascade-delete all incident edges
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 2.2 Write property test for node removal cascade (Property 8)
    - **Property 8: Node removal cascades to incident edges**
    - **Validates: Requirements 4.3**

  - [ ]* 2.3 Write property test for NLP result → graph structure (Property 3)
    - **Property 3: NLP result maps to graph structure**
    - **Validates: Requirements 2.1**

  - [ ]* 2.4 Write property test for default edge weight (Property 4)
    - **Property 4: Default edge weight is 1**
    - **Validates: Requirements 2.2**

  - [ ]* 2.5 Write property test for edit node/edge reflects new values (Property 9)
    - **Property 9: Edit node/edge reflects new values**
    - **Validates: Requirements 4.5**

  - [ ]* 2.6 Write unit tests for Graph Engine
    - Test boundary conditions: exactly 100 nodes, exactly 500 edges, 0 nodes, 1 node
    - Test `GraphSizeError` is thrown at limit + 1
    - Test `InsufficientGraphError` when NLPResult yields < 2 nodes
    - _Requirements: 2.4, 2.5_

- [ ] 3. Implement Graph Serializer
  - [ ] 3.1 Implement `GraphSerializer` serialize and deserialize
    - `serialize(graph)` → JSON string matching the defined serialized schema
    - `deserialize(json)` → `Graph`; throw `DeserializationError` on invalid input without mutating state
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

  - [ ]* 3.2 Write property test for graph serialization round-trip (Property 20)
    - **Property 20: Graph serialization round-trip**
    - **Validates: Requirements 8.2, 8.3, 8.4**

  - [ ]* 3.3 Write property test for malformed JSON deserialization (Property 21)
    - **Property 21: Malformed JSON deserialization returns error without state mutation**
    - **Validates: Requirements 8.5**

  - [ ]* 3.4 Write unit tests for Graph Serializer
    - Test known valid JSON → graph
    - Test known invalid JSON → `DeserializationError`
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [ ] 4. Checkpoint — Ensure all graph-layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement NLP Engine
  - [ ] 5.1 Implement `NLPEngine.extract`
    - Integrate on-device model or hosted LLM call with a 3 000 ms timeout
    - Return `NLPResult` conforming to the defined schema
    - Throw `NLPExtractionError` when no tasks are found; throw `NLPTimeoutError` on timeout
    - _Requirements: 1.1, 1.3, 1.4, 8.1_

  - [ ]* 5.2 Write property test for NLP extraction timeout (Property 2)
    - **Property 2: NLP extraction completes within timeout**
    - **Validates: Requirements 1.3**

  - [ ]* 5.3 Write property test for NLP output schema conformance (Property 19)
    - **Property 19: NLP output conforms to NLPResult schema**
    - **Validates: Requirements 8.1**

  - [ ]* 5.4 Write property test for input length boundary (Property 1)
    - **Property 1: Input length boundary**
    - **Validates: Requirements 1.1**

  - [ ]* 5.5 Write unit tests for NLP Engine
    - Test specific example inputs with known expected node/edge extractions
    - Test `NLPExtractionError` on empty/meaningless input
    - Test `NLPTimeoutError` with a mocked slow response
    - _Requirements: 1.3, 1.4_

- [ ] 6. Implement Algorithm Engine
  - [ ] 6.1 Implement Dijkstra algorithm
    - Produce `AlgorithmResult` with ordered `steps[]`, `shortestPaths`, and `distanceMap` per step
    - Throw `AlgorithmError` for disconnected source node or invalid graph state
    - _Requirements: 3.1, 3.2, 3.5_

  - [ ] 6.2 Implement DFS algorithm
    - Produce `AlgorithmResult` with ordered `steps[]` and `visitOrder`
    - _Requirements: 3.1, 3.2_

  - [ ]* 6.3 Write property test for algorithm produces ordered steps (Property 5)
    - **Property 5: Algorithm engine produces non-empty ordered steps**
    - **Validates: Requirements 3.2**

  - [ ]* 6.4 Write property test for Dijkstra shortest-path correctness (Property 6)
    - **Property 6: Dijkstra shortest-path correctness**
    - **Validates: Requirements 3.5**

  - [ ]* 6.5 Write property test for algorithm re-run uses updated graph (Property 10)
    - **Property 10: Algorithm re-run uses updated graph**
    - **Validates: Requirements 4.7**

  - [ ]* 6.6 Write unit tests for Algorithm Engine
    - Test known small graphs with hand-verified Dijkstra outputs
    - Test known small graphs with hand-verified DFS visit orders
    - Test `AlgorithmError` on disconnected source node
    - _Requirements: 3.2, 3.5_

- [ ] 7. Implement Insight Engine
  - [ ] 7.1 Implement `InsightEngine.analyse`
    - Always return ≥ 1 insight
    - Emit `critical_path` insight for Dijkstra results
    - Emit `cycle_detected` insight for DFS results on cyclic graphs; no emission on acyclic graphs
    - Emit `isolated_node` insights for all degree-0 nodes
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [ ]* 7.2 Write property test for insight engine always produces at least one insight (Property 11)
    - **Property 11: Insight engine always produces at least one insight**
    - **Validates: Requirements 5.1**

  - [ ]* 7.3 Write property test for Dijkstra always produces critical-path insight (Property 12)
    - **Property 12: Dijkstra run always produces a critical-path insight**
    - **Validates: Requirements 5.2**

  - [ ]* 7.4 Write property test for DFS cycle detection (Property 13)
    - **Property 13: DFS detects cycles correctly**
    - **Validates: Requirements 5.3**

  - [ ]* 7.5 Write property test for isolated nodes flagged (Property 14)
    - **Property 14: Isolated nodes are flagged**
    - **Validates: Requirements 5.5**

  - [ ]* 7.6 Write unit tests for Insight Engine
    - Test graphs with known cycles, known isolated nodes, known critical paths
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [ ] 8. Checkpoint — Ensure all engine-layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement Playback Controller
  - [ ] 9.1 Implement `PlaybackController` as a finite state machine
    - Implement `play`, `pause`, `stepForward`, `stepBackward`, `restart`, `setSpeed`
    - `currentStep` must always remain within `[0, totalSteps - 1]`
    - `state` must only ever be one of `idle | playing | paused | completed`
    - Default speed: 500 ms/step
    - _Requirements: 3.3, 3.4, 3.6, 3.7_

  - [ ]* 9.2 Write property test for playback controller state machine invariants (Property 7)
    - **Property 7: Playback controller state machine invariants**
    - **Validates: Requirements 3.6**

  - [ ]* 9.3 Write unit tests for Playback Controller
    - Test each state transition explicitly
    - Test boundary: `stepBackward` at step 0, `stepForward` at last step
    - _Requirements: 3.6, 3.7_

- [ ] 10. Implement History Store
  - [ ] 10.1 Implement `HistoryStore` using AsyncStorage or SQLite
    - Implement `save`, `list`, `load`, `delete`
    - `list()` returns sessions ordered most-recent-first
    - Auto-purge sessions older than 90 days on `list()` call
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 10.2 Write property test for session save/load round-trip (Property 15)
    - **Property 15: Session save/load round-trip**
    - **Validates: Requirements 7.1, 7.3**

  - [ ]* 10.3 Write property test for history ordered most-recent-first (Property 16)
    - **Property 16: History list is ordered most-recent-first**
    - **Validates: Requirements 7.2**

  - [ ]* 10.4 Write property test for deleted session absent from history (Property 17)
    - **Property 17: Deleted session is absent from history**
    - **Validates: Requirements 7.4**

  - [ ]* 10.5 Write property test for 90-day retention policy (Property 18)
    - **Property 18: Sessions within 90 days are retained; older sessions are purged**
    - **Validates: Requirements 7.5**

  - [ ]* 10.6 Write unit tests for History Store
    - Test session ordering with fixed timestamps
    - Test 90-day boundary: 89-day-old session retained, 91-day-old session purged
    - _Requirements: 7.2, 7.5_

- [ ] 11. Checkpoint — Ensure all persistence-layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement UI — Input Screen
  - [ ] 12.1 Build text input component with 2000-character limit
    - Enforce max length; reject or truncate beyond 2000 characters
    - _Requirements: 1.1_

  - [ ] 12.2 Build voice input component with recording indicator
    - Integrate STT; show visual recording-in-progress indicator while active
    - Transcribe speech to text before passing to NLP Engine
    - _Requirements: 1.2, 1.5_

  - [ ] 12.3 Wire input components to NLP Engine and Graph Engine
    - On submit: call `NLPEngine.extract` → `GraphEngine.buildFromNLP`
    - Display `NLPExtractionError` / `NLPTimeoutError` / `InsufficientGraphError` inline
    - _Requirements: 1.3, 1.4, 2.4_

- [ ] 13. Implement UI — Visualizer Component
  - [ ] 13.1 Build the graph canvas using react-native-svg or react-native-skia
    - Render nodes as circles with labels; render edges as directed arrows with weight labels
    - Enforce 44×44 pt minimum tap targets on nodes
    - Support portrait and landscape layout, filling available screen area
    - _Requirements: 2.3, 6.4, 6.5_

  - [ ] 13.2 Apply dark theme and neon glow effects
    - Dark background with luminance < 15% relative to white
    - Neon glow on active nodes and traversed edges during animation
    - _Requirements: 6.1, 6.2_

  - [ ] 13.3 Implement step animation driven by Playback Controller
    - Highlight active node and traversed edges per `AlgorithmStep`
    - Display current step number and total step count
    - Complete each step transition within 500 ms at default speed
    - _Requirements: 3.3, 3.4, 3.7_

  - [ ] 13.4 Implement graph mutation interactions
    - Tap empty area → add node; select two nodes → add edge
    - Tap node/edge → show edit/delete options (label, weight)
    - Re-render updated graph within 500 ms after any mutation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 14. Implement UI — Algorithm Controls and Insight Panel
  - [ ] 14.1 Build algorithm selector and playback controls bar
    - Algorithm picker (Dijkstra / DFS) and source-node selector
    - Play, pause, step forward, step backward, restart buttons wired to `PlaybackController`
    - Apply 200–400 ms screen-transition animations
    - _Requirements: 3.1, 3.6, 6.3_

  - [ ] 14.2 Build Insight Panel
    - Dedicated panel below the Visualizer displaying `Insight[]` after algorithm completion
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 15. Implement UI — History and Comparison Views
  - [ ] 15.1 Build History List screen
    - Show saved sessions ordered most-recent-first with delete affordance
    - Tap session → restore graph and algorithm output via `HistoryStore.load` + `GraphSerializer.deserialize`
    - _Requirements: 7.2, 7.3, 7.4_

  - [ ] 15.2 Build side-by-side Comparison View
    - Allow user to select two sessions and display both graphs simultaneously
    - _Requirements: 7.6_

  - [ ] 15.3 Wire save-session action
    - Save button persists current graph, algorithm, result, and insights via `HistoryStore.save`
    - _Requirements: 7.1_

- [ ] 16. Integration wiring and end-to-end integration tests
  - [ ] 16.1 Wire full pipeline: input → NLP → graph → algorithm → insights → history
    - Ensure every layer hands off correctly to the next with no orphaned state
    - _Requirements: 1.3, 2.1, 3.2, 5.1, 7.1_

  - [ ]* 16.2 Write integration tests for full pipeline
    - Test: text input → NLP → graph → algorithm → insights (happy path and error paths)
    - Test: session save → simulated app restart → session load → graph restore
    - Test: graph mutation → algorithm re-run → updated insights
    - _Requirements: 1.3, 2.1, 3.2, 4.7, 5.1, 7.1, 7.3_

- [ ] 17. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations per run
- Each property test must include the comment tag: `// Feature: algorithm-visual-soul, Property <N>: <property_text>`
- Checkpoints ensure incremental validation at each architectural layer
