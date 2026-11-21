# Custom extension dock tabs

An extension can place React content beside Terminal and Pod Logs. It
registers a content type and opens instances; Freelens owns the native header,
selection, close actions, dock size and per-cluster storage. This requires a
host build and SDK declarations containing `dockTabs` and `openDockTab`.
Setting `engines.freelens` alone does not add the API to a host without it.

```tsx
import { Renderer } from "@freelensapp/extensions";
import React, { useEffect } from "react";

function TargetSummary({ tabId, params, close }: Renderer.ExtensionDockTabProps) {
  useEffect(() => {
    // Start work for this visible mount, after validating your target schema.
    return () => {
      // Stop timers, subscriptions and watches; ignore stale async results.
    };
  }, [tabId]);

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

Freelens mounts content only while selected, the dock is expanded, the type is
enabled, the hosting cluster's catalog status is active, and the document is
visible. Switching tabs or clusters, minimizing the dock or window, or
disabling the contribution ends that mount. Catalog visibility synchronization
is asynchronous. Local React state resets on the next mount; keep durable view
state in your own store keyed by `tabId` when necessary. The host isolates a
throwing instance with an error boundary, so other tabs remain usable.

Effect cleanup owns work started by that mount. The host cannot cancel timers
or requests started elsewhere by your extension. Keep credentials out of saved
parameters and clean up extension-wide work in `onDeactivate`.

The full public contract is [C6](./api.md#c6-registration-and-the-extension-instance).
