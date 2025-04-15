/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";

import { withInjectables } from "@ogre-tools/injectable-react";
import type { IObservableValue } from "mobx";
import { observer } from "mobx-react";
import { Notice } from "../../../../../renderer/components/extensions/notice";
import { AddingOfCustomHelmRepositoryDialog } from "./adding-of-custom-helm-repository/adding-of-custom-helm-repository-dialog";
import { AddingOfCustomHelmRepositoryOpenButton } from "./adding-of-custom-helm-repository/adding-of-custom-helm-repository-open-button";
import { AddingOfPublicHelmRepository } from "./adding-of-public-helm-repository/adding-of-public-helm-repository";
import { HelmRepositories } from "./helm-repositories";
import type { HelmRepositoriesErrorState } from "./helm-repositories-error-state.injectable";
import helmRepositoriesErrorStateInjectable from "./helm-repositories-error-state.injectable";

interface Dependencies {
  helmRepositoriesErrorState: IObservableValue<HelmRepositoriesErrorState>;
}

const NonInjectedHelmCharts = observer(({ helmRepositoriesErrorState }: Dependencies) => {
  const state = helmRepositoriesErrorState.get();

  return (
    <section id="helm">
      <h2>Helm Charts</h2>

      <div>
        {!state.controlsAreShown && (
          <Notice>
            <div className="flex-grow text-center">{state.errorMessage}</div>
          </Notice>
        )}

        {state.controlsAreShown && (
          <div data-testid="helm-controls">
            <div className="flex gaps">
              <AddingOfPublicHelmRepository />

              <AddingOfCustomHelmRepositoryOpenButton />
            </div>

            <HelmRepositories />

            <AddingOfCustomHelmRepositoryDialog />
          </div>
        )}
      </div>
    </section>
  );
});

export const HelmCharts = withInjectables<Dependencies>(
  NonInjectedHelmCharts,

  {
    getProps: (di) => ({
      helmRepositoriesErrorState: di.inject(helmRepositoriesErrorStateInjectable),
    }),
  },
);
