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

import { Spinner } from "@freelensapp/spinner";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { RemovableItem } from "../../../../preferences/renderer/removable-item/removable-item";
import activeHelmRepositoriesInjectable from "./active-helm-repositories.injectable";
import styles from "./helm-charts.module.scss";
import removeHelmRepositoryInjectable from "./remove-helm-repository.injectable";

import type { IAsyncComputed } from "@ogre-tools/injectable-react";

import type { HelmRepo } from "../../../../../common/helm/helm-repo";

interface Dependencies {
  activeHelmRepositories: IAsyncComputed<HelmRepo[]>;
  removeRepository: (repository: HelmRepo) => Promise<void>;
}

const NonInjectedActiveHelmRepositories = observer(({ activeHelmRepositories, removeRepository }: Dependencies) => {
  if (activeHelmRepositories.pending.get()) {
    return (
      <div className={styles.repos}>
        <div className="pt-5 relative">
          <Spinner center data-testid="helm-repositories-are-loading" />
        </div>
      </div>
    );
  }

  const repositories = activeHelmRepositories.value.get();

  return (
    <div className={styles.repos}>
      {repositories.map((repository) => (
        <RemovableItem
          key={repository.name}
          onRemove={() => removeRepository(repository)}
          className={styles.repo}
          data-testid={`remove-helm-repository-${repository.name}`}
        >
          <div>
            <div data-testid={`helm-repository-${repository.name}`} className={styles.repoName}>
              {repository.name}
            </div>

            <div className={styles.repoUrl}>{repository.url}</div>
          </div>
        </RemovableItem>
      ))}
    </div>
  );
});

export const HelmRepositories = withInjectables<Dependencies>(
  NonInjectedActiveHelmRepositories,

  {
    getProps: (di) => ({
      activeHelmRepositories: di.inject(activeHelmRepositoriesInjectable),
      removeRepository: di.inject(removeHelmRepositoryInjectable),
    }),
  },
);
