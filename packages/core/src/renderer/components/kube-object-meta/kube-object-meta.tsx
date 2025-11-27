/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import yaml from "js-yaml";
import { observer } from "mobx-react";
import React from "react";
import { Link } from "react-router-dom";
import apiManagerInjectable from "../../../common/k8s-api/api-manager/manager.injectable";
import { defaultYamlDumpOptions } from "../../../common/kube-helpers";
import { DrawerItem, DrawerItemLabels, DrawerParamToggler } from "../drawer";
import { DurationAbsoluteTimestamp } from "../events";
import getDetailsUrlInjectable from "../kube-detail-params/get-details-url.injectable";
import { KubeObjectAge } from "../kube-object/age";
import { LinkToNamespace } from "../kube-object-link";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { LocaleDate } from "../locale-date";
import { MonacoEditor } from "../monaco-editor";
import { WithTooltip } from "../with-tooltip";

import type { KubeMetaField } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";

import type { ApiManager } from "../../../common/k8s-api/api-manager";
import type { GetDetailsUrl } from "../kube-detail-params/get-details-url.injectable";

interface ManagedFieldsEntry {
  manager: string;
  operation: "Apply" | "Update";
  apiVersion?: string;
  time?: string;
  fieldsType?: string;
  fieldsV1?: unknown;
  subresource?: string;
}

export interface KubeObjectMetaProps {
  object: KubeObject;
  hideFields?: KubeMetaField[];
}

interface Dependencies {
  getDetailsUrl: GetDetailsUrl;
  apiManager: ApiManager;
  logger: Logger;
}

function ManagedFieldEntryLabel({ entry }: { entry: ManagedFieldsEntry }) {
  return (
    <WithTooltip tooltip={entry.time && <DurationAbsoluteTimestamp timestamp={entry.time} />}>
      {entry.manager}
      {": "}
      {entry.operation}
    </WithTooltip>
  );
}

const NonInjectedKubeObjectMeta = observer((props: Dependencies & KubeObjectMetaProps) => {
  const { apiManager, getDetailsUrl, object, hideFields = ["uid", "resourceVersion", "selfLink"], logger } = props;

  if (!object) {
    return null;
  }

  if (!(object instanceof KubeObject)) {
    logger.error("[KubeObjectMeta]: passed object that is not an instanceof KubeObject", object);

    return null;
  }

  const isHidden = (field: KubeMetaField) => hideFields.includes(field);

  const isManagedFieldsEntry = (entry: unknown): entry is ManagedFieldsEntry => {
    return (
      typeof entry === "object" &&
      entry !== null &&
      "manager" in entry &&
      typeof entry.manager === "string" &&
      entry.manager.length > 0 &&
      "operation" in entry &&
      typeof entry.operation === "string" &&
      entry.operation.length > 0
    );
  };

  const {
    selfLink,
    metadata: { creationTimestamp, deletionTimestamp, managedFields },
  } = object;
  const ownerRefs = object.getOwnerRefs();
  const namespace = object.getNs();

  return (
    <>
      <DrawerItem name="Created" hidden={isHidden("creationTimestamp") || !creationTimestamp}>
        <KubeObjectAge object={object} compact={false} withTooltip={false} />
        {" ago "}
        {creationTimestamp && (
          <>
            {"("}
            <LocaleDate date={creationTimestamp} />
            {")"}
          </>
        )}
      </DrawerItem>
      <DrawerItem name="Deleted" hidden={isHidden("deletionTimestamp") || !deletionTimestamp}>
        <DurationAbsoluteTimestamp timestamp={deletionTimestamp} />
      </DrawerItem>
      <DrawerItem name="Name" hidden={isHidden("name")}>
        {object.getName()}
        <KubeObjectStatusIcon key="icon" object={object} />
      </DrawerItem>
      <DrawerItem name="Namespace" hidden={isHidden("namespace") || !namespace}>
        <LinkToNamespace namespace={namespace} />
      </DrawerItem>
      <DrawerItem name="UID" hidden={isHidden("uid")}>
        {object.getId()}
      </DrawerItem>
      <DrawerItem name="Link" hidden={isHidden("selfLink")}>
        {selfLink}
      </DrawerItem>
      <DrawerItem name="Resource Version" hidden={isHidden("resourceVersion")}>
        {object.getResourceVersion()}
      </DrawerItem>
      <DrawerItemLabels name="Labels" labels={object.getLabels()} hidden={isHidden("labels")} />
      <DrawerItemLabels name="Annotations" labels={object.getAnnotations()} hidden={isHidden("annotations")} />
      <DrawerItemLabels name="Finalizers" labels={object.getFinalizers()} hidden={isHidden("finalizers")} />
      {ownerRefs?.length > 0 && (
        <DrawerItem name="Controlled By" hidden={isHidden("ownerReferences")}>
          {ownerRefs.map((ref) => (
            <p key={ref.name}>
              {`${ref.kind} `}
              <Link to={getDetailsUrl(apiManager.lookupApiLink(ref, object))}>{ref.name}</Link>
            </p>
          ))}
        </DrawerItem>
      )}
      {managedFields && managedFields.length > 0 && (
        <DrawerItem name="Managed Fields" hidden={isHidden("managedFields")}>
          {managedFields.filter(isManagedFieldsEntry).map((entry) => (
            <DrawerParamToggler
              label={<ManagedFieldEntryLabel entry={entry} />}
              key={`${entry.manager}-${entry.operation}`}
            >
              <MonacoEditor
                readOnly
                style={{ height: 200 }}
                value={yaml.dump(entry.fieldsV1, defaultYamlDumpOptions)}
              />
            </DrawerParamToggler>
          ))}
        </DrawerItem>
      )}
    </>
  );
});

export const KubeObjectMeta = withInjectables<Dependencies, KubeObjectMetaProps>(NonInjectedKubeObjectMeta, {
  getProps: (di, props) => ({
    ...props,
    getDetailsUrl: di.inject(getDetailsUrlInjectable),
    apiManager: di.inject(apiManagerInjectable),
    logger: di.inject(loggerInjectionToken),
  }),
});
