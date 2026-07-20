import { getInjectable, getInjectionToken } from "@ogre-tools/injectable";
import { createRoot } from "react-dom/client";

import type React from "react";
import type { Root } from "react-dom/client";

export type ReactRoot = {
  render: (container: Element, application: React.ReactElement) => void;
  unmount: (container: Element) => void;
};

export const reactRootInjectionToken = getInjectionToken<ReactRoot>({
  id: "react-root-injection-token",
});

const reactRootInjectable = getInjectable({
  id: "react-root",

  /* c8 ignore start */
  instantiate: (): ReactRoot => {
    const roots = new WeakMap<Element, Root>();

    const getRoot = (container: Element): Root => {
      let root = roots.get(container);

      if (!root) {
        root = createRoot(container);
        roots.set(container, root);
      }

      return root;
    };

    return {
      render: (container, application) => getRoot(container).render(application),
      unmount: (container) => {
        const root = roots.get(container);

        if (root) {
          root.unmount();
          roots.delete(container);
        }
      },
    };
  },
  /* c8 ignore stop */

  causesSideEffects: true,

  injectionToken: reactRootInjectionToken,
});

export default reactRootInjectable;
