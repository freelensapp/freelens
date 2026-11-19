/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, fireEvent, render as renderOutsideTheHost } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { renderFor } from "../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import { Renderer } from "../extension-api";

import type { DiRender } from "../../renderer/components/test-utils/renderFor";

// The generic components the host's views are built from, as an extension
// renders them, through `Renderer.Component`.
describe("the generic components of Renderer.Component", () => {
  const {
    Animate,
    ColorSwatch,
    ColorSwatchGroup,
    CustomColorSwatch,
    ErrorBoundary,
    OrderableItem,
    OrderableList,
    ResizeDirection,
    ResizeSide,
    ResizingAnchor,
    VirtualList,
  } = Renderer.Component;
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-user-data");
    render = renderFor(di);
  });

  describe("ErrorBoundary", () => {
    const Crash = ({ crash }: { crash: boolean }) => {
      if (crash) {
        throw new Error("some-error");
      }

      return <div data-testid="child">some-child</div>;
    };

    beforeEach(() => {
      // React reports the error that the boundary catches.
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("renders its children while they do not crash", () => {
      const result = render(
        <ErrorBoundary>
          <Crash crash={false} />
        </ErrorBoundary>,
      );

      expect(result.getByTestId("child")).toHaveTextContent("some-child");
    });

    it("shows the crash of its children under its global class, until its reset key changes", () => {
      const result = render(
        <ErrorBoundary resetKey="some-key">
          <Crash crash={true} />
        </ErrorBoundary>,
      );

      expect(result.container.querySelector(".ErrorBoundary")).toHaveTextContent("some-error");

      result.rerender(
        <ErrorBoundary resetKey="other-key">
          <Crash crash={false} />
        </ErrorBoundary>,
      );

      expect(result.container.querySelector(".ErrorBoundary")).toBeNull();
      expect(result.getByTestId("child")).toBeInTheDocument();
    });
  });

  describe("Animate", () => {
    it("renders its child with the global class of the animation and its durations", () => {
      const onEnter = vi.fn();
      const result = render(
        <Animate name="opacity-scale" enterDuration={50} leaveDuration={150} onEnter={onEnter}>
          <div data-testid="animated" className="some-class" />
        </Animate>,
      );
      const animated = result.getByTestId("animated");

      expect(animated).toHaveClass("Animate", "opacity-scale", "some-class", "enter");
      expect(animated.style.getPropertyValue("--enter-duration")).toBe("50ms");
      expect(animated.style.getPropertyValue("--leave-duration")).toBe("150ms");
      expect(onEnter).toHaveBeenCalled();
    });

    it("renders its child with the host's default durations when it is given none", () => {
      const result = render(
        <Animate>
          <div data-testid="animated" />
        </Animate>,
      );
      const animated = result.getByTestId("animated");

      expect(animated).toHaveClass("Animate", "opacity");
      expect(animated.style.getPropertyValue("--enter-duration")).toBe("100ms");
      expect(animated.style.getPropertyValue("--leave-duration")).toBe("100ms");
    });

    it("throws when it is rendered outside the host's React tree", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() =>
        renderOutsideTheHost(
          <Animate>
            <div />
          </Animate>,
        ),
      ).toThrow();

      vi.restoreAllMocks();
    });

    it("renders nothing while it is not entered", () => {
      const result = render(
        <Animate enter={false}>
          <div data-testid="animated" />
        </Animate>,
      );

      expect(result.queryByTestId("animated")).toBeNull();
    });
  });

  describe("ResizingAnchor", () => {
    it("reports a drag under its global classes", () => {
      const onStart = vi.fn();
      const onEnd = vi.fn();
      const result = render(
        <ResizingAnchor
          direction={ResizeDirection.HORIZONTAL}
          placement={ResizeSide.TRAILING}
          getCurrentExtent={() => 100}
          onStart={onStart}
          onEnd={onEnd}
        />,
      );
      const anchor = result.container.querySelector(".ResizingAnchor");

      expect(anchor).toHaveClass("horizontal", "trailing");

      fireEvent.mouseDown(anchor!);

      expect(onStart).toHaveBeenCalled();
      expect(anchor).toHaveClass("resizing");

      fireEvent.mouseUp(document);

      expect(onEnd).toHaveBeenCalled();
      expect(anchor).not.toHaveClass("resizing");
    });
  });

  describe("the color swatches", () => {
    it("show a color or a text, and which one is selected, under their global classes", () => {
      const onClick = vi.fn();
      const result = render(
        <ColorSwatchGroup label="Some color">
          <ColorSwatch color="#ff0000" selected={true} aria-label="Red" data-testid="red" />
          <ColorSwatch selected={false} onClick={onClick} data-testid="text">
            Some text
          </ColorSwatch>
        </ColorSwatchGroup>,
      );

      expect(result.getByRole("group", { name: "Some color" })).toHaveClass("ColorSwatchGroup");
      expect(result.getByTestId("red")).toHaveClass("ColorSwatch");
      expect(result.getByTestId("red")).toHaveAttribute("aria-pressed", "true");
      expect(result.getByTestId("red")).not.toHaveAttribute("data-text");
      expect(result.getByTestId("text")).toHaveClass("ColorSwatch");
      expect(result.getByTestId("text")).toHaveAttribute("aria-pressed", "false");
      expect(result.getByTestId("text")).toHaveAttribute("data-text");

      result.getByTestId("text").click();

      expect(onClick).toHaveBeenCalled();
    });

    it("commit the hex code entered in the panel of CustomColorSwatch, under its global classes", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const result = render(<CustomColorSwatch value={undefined} onChange={onChange} data-testid="custom" />);

      expect(result.getByTestId("custom")).toHaveAttribute("aria-pressed", "false");

      await user.click(result.getByTestId("custom"));

      expect(result.getByTestId("custom-panel")).toHaveClass("CustomColorSwatch-panel");
      expect(result.getByTestId("custom-hex")).toHaveClass("CustomColorSwatch-hex");

      await user.clear(result.getByTestId("custom-hex"));
      await user.type(result.getByTestId("custom-hex"), "123456{Enter}");

      expect(onChange).toHaveBeenLastCalledWith("#123456");
    });
  });

  describe("OrderableList", () => {
    it("renders each of its children in an item, in their order, under their global classes", () => {
      const result = render(
        <OrderableList className="some-class" onReorder={() => {}}>
          {["first", "second", "third"].map((name) => (
            <div key={name} data-testid={name}>
              {name}
            </div>
          ))}
        </OrderableList>,
      );
      const list = result.container.querySelector(".OrderableList");

      expect(list).toHaveClass("some-class");
      expect([...list!.querySelectorAll(".OrderableItem")].map((item) => item.textContent)).toEqual([
        "first",
        "second",
        "third",
      ]);
    });

    it("shows the element of an OrderableItem outside a list", () => {
      const result = render(<OrderableItem id="some-id" item={<div data-testid="item" />} />);

      expect(result.getByTestId("item").parentElement).toHaveClass("OrderableItem");
    });
  });

  describe("VirtualList", () => {
    it("renders the rows of its items under its global class, and scrolls to one through its ref", () => {
      const ref = createRef<Renderer.Component.VirtualListRef>();
      const items = [...new Array(100)].map((_, index) => `some-item-${index}`);
      const result = render(
        <VirtualList
          ref={ref}
          className="some-class"
          items={items}
          rowHeights={items.map(() => 15)}
          fixedHeight={45}
          getRow={(index) => <div data-testid={`row-${index}`}>{items[index]}</div>}
        />,
      );

      expect(result.container.querySelector(".VirtualList")).toHaveClass("some-class");
      expect(result.getByTestId("row-0")).toHaveTextContent("some-item-0");

      act(() => ref.current?.scrollToItem(50, "center"));
    });
  });
});
