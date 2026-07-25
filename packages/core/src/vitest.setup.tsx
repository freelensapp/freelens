/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { TextDecoder as TextDecoderNode, TextEncoder } from "node:util";
import { enableMapSet, setAutoFreeze } from "immer";
import { configure } from "mobx";
import freelensFetch from "node-fetch";

import type * as K8slensTooltip from "@freelensapp/tooltip";

configure({
  // Needed because we want to use vi.spyOn()
  // ref https://github.com/mobxjs/mobx/issues/2784
  safeDescriptors: false,
  enforceActions: "never",
});

setAutoFreeze(false); // allow to merge mobx observables
enableMapSet(); // allow to merge maps and sets

process.on("unhandledRejection", (err: any) => {
  console.error(err ?? "Test failed without explicit error");
});

global.fetch = freelensFetch as unknown as typeof fetch;

global.TextEncoder = TextEncoder as unknown as typeof global.TextEncoder;
global.TextDecoder = TextDecoderNode as unknown as typeof TextDecoder;

global.ResizeObserver = class {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
};

vi.mock("./renderer/components/monaco-editor/monaco-editor");
vi.mock("@freelensapp/tooltip", async (importOriginal) => ({
  ...(await importOriginal<typeof K8slensTooltip>()),
  withTooltip: ((Target) =>
    ({ tooltip, tooltipOverrideDisabled, ...props }: any) => {
      if (tooltip) {
        const testId = props["data-testid"];

        return (
          <>
            <Target {...props} />
            <div data-testid={testId && `tooltip-content-for-${testId}`}>{tooltip.children || tooltip}</div>
          </>
        );
      }

      return <Target {...props} />;
    }) as typeof K8slensTooltip.withTooltip,
}));
// monaco-editor is replaced with __mocks__/monaco-editor.ts through a resolve
// alias in the root vitest.config.ts: its package has no Node-resolvable
// entry, so neither externalization nor vi.mock automocking can load it.
//
// The injectable files for getDiForUnitTesting are collected with
// import.meta.glob inside src/{main,renderer}/getDiForUnitTesting themselves,
// so they load through Vite's transform pipeline instead of native require.
