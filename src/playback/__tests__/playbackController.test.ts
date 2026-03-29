import { createPlaybackController } from '../playbackController';

describe('PlaybackController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── Factory ────────────────────────────────────────────────────────────────

  it('starts in idle state at step 0', () => {
    const ctrl = createPlaybackController(5, jest.fn());
    expect(ctrl.state).toBe('idle');
    expect(ctrl.currentStep).toBe(0);
    expect(ctrl.totalSteps).toBe(5);
  });

  it('throws when totalSteps < 1', () => {
    expect(() => createPlaybackController(0, jest.fn())).toThrow(RangeError);
  });

  // ─── State transitions ───────────────────────────────────────────────────────

  it('IDLE → play() → PLAYING', () => {
    const ctrl = createPlaybackController(5, jest.fn());
    ctrl.play();
    expect(ctrl.state).toBe('playing');
  });

  it('PLAYING → pause() → PAUSED', () => {
    const ctrl = createPlaybackController(5, jest.fn());
    ctrl.play();
    ctrl.pause();
    expect(ctrl.state).toBe('paused');
  });

  it('PAUSED → play() → PLAYING', () => {
    const ctrl = createPlaybackController(5, jest.fn());
    ctrl.play();
    ctrl.pause();
    ctrl.play();
    expect(ctrl.state).toBe('playing');
  });

  it('PLAYING → reaches last step → COMPLETED', () => {
    const ctrl = createPlaybackController(3, jest.fn());
    ctrl.play();
    // Advance through all steps: step 0 → 1 → 2 (last), then completed
    jest.advanceTimersByTime(500 * 2); // two ticks: step 1, step 2
    expect(ctrl.state).toBe('completed');
    expect(ctrl.currentStep).toBe(2);
  });

  it('PLAYING → restart() → IDLE at step 0', () => {
    const ctrl = createPlaybackController(5, jest.fn());
    ctrl.play();
    jest.advanceTimersByTime(500);
    ctrl.restart();
    expect(ctrl.state).toBe('idle');
    expect(ctrl.currentStep).toBe(0);
  });

  it('PAUSED → restart() → IDLE at step 0', () => {
    const ctrl = createPlaybackController(5, jest.fn());
    ctrl.play();
    ctrl.pause();
    ctrl.restart();
    expect(ctrl.state).toBe('idle');
    expect(ctrl.currentStep).toBe(0);
  });

  it('COMPLETED → restart() → IDLE at step 0', () => {
    const ctrl = createPlaybackController(2, jest.fn());
    ctrl.play();
    jest.advanceTimersByTime(500); // step 1 → completed
    expect(ctrl.state).toBe('completed');
    ctrl.restart();
    expect(ctrl.state).toBe('idle');
    expect(ctrl.currentStep).toBe(0);
  });

  it('play() is a no-op when already PLAYING', () => {
    const ctrl = createPlaybackController(5, jest.fn());
    ctrl.play();
    ctrl.play(); // should not throw or change state
    expect(ctrl.state).toBe('playing');
  });

  it('play() is a no-op when COMPLETED', () => {
    const ctrl = createPlaybackController(2, jest.fn());
    ctrl.play();
    jest.advanceTimersByTime(500);
    expect(ctrl.state).toBe('completed');
    ctrl.play();
    expect(ctrl.state).toBe('completed');
  });

  it('pause() is a no-op when IDLE', () => {
    const ctrl = createPlaybackController(5, jest.fn());
    ctrl.pause();
    expect(ctrl.state).toBe('idle');
  });

  // ─── Auto-advance ────────────────────────────────────────────────────────────

  it('advances step on each interval tick', () => {
    const onStep = jest.fn();
    const ctrl = createPlaybackController(5, onStep);
    ctrl.play();
    jest.advanceTimersByTime(500);
    expect(ctrl.currentStep).toBe(1);
    expect(onStep).toHaveBeenCalledWith(1);
    jest.advanceTimersByTime(500);
    expect(ctrl.currentStep).toBe(2);
  });

  it('does not advance past last step', () => {
    const ctrl = createPlaybackController(3, jest.fn());
    ctrl.play();
    jest.advanceTimersByTime(500 * 10); // many ticks
    expect(ctrl.currentStep).toBe(2);
    expect(ctrl.state).toBe('completed');
  });

  it('stops advancing after pause', () => {
    const ctrl = createPlaybackController(5, jest.fn());
    ctrl.play();
    jest.advanceTimersByTime(500);
    ctrl.pause();
    jest.advanceTimersByTime(500 * 5);
    expect(ctrl.currentStep).toBe(1);
  });

  // ─── stepForward / stepBackward ──────────────────────────────────────────────

  it('stepForward increments currentStep', () => {
    const onStep = jest.fn();
    const ctrl = createPlaybackController(5, onStep);
    ctrl.stepForward();
    expect(ctrl.currentStep).toBe(1);
    expect(onStep).toHaveBeenCalledWith(1);
  });

  it('stepForward clamps at last step', () => {
    const ctrl = createPlaybackController(3, jest.fn());
    ctrl.stepForward();
    ctrl.stepForward();
    ctrl.stepForward(); // already at 2 (last)
    expect(ctrl.currentStep).toBe(2);
  });

  it('stepBackward decrements currentStep', () => {
    const onStep = jest.fn();
    const ctrl = createPlaybackController(5, onStep);
    ctrl.stepForward();
    ctrl.stepForward();
    ctrl.stepBackward();
    expect(ctrl.currentStep).toBe(1);
    expect(onStep).toHaveBeenLastCalledWith(1);
  });

  it('stepBackward clamps at step 0', () => {
    const ctrl = createPlaybackController(5, jest.fn());
    ctrl.stepBackward(); // already at 0
    expect(ctrl.currentStep).toBe(0);
  });

  it('stepForward to last step while playing transitions to COMPLETED', () => {
    const ctrl = createPlaybackController(2, jest.fn());
    ctrl.play();
    ctrl.stepForward(); // step 0 → 1 (last)
    expect(ctrl.currentStep).toBe(1);
    expect(ctrl.state).toBe('completed');
  });

  it('stepForward and stepBackward work in PAUSED state', () => {
    const ctrl = createPlaybackController(5, jest.fn());
    ctrl.play();
    ctrl.pause();
    ctrl.stepForward();
    expect(ctrl.currentStep).toBe(1);
    ctrl.stepBackward();
    expect(ctrl.currentStep).toBe(0);
  });

  it('stepForward and stepBackward work in COMPLETED state', () => {
    const ctrl = createPlaybackController(3, jest.fn());
    ctrl.play();
    jest.advanceTimersByTime(500 * 2);
    expect(ctrl.state).toBe('completed');
    ctrl.stepBackward();
    expect(ctrl.currentStep).toBe(1);
    ctrl.stepForward();
    expect(ctrl.currentStep).toBe(2);
  });

  // ─── setSpeed ────────────────────────────────────────────────────────────────

  it('default speed is 500ms per step', () => {
    const onStep = jest.fn();
    const ctrl = createPlaybackController(5, onStep);
    ctrl.play();
    jest.advanceTimersByTime(499);
    expect(onStep).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onStep).toHaveBeenCalledTimes(1);
  });

  it('setSpeed changes the interval duration', () => {
    const onStep = jest.fn();
    const ctrl = createPlaybackController(5, onStep);
    ctrl.setSpeed(200);
    ctrl.play();
    jest.advanceTimersByTime(200);
    expect(onStep).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(200);
    expect(onStep).toHaveBeenCalledTimes(2);
  });

  it('setSpeed while playing restarts interval at new speed', () => {
    const onStep = jest.fn();
    const ctrl = createPlaybackController(5, onStep);
    ctrl.play();
    jest.advanceTimersByTime(500);
    expect(onStep).toHaveBeenCalledTimes(1);
    ctrl.setSpeed(1000);
    jest.advanceTimersByTime(500);
    // Should NOT have advanced yet (new interval is 1000ms)
    expect(onStep).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(500);
    expect(onStep).toHaveBeenCalledTimes(2);
  });

  // ─── onStep callback ─────────────────────────────────────────────────────────

  it('restart calls onStep with 0', () => {
    const onStep = jest.fn();
    const ctrl = createPlaybackController(5, onStep);
    ctrl.stepForward();
    ctrl.restart();
    expect(onStep).toHaveBeenLastCalledWith(0);
  });

  it('currentStep never goes below 0', () => {
    const ctrl = createPlaybackController(5, jest.fn());
    for (let i = 0; i < 10; i++) ctrl.stepBackward();
    expect(ctrl.currentStep).toBe(0);
  });

  it('currentStep never exceeds totalSteps - 1', () => {
    const ctrl = createPlaybackController(3, jest.fn());
    for (let i = 0; i < 10; i++) ctrl.stepForward();
    expect(ctrl.currentStep).toBe(2);
  });
});
