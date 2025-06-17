import { startApplicationInjectionToken } from "@freelensapp/application";
import { registerFeature } from "@freelensapp/feature-core";
import { Discover, discoverFor } from "@freelensapp/react-testing-library-discovery";
import { createContainer, DiContainer, getInjectable } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { registerInjectableReact } from "@ogre-tools/injectable-react";
import type { RenderResult } from "@testing-library/react";
import { act, render } from "@testing-library/react";
import { computed, IObservableValue, observable, runInAction } from "mobx";
import React from "react";
import { clusterFrameChildComponentInjectionToken } from "./cluster-frame/cluster-frame-child-component-injection-token";
import { reactApplicationFeature } from "./feature";
import { reactApplicationChildrenInjectionToken } from "./react-application/react-application-children-injection-token";
import {
  ReactApplicationHigherOrderComponent,
  reactApplicationHigherOrderComponentInjectionToken,
} from "./react-application/react-application-higher-order-component-injection-token";
import renderInjectable from "./render-application/render.injectable";
import { rootFrameChildComponentInjectionToken } from "./root-frame/root-frame-child-component-injection-token";

const SomeContent = () => <div data-some-content-test>Some children</div>;

describe("react-application", () => {
  let rendered: RenderResult;
  let di: DiContainer;
  let discover: Discover;

  beforeEach(async () => {
    di = createContainer("some-container");

    registerInjectableReact(di);

    registerMobX(di);

    runInAction(() => {
      registerFeature(di, reactApplicationFeature);
    });

    di.override(renderInjectable, () => (application) => {
      rendered = render(application);
    });

    const startApplication = di.inject(startApplicationInjectionToken);

    await startApplication();

    discover = discoverFor(() => rendered);

    expect(clusterFrameChildComponentInjectionToken.id).toBe("cluster-frame-child-component");
    expect(rootFrameChildComponentInjectionToken.id).toBe("root-frame-child-component");
  });

  it("renders", () => {
    expect(rendered.baseElement).toMatchSnapshot();
  });

  describe("when content is registered and enabled", () => {
    let someObservable: IObservableValue<boolean>;

    beforeEach(() => {
      someObservable = observable.box(true);

      const someContentInjectable = getInjectable({
        id: "some-content",

        instantiate: () => ({
          id: "some-content",
          Component: SomeContent,
          enabled: computed(() => someObservable.get()),
        }),

        injectionToken: reactApplicationChildrenInjectionToken,
      });

      runInAction(() => {
        di.register(someContentInjectable);
      });
    });

    it("renders", () => {
      expect(rendered.baseElement).toMatchSnapshot();
    });

    it("renders the content", () => {
      const { discovered } = discover.getSingleElement("some-content");

      expect(discovered).not.toBeNull();
    });

    describe("when higher order component is registered", () => {
      beforeEach(() => {
        const SomeHigherOrderComponent: ReactApplicationHigherOrderComponent = ({ children }) => (
          <div data-some-higher-order-component-test>{children}</div>
        );

        const someHigherOrderComponentInjectable = getInjectable({
          id: "some-higher-order-component",

          instantiate: () => SomeHigherOrderComponent,

          injectionToken: reactApplicationHigherOrderComponentInjectionToken,
        });

        runInAction(() => {
          di.register(someHigherOrderComponentInjectable);
        });
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });

      it("renders the content inside the higher order component", () => {
        const { discovered } = discover
          .getSingleElement("some-higher-order-component")
          .getSingleElement("some-content");

        expect(discovered).not.toBeNull();
      });
    });

    describe("when content is disabled", () => {
      beforeEach(() => {
        act(() => {
          runInAction(() => {
            someObservable.set(false);
          });
        });
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });

      it("does not render the content", () => {
        const { discovered } = discover.querySingleElement("some-content");

        expect(discovered).toBeNull();
      });
    });
  });
});
