// PlaybackController — finite state machine for algorithm step animation

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'completed';

export interface PlaybackController {
  play(): void;
  pause(): void;
  stepForward(): void;
  stepBackward(): void;
  restart(): void;
  setSpeed(msPerStep: number): void;
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly state: PlaybackState;
}

/**
 * Creates a PlaybackController finite state machine.
 *
 * State transitions:
 *   IDLE      → play()          → PLAYING
 *   PLAYING   → pause()         → PAUSED
 *   PAUSED    → play()          → PLAYING
 *   PLAYING   → last step       → COMPLETED
 *   PLAYING | PAUSED → restart() → IDLE (step 0)
 *   COMPLETED → restart()       → IDLE (step 0)
 *
 * stepForward / stepBackward work in any state and clamp to [0, totalSteps - 1].
 *
 * @param totalSteps  Total number of algorithm steps (must be ≥ 1)
 * @param onStep      Callback invoked with the new step index whenever it changes
 */
export function createPlaybackController(
  totalSteps: number,
  onStep: (step: number) => void,
): PlaybackController {
  if (totalSteps < 1) {
    throw new RangeError('totalSteps must be at least 1');
  }

  let _currentStep = 0;
  let _state: PlaybackState = 'idle';
  let _msPerStep = 500; // default 500 ms/step (req 3.7)
  let _intervalId: ReturnType<typeof setInterval> | null = null;

  function _clearInterval(): void {
    if (_intervalId !== null) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
  }

  function _clamp(step: number): number {
    return Math.max(0, Math.min(totalSteps - 1, step));
  }

  function _advance(): void {
    if (_currentStep < totalSteps - 1) {
      _currentStep += 1;
      onStep(_currentStep);
      // If we just reached the last step, transition to COMPLETED
      if (_currentStep === totalSteps - 1) {
        _clearInterval();
        _state = 'completed';
      }
    }
  }

  function _startInterval(): void {
    _clearInterval();
    _intervalId = setInterval(_advance, _msPerStep);
  }

  const controller: PlaybackController = {
    get currentStep(): number {
      return _currentStep;
    },

    get totalSteps(): number {
      return totalSteps;
    },

    get state(): PlaybackState {
      return _state;
    },

    play(): void {
      if (_state === 'idle' || _state === 'paused') {
        _state = 'playing';
        _startInterval();
      }
      // PLAYING and COMPLETED: no-op
    },

    pause(): void {
      if (_state === 'playing') {
        _clearInterval();
        _state = 'paused';
      }
      // Other states: no-op
    },

    stepForward(): void {
      const next = _clamp(_currentStep + 1);
      if (next !== _currentStep) {
        _currentStep = next;
        onStep(_currentStep);
      }
      // If we just stepped to the last step while playing, stop the interval
      if (_currentStep === totalSteps - 1 && _state === 'playing') {
        _clearInterval();
        _state = 'completed';
      }
    },

    stepBackward(): void {
      const prev = _clamp(_currentStep - 1);
      if (prev !== _currentStep) {
        _currentStep = prev;
        onStep(_currentStep);
      }
    },

    restart(): void {
      _clearInterval();
      _currentStep = 0;
      _state = 'idle';
      onStep(_currentStep);
    },

    setSpeed(msPerStep: number): void {
      _msPerStep = msPerStep;
      // If currently playing, restart the interval with the new speed
      if (_state === 'playing') {
        _startInterval();
      }
    },
  };

  return controller;
}
