/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@nibamot/button";
import { loggerInjectionToken } from "@nibamot/logger";
import { Spinner } from "@nibamot/spinner";
import { iter, tuple } from "@nibamot/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { computed, makeObservable, observable, reaction } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import isWindowsInjectable from "../../../../../../common/vars/is-windows.injectable";
import { Notice } from "../../../../../../renderer/components/extensions/notice";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { PathPicker } from "../../../../../../renderer/components/path-picker/path-picker";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import { RemovableItem } from "../../../removable-item/removable-item";
import discoverAllKubeconfigSyncKindsInjectable from "./discover-all-sync-kinds.injectable";
import discoverSiblingLensInstallsInjectable from "./discover-sibling-lens-installs.injectable";
import discoverKubeconfigSyncKindInjectable from "./discover-sync-kind.injectable";

import type { Logger } from "@nibamot/logger";

import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";
import type { DiscoverAllKubeconfigSyncKinds } from "./discover-all-sync-kinds.injectable";
import type { DiscoverSiblingLensInstalls, SiblingLensInstall } from "./discover-sibling-lens-installs.injectable";
import type { DiscoverKubeconfigSyncKind, SyncKind } from "./discover-sync-kind.injectable";

interface Entry extends SyncKind {
  filePath: string;
}

interface Dependencies {
  state: UserPreferencesState;
  isWindows: boolean;
  logger: Logger;
  discoverAllKubeconfigSyncKinds: DiscoverAllKubeconfigSyncKinds;
  discoverKubeconfigSyncKind: DiscoverKubeconfigSyncKind;
  discoverSiblingLensInstalls: DiscoverSiblingLensInstalls;
}

@observer
class NonInjectedKubeconfigSync extends React.Component<Dependencies> {
  private readonly disposers: (() => void)[] = [];
  readonly syncs = observable.map<string, SyncKind>();
  readonly siblingInstalls = observable.array<SiblingLensInstall>();
  @observable loaded = false;
  @observable importingAppName: string | undefined;

  constructor(props: Dependencies) {
    super(props);
    makeObservable(this);
  }

  async componentDidMount() {
    const mapEntries = await Promise.all(
      iter.map(this.props.state.syncKubeconfigEntries, ([filePath]) => this.props.discoverKubeconfigSyncKind(filePath)),
    );

    this.syncs.replace(mapEntries);
    this.loaded = true;

    this.siblingInstalls.replace(await this.props.discoverSiblingLensInstalls());

    this.disposers.push(
      reaction(
        () => Array.from(this.syncs.entries(), ([filePath, kind]) => tuple.from(filePath, kind)),
        (syncs) => {
          this.props.state.syncKubeconfigEntries.replace(syncs);
        },
      ),
    );
  }

  componentWillUnmount() {
    this.disposers.forEach((dispose) => dispose());
  }

  @computed get syncsList(): Entry[] | undefined {
    if (!this.loaded) {
      return undefined;
    }

    return Array.from(this.syncs.entries(), ([filePath, value]) => ({ filePath, ...value }));
  }

  onPick = async (filePaths: string[]) => {
    this.syncs.merge(await this.props.discoverAllKubeconfigSyncKinds(filePaths));
  };

  importSiblingInstall = async (install: SiblingLensInstall) => {
    this.importingAppName = install.appName;

    try {
      this.syncs.merge(await this.props.discoverAllKubeconfigSyncKinds(install.filePaths));
      this.siblingInstalls.remove(install);
    } finally {
      this.importingAppName = undefined;
    }
  };

  getIconName(entry: Entry) {
    switch (entry.type) {
      case "file":
        return "description";
      case "folder":
        return "folder";
      case "unknown":
        return "help_outline";
    }
  }

  renderEntry = (entry: Entry) => {
    return (
      <RemovableItem
        key={entry.filePath}
        onRemove={() => this.syncs.delete(entry.filePath)}
        className="mt-3"
        icon={this.getIconName(entry)}
      >
        <div className="flex-grow break-all">{entry.filePath}</div>
      </RemovableItem>
    );
  };

  renderEntries() {
    const entries = this.syncsList;

    if (!entries) {
      return (
        <div className="loading-spinner">
          <Spinner />
        </div>
      );
    }

    if (!entries.length) {
      return (
        <Notice className="mt-3">
          <div className="flex-grow text-center">No files and folders have been synced yet</div>
        </Notice>
      );
    }

    return <div>{entries.map(this.renderEntry)}</div>;
  }

  renderSyncButtons() {
    if (this.props.isWindows) {
      return (
        <div className="flex gap-2 items-center mb-5">
          <PathPicker
            message="Sync file(s)"
            onPick={this.onPick}
            buttonLabel="Sync"
            properties={["showHiddenFiles", "multiSelections", "openFile"]}
          />
          <span>or</span>
          <PathPicker
            message="Sync folder(s)"
            onPick={this.onPick}
            buttonLabel="Sync"
            properties={["showHiddenFiles", "multiSelections", "openDirectory"]}
          />
        </div>
      );
    }

    return (
      <div className="self-start mb-5">
        <PathPicker
          message="Sync Files and Folders"
          onPick={this.onPick}
          buttonLabel="Sync"
          properties={["showHiddenFiles", "multiSelections", "openFile", "openDirectory"]}
        />
      </div>
    );
  }

  renderSiblingInstalls() {
    if (!this.siblingInstalls.length) {
      return null;
    }

    return (
      <div className="mb-5">
        <SubTitle title="Import from other Lens apps" />
        {this.siblingInstalls.map((install) => (
          <div key={install.appName} className="flex gap-2 items-center mt-2">
            <div className="flex-grow">
              {install.appName}: {install.filePaths.length} synced item{install.filePaths.length === 1 ? "" : "s"}
            </div>
            <Button
              label="Import"
              waiting={this.importingAppName === install.appName}
              disabled={this.importingAppName !== undefined}
              onClick={() => this.importSiblingInstall(install)}
            />
          </div>
        ))}
      </div>
    );
  }

  render() {
    return (
      <section id="kube-sync">
        <h2 data-testid="kubernetes-sync-header">Kubeconfig Syncs</h2>

        {this.renderSiblingInstalls()}
        {this.renderSyncButtons()}
        <SubTitle title="Synced Items" className="pt-5" />
        {this.renderEntries()}
      </section>
    );
  }
}

export const KubeconfigSync = withInjectables<Dependencies>(NonInjectedKubeconfigSync, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    isWindows: di.inject(isWindowsInjectable),
    logger: di.inject(loggerInjectionToken),
    discoverAllKubeconfigSyncKinds: di.inject(discoverAllKubeconfigSyncKindsInjectable),
    discoverKubeconfigSyncKind: di.inject(discoverKubeconfigSyncKindInjectable),
    discoverSiblingLensInstalls: di.inject(discoverSiblingLensInstallsInjectable),
  }),
});
