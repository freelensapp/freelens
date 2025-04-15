import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { removeHelmRepositoryChannel } from "../../../../common/helm/remove-helm-repository-channel";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import removeHelmRepositoryInjectable from "./remove-helm-repository.injectable";

const removeHelmRepositoryChannelListenerInjectable = getRequestChannelListenerInjectable({
  id: "remove-helm-repository-channel-listener",
  channel: removeHelmRepositoryChannel,
  getHandler: (di) => di.inject(removeHelmRepositoryInjectable),
});

export default removeHelmRepositoryChannelListenerInjectable;
