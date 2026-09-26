/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The renderer entrypoint of the in-repo contract fixture. It is written the
// way a third-party extension is written — the only import that reaches into
// Freelens is `@freelensapp/extensions`, and it is compiled against the built
// `dist/extension-api.d.ts` rather than the workspace source — and it is kept
// to the four things that break silently:
//
//  1. a component with a hook, which throws "invalid hook call" under two Reacts
//  2. an observable the host has to react to, which fails *without* an error
//     under two mobx instances
//  3. one declarative registration, which only appears if the registrators and
//     the extension lifecycle both work
//  4. one `Util.fetch` call, which only resolves if the host's DI container is
//     reachable through the API namespace
//
// Everything here is asserted from
// `packages/core/src/extensions/__tests__/fixture-extension.test.tsx`.

import { Common, Renderer } from "@freelensapp/extensions";
import { computed, observable, runInAction } from "mobx";
import { useCallback, useMemo, useState } from "react";

/** The URL the fixture probes on activation. Never actually requested: the host DI serves it. */
export const FIXTURE_PROBE_URL = "https://fixture.invalid/contract-probe";

/**
 * The host-provided singletons this bundle actually resolved, so the harness can
 * compare them by identity with what the host published.
 *
 * A behavioural check alone is not enough for mobx: two copies of mobx 6 still
 * interoperate through the shared global state they both write to
 * `globalThis`, so a reaction can keep firing while the extension carries its
 * own duplicate — which is the failure the identity comparison catches and the
 * reactivity assertion does not. React has no such fallback: a second copy
 * throws "invalid hook call" the first time the host renders the component
 * below.
 *
 * No extension would export these. This one is a fixture for the contract, and
 * this is the contract.
 */
export { observable as resolvedMobxObservable } from "mobx";
export { useState as resolvedReactUseState } from "react";

/**
 * Drives the `visible` flag of the registration below.
 *
 * Created by this bundle, with the mobx the host published on the global, and
 * read by the host's own `status-bar-items` computed. If the two ever stop
 * being the same mobx, nothing throws — the host's computed simply stops
 * tracking this box and never invalidates.
 */
const statusBarItemIsVisible = observable.box(true);

/** The only way this bundle mutates the box, so the mutation goes through the fixture's mobx. */
export const setStatusBarItemVisible = (value: boolean) => {
  runInAction(() => {
    statusBarItemIsVisible.set(value);
  });
};

/** What `onActivate` recorded, observable so a host reaction can await it. */
export const activationRecord = observable.box<{ appVersion: string; probeStatus: number } | undefined>(undefined);

/**
 * A component with hooks. Under two React instances every hook here throws
 * "invalid hook call" the moment the host renders the status bar.
 */
export const FixtureStatusBarItem = () => {
  const [clicks, setClicks] = useState(0);
  const label = useMemo(() => `fixture:${clicks}`, [clicks]);
  const onClick = useCallback(() => {
    setClicks((previous) => previous + 1);
  }, []);

  return (
    <button data-testid="fixture-status-bar-item" onClick={onClick} type="button">
      {label}
    </button>
  );
};

export default class FixtureRendererExtension extends Renderer.LensExtension {
  /**
   * The declarative registration. It reaches the host only through the
   * registrator for this field plus `extension.register()`, so its presence in
   * `status-bar-items` is a statement about the lifecycle, not about this array.
   */
  statusBarItems: Common.Types.StatusBarRegistration[] = [
    {
      components: {
        Item: FixtureStatusBarItem,
        position: "right",
      },
      visible: computed(() => statusBarItemIsVisible.get()),
    },
  ];

  protected async onActivate(): Promise<void> {
    const response = await Renderer.Util.fetch(FIXTURE_PROBE_URL);

    runInAction(() => {
      activationRecord.set({
        appVersion: Common.Util.getAppVersion(),
        probeStatus: response.status,
      });
    });
  }
}
