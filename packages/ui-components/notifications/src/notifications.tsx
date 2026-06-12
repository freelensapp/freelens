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
    disposeOnUnmount(this, [
      reaction(
        () => this.props.store.notifications.length,
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
      <div className="Notifications flex column align-flex-end" ref={(e) => (this.elem = e)}>
        {notifications.map((notification) => {
          const { id, status, onClose } = notification;
          const msgText = this.getMessage(notification);

          return (
            <Animate key={id}>
              <div
                className={cssNames("notification flex", status)}
                onMouseLeave={() => addAutoHideTimer(id)}
                onMouseEnter={() => removeAutoHideTimer(id)}
              >
                <div className="box">
                  <Icon material="info_outline" />
                </div>
                <div className="message box grow">{msgText}</div>
                <div
                  className="box close-icon"
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
