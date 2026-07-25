/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./volume-details-list.scss";

import { Spinner } from "@freelensapp/spinner";
import { cssNames, prevDefault } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { kebabCase } from "es-toolkit";
import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { DrawerTitle } from "../drawer/drawer-title";
import showDetailsInjectable from "../kube-detail-params/show-details.injectable";
import { Table } from "../table/table";
import { TableCell } from "../table/table-cell";
import { TableHead } from "../table/table-head";
import { TableRow } from "../table/table-row";
import persistentVolumeStoreInjectable from "./store.injectable";

import type { PersistentVolume } from "@freelensapp/kube-object";

import type { ShowDetails } from "../kube-detail-params/show-details.injectable";
import type { PersistentVolumeStore } from "./store";

export interface VolumeDetailsListProps {
  persistentVolumes: PersistentVolume[];
}

enum sortBy {
  name = "name",
  status = "status",
  capacity = "capacity",
}

interface Dependencies {
  persistentVolumeStore: PersistentVolumeStore;
  showDetails: ShowDetails;
}

@observer
class NonInjectedVolumeDetailsList extends React.Component<VolumeDetailsListProps & Dependencies> {
  // mobx-react 9 forbids reading this.props inside a derivation. getTableRow is
  // invoked from the Table row renderer (a derivation other than this component's
  // own render), so it reads props from this observable snapshot, refreshed on
  // every update, instead of this.props.
  @observable.ref private observableProps: Readonly<VolumeDetailsListProps & Dependencies>;

  private sortingCallbacks = {
    [sortBy.name]: (volume: PersistentVolume) => volume.getName(),
    [sortBy.capacity]: (volume: PersistentVolume) => volume.getCapacity(),
    [sortBy.status]: (volume: PersistentVolume) => volume.getStatus(),
  };

  constructor(props: VolumeDetailsListProps & Dependencies) {
    super(props);
    this.observableProps = props;
    makeObservable(this);
  }

  componentDidUpdate() {
    this.observableProps = this.props;
  }

  getTableRow = (uid: string) => {
    const { persistentVolumes, showDetails } = this.observableProps;
    const volume = persistentVolumes.find((volume) => volume.getId() === uid);

    if (!volume) {
      return undefined;
    }

    return (
      <TableRow
        key={volume.getId()}
        sortItem={volume}
        nowrap
        onClick={prevDefault(() => showDetails(volume.selfLink, false))}
      >
        <TableCell className="name">{volume.getName()}</TableCell>
        <TableCell className="capacity">{volume.getCapacity()}</TableCell>
        <TableCell className={cssNames("status", kebabCase(volume.getStatus()))}>{volume.getStatus()}</TableCell>
      </TableRow>
    );
  };

  render() {
    const { persistentVolumes, persistentVolumeStore } = this.props;
    const virtual = persistentVolumes.length > 100;

    if (!persistentVolumes.length) {
      return !persistentVolumeStore.isLoaded && <Spinner center />;
    }

    return (
      <div className="VolumeDetailsList flex flex-col">
        <DrawerTitle>Persistent Volumes</DrawerTitle>
        <Table
          tableId="storage_volume_details_list"
          items={persistentVolumes}
          selectable
          virtual={virtual}
          sortable={this.sortingCallbacks}
          sortByDefault={{ sortBy: sortBy.name, orderBy: "desc" }}
          sortSyncWithUrl={false}
          getTableRow={this.getTableRow}
          className="grow shrink-0 basis-0"
        >
          <TableHead>
            <TableCell className="name" sortBy={sortBy.name}>
              Name
            </TableCell>
            <TableCell className="capacity" sortBy={sortBy.capacity}>
              Capacity
            </TableCell>
            <TableCell className="status" sortBy={sortBy.status}>
              Status
            </TableCell>
          </TableHead>
          {!virtual && persistentVolumes.map((volume) => this.getTableRow(volume.getId()))}
        </Table>
      </div>
    );
  }
}

export const VolumeDetailsList = withInjectables<Dependencies, VolumeDetailsListProps>(NonInjectedVolumeDetailsList, {
  getProps: (di, props) => ({
    ...props,
    persistentVolumeStore: di.inject(persistentVolumeStoreInjectable),
    showDetails: di.inject(showDetailsInjectable),
  }),
});
