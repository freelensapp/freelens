/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderFor } from "../../../../../../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../../../../../../renderer/getDiForUnitTesting";
import requestTerminalShellLookupInjectable from "../../../../../../terminal-shell-lookup/renderer/request-terminal-shell-lookup.injectable";
import userPreferencesStateInjectable from "../../../../../../user-preferences/common/state.injectable";
import { TerminalShellPath } from "../terminal-shell-path";

import type { Mock } from "vitest";

import type { DiRender } from "../../../../../../../renderer/components/test-utils/renderFor";
import type { TerminalShellLookup } from "../../../../../../terminal-shell-lookup/common/channels";
import type { RequestTerminalShellLookup } from "../../../../../../terminal-shell-lookup/renderer/request-terminal-shell-lookup.injectable";
import type { UserPreferencesState } from "../../../../../../user-preferences/common/state.injectable";

describe("the Terminal Shell Path setting", () => {
  let render: DiRender;
  let requestTerminalShellLookup: Mock<RequestTerminalShellLookup>;
  let state: UserPreferencesState;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
    requestTerminalShellLookup = vi.fn<RequestTerminalShellLookup>();
    di.override(requestTerminalShellLookupInjectable, () => requestTerminalShellLookup);
    state = di.inject(userPreferencesStateInjectable);
  });

  // Main answers with the given lookups, and finds no other shell. An empty setting stands for the default shell.
  const answerWith = (lookups: Record<string, TerminalShellLookup>) =>
    requestTerminalShellLookup.mockImplementation(async (setting) => lookups[setting] ?? { shell: setting });

  const typeAndLeave = (input: HTMLElement, value: string) => {
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  };

  it("checks the setting as soon as the section opens", async () => {
    state.shell = "no-such-shell";
    answerWith({ "": { shell: "/bin/bash", path: "/bin/bash" } });

    const result = render(<TerminalShellPath />);

    expect(requestTerminalShellLookup).toHaveBeenCalledWith("no-such-shell");
    expect(await result.findByTestId("terminal-shell-lookup")).toHaveTextContent(
      '"no-such-shell" was not found, so terminals cannot start it.',
    );
  });

  it("shows the default shell of main in the empty field", async () => {
    answerWith({ "": { shell: "/opt/homebrew/bin/bash", path: "/opt/homebrew/bin/bash" } });

    const result = render(<TerminalShellPath />);

    expect(await result.findByPlaceholderText("/opt/homebrew/bin/bash")).toHaveValue("");
    expect(result.getByTestId("terminal-shell-lookup")).toHaveTextContent("Terminals start /opt/homebrew/bin/bash.");
  });

  it("shows the default shell of main in the field also while the setting names another shell", async () => {
    state.shell = "zsh";
    answerWith({
      "": { shell: "/opt/homebrew/bin/bash", path: "/opt/homebrew/bin/bash" },
      zsh: { shell: "zsh", path: "/bin/zsh" },
    });

    const result = render(<TerminalShellPath />);

    expect(await result.findByPlaceholderText("/opt/homebrew/bin/bash")).toHaveValue("zsh");
    expect(await result.findByTestId("terminal-shell-lookup")).toHaveTextContent("Terminals start /bin/zsh.");
  });

  it("shows the default shell of the renderer in the empty field until main answers", () => {
    requestTerminalShellLookup.mockImplementation(() => new Promise(() => {}));

    const result = render(<TerminalShellPath />);

    expect(result.getByPlaceholderText("some-default-shell")).toHaveValue("");
    expect(result.queryByTestId("terminal-shell-lookup")).toBeNull();
  });

  it("shows the file terminals start once the field is left", async () => {
    answerWith({ "": { shell: "/bin/bash", path: "/bin/bash" }, zsh: { shell: "zsh", path: "/bin/zsh" } });

    const result = render(<TerminalShellPath />);

    typeAndLeave(result.getByRole("textbox"), "zsh");

    expect(requestTerminalShellLookup).toHaveBeenCalledWith("zsh");
    expect(await result.findByText("Terminals start /bin/zsh.")).toBeInTheDocument();
  });

  it("says when terminals cannot find the shell", async () => {
    answerWith({ "": { shell: "/bin/bash", path: "/bin/bash" } });

    const result = render(<TerminalShellPath />);

    typeAndLeave(result.getByRole("textbox"), "elvish");

    expect(await result.findByText(/"elvish" was not found, so terminals cannot start it\./)).toBeInTheDocument();
  });

  it("keeps the answer to the latest lookup when an older one comes back later", async () => {
    const answers: ((lookup: TerminalShellLookup) => void)[] = [];

    requestTerminalShellLookup.mockImplementation(
      (setting) =>
        new Promise((resolve) => {
          if (setting) {
            answers.push(resolve);
          } else {
            resolve({ shell: "/bin/bash", path: "/bin/bash" });
          }
        }),
    );

    const result = render(<TerminalShellPath />);
    const input = result.getByRole("textbox");

    typeAndLeave(input, "zsh");
    typeAndLeave(input, "fish");

    await act(async () => answers[1]({ shell: "fish", path: "/usr/local/bin/fish" }));
    await act(async () => answers[0]({ shell: "zsh", path: "/bin/zsh" }));

    expect(result.getByTestId("terminal-shell-lookup")).toHaveTextContent("Terminals start /usr/local/bin/fish.");
  });
});
