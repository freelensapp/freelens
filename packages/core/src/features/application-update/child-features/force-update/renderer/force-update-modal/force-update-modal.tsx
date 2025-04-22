/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { IComputedValue } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { Countdown } from "../../../../../../renderer/components/countdown/countdown";
import { Dialog } from "../../../../../../renderer/components/dialog";
import restartAndInstallUpdateInjectable from "../../../../renderer/restart-and-install-update.injectable";
import styles from "./force-update-modal.module.scss";
import installUpdateCountdownInjectable from "./install-update-countdown.injectable";

interface Dependencies {
  restartAndInstallUpdate: () => void;
  secondsTill: IComputedValue<number>;
}

const NonInjectedForceUpdateModal = observer(({ restartAndInstallUpdate, secondsTill }: Dependencies) => (
  <Dialog isOpen={true} pinned>
    <div data-testid="must-update-immediately" className={styles.ForceUpdateModal}>
      <div className={styles.header}>
        <h2>Please update</h2>
      </div>

      <div className={styles.content}>
        <p>An update to Lens Desktop is required to continue using the application.</p>
      </div>

      <div className={styles.footer}>
        <Button
          primary
          data-testid="update-now-from-must-update-immediately-modal"
          onClick={restartAndInstallUpdate}
          label="Update"
        >
          {" "}
          (
          <Countdown secondsTill={secondsTill} data-testid="countdown-to-automatic-update" />)
        </Button>
      </div>
    </div>
  </Dialog>
));

export const ForceUpdateModal = withInjectables<Dependencies>(
  NonInjectedForceUpdateModal,

  {
    getProps: (di, props) => ({
      restartAndInstallUpdate: di.inject(restartAndInstallUpdateInjectable),
      secondsTill: di.inject(installUpdateCountdownInjectable),
      ...props,
    }),
  },
);
