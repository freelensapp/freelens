/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./endpoint-subset-list.scss";

import { Link } from "@freelensapp/routing";
import { withInjectables } from "@ogre-tools/injectable-react";
import autoBindReact from "auto-bind/react";
import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import apiManagerInjectable from "../../../common/k8s-api/api-manager/manager.injectable";
import getDetailsUrlInjectable from "../kube-detail-params/get-details-url.injectable";
import { Table, TableCell, TableHead, TableRow } from "../table";

import type { EndpointAddress, EndpointSubset, Endpoints } from "@freelensapp/kube-object";

import type { ApiManager } from "../../../common/k8s-api/api-manager";
import type { GetDetailsUrl } from "../kube-detail-params/get-details-url.injectable";

export interface EndpointSubsetListProps {
  subset: Required<EndpointSubset>;
  endpoint: Endpoints;
}

interface Dependencies {
  apiManager: ApiManager;
  getDetailsUrl: GetDetailsUrl;
}

@observer
class NonInjectedEndpointSubsetList extends React.Component<EndpointSubsetListProps & Dependencies> {
  // mobx-react 9 forbids reading this.props inside a derivation. getAddressTableRow and
  // getNotReadyAddressTableRow are invoked from the Table row renderer (a derivation
  // other than this component's own render), so they (and renderAddressTableRow they
  // call) read props from this observable snapshot, refreshed on every update, instead
  // of this.props.
  @observable.ref private observableProps: Readonly<EndpointSubsetListProps & Dependencies>;

  constructor(props: EndpointSubsetListProps & Dependencies) {
    super(props);
    this.observableProps = props;
    autoBindReact(this);
    makeObservable(this);
  }

  componentDidUpdate() {
    this.observableProps = this.props;
  }

  getAddressTableRow(ip: string) {
    const address = this.observableProps.subset.addresses.find((address) => address.ip == ip);

    return this.renderAddressTableRow(address);
  }

  getNotReadyAddressTableRow(ip: string) {
    const address = this.observableProps.subset.notReadyAddresses.find((address) => address.ip == ip);

    return this.renderAddressTableRow(address);
  }

  renderAddressTable(addresses: EndpointAddress[], virtual: boolean) {
    return (
      <div>
        <div className="title flex gap-2">Addresses</div>
        <Table
          items={addresses}
          selectable={false}
          virtual={virtual}
          scrollable={false}
          getTableRow={this.getAddressTableRow}
          className="grow shrink-0 basis-0"
        >
          <TableHead>
            <TableCell className="ip">IP</TableCell>
            <TableCell className="name">Hostname</TableCell>
            <TableCell className="target">Target</TableCell>
          </TableHead>
          {!virtual && addresses.map((address) => this.getAddressTableRow(address.ip))}
        </Table>
      </div>
    );
  }

  renderAddressTableRow(address: EndpointAddress | undefined) {
    if (!address) {
      return undefined;
    }

    const { endpoint, getDetailsUrl, apiManager } = this.observableProps;

    return (
      <TableRow key={address.ip} nowrap>
        <TableCell className="ip">{address.ip}</TableCell>
        <TableCell className="name">{address.hostname}</TableCell>
        <TableCell className="target">
          {address.targetRef && (
            <Link to={getDetailsUrl(apiManager.lookupApiLink(address.targetRef, endpoint))}>
              {address.targetRef.name}
            </Link>
          )}
        </TableCell>
      </TableRow>
    );
  }

  render() {
    const {
      subset: { addresses, ports, notReadyAddresses },
    } = this.props;
    const addressesVirtual = addresses.length > 100;
    const notReadyAddressesVirtual = notReadyAddresses.length > 100;

    return (
      <div className="EndpointSubsetList flex flex-col">
        {addresses.length > 0 && (
          <div>
            <div className="title flex gap-2">Addresses</div>
            <Table
              items={addresses}
              selectable={false}
              virtual={addressesVirtual}
              scrollable={false}
              getTableRow={this.getAddressTableRow}
              className="grow shrink-0 basis-0"
            >
              <TableHead>
                <TableCell className="ip">IP</TableCell>
                <TableCell className="host">Hostname</TableCell>
                <TableCell className="target">Target</TableCell>
              </TableHead>
              {!addressesVirtual && addresses.map((address) => this.getAddressTableRow(address.ip))}
            </Table>
          </div>
        )}

        {notReadyAddresses.length > 0 && (
          <div>
            <div className="title flex gap-2">Not Ready Addresses</div>
            <Table
              items={notReadyAddresses}
              selectable
              virtual={notReadyAddressesVirtual}
              scrollable={false}
              getTableRow={this.getNotReadyAddressTableRow}
              className="grow shrink-0 basis-0"
            >
              <TableHead>
                <TableCell className="ip">IP</TableCell>
                <TableCell className="host">Hostname</TableCell>
                <TableCell className="target">Target</TableCell>
              </TableHead>
              {!notReadyAddressesVirtual &&
                notReadyAddresses.map((address) => this.getNotReadyAddressTableRow(address.ip))}
            </Table>
          </div>
        )}

        <div className="title flex gap-2">Ports</div>
        <Table selectable={false} virtual={false} scrollable={false} className="grow shrink-0 basis-0">
          <TableHead>
            <TableCell className="port">Port</TableCell>
            <TableCell className="name">Name</TableCell>
            <TableCell className="protocol">Protocol</TableCell>
          </TableHead>
          {ports.map((port) => (
            // The same port number may be exposed under several protocols, so the number
            // alone is not a unique key.
            <TableRow key={`${port.port}-${port.protocol}`} nowrap>
              <TableCell className="name">{port.port}</TableCell>
              <TableCell className="name">{port.name}</TableCell>
              <TableCell className="node">{port.protocol}</TableCell>
            </TableRow>
          ))}
        </Table>
      </div>
    );
  }
}

export const EndpointSubsetList = withInjectables<Dependencies, EndpointSubsetListProps>(
  NonInjectedEndpointSubsetList,
  {
    getProps: (di, props) => ({
      ...props,
      apiManager: di.inject(apiManagerInjectable),
      getDetailsUrl: di.inject(getDetailsUrlInjectable),
    }),
  },
);
