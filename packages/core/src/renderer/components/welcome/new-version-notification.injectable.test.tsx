/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showInfoNotificationInjectable } from "@freelensapp/notifications";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
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

    // Current app version used in comparison
    di.override(buildVersionInitializable.stateToken, () => "1.2.3");

    showInfoMock = jest.fn();
    di.override(showInfoNotificationInjectable, () => showInfoMock);
  });

  it("shows a notification containing the latest version when latest > current", async () => {
    // latest version from main via channel
    di.override(getLatestVersionViaChannelInjectable, () => async () => "1.2.4");

    const newVersionNotification = di.inject(newVersionNotificationInjectable);

    await newVersionNotification();

    expect(showInfoMock).toHaveBeenCalledTimes(1);

    const [message] = showInfoMock.mock.calls[0];

    // message is JSX - render it to static markup and assert the version string presence
    const html = renderToStaticMarkup(<>{message}</>);

    expect(html).toContain("1.2.4");
  });

  it("does not show a notification when latest <= current", async () => {
    // same version as current
    di.override(getLatestVersionViaChannelInjectable, () => async () => "1.2.3");

    const newVersionNotification = di.inject(newVersionNotificationInjectable);

    await newVersionNotification();

    expect(showInfoMock).not.toHaveBeenCalled();
  });
});
