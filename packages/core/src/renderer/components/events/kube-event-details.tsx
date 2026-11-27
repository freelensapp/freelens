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

import { kubeEventApiInjectable } from "@freelensapp/kube-api-specifics";
import { type KubeEvent, KubeObject } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observableRef, runInAction } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import { DrawerItem, DrawerTitle } from "../drawer";
import { DurationAbsoluteTimestamp } from "./duration-absolute";
import styles from "./kube-event-details.module.scss";
import eventStoreInjectable from "./store.injectable";

import type { KubeEventApi } from "@freelensapp/kube-api";
import type { Logger } from "@freelensapp/logger";

import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import type { EventStore } from "./store";

export interface KubeEventDetailsProps {
  object: KubeObject;
}

interface Dependencies {
  subscribeStores: SubscribeStores;
  eventStore: EventStore;
  kubeEventApi: KubeEventApi;
  logger: Logger;
}

function timeToUnix(dateStr?: string): number {
  if (!dateStr) return 0;
  const time = Date.parse(dateStr);
  return Number.isNaN(time) ? 0 : Math.floor(time / 1000);
}

export function sortEvents(events: KubeEvent[]): KubeEvent[] | undefined {
  return events?.sort((a, b) => timeToUnix(b.lastTimestamp) - timeToUnix(a.lastTimestamp));
}

// Node events name the node as their object's uid.
function involvedObjectFieldSelector(object: KubeObject): string {
  return object.kind === "Node"
    ? `involvedObject.kind=Node,involvedObject.name=${object.getName()}`
    : `involvedObject.uid=${object.getId()}`;
}

function isAbout(object: KubeObject, event: KubeEvent): boolean {
  return object.kind === "Node"
    ? event.involvedObject.kind === "Node" && event.involvedObject.name === object.getName()
    : event.involvedObject.uid === object.getId();
}

// An object that changes often, such as a Lease, would otherwise list its events on every change.
const relistIntervalMs = 10_000;

@observer
class NonInjectedKubeEventDetails extends React.Component<KubeEventDetailsProps & Dependencies> {
  private readonly disposers: (() => void)[] = [];

  // The event store holds a limited number of events, which may leave out the
  // object's, so they are also listed for the object alone, as kubectl does.
  @observableRef private accessor ownEvents: KubeEvent[] = [];
  private loaded: { uid: string; resourceVersion: string; at: number } | undefined;

  componentDidMount() {
    this.disposers.push(this.props.subscribeStores([this.props.eventStore]));
    void this.loadOwnEvents();
  }

  componentDidUpdate() {
    void this.loadOwnEvents();
  }

  componentWillUnmount() {
    this.loaded = undefined;
    this.disposers.forEach((dispose) => dispose());
  }

  // Listed again when the object changes, which it usually does along with its
  // events, at most once per interval.
  private async loadOwnEvents() {
    const { object, kubeEventApi, logger } = this.props;

    if (!(object instanceof KubeObject)) {
      return;
    }

    const uid = object.getId();
    const resourceVersion = object.getResourceVersion();
    const { loaded } = this;

    if (
      loaded?.uid === uid &&
      (loaded.resourceVersion === resourceVersion || Date.now() - loaded.at < relistIntervalMs)
    ) {
      return;
    }

    const current = { uid, resourceVersion, at: Date.now() };

    this.loaded = current;

    try {
      const events = await kubeEventApi.list(
        { namespace: object.getNs() ?? "" },
        { fieldSelector: involvedObjectFieldSelector(object) },
      );

      if (this.loaded === current) {
        runInAction(() => {
          this.ownEvents = events ?? [];
        });
      }
    } catch (error) {
      logger.warn("[KubeEventDetails]: failed to list the events of an object", error);
    }
  }

  private getEvents(object: KubeObject): KubeEvent[] {
    const events = new Map<string, KubeEvent>();

    for (const event of this.ownEvents.filter((event) => isAbout(object, event))) {
      events.set(event.getId(), event);
    }

    // The store's copies come from its watch, so they are the more recent.
    for (const event of this.props.eventStore.getEventsByObject(object)) {
      events.set(event.getId(), event);
    }

    return [...events.values()];
  }

  render() {
    const { object } = this.props;

    if (!object) {
      return null;
    }

    if (!(object instanceof KubeObject)) {
      this.props.logger.error("[KubeEventDetails]: passed object that is not an instanceof KubeObject", object);

      return null;
    }

    const events = this.getEvents(object);

    return (
      <div>
        <DrawerTitle>
          <span>Events</span>
        </DrawerTitle>
        {events.length > 0 && (
          <div className={styles.KubeEventDetails}>
            {sortEvents(events)?.map((event) => (
              <div className={styles.event} key={event.getId()}>
                <div className={cssNames(styles.title, { [styles.warning]: event.isWarning() })}>{event.message}</div>
                <DrawerItem name="Reason">{event.reason}</DrawerItem>
                <DrawerItem name="Source">{event.getSource()}</DrawerItem>
                <DrawerItem name="Count">{event.getCount()}</DrawerItem>
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
    kubeEventApi: di.inject(kubeEventApiInjectable),
    logger: di.inject(loggerInjectionToken),
  }),
});
