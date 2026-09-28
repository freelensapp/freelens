/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import userPreferencesStateInjectable from "../../../../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import { renderFor } from "../../../test-utils/renderFor";
import { LogTabViewModel } from "../logs-view-model";
import { LogSearch } from "../search";
import { dockerPod } from "./pod.mock";
import {
  createMockLogTabViewModel,
  getDefaultOnePodLogTabData,
  initializeDefaultLogViewerPreferences,
} from "./test-utils";

import type { UserEvent } from "@testing-library/user-event";

import type { UserPreferencesState } from "../../../../../features/user-preferences/common/state.injectable";
import type { DiRender } from "../../../test-utils/renderFor";
import type { TabId } from "../../dock/store";
import type { LogTabViewModelDependencies } from "../logs-view-model";

const getOnePodViewModel = (
  tabId: TabId,
  userPreferencesState: UserPreferencesState,
  deps: Partial<LogTabViewModelDependencies> = {},
): LogTabViewModel => {
  const selectedPod = dockerPod;

  return createMockLogTabViewModel(tabId, userPreferencesState, {
    getLogTabData: () => getDefaultOnePodLogTabData(),
    getPodById: (id) => {
      if (id === selectedPod.getId()) {
        return selectedPod;
      }

      return undefined;
    },
    ...deps,
  });
};

describe("LogSearch tests", () => {
  let render: DiRender;
  let user: UserEvent;
  let userPreferencesState: UserPreferencesState;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);

    user = userEvent.setup();
    userPreferencesState = di.inject(userPreferencesStateInjectable);
    initializeDefaultLogViewerPreferences(userPreferencesState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders w/o errors", () => {
    const model = getOnePodViewModel("foobar", userPreferencesState);
    const { container } = render(<LogSearch model={model} scrollToOverlay={vi.fn()} />);

    expect(container).toBeInstanceOf(HTMLElement);
  });

  it("should scroll to new active overlay when clicking the previous button", async () => {
    const scrollToOverlay = vi.fn();
    const model = getOnePodViewModel("foobar", userPreferencesState, {
      getLogsWithoutTimestamps: () => ["hello", "world"],
    });

    render(<LogSearch model={model} scrollToOverlay={scrollToOverlay} />);

    await user.click(await screen.findByPlaceholderText("Search..."));
    await user.keyboard("o");
    await user.click(await screen.findByText("keyboard_arrow_up"));
    expect(scrollToOverlay).toBeCalled();
  });

  it("should scroll to new active overlay when clicking the next button", async () => {
    const scrollToOverlay = vi.fn();
    const model = getOnePodViewModel("foobar", userPreferencesState, {
      getLogsWithoutTimestamps: () => ["hello", "world"],
    });

    render(<LogSearch model={model} scrollToOverlay={scrollToOverlay} />);

    await user.click(await screen.findByPlaceholderText("Search..."));
    await user.keyboard("o");
    await user.click(await screen.findByText("keyboard_arrow_down"));
    expect(scrollToOverlay).toBeCalled();
  });

  it("next and previous should be disabled initially", async () => {
    const scrollToOverlay = vi.fn();
    const model = getOnePodViewModel("foobar", userPreferencesState, {
      getLogsWithoutTimestamps: () => ["hello", "world"],
    });

    render(<LogSearch model={model} scrollToOverlay={scrollToOverlay} />);

    await user.click(await screen.findByText("keyboard_arrow_down"));
    await user.click(await screen.findByText("keyboard_arrow_up"));
    expect(scrollToOverlay).not.toBeCalled();
  });

  it.each([
    { label: "ctrl+f", eventInit: { key: "f", ctrlKey: true } },
    { label: "cmd+f", eventInit: { key: "f", metaKey: true } },
  ])("should prefill search on $label when selection is inside pod logs list", async ({ eventInit }) => {
    const scrollToOverlay = vi.fn();
    const model = getOnePodViewModel("foobar", userPreferencesState, {
      getLogsWithoutTimestamps: () => ["hello", "world"],
    });

    render(
      <div className="PodLogs">
        <div className="LogList">
          <span data-testid="selection-source">hello</span>
        </div>
        <LogSearch model={model} scrollToOverlay={scrollToOverlay} />
      </div>,
    );

    const selectionSource = screen.getByTestId("selection-source").firstChild;

    vi.spyOn(window, "getSelection").mockReturnValue({
      anchorNode: selectionSource,
      focusNode: selectionSource,
      toString: () => "hello",
    } as Selection);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", eventInit));
    });

    expect(await screen.findByPlaceholderText("Search...")).toHaveValue("hello");
    expect(scrollToOverlay).toHaveBeenCalled();
  });

  it("should not prefill search on ctrl+f when selection is outside pod logs list", async () => {
    const scrollToOverlay = vi.fn();
    const model = getOnePodViewModel("foobar", userPreferencesState, {
      getLogsWithoutTimestamps: () => ["hello", "world"],
    });

    render(
      <div>
        <div data-testid="outside-selection-source">hello</div>
        <div className="PodLogs">
          <div className="LogList" />
          <LogSearch model={model} scrollToOverlay={scrollToOverlay} />
        </div>
      </div>,
    );

    const search = await screen.findByPlaceholderText("Search...");

    await user.click(search);
    await user.keyboard("o");

    const outsideSelectionSource = screen.getByTestId("outside-selection-source").firstChild;

    vi.spyOn(window, "getSelection").mockReturnValue({
      anchorNode: outsideSelectionSource,
      focusNode: outsideSelectionSource,
      toString: () => "hello",
    } as Selection);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "f", ctrlKey: true }));
    });

    expect(search).toHaveValue("o");
  });

  it("should keep existing query on ctrl+f when selection is empty", async () => {
    const scrollToOverlay = vi.fn();
    const model = getOnePodViewModel("foobar", userPreferencesState, {
      getLogsWithoutTimestamps: () => ["hello", "world"],
    });

    render(
      <div className="PodLogs">
        <div className="LogList">
          <span data-testid="selection-source">hello</span>
        </div>
        <LogSearch model={model} scrollToOverlay={scrollToOverlay} />
      </div>,
    );

    const search = await screen.findByPlaceholderText("Search...");

    await user.click(search);
    await user.keyboard("o");

    const selectionSource = screen.getByTestId("selection-source").firstChild;

    vi.spyOn(window, "getSelection").mockReturnValue({
      anchorNode: selectionSource,
      focusNode: selectionSource,
      toString: () => "",
    } as Selection);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "f", ctrlKey: true }));
    });

    expect(search).toHaveValue("o");
  });
});
