/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { object } from "@freelensapp/utilities";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import createPageParamInjectable from "../navigation/create-page-param.injectable";

import type { LensRendererExtension } from "../../extensions/lens-renderer-extension";
import type { PageParamInit } from "../navigation/page-param";
import type { PageRegistration } from "./page-registration";

export interface ExtensionPageParametersInstantiationParam {
  extension: LensRendererExtension;
  registration: PageRegistration;
}

const extensionPageParametersInjectable = getInjectable({
  id: "extension-page-parameters",

  instantiate: (di, { registration }: ExtensionPageParametersInstantiationParam) => {
    const createPageParam = di.inject(createPageParamInjectable);

    return object.fromEntries(
      Object.entries(registration.params ?? {})
        .map(([key, value]): [string, PageParamInit<unknown>] => [
          key,
          typeof value === "string"
            ? convertStringToPageParamInit(key, value)
            : convertPartialPageParamInitToFull(key, value),
        ])
        .map(([key, value]) => [key, createPageParam(value)] as const),
    );
  },

  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, { extension, registration }: ExtensionPageParametersInstantiationParam) =>
      `${extension.sanitizedExtensionId}-${registration?.id}`,
  }),
});

const convertPartialPageParamInitToFull = <V>(
  key: string,
  value: Omit<PageParamInit<V>, "name" | "prefix">,
): PageParamInit<V> => ({
  name: key,
  defaultValue: value.defaultValue,
  stringify: value.stringify,
  parse: value.parse,
});

const convertStringToPageParamInit = (key: string, value: string): PageParamInit<string> => ({
  name: key,
  defaultValue: value,
});

export default extensionPageParametersInjectable;
