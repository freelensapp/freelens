import { getStartableStoppable } from "./get-startable-stoppable";

import type { MockedFunction } from "vitest";

import type { StartableStoppable } from "./get-startable-stoppable";

describe("getStartableStoppable", () => {
  let stopMock: MockedFunction<() => void>;
  let startMock: MockedFunction<() => () => void>;
  let actual: StartableStoppable;

  beforeEach(() => {
    stopMock = vi.fn();
    startMock = vi.fn().mockImplementation(() => stopMock);
    actual = getStartableStoppable("some-id", startMock);
  });

  it("does not start yet", () => {
    expect(startMock).not.toHaveBeenCalled();
  });

  it("does not stop yet", () => {
    expect(stopMock).not.toHaveBeenCalled();
  });

  it("when stopping before ever starting, throws", () => {
    expect(() => actual.stop()).toThrow('Tried to stop "some-id", but it is already stopped.');
  });

  it("is not started", () => {
    expect(actual.started).toBe(false);
  });

  describe("when started", () => {
    beforeEach(() => {
      actual.start();
    });

    it("calls start function", () => {
      expect(startMock).toHaveBeenCalled();
    });

    it("is started", () => {
      expect(actual.started).toBe(true);
    });

    it("when started again, throws", () => {
      expect(() => actual.start()).toThrow('Tried to start "some-id", but it is already started.');
    });

    describe("when stopped", () => {
      beforeEach(() => {
        actual.stop();
      });

      it("calls stop function", () => {
        expect(stopMock).toBeCalled();
      });

      it("is stopped", () => {
        expect(actual.started).toBe(false);
      });
    });
  });
});
