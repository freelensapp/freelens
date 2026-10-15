/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { IComputedValue } from "mobx";

import type { PageParam, PageParamInit } from "../navigation/page-param";

// Extensions-api -> Custom page registration

export interface PageRegistration {
  /**
   * Page ID, part of extension's page url, must be unique within same extension
   * When not provided, first registered page without "id" would be used for page-menus without target.pageId for same extension
   */
  id?: string;
  params?: PageParams<string | Omit<PageParamInit<any>, "name" | "prefix">>;
  components: PageComponents;
  enabled?: IComputedValue<boolean>;
}

export interface PageComponents {
  /**
   * Rendered with {@link PageComponentProps} and nothing else. A page that needs
   * anything more, such as the extension instance, gets it from the
   * registration: `Page: () => <MyPage extension={this} />`.
   */
  Page: React.ComponentType<PageComponentProps>;
}

export interface PageTarget {
  extensionId?: string;
  pageId?: string;
  params?: PageParams;
}

export interface PageParams<V = any> {
  [paramName: string]: V;
}

/**
 * The props the host renders a page component with: one `PageParam` for each
 * entry of {@link PageRegistration.params}, under the same name.
 *
 * `PageComponents.Page` takes the default form: the host knows the names of the
 * parameters only at runtime, so a component typed with named parameters in `P`
 * is not assignable to it.
 */
export interface PageComponentProps<P extends PageParams = PageParams> {
  params: {
    [N in keyof P]: PageParam<P[N]>;
  };
}

export interface RegisteredPage {
  id: string;
  extensionId: string;
  url: string; // registered extension's page URL (without page params)
  params: PageParams<PageParam<any>>; // normalized params
  components: PageComponents; // normalized components
}
