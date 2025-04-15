/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./welcome.scss";
import { Icon } from "@freelensapp/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { IComputedValue } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { forumsUrl } from "../../../common/vars";
import productNameInjectable from "../../../common/vars/product-name.injectable";
import welcomeMenuItemsInjectable from "./welcome-menu-items/welcome-menu-items.injectable";
import type { WelcomeMenuRegistration } from "./welcome-menu-items/welcome-menu-registration";

export const defaultWidth = 320;

interface Dependencies {
  welcomeMenuItems: IComputedValue<WelcomeMenuRegistration[]>;
  productName: string;
}

const NonInjectedWelcome = observer(({ welcomeMenuItems, productName }: Dependencies) => {
  return (
    <div className="flex justify-center Welcome align-center" data-testid="welcome-page">
      <div style={{ width: `${defaultWidth}px` }} data-testid="welcome-banner-container">
        <Icon svg="logo-lens" className="logo" welcomeLogo={true} data-testid="no-welcome-banners-icon" />

        <div className="flex justify-center">
          <div style={{ width: `${defaultWidth}px` }} data-testid="welcome-text-container">
            <h2>{`Welcome to ${productName}!`}</h2>

            <p>
              To get you started we have auto-detected your clusters in your kubeconfig file and added them to the
              catalog, your centralized view for managing all your cloud-native resources.
              <br />
              <br />
              {"If you have any questions or feedback, please join us on our "}
              <a href={forumsUrl} target="_blank" rel="noreferrer" className="link">
                Github repository
              </a>
              .
            </p>

            <ul className="block" style={{ width: `${defaultWidth}px` }} data-testid="welcome-menu-container">
              {welcomeMenuItems.get().map((item, index) => (
                <li key={index} className="flex grid-12" onClick={() => item.click()}>
                  <Icon material={item.icon} className="box col-1" />
                  <a className="box col-10">{typeof item.title === "string" ? item.title : item.title()}</a>
                  <Icon material="navigate_next" className="box col-1" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
});

export const Welcome = withInjectables<Dependencies>(NonInjectedWelcome, {
  getProps: (di) => ({
    welcomeMenuItems: di.inject(welcomeMenuItemsInjectable),
    productName: di.inject(productNameInjectable),
  }),
});
