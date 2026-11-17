/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { StatusCard } from "../../../../../../renderer/components/overview-cards";
import { WorkloadStatusChart } from "../../../../../../renderer/components/workloads-overview/overview-workload-status";
import { toStatusCardStatuses } from "../../../../../../renderer/components/workloads-overview/workload-status-cards";
import overviewStyleInjectable from "../../../../../user-preferences/common/overview-style.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import styles from "./overview-style.module.scss";

import type { IComputedValue } from "mobx";
import type { ReactElement } from "react";

import type { WorkloadStatus } from "../../../../../../renderer/components/workloads-overview/overview-workload-status";
import type { OverviewStylePreference } from "../../../../../user-preferences/common/preferences-helpers";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  overviewStyle: IComputedValue<OverviewStylePreference>;
}

// The same pods in both previews, so that they compare the two styles and nothing else.
const sampleTitle = "Pods";
const sampleStatus: WorkloadStatus = { running: 12, pending: 2, failed: 1 };
const sampleTotal = 15;

const CardsPreview = () => <StatusCard title={sampleTitle} statuses={toStatusCardStatuses(sampleStatus)} />;

const ChartsPreview = () => (
  <div className={styles.chart}>
    <div className={styles.chartTitle}>{`${sampleTitle} (${sampleTotal})`}</div>
    <WorkloadStatusChart status={sampleStatus} />
  </div>
);

interface OverviewStyleOption {
  value: OverviewStylePreference;
  label: string;
  Preview: () => ReactElement;
  stageClassName: string;
}

const options: OverviewStyleOption[] = [
  { value: "charts", label: "Charts", Preview: ChartsPreview, stageClassName: styles.chartsStage },
  { value: "cards", label: "Cards", Preview: CardsPreview, stageClassName: styles.cardsStage },
];

const NonInjectedOverviewStyle = observer(({ state, overviewStyle }: Dependencies) => {
  const selected = overviewStyle.get();

  return (
    <section id="overview-style">
      <SubTitle title="Overview style" id="overview-style-title" />
      <div className={styles.options} role="radiogroup" aria-labelledby="overview-style-title">
        {options.map(({ value, label, Preview, stageClassName }) => (
          // The whole tile is the control: a click anywhere on it selects the radio inside, and the
          // radios of one name are a group the arrow keys move through.
          <label
            key={value}
            className={cssNames(styles.option, { [styles.selected]: value === selected })}
            data-testid={`overview-style-${value}`}
          >
            <input
              type="radio"
              className="sr-only"
              name="overview-style"
              value={value}
              checked={value === selected}
              onChange={() => (state.overviewStyle = value)}
            />
            {/* A picture of the style: the real components, at half their size, in the active theme. */}
            <span className={styles.preview} aria-hidden inert data-testid={`overview-style-preview-${value}`}>
              <span className={cssNames(styles.stage, stageClassName)}>
                <Preview />
              </span>
            </span>
            <span className={styles.label}>{label}</span>
          </label>
        ))}
      </div>
      <small className="hint">
        How the cluster and workloads overviews show their numbers: as ring and pie charts, or as cards.
      </small>
    </section>
  );
});

export const OverviewStyle = withInjectables<Dependencies>(NonInjectedOverviewStyle, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    overviewStyle: di.inject(overviewStyleInjectable),
  }),
});
