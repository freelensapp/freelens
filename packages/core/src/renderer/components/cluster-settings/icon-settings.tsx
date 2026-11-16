/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterIconSettingsComponentInjectionToken } from "@freelensapp/cluster-settings";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { computedInjectManyInjectionToken } from "@ogre-tools/injectable-extension-for-mobx";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { Avatar } from "../avatar";
import { FilePicker, OverSizeLimitStyle } from "../file-picker";
import { readIconFile } from "./read-icon-file";

import type { ClusterIconSettingsComponent } from "@freelensapp/cluster-settings";
import type { ShowNotification } from "@freelensapp/notifications";

import type { IComputedValue } from "mobx";

import type { KubernetesCluster } from "../../../common/catalog-entities";
import type { Cluster } from "../../../common/cluster/cluster";

export interface ClusterIconSettingProps {
  cluster: Cluster;
  entity: KubernetesCluster;
}

interface Dependencies {
  settingComponents: IComputedValue<ClusterIconSettingsComponent[]>;
  showErrorNotification: ShowNotification;
}

const NonInjectedClusterIconSetting = observer((props: ClusterIconSettingProps & Dependencies) => {
  const { cluster, entity } = props;

  const onIconPick = async ([file]: File[]) => {
    if (!file) {
      return;
    }

    try {
      cluster.preferences.icon = await readIconFile(file);
    } catch (e) {
      props.showErrorNotification(String(e));
    }
  };

  return (
    <div>
      <div className="file-loader flex flex-row items-center">
        <FilePicker
          accept="image/*"
          label={
            <Avatar
              colorHash={`${entity.getName()}-${entity.metadata.source}`}
              title={entity.getName()}
              shortName={entity.metadata.shortName}
              src={entity.spec.icon?.src}
              size={53}
              background={entity.spec.icon?.background}
            />
          }
          onOverSizeLimit={OverSizeLimitStyle.FILTER}
          handler={onIconPick}
        />
      </div>
      {props.settingComponents.get().map((item) => {
        return <item.Component key={item.id} preferences={cluster.preferences} />;
      })}
    </div>
  );
});

export const ClusterIconSetting = withInjectables<Dependencies, ClusterIconSettingProps>(
  NonInjectedClusterIconSetting,
  {
    getProps: (di, props) => {
      const computedInjectMany = di.inject(computedInjectManyInjectionToken);

      return {
        ...props,
        settingComponents: computedInjectMany(clusterIconSettingsComponentInjectionToken),
        showErrorNotification: di.inject(showErrorNotificationInjectable),
      };
    },
  },
);
