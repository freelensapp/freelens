/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useRef, useState } from "react";
import defaultShellInjectable from "../../../../../../common/vars/default-shell.injectable";
import { Input } from "../../../../../../renderer/components/input";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import requestTerminalShellLookupInjectable from "../../../../../terminal-shell-lookup/renderer/request-terminal-shell-lookup.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { TerminalShellLookup } from "../../../../../terminal-shell-lookup/common/channels";
import type { RequestTerminalShellLookup } from "../../../../../terminal-shell-lookup/renderer/request-terminal-shell-lookup.injectable";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  defaultShell: string;
  requestTerminalShellLookup: RequestTerminalShellLookup;
}

const NonInjectedTerminalShellPath = observer(({ state, defaultShell, requestTerminalShellLookup }: Dependencies) => {
  const [lookup, setLookup] = useState<TerminalShellLookup>();
  // Only the answer to the latest lookup is shown, whatever order the answers come back in
  const latestLookup = useRef(0);

  const lookUpShell = async () => {
    const thisLookup = ++latestLookup.current;
    let result: TerminalShellLookup | undefined;

    try {
      result = await requestTerminalShellLookup(state.shell ?? "");
    } catch {
      result = undefined;
    }

    if (thisLookup === latestLookup.current) {
      setLookup(result);
    }
  };

  return (
    <section id="shell">
      <SubTitle title="Terminal Shell Path" />
      <Input
        theme="round-black"
        placeholder={defaultShell}
        value={state.shell ?? ""}
        onChange={(value) => (state.shell = value)}
        onBlur={() => void lookUpShell()}
      />
      {lookup && (
        <div className="hint" data-testid="terminal-shell-lookup">
          {lookup.path
            ? `Terminals start ${lookup.path}.`
            : `"${lookup.shell}" was not found, so terminals cannot start it. Give the full path of a shell, or the name of one on the PATH.`}
        </div>
      )}
    </section>
  );
});

export const TerminalShellPath = withInjectables<Dependencies>(NonInjectedTerminalShellPath, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    defaultShell: di.inject(defaultShellInjectable),
    requestTerminalShellLookup: di.inject(requestTerminalShellLookupInjectable),
  }),
});
