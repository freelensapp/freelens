/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./notifications.scss";

import { Animate } from "@freelensapp/animate";
import { Icon } from "@freelensapp/icon";
import { JsonApiErrorParsed } from "@freelensapp/json-api";
import { cssNames, prevDefault } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import { notificationsStoreInjectable } from "./notifications-store.injectable";

import type { Disposer } from "@freelensapp/utilities";

import type {
  CreateNotificationOptions,
  Notification,
  NotificationMessage,
  NotificationsStore,
} from "./notifications.store";

export type ShowNotification = (message: NotificationMessage, opts?: CreateNotificationOptions) => Disposer;

interface Dependencies {
  store: NotificationsStore;
}

@observer
class NonInjectedNotifications extends React.Component<Dependencies> {
  public elem: HTMLDivElement | null = null;

  componentDidMount() {
    // Capture props before the reaction: mobx-react 9 forbids reading this.props
    // inside a derivation (the reaction's data function below).
    const { store } = this.props;

    disposeOnUnmount(this, [
      reaction(
        () => store.notifications.length,
        () => {
          this.scrollToLastNotification();
        },
        { delay: 250 },
      ),
    ]);
  }

  scrollToLastNotification() {
    if (!this.elem) {
      return;
    }
    this.elem.scrollTo?.({
      top: this.elem.scrollHeight,
      behavior: "smooth",
    });
  }

  getMessage(notification: Notification) {
    let { message } = notification;

    if (message instanceof JsonApiErrorParsed || message instanceof Error) {
      message = message.toString();
    }

    return React.Children.toArray(message);
  }

  render() {
    const { notifications, remove, addAutoHideTimer, removeAutoHideTimer } = this.props.store;

    return (
      <div
        className="Notifications"
        ref={(e) => {
          this.elem = e;
        }}
      >
        {notifications.map((notification) => {
          const { id, status, onClose } = notification;
          const msgText = this.getMessage(notification);

          return (
            <Animate key={id}>
              <div
                className={cssNames("notification", status)}
                onMouseLeave={() => addAutoHideTimer(id)}
                onMouseEnter={() => removeAutoHideTimer(id)}
              >
                <div className="info-icon">
                  <Icon material="info_outline" />
                </div>
                <div className="message">{msgText}</div>
                <div
                  className="close-icon"
                  onClick={prevDefault(() => {
                    remove(id);
                    onClose?.();
                  })}
                >
                  <Icon material="close" className="close" interactive data-testid={`close-notification-for-${id}`} />
                </div>
              </div>
            </Animate>
          );
        })}
      </div>
    );
  }
}

export const Notifications = withInjectables<Dependencies>(NonInjectedNotifications, {
  getProps: (di) => ({
    store: di.inject(notificationsStoreInjectable),
  }),
});
