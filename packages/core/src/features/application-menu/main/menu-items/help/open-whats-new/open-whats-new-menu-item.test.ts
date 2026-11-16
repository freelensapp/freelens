/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import openLinkInBrowserInjectable from "../../../../../../common/utils/open-link-in-browser.injectable";
import { getDiForUnitTesting } from "../../../../../../main/getDiForUnitTesting";
import { buildVersionInitializable } from "../../../../../vars/build-version/common/token";
import openWhatsNewMenuItemInjectable from "./open-whats-new-menu-item.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { Mock } from "vitest";

describe("open-whats-new-menu-item", () => {
  let di: DiContainer;
  let openLinkInBrowserMock: Mock;

  beforeEach(() => {
    di = getDiForUnitTesting();

    openLinkInBrowserMock = vi.fn().mockResolvedValue(undefined);
    di.override(openLinkInBrowserInjectable, () => openLinkInBrowserMock);
  });

  const click = (buildVersion: string) => {
    di.override(buildVersionInitializable.stateToken, () => buildVersion);

    const menuItem = di.inject(openWhatsNewMenuItemInjectable);

    menuItem.onClick();
  };

  it("is placed in the Help menu between Documentation and Licenses", () => {
    di.override(buildVersionInitializable.stateToken, () => "2.0.1");

    const menuItem = di.inject(openWhatsNewMenuItemInjectable);

    expect(menuItem).toMatchObject({ parentId: "help", label: "What's new", orderNumber: 25 });
  });

  it("opens the release notes of a released version", () => {
    click("2.0.1");

    expect(openLinkInBrowserMock).toHaveBeenCalledWith("https://github.com/freelensapp/freelens/releases/tag/v2.0.1");
  });

  it("opens the list of releases for a prerelease version", () => {
    click("2.0.1-0");

    expect(openLinkInBrowserMock).toHaveBeenCalledWith("https://github.com/freelensapp/freelens/releases");
  });
});
