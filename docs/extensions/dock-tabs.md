# Custom extension dock tabs

An extension can place React content beside Terminal and Pod Logs. It
registers a content type and opens instances; Freelens owns the native header,
selection, close actions, dock size and per-cluster storage. This requires a
host build and SDK declarations containing `dockTabs` and `openDockTab`.
Setting `engines.freelens` alone does not add the API to a host without it.

```tsx
import { Renderer } from "@freelensapp/extensions";
import React from "react";

function TargetSummary({ params, close }: Renderer.ExtensionDockTabProps) {
  return (
    <div>
      {String(params.pod)} <button onClick={close}>Close</button>
    </div>
  );
}

export default class MyExtension extends Renderer.LensExtension {
  dockTabs: Renderer.DockTabRegistration[] = [
    { id: "target-summary", title: "Target summary", components: { Tab: TargetSummary } },
  ];

  openTarget(namespace: string, pod: string, podUid: string) {
    return this.openDockTab("target-summary", {
      title: `Summary: ${pod}`,
      params: { namespace, pod, podUid },
    });
  }
}
```

Call `openTarget` from your own cluster-frame action after registration and
cluster eligibility have resolved. A root-frame call, pending or false cluster
eligibility, an unavailable type, an invalid title, or invalid JSON parameters
throws before adding a tab. Each successful call opens a new, independently
closable instance. Types may have an optional mobx computed `enabled`; use the host's
mobx instance as described in [C3](./api.md#c3-host-provided-singletons).

Use a stable type `id`, unique within your extension. Freelens restores the
type by exact manifest package name and local ID across reinstalls and version
changes, without persisting an installation path. Parameters must be a JSON
object containing only finite JSON values. The component receives a deeply
frozen snapshot. Keep parameters small, use resource identifiers rather than
records, and include your own parameter-schema version when needed. Validate
that schema and resource identity in the component.

A saved tab stays present when its extension is unavailable or disabled, and
recovers reactively when its contribution returns. An invalid descriptor or
unknown descriptor version displays an invalid-parameters message. Both views
retain native close actions.

Freelens mounts content while the tab is selected, the dock is expanded, the
contribution is enabled, and the hosting cluster's catalog status is active.
Closing or deselecting the tab, collapsing the dock, switching away from its
cluster, and disabling the contribution end that mount. Catalog activity updates
are asynchronous. Local React state resets on the next mount. If state needs to
last across mounts, keep it in your own store keyed by `tabId`. The host isolates
a throwing instance with an error boundary, so other tabs remain usable.

Hiding or minimizing the Freelens window does not end that mount. Draft text,
filters, and scroll position can stay where you left them. Nothing extra is
needed to let a request continue. [Electron can throttle timers in hidden
windows](https://www.electronjs.org/docs/latest/api/browser-window#page-visibility),
so don't rely on a dock view for work that must run on a strict schedule.

To pause a particular subscription while hidden, use the
[Page Visibility API](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility).
Pass a stable `subscribe` function that starts the subscription and returns its
cleanup. The effect reads the initial state, then stops or starts only that
subscription as visibility changes. It leaves the view's React state alone.

```tsx
import { useEffect } from "react";

function useVisibleSubscription(subscribe: () => () => void) {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const stop = () => {
      unsubscribe?.();
      unsubscribe = undefined;
    };

    const sync = () => {
      if (document.hidden) stop();
      else unsubscribe ??= subscribe();
    };

    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      document.removeEventListener("visibilitychange", sync);
      stop();
    };
  }, [subscribe]);
}
```

On unmount, clean up work the view started and ignore stale async results. The
host cannot cancel timers or requests started elsewhere by your extension.
Keep credentials out of saved parameters and clean up extension-wide work in
`onDeactivate`.

The full public contract is [C6](./api.md#c6-registration-and-the-extension-instance).
