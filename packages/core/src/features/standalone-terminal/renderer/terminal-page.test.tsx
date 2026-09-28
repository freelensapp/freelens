/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { fireEvent } from "@testing-library/react";
import createStandaloneTerminalApiInjectable from "../../../renderer/api/create-standalone-terminal-api.injectable";
import createTerminalInjectable from "../../../renderer/components/dock/terminal/create-terminal.injectable";
import { renderFor } from "../../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../../renderer/getDiForUnitTesting";
import lensLocalStorageStateInjectable from "../../../renderer/utils/create-storage/state.injectable";
import tabsStoreInjectable from "./tabs-store.injectable";
import { TerminalPage } from "./terminal-page";

import type { DiContainer } from "@ogre-tools/injectable";
import type { RenderResult } from "@testing-library/react";
import type { Mock } from "vitest";

import type { TerminalApi } from "../../../renderer/api/terminal-api";
import type { Terminal } from "../../../renderer/components/dock/terminal/terminal";
import type { DiRender } from "../../../renderer/components/test-utils/renderFor";

describe("the terminal page", () => {
  let di: DiContainer;
  let render: DiRender;
  let terminals: Map<string, { attachTo: Mock; detach: Mock; destroy: Mock; onResize: Mock }>;
  let apis: Map<string, { connect: Mock; destroy: Mock }>;

  beforeEach(() => {
    di = getDiForUnitTesting();
    terminals = new Map();
    apis = new Map();

    di.override(createStandaloneTerminalApiInjectable, () => (tabId: string) => {
      const api = { connect: vi.fn(), destroy: vi.fn(), isReady: false };

      apis.set(tabId, api);

      return api as Partial<TerminalApi> as TerminalApi;
    });

    di.override(createTerminalInjectable, () => (tabId: string) => {
      const terminal = { attachTo: vi.fn(), detach: vi.fn(), destroy: vi.fn(), onResize: vi.fn() };

      terminals.set(tabId, terminal);

      return terminal as Partial<Terminal> as Terminal;
    });

    render = renderFor(di);
  });

  const openTabIds = () => [...terminals.keys()];

  describe("when opened for the first time", () => {
    let rendered: RenderResult;

    beforeEach(() => {
      rendered = render(<TerminalPage />);
    });

    it("opens a shell for its only tab", () => {
      expect(openTabIds()).toHaveLength(1);
      expect(apis.get(openTabIds()[0])?.connect).toHaveBeenCalled();
      expect(terminals.get(openTabIds()[0])?.attachTo).toHaveBeenCalled();
    });

    it("keeps the shell running when the page goes away, only detaching it", () => {
      const [tabId] = openTabIds();

      rendered.unmount();

      expect(terminals.get(tabId)?.detach).toHaveBeenCalled();
      expect(terminals.get(tabId)?.destroy).not.toHaveBeenCalled();
      expect(apis.get(tabId)?.destroy).not.toHaveBeenCalled();
    });

    it("reattaches to the same shell when the page is opened again", () => {
      const [tabId] = openTabIds();

      rendered.unmount();
      render(<TerminalPage />);

      expect(openTabIds()).toEqual([tabId]);
      expect(apis.get(tabId)?.connect).toHaveBeenCalledTimes(1);
    });

    it("tears the shell down when its tab is closed", () => {
      const [tabId] = openTabIds();

      fireEvent.click(rendered.getByTestId(`close-standalone-terminal-tab-${tabId}`));

      expect(terminals.get(tabId)?.destroy).toHaveBeenCalled();
      expect(apis.get(tabId)?.destroy).toHaveBeenCalled();
    });

    it("opens a shell per added tab", () => {
      fireEvent.click(rendered.getByTestId("add-standalone-terminal-tab"));

      expect(openTabIds()).toHaveLength(2);
    });
  });

  describe("given tabs persisted by a previous run", () => {
    beforeEach(() => {
      di.inject(lensLocalStorageStateInjectable)["standalone-terminals"] = {
        tabs: [
          { id: "some-tab-id", title: "Terminal 1" },
          { id: "some-other-tab-id", title: "Terminal 2" },
        ],
        selectedTabId: "some-other-tab-id",
      };
    });

    it("restores the list, and its selection, on a fresh store", () => {
      const tabsStore = di.inject(tabsStoreInjectable);

      expect(tabsStore.tabs.map((tab) => tab.id)).toEqual(["some-tab-id", "some-other-tab-id"]);
      expect(tabsStore.selectedTab?.id).toBe("some-other-tab-id");
    });

    it("opens a shell only for the tab that is shown", () => {
      render(<TerminalPage />);

      expect(openTabIds()).toEqual(["some-other-tab-id"]);
    });
  });
});
