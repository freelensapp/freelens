import { computedInjectManyInjectable } from "@ogre-tools/injectable-extension-for-mobx";
import { withInjectables } from "@ogre-tools/injectable-react";
import { Observer, observer } from "mobx-react";
import React from "react";
import {
  ReactApplicationChildren,
  reactApplicationChildrenInjectionToken,
} from "./react-application-children-injection-token";

import type { IComputedValue } from "mobx";

type Dependencies = { contents: IComputedValue<ReactApplicationChildren[]> };

const NonInjectedContent = observer(({ contents }: Dependencies) => (
  <>
    {contents.get().map((child) => (
      <Observer key={child.id}>{() => (child.enabled.get() ? <child.Component /> : null)}</Observer>
    ))}
  </>
));

export const ReactApplicationContent = withInjectables<Dependencies>(
  NonInjectedContent,

  {
    getProps: (di) => ({
      contents: di.inject(computedInjectManyInjectable)(reactApplicationChildrenInjectionToken),
    }),
  },
);
