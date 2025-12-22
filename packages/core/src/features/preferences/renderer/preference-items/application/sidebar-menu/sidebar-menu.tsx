import React, { useState } from "react";
import { SubTitle } from "../../../../../../extensions/renderer-api/components";
import { Button } from "@freelensapp/button";
import { withInjectables } from "@ogre-tools/injectable-react";
import styles from "./sidebar-menu.module.scss";
import { resetClusterPageMenuOrderInjectable } from "../../../../../user-preferences/common/cluster-page-menu-order.injectable";
import { ShowNotification, showSuccessNotificationInjectable } from "@freelensapp/notifications";

interface NonInjectedSidebarMenuProps {
    resetClusterPageMenuOrder: () => void;
    showSuccessNotification: ShowNotification;
}

const NonInjectedSidebarMenu = ({ resetClusterPageMenuOrder, showSuccessNotification }: NonInjectedSidebarMenuProps) => {
    const [disabled, setDisabled] = useState(false);

    return (
        <section id="other">
            <SubTitle title="Sidebar menu order" />
            <div className={styles.row}>
                <span>Reset sidebar menu order to the original settings</span>
                <Button
                    disabled={disabled}
                    primary
                    label="Reset"
                    onClick={() => {
                        resetClusterPageMenuOrder();
                        showSuccessNotification("Sidebar menu order has been restored to the original state");
                        setDisabled(true);
                    }}
                />
            </div>
        </section>
    )
}

export const SidebarMenu = withInjectables<NonInjectedSidebarMenuProps>(NonInjectedSidebarMenu, {
  getProps: (di) => ({
    resetClusterPageMenuOrder: di.inject(resetClusterPageMenuOrderInjectable),
    showSuccessNotification: di.inject(showSuccessNotificationInjectable),
  }),
});
