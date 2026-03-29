import { NLPEngine } from '../nlpEngine';
import { NLPExtractionError, NLPTimeoutError } from '../../types/errors';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeLLMResponse(content: string, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () =>
      Promise.resolve({
        choices: [{ message: { content } }],
      }),
  } as Response);
}

const VALID_RESULT = {
  nodes: [
    { id: 'n1', label: 'Task A' },
    { id: 'n2', label: 'Task B' },
  ],
  edges: [{ sourceId: 'n1', targetId: 'n2', weight: 1, label: '1' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe('NLPEngine.extract', () => {
  describe('happy path', () => {
    it('returns a valid NLPResult with nodes and edges', async () => {
      mockFetch.mockReturnValue(makeLLMResponse(JSON.stringify(VALID_RESULT)));

      const result = await NLPEngine.extract('Task A depends on Task B');

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes[0]).toMatchObject({ id: 'n1', label: 'Task A' });
      expect(result.nodes[1]).toMatchObject({ id: 'n2', label: 'Task B' });
    });

    it('returns edges with optional weight and label fields', async () => {
      const resultWithOptionals = {
        nodes: [
          { id: 'n1', label: 'Start' },
          { id: 'n2', label: 'End' },
        ],
        edges: [{ sourceId: 'n1', targetId: 'n2' }],
      };
      mockFetch.mockReturnValue(
        makeLLMResponse(JSON.stringify(resultWithOptionals)),
      );

      const result = await NLPEngine.extract('Start leads to End');

      expect(result.edges[0].sourceId).toBe('n1');
      expect(result.edges[0].targetId).toBe('n2');
    });
  });

  describe('NLPExtractionError', () => {
    it('throws NLPExtractionError when nodes array is empty', async () => {
      const emptyNodes = { nodes: [], edges: [] };
      mockFetch.mockReturnValue(makeLLMResponse(JSON.stringify(emptyNodes)));

      await expect(NLPEngine.extract('gibberish')).rejects.toThrow(
        NLPExtractionError,
      );
    });

    it('throws NLPExtractionError when only 1 node is returned', async () => {
      const oneNode = {
        nodes: [{ id: 'n1', label: 'Solo' }],
        edges: [],
      };
      mockFetch.mockReturnValue(makeLLMResponse(JSON.stringify(oneNode)));

      await expect(NLPEngine.extract('just one thing')).rejects.toThrow(
        NLPExtractionError,
      );
    });

    it('throws NLPExtractionError when LLM returns invalid JSON', async () => {
      mockFetch.mockReturnValue(makeLLMResponse('not valid json at all'));

      await expect(NLPEngine.extract('some input')).rejects.toThrow(
        NLPExtractionError,
      );
    });

    it('throws NLPExtractionError when LLM response does not match schema', async () => {
      mockFetch.mockReturnValue(
        makeLLMResponse(JSON.stringify({ unexpected: 'shape' })),
      );

      await expect(NLPEngine.extract('some input')).rejects.toThrow(
        NLPExtractionError,
      );
    });

    it('throws NLPExtractionError when HTTP request fails', async () => {
      mockFetch.mockReturnValue(makeLLMResponse('', 500));

      await expect(NLPEngine.extract('some input')).rejects.toThrow(
        NLPExtractionError,
      );
    });
  });

  describe('NLPTimeoutError', () => {
    it('throws NLPTimeoutError when LLM call exceeds 3000ms', async () => {
      jest.useFakeTimers();

      // fetch never resolves
      mockFetch.mockReturnValue(new Promise(() => {}));

      const extractPromise = NLPEngine.extract('slow input');

      // Advance past the 3000ms timeout
      jest.advanceTimersByTime(3001);

      await expect(extractPromise).rejects.toThrow(NLPTimeoutError);

      jest.useRealTimers();
    });
  });
});
