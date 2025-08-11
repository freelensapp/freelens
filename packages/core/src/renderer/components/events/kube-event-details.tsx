/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import { DrawerItem, DrawerTitle } from "../drawer";
import { DurationAbsoluteTimestamp } from "./duration-absolute";
import styles from "./kube-event-details.module.scss";
import eventStoreInjectable from "./store.injectable";

import type { Logger } from "@freelensapp/logger";

import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import type { EventStore } from "./store";

export interface KubeEventDetailsProps {
  object: KubeObject;
}

interface Dependencies {
  subscribeStores: SubscribeStores;
  eventStore: EventStore;
  logger: Logger;
}

@observer
class NonInjectedKubeEventDetails extends React.Component<KubeEventDetailsProps & Dependencies> {
  componentDidMount() {
    disposeOnUnmount(this, [this.props.subscribeStores([this.props.eventStore])]);
  }

  render() {
    const { object, eventStore } = this.props;

    if (!object) {
      return null;
    }

    if (!(object instanceof KubeObject)) {
      this.props.logger.error("[KubeEventDetails]: passed object that is not an instanceof KubeObject", object);

      return null;
    }

    const events = eventStore.getEventsByObject(object);

    return (
      <div>
        <DrawerTitle>
          <span>Events</span>
        </DrawerTitle>
        {events.length > 0 && (
          <div className={styles.KubeEventDetails}>
            {events.map((event) => (
              <div className={styles.event} key={event.getId()}>
                <div className={cssNames(styles.title, { [styles.warning]: event.isWarning() })}>{event.message}</div>
                <DrawerItem name="Source">{event.getSource()}</DrawerItem>
                <DrawerItem name="Count">{event.count}</DrawerItem>
                <DrawerItem name="Sub-object">{event.involvedObject.fieldPath}</DrawerItem>
                {event.lastTimestamp && (
                  <DrawerItem name="Last seen">
                    <DurationAbsoluteTimestamp timestamp={event.lastTimestamp} />
                  </DrawerItem>
                )}
              </div>
            ))}
          </div>
        )}
        {events.length === 0 && <div className={styles.empty}>No events found</div>}
      </div>
    );
  }
}

export const KubeEventDetails = withInjectables<Dependencies, KubeEventDetailsProps>(NonInjectedKubeEventDetails, {
  getProps: (di, props) => ({
    ...props,
    subscribeStores: di.inject(subscribeStoresInjectable),
    eventStore: di.inject(eventStoreInjectable),
    logger: di.inject(loggerInjectionToken),
  }),
});
