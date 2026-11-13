/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderFor } from "../../../../../../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../../../../../../renderer/getDiForUnitTesting";
import requestTerminalShellLookupInjectable from "../../../../../../terminal-shell-lookup/renderer/request-terminal-shell-lookup.injectable";
import { TerminalShellPath } from "../terminal-shell-path";

import type { Mock } from "vitest";

import type { DiRender } from "../../../../../../../renderer/components/test-utils/renderFor";
import type { TerminalShellLookup } from "../../../../../../terminal-shell-lookup/common/channels";
import type { RequestTerminalShellLookup } from "../../../../../../terminal-shell-lookup/renderer/request-terminal-shell-lookup.injectable";

describe("the Terminal Shell Path setting", () => {
  let render: DiRender;
  let requestTerminalShellLookup: Mock<RequestTerminalShellLookup>;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
    requestTerminalShellLookup = vi.fn<RequestTerminalShellLookup>();
    di.override(requestTerminalShellLookupInjectable, () => requestTerminalShellLookup);
  });

  const typeAndLeave = (input: HTMLElement, value: string) => {
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  };

  it("says nothing about the shell before the field is left", () => {
    const result = render(<TerminalShellPath />);

    fireEvent.change(result.getByPlaceholderText("some-default-shell"), { target: { value: "zsh" } });

    expect(result.queryByTestId("terminal-shell-lookup")).toBeNull();
    expect(requestTerminalShellLookup).not.toHaveBeenCalled();
  });

  it("shows the file terminals start once the field is left", async () => {
    requestTerminalShellLookup.mockResolvedValue({ shell: "zsh", path: "/bin/zsh" });

    const result = render(<TerminalShellPath />);

    typeAndLeave(result.getByPlaceholderText("some-default-shell"), "zsh");

    expect(requestTerminalShellLookup).toHaveBeenCalledWith("zsh");
    expect(await result.findByTestId("terminal-shell-lookup")).toHaveTextContent("Terminals start /bin/zsh.");
  });

  it("says when terminals cannot find the shell", async () => {
    requestTerminalShellLookup.mockResolvedValue({ shell: "elvish" });

    const result = render(<TerminalShellPath />);

    typeAndLeave(result.getByPlaceholderText("some-default-shell"), "elvish");

    expect(await result.findByTestId("terminal-shell-lookup")).toHaveTextContent(
      '"elvish" was not found, so terminals cannot start it.',
    );
  });

  it("keeps the answer to the latest lookup when an older one comes back later", async () => {
    const answers: ((lookup: TerminalShellLookup) => void)[] = [];

    requestTerminalShellLookup.mockImplementation(() => new Promise((resolve) => answers.push(resolve)));

    const result = render(<TerminalShellPath />);
    const input = result.getByPlaceholderText("some-default-shell");

    typeAndLeave(input, "zsh");
    typeAndLeave(input, "fish");

    await act(async () => answers[1]({ shell: "fish", path: "/usr/local/bin/fish" }));
    await act(async () => answers[0]({ shell: "zsh", path: "/bin/zsh" }));

    expect(result.getByTestId("terminal-shell-lookup")).toHaveTextContent("Terminals start /usr/local/bin/fish.");
  });
});
