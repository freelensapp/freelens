/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useState } from "react";
import { maxConcurrentLogRequests } from "../../../../../../renderer/components/dock/logs/merge-pod-logs";
import { Input } from "../../../../../../renderer/components/input";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import {
  clampMaxCombinedLogsPods,
  maxMaxCombinedLogsPods,
  minMaxCombinedLogsPods,
} from "../../../../../user-preferences/common/preferences-helpers";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
}

const NonInjectedCombinedLogsPods = observer(({ state }: Dependencies) => {
  const storedValue = clampMaxCombinedLogsPods(state.logViewerPreferences.maxCombinedLogsPods);
  // The text of the input is kept apart from the preference, so that the
  // field can be cleared to type another number. A number outside the range is
  // stored clamped, and leaving the field shows what was stored.
  const [text, setText] = useState(storedValue.toString());

  const onChange = (value: string) => {
    setText(value);

    const number = Number(value);

    if (value.trim() !== "" && Number.isFinite(number)) {
      state.logViewerPreferences = {
        ...state.logViewerPreferences,
        maxCombinedLogsPods: clampMaxCombinedLogsPods(number),
      };
    }
  };

  return (
    <section id="logs">
      <h2>Logs</h2>
      <SubTitle title="Pods in a combined logs tab" />
      <Input
        theme="round-black"
        type="number"
        min={minMaxCombinedLogsPods}
        max={maxMaxCombinedLogsPods}
        step={1}
        value={text}
        onChange={onChange}
        onBlur={() => setText(storedValue.toString())}
        data-testid="max-combined-logs-pods-input"
      />
      <div className="hint">
        {`The Logs of a Deployment, DaemonSet, StatefulSet, ReplicaSet or Job read at most this many of its pods, the first ones by name, from ${minMaxCombinedLogsPods} to ${maxMaxCombinedLogsPods}. Every refresh of the tab, every 10 seconds, asks each of these pods for its lines, at most ${maxConcurrentLogRequests} at a time.`}
      </div>
    </section>
  );
});

export const CombinedLogsPods = withInjectables<Dependencies>(NonInjectedCombinedLogsPods, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
