/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./kube-event-icon.scss";

import { Icon } from "@freelensapp/icon";
import type { KubeEvent, KubeObject } from "@freelensapp/kube-object";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import { KubeObjectAge } from "../kube-object/age";
import type { EventStore } from "./store";
import eventStoreInjectable from "./store.injectable";

export interface KubeEventIconProps {
  object: KubeObject;
  showWarningsOnly?: boolean;
  filterEvents?: (events: KubeEvent[]) => KubeEvent[];
}

interface Dependencies {
  eventStore: EventStore;
}

class NonInjectedKubeEventIcon extends React.Component<KubeEventIconProps & Dependencies> {
  get showWarningsOnly() {
    return this.props.showWarningsOnly ?? true;
  }

  render() {
    const { object, filterEvents, eventStore } = this.props;
    const events = eventStore.getEventsByObject(object);
    let warnings = events.filter((evt) => evt.isWarning());

    if (filterEvents) warnings = filterEvents(warnings);

    if (!events.length || (this.showWarningsOnly && !warnings.length)) {
      return null;
    }
    const event = [...warnings, ...events][0]; // get latest event

    return (
      <Icon
        material="warning"
        className={cssNames("KubeEventIcon", { warning: event.isWarning() })}
        tooltip={{
          children: (
            <div className="KubeEventTooltip">
              <div className="msg">{event.message}</div>
              <div className="age">
                <Icon material="access_time" />
                <KubeObjectAge object={event} />
              </div>
            </div>
          ),
        }}
      />
    );
  }
}

export const KubeEventIcon = withInjectables<Dependencies, KubeEventIconProps>(NonInjectedKubeEventIcon, {
  getProps: (di, props) => ({
    ...props,
    eventStore: di.inject(eventStoreInjectable),
  }),
});
