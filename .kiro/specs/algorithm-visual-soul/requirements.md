# Requirements Document

## Introduction

Algorithm Visual Soul is an AI-powered mobile application that transforms user-described problems, thoughts, or tasks into interactive algorithm visualizations. The app maps real-life problems into computational graph models and solves them using algorithms such as Dijkstra's Algorithm and Depth-First Search (DFS), providing step-by-step animated visualizations and actionable insights.

## Glossary

- **App**: The Algorithm Visual Soul mobile application
- **User**: A person interacting with the App
- **NLP_Engine**: The AI/NLP component that extracts tasks and relationships from user input
- **Graph_Engine**: The backend component responsible for constructing and managing graph data structures
- **Graph**: A data structure composed of Nodes and Edges representing a user's problem
- **Node**: A single task, decision point, or concept within a Graph
- **Edge**: A directed or weighted connection between two Nodes representing a dependency or relationship
- **Algorithm_Engine**: The component that executes graph algorithms (Dijkstra's, DFS) on a Graph
- **Visualizer**: The frontend component responsible for rendering Graphs and animating algorithm execution
- **Insight_Engine**: The component that generates recommendations based on algorithm output
- **History_Store**: The persistent storage component for saving and retrieving past problems and solutions
- **Dijkstra**: Dijkstra's shortest-path algorithm
- **DFS**: Depth-First Search algorithm

---

## Requirements

### Requirement 1: Problem Input

**User Story:** As a user, I want to input my problem in text or voice form, so that the app can understand and process it without requiring me to manually build a graph.

#### Acceptance Criteria

1. THE App SHALL provide a text input field accepting up to 2000 characters.
2. THE App SHALL provide a voice input option that transcribes speech to text before processing.
3. WHEN the User submits an input, THE NLP_Engine SHALL extract a list of tasks and relationships from the input within 3 seconds.
4. IF the NLP_Engine cannot extract any meaningful tasks from the input, THEN THE App SHALL display a descriptive error message prompting the User to rephrase.
5. WHEN voice input is active, THE App SHALL display a visual indicator showing that recording is in progress.

---

### Requirement 2: Graph Generation

**User Story:** As a user, I want my problem automatically converted into a graph, so that I can see the structure of my tasks and their relationships.

#### Acceptance Criteria

1. WHEN the NLP_Engine produces a list of tasks and relationships, THE Graph_Engine SHALL construct a Graph where each task maps to a Node and each relationship maps to a weighted Edge.
2. THE Graph_Engine SHALL assign a default weight of 1 to any Edge for which no explicit weight or priority is derivable from the input.
3. WHEN a Graph is constructed, THE Visualizer SHALL render all Nodes and Edges on screen within 1 second.
4. IF the extracted input produces fewer than 2 Nodes, THEN THE App SHALL notify the User that the input did not yield enough structure to form a graph and prompt for more detail.
5. THE Graph_Engine SHALL support Graphs containing up to 100 Nodes and 500 Edges.

---

### Requirement 3: Algorithm Visualization

**User Story:** As a user, I want to see Dijkstra's and DFS algorithms applied to my graph with step-by-step animation, so that I can understand how the algorithm processes my problem.

#### Acceptance Criteria

1. THE App SHALL allow the User to select either Dijkstra or DFS as the algorithm to apply to the current Graph.
2. WHEN the User starts an algorithm, THE Algorithm_Engine SHALL execute the selected algorithm and produce an ordered list of steps representing the traversal or path.
3. WHEN the Algorithm_Engine produces steps, THE Visualizer SHALL animate each step sequentially, highlighting the active Node and traversed Edges.
4. THE Visualizer SHALL display the current step number and total step count during animation.
5. WHEN the User selects Dijkstra, THE Visualizer SHALL highlight the shortest path from the source Node to all reachable Nodes upon algorithm completion.
6. THE App SHALL provide playback controls (play, pause, step forward, step backward, restart) for the animation.
7. THE Visualizer SHALL complete each animation step transition within 500ms at the default playback speed.

---

### Requirement 4: Interactive Simulation

**User Story:** As a user, I want to modify the graph by adding or removing nodes and edges and re-run algorithms, so that I can explore different scenarios.

#### Acceptance Criteria

1. WHILE a Graph is displayed, THE App SHALL allow the User to add a new Node by tapping an empty area of the canvas.
2. WHILE a Graph is displayed, THE App SHALL allow the User to add an Edge by selecting a source Node and a destination Node.
3. WHILE a Graph is displayed, THE App SHALL allow the User to remove a Node, which SHALL also remove all Edges connected to that Node.
4. WHILE a Graph is displayed, THE App SHALL allow the User to remove an Edge by selecting it.
5. WHILE a Graph is displayed, THE App SHALL allow the User to edit the label and weight of any Node or Edge.
6. WHEN the User modifies the Graph, THE Visualizer SHALL re-render the updated Graph within 500ms.
7. WHEN the User re-runs an algorithm after modifying the Graph, THE Algorithm_Engine SHALL execute the algorithm on the updated Graph and produce a new set of steps.

---

### Requirement 5: Insight and Recommendation Engine

**User Story:** As a user, I want to receive suggestions based on the algorithm output, so that I can make better decisions about my problem.

#### Acceptance Criteria

1. WHEN an algorithm run completes, THE Insight_Engine SHALL generate at least one human-readable recommendation based on the algorithm output.
2. WHEN Dijkstra completes, THE Insight_Engine SHALL identify the critical path and present it as a prioritized action sequence to the User.
3. WHEN DFS completes, THE Insight_Engine SHALL identify any cycles in the Graph and notify the User if circular dependencies exist.
4. THE App SHALL display Insight_Engine output in a dedicated panel below the Visualizer.
5. IF the Graph contains isolated Nodes (Nodes with no Edges), THEN THE Insight_Engine SHALL flag them as unconnected tasks and suggest the User review their relevance.

---

### Requirement 6: UI/UX Design

**User Story:** As a user, I want a visually engaging dark-themed interface with smooth animations, so that the experience is immersive and easy to use.

#### Acceptance Criteria

1. THE App SHALL render all screens using a dark background with a luminance value below 15% relative to white.
2. THE Visualizer SHALL render active Nodes and traversed Edges with a neon glow effect distinguishable from inactive elements.
3. THE App SHALL apply smooth transitions of 200ms–400ms duration when navigating between screens.
4. THE App SHALL support both portrait and landscape orientations, re-laying out the Graph canvas to fill the available screen area.
5. THE Visualizer SHALL maintain a minimum Node tap target size of 44x44 points to ensure usability on touch screens.

---

### Requirement 7: History and Memory

**User Story:** As a user, I want to save my previous problems and solutions and revisit or compare them, so that I can track my thinking over time.

#### Acceptance Criteria

1. WHEN the User saves a session, THE History_Store SHALL persist the Graph, algorithm selection, algorithm output, and Insight_Engine recommendations.
2. THE App SHALL display a history list showing saved sessions ordered by most recent first.
3. WHEN the User selects a saved session, THE App SHALL restore the Graph and algorithm output to the state at the time of saving.
4. THE App SHALL allow the User to delete a saved session from the history list.
5. THE History_Store SHALL retain saved sessions for a minimum of 90 days without requiring cloud connectivity.
6. WHEN the User views two saved sessions simultaneously, THE App SHALL display both Graphs side-by-side in a comparison view.

---

### Requirement 8: NLP Parsing and Round-Trip Integrity

**User Story:** As a developer, I want the NLP extraction and graph serialization to be reliable and reversible, so that problem data is never lost or corrupted.

#### Acceptance Criteria

1. WHEN the NLP_Engine processes a text input, THE NLP_Engine SHALL produce a structured representation (nodes list and edges list) in a defined internal format.
2. THE Graph_Engine SHALL serialize any Graph to a JSON representation.
3. THE Graph_Engine SHALL deserialize a valid JSON representation back into an equivalent Graph.
4. FOR ALL valid Graph objects, serializing then deserializing SHALL produce a Graph with identical Nodes, Edges, weights, and labels (round-trip property).
5. IF the Graph_Engine receives a malformed or invalid JSON input during deserialization, THEN THE Graph_Engine SHALL return a descriptive error without modifying application state.
