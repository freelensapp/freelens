/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./details.scss";

import { CustomResourceDefinition, KubeObject } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { cssNames, safeJSONPathValue } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { startCase } from "es-toolkit";
import { observer } from "mobx-react";
import React from "react";
import { BadgeBoolean } from "../badge";
import { DrawerItem } from "../drawer";
import { Input } from "../input";
import { KubeObjectConditionsDrawer } from "../kube-object-conditions";
import { CustomResourceColumnOfExtension } from "./custom-resource-column-of-extension";
import customResourceColumnsOfExtensionsInjectable from "./custom-resource-columns-of-extensions.injectable";
import { getPrinterColumnsOfObject } from "./printer-columns";

import type { AdditionalPrinterColumnsV1 } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";
import type { StrictReactNode } from "@freelensapp/utilities";

import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { GetCustomResourceColumnsOfExtensions } from "./custom-resource-columns-of-extensions.injectable";

export interface CustomResourceDetailsProps extends KubeObjectDetailsProps<KubeObject> {
  crd?: CustomResourceDefinition;
}

function convertSpecValue(value: unknown): StrictReactNode {
  if (Array.isArray(value)) {
    return (
      <ul>
        {value.map((value, index) => (
          <li key={index}>{convertSpecValue(value)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    return (
      <Input
        readOnly
        multiLine
        theme="round-black"
        className="grow shrink-0 basis-0"
        value={JSON.stringify(value, null, 2)}
      />
    );
  }

  if (typeof value === "boolean") {
    return <BadgeBoolean value={value} />;
  }

  if (typeof value === "string" || typeof value === "number") {
    return value.toString();
  }

  return null;
}

interface Dependencies {
  logger: Logger;
  getCustomResourceColumnsOfExtensions: GetCustomResourceColumnsOfExtensions;
}

@observer
class NonInjectedCustomResourceDetails extends React.Component<CustomResourceDetailsProps & Dependencies> {
  renderAdditionalColumns(resource: KubeObject, columns: AdditionalPrinterColumnsV1[]) {
    const columnsOfExtensions = this.props.getCustomResourceColumnsOfExtensions(resource.kind, resource.apiVersion);

    return columns.map((column) => {
      const ofExtension = columnsOfExtensions.get(column.name);

      if (ofExtension?.column.hidden) {
        return null;
      }

      const value = convertSpecValue(safeJSONPathValue(resource, column.jsonPath));

      return (
        <DrawerItem key={column.name} name={startCase(column.name)}>
          {ofExtension?.column.Render ? (
            <CustomResourceColumnOfExtension
              object={resource}
              column={column}
              extensionName={ofExtension.extensionName}
              Render={ofExtension.column.Render}
              fallback={value}
            />
          ) : (
            value
          )}
        </DrawerItem>
      );
    });
  }

  render() {
    const {
      props: { object, crd, logger },
    } = this;

    if (!object) {
      return null;
    }

    if (!(object instanceof KubeObject)) {
      logger.error("[CrdResourceDetails]: passed object that is not an instanceof KubeObject", object);

      return null;
    }

    if (crd && !(crd instanceof CustomResourceDefinition)) {
      logger.error("[CrdResourceDetails]: passed crd that is not an instanceof CustomResourceDefinition", crd);

      return null;
    }

    // Without a definition, as for a user who may not list them, there are no
    // printer columns to show. With one, those of the object's version.
    const extraColumns = crd ? getPrinterColumnsOfObject(crd, object) : [];

    return (
      <div className={cssNames("CustomResourceDetails", crd?.getResourceKind() ?? object.kind)}>
        {this.renderAdditionalColumns(object, extraColumns)}
        <KubeObjectConditionsDrawer object={object} />
      </div>
    );
  }
}

export const CustomResourceDetails = withInjectables<Dependencies, CustomResourceDetailsProps>(
  NonInjectedCustomResourceDetails,
  {
    getProps: (di, props) => ({
      ...props,
      logger: di.inject(loggerInjectionToken),
      getCustomResourceColumnsOfExtensions: di.inject(customResourceColumnsOfExtensionsInjectable),
    }),
  },
);
