/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { type IObservableArray, type IObservableValue, observable, runInAction, toJS } from "mobx";
import * as uuid from "uuid";
import { getShortName } from "../../../../common/catalog/helpers";

import type { CatalogEntity } from "../../../../common/catalog";
import type { CreateHotbarData, HotbarItem } from "./types";

export interface HotbarData {
  readonly id: string;
  readonly name: string;
  readonly items: HotbarItem[];
}

export class Hotbar {
  readonly id: string;
  readonly name: IObservableValue<string>;
  readonly items: IObservableArray<HotbarItem>;

  constructor(data: CreateHotbarData) {
    this.id = data.id ?? uuid.v4();
    this.name = observable.box(data.name);
    this.items = observable.array(data.items?.filter((item): item is HotbarItem => item !== null) ?? []);
  }

  hasEntity(entityId: string) {
    return this.items.findIndex((item) => item?.entity.uid === entityId) >= 0;
  }

  restack(from: number, to: number) {
    if (from < 0 || to < 0 || from >= this.items.length || to >= this.items.length || isNaN(from) || isNaN(to)) {
      throw new Error("Invalid 'from' or 'to' arguments");
    }

    runInAction(() => {
      if (from == to) {
        return;
      }

      const [source] = this.items.splice(from, 1);

      this.items.splice(to, 0, source);
    });
  }

  toggleEntity(item: CatalogEntity) {
    runInAction(() => {
      if (this.hasEntity(item.getId())) {
        this.removeEntity(item.getId());
      } else {
        this.addEntity(item);
      }
    });
  }

  removeEntity(uid: string) {
    runInAction(() => {
      const index = this.items.findIndex((item) => item?.entity.uid === uid);

      if (index < 0) {
        return;
      }

      this.items.splice(index, 1);
    });
  }

  addEntity(item: CatalogEntity) {
    const uid = item.getId();
    const name = item.getName();
    const shortName = getShortName(item);

    if (typeof uid !== "string") {
      throw new TypeError("CatalogEntity's ID must be a string");
    }

    if (typeof name !== "string") {
      throw new TypeError("CatalogEntity's NAME must be a string");
    }

    if (typeof shortName !== "string") {
      throw new TypeError("CatalogEntity's SHORT_NAME must be a string");
    }

    if (this.hasEntity(item.getId())) {
      return;
    }

    const entity = {
      uid,
      name,
      source: item.metadata.source,
      shortName,
    };
    const newItem = { entity };

    runInAction(() => {
      this.items.push(newItem);
    });
  }

  toJSON(): HotbarData {
    return {
      id: this.id,
      items: toJS(this.items),
      name: this.name.get(),
    };
  }
}
