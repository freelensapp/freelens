/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useState } from "react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Slider } from "../../../../../../renderer/components/slider";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import { defaultZoom, isZoomStep, zoomSteps } from "../../../../../zoom/common/zoom-steps";

import type { SliderMark } from "../../../../../../renderer/components/slider";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
}

// A mark at every step, so that the thumb snaps to them; only the default is labelled.
const zoomMarks: SliderMark[] = zoomSteps.map((step) => ({
  value: step,
  label: step === defaultZoom ? `${step}%` : undefined,
}));

const NonInjectedZoom = observer(({ state }: Dependencies) => {
  // The value under the thumb while it is dragged. The zoom is applied only on release:
  // zooming the window under the pointer would move the slider itself.
  const [dragged, setDragged] = useState<number>();
  const shown = dragged ?? state.zoom;

  const setZoom = (zoom: number) => {
    setDragged(undefined);
    state.zoom = isZoomStep(zoom) ? zoom : defaultZoom;
  };

  return (
    <section id="zoom">
      <SubTitle title="Zoom" />
      <div className="flex items-center gap-4">
        <Slider
          className="flex-1"
          min={zoomSteps[0]}
          max={zoomSteps[zoomSteps.length - 1]}
          step={null}
          marks={zoomMarks}
          value={shown}
          onChange={(_event, value) => setDragged(value)}
          onChangeCommitted={(_event, value) => setZoom(value)}
        />
        <span className="w-12 text-right" data-testid="zoom-value">
          {`${shown}%`}
        </span>
        <Button
          outlined
          label="Reset"
          disabled={shown === defaultZoom}
          onClick={() => setZoom(defaultZoom)}
          data-testid="zoom-reset"
        />
      </div>
      <small className="hint">
        Applies to every window. Zoom In, Zoom Out and Actual Size in the View menu change it too.
      </small>
    </section>
  );
});

export const Zoom = withInjectables<Dependencies>(NonInjectedZoom, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
