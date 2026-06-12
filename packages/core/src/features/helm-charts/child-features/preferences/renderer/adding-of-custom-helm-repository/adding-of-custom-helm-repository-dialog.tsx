/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./add-helm-repo-dialog.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Dialog } from "../../../../../../renderer/components/dialog";
import { AddingOfCustomHelmRepositoryDialogContent } from "./adding-of-custom-helm-repository-dialog-content";
import addingOfCustomHelmRepositoryDialogIsVisibleInjectable from "./dialog-visibility/adding-of-custom-helm-repository-dialog-is-visible.injectable";
import hideDialogForAddingCustomHelmRepositoryInjectable from "./dialog-visibility/hide-dialog-for-adding-custom-helm-repository.injectable";

import type { IObservableValue } from "mobx";

interface Dependencies {
  contentIsVisible: IObservableValue<boolean>;
  hideDialog: () => void;
}

const NonInjectedActivationOfCustomHelmRepositoryDialog = observer(({ contentIsVisible, hideDialog }: Dependencies) => (
  <div>
    <Dialog className="AddHelmRepoDialog" isOpen={contentIsVisible.get()} close={hideDialog}>
      {contentIsVisible.get() && <AddingOfCustomHelmRepositoryDialogContent />}
    </Dialog>
  </div>
));

export const AddingOfCustomHelmRepositoryDialog = withInjectables<Dependencies>(
  NonInjectedActivationOfCustomHelmRepositoryDialog,

  {
    getProps: (di) => ({
      contentIsVisible: di.inject(addingOfCustomHelmRepositoryDialogIsVisibleInjectable),
      hideDialog: di.inject(hideDialogForAddingCustomHelmRepositoryInjectable),
    }),
  },
);
