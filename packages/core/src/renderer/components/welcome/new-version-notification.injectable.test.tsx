/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showInfoNotificationInjectable } from "@freelensapp/notifications";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { buildVersionInitializable } from "../../../features/vars/build-version/common/token";
import getLatestVersionViaChannelInjectable from "../../common/utils/get-latest-version-via-channel.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import newVersionNotificationInjectable from "./new-version-notification.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

describe("new-version-notification.injectable", () => {
  let di: DiContainer;
  let showInfoMock: jest.Mock;

  beforeEach(() => {
    di = getDiForUnitTesting();

    di.override(buildVersionInitializable.stateToken, () => "1.2.3");

    showInfoMock = jest.fn();
    di.override(showInfoNotificationInjectable, () => showInfoMock);
  });

  it("shows a notification containing the latest version when latest > current", async () => {
    di.override(getLatestVersionViaChannelInjectable, () => async () => "1.2.4");

    const newVersionNotification = di.inject(newVersionNotificationInjectable);

    await newVersionNotification();

    expect(showInfoMock).toHaveBeenCalledTimes(1);

    const [message] = showInfoMock.mock.calls[0];

    const html = renderToStaticMarkup(<>{message}</>);

    expect(html).toContain("1.2.4");
  });

  it("does not show a notification when latest <= current", async () => {
    di.override(getLatestVersionViaChannelInjectable, () => async () => "1.2.3");

    const newVersionNotification = di.inject(newVersionNotificationInjectable);

    await newVersionNotification();

    expect(showInfoMock).not.toHaveBeenCalled();
  });

  it("does not show a notification when checkForUpdates is disabled", async () => {
    di.override(getLatestVersionViaChannelInjectable, () => async () => "1.2.4");

    di.override(userPreferencesStateInjectable, () => ({
      checkForUpdates: false,
    }));

    const newVersionNotification = di.inject(newVersionNotificationInjectable);

    await newVersionNotification();

    expect(showInfoMock).not.toHaveBeenCalled();
  });
});
