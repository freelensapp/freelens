/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import openLinkInBrowserInjectable from "../../../../common/utils/open-link-in-browser.injectable";
import isMacInjectable from "../../../../common/vars/is-mac.injectable";
import { terminalFontInjectionToken } from "../../../../features/terminal/renderer/fonts/token";
import terminalConfigInjectable from "../../../../features/user-preferences/common/terminal-config.injectable";
import terminalCopyOnSelectInjectable from "../../../../features/user-preferences/common/terminal-copy-on-select.injectable";
import xtermColorThemeInjectable from "../../../themes/terminal-colors.injectable";
import { Terminal } from "./terminal";
import terminalSpawningPoolInjectable from "./terminal-spawning-pool.injectable";

import type { TerminalApi } from "../../../api/terminal-api";
import type { TabId } from "../dock/store";
import type { TerminalDependencies } from "./terminal";

export type CreateTerminal = (tabId: TabId, api: TerminalApi) => Terminal;

const createTerminalInjectable = getInjectable({
  id: "create-terminal",
  instantiate: (di): CreateTerminal => {
    const dependencies: TerminalDependencies = {
      spawningPool: di.inject(terminalSpawningPoolInjectable),
      terminalConfig: di.inject(terminalConfigInjectable),
      terminalCopyOnSelect: di.inject(terminalCopyOnSelectInjectable),
      terminalFonts: di.injectMany(terminalFontInjectionToken),
      isMac: di.inject(isMacInjectable),
      openLinkInBrowser: di.inject(openLinkInBrowserInjectable),
      xtermColorTheme: di.inject(xtermColorThemeInjectable),
      logger: di.inject(loggerInjectionToken),
    };

    return (tabId, api) => new Terminal(dependencies, { tabId, api });
  },
});

export default createTerminalInjectable;
