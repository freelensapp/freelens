/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { anyObject } from "jest-mock-extended";
import { HelmChart } from "../endpoints/helm-charts.api";

describe("HelmChart tests", () => {
  describe("HelmChart.create() tests", () => {
    it("should throw on non-object input", () => {
      expect(() => HelmChart.create("" as never)).toThrow('"value" must be of type object');
      expect(() => HelmChart.create(1 as never)).toThrow('"value" must be of type object');
      expect(() => HelmChart.create(false as never)).toThrow('"value" must be of type object');
      expect(() => HelmChart.create([] as never)).toThrow('"value" must be of type object');
      expect(() => HelmChart.create(Symbol() as never)).toThrow('"value" must be of type object');
    });

    it("should throw on missing fields", () => {
      expect(() => HelmChart.create({} as never)).toThrow('"apiVersion" is required');
      expect(() =>
        HelmChart.create({
          apiVersion: "!",
        } as never),
      ).toThrow('"name" is required');
      expect(() =>
        HelmChart.create({
          apiVersion: "!",
          name: "!",
        } as never),
      ).toThrow('"version" is required');
      expect(() =>
        HelmChart.create({
          apiVersion: "!",
          name: "!",
          version: "!",
        } as never),
      ).toThrow('"repo" is required');
      expect(() =>
        HelmChart.create({
          apiVersion: "!",
          name: "!",
          version: "!",
          repo: "!",
        } as never),
      ).toThrow('"created" is required');
    });

    it("should throw on fields being wrong type", () => {
      expect(() =>
        HelmChart.create({
          apiVersion: 1,
          name: "!",
          version: "!",
          repo: "!",
          created: "!",
          digest: "!",
        } as never),
      ).toThrow('"apiVersion" must be a string');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: 1,
          version: "!",
          repo: "!",
          created: "!",
          digest: "!",
        } as never),
      ).toThrow('"name" must be a string');
      expect(() =>
        HelmChart.create({
          apiVersion: "!",
          name: "!",
          version: "!",
          repo: "!",
          created: "!",
          digest: 1,
        } as never),
      ).toThrow('"digest" must be a string');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "",
          version: 1,
          repo: "!",
          created: "!",
          digest: "!",
        } as never),
      ).toThrow('"version" must be a string');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "1",
          version: "1",
          repo: 1,
          created: "!",
          digest: "!",
        } as never),
      ).toThrow('"repo" must be a string');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "1",
          version: "1",
          repo: "1",
          created: 1,
          digest: "a",
        } as never),
      ).toThrow('"created" must be a string');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "1",
          version: "1",
          repo: "1",
          created: "!",
          digest: 1,
        } as never),
      ).toThrow('"digest" must be a string');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "1",
          version: "1",
          repo: "1",
          digest: "1",
          created: "!",
          kubeVersion: 1,
        } as never),
      ).toThrow('"kubeVersion" must be a string');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "1",
          version: "1",
          repo: "1",
          digest: "1",
          created: "!",
          description: 1,
        } as never),
      ).toThrow('"description" must be a string');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "1",
          version: "1",
          repo: "1",
          digest: "1",
          created: "!",
          home: 1,
        } as never),
      ).toThrow('"home" must be a string');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "1",
          version: "1",
          repo: "1",
          digest: "1",
          created: "!",
          engine: 1,
        } as never),
      ).toThrow('"engine" must be a string');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "1",
          version: "1",
          repo: "1",
          digest: "1",
          created: "!",
          icon: 1,
        } as never),
      ).toThrow('"icon" must be a string');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "1",
          version: "1",
          repo: "1",
          digest: "1",
          created: "!",
          appVersion: 1,
        } as never),
      ).toThrow('"appVersion" must be a string');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "1",
          version: "1",
          repo: "1",
          digest: "1",
          created: "!",
          tillerVersion: 1,
        } as never),
      ).toThrow('"tillerVersion" must be a string');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "1",
          version: "1",
          repo: "1",
          digest: "1",
          created: "!",
          deprecated: 1,
        } as never),
      ).toThrow('"deprecated" must be a boolean');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "1",
          version: "1",
          repo: "1",
          digest: "1",
          created: "!",
          keywords: 1,
        } as never),
      ).toThrow('"keywords" must be an array');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "1",
          version: "1",
          repo: "1",
          digest: "1",
          created: "!",
          sources: 1,
        } as never),
      ).toThrow('"sources" must be an array');
      expect(() =>
        HelmChart.create({
          apiVersion: "1",
          name: "1",
          version: "1",
          repo: "1",
          digest: "1",
          created: "!",
          maintainers: 1,
        } as never),
      ).toThrow('"maintainers" must be an array');
    });

    it("should filter non-string keywords", () => {
      const chart = HelmChart.create({
        apiVersion: "1",
        name: "1",
        version: "1",
        repo: "1",
        digest: "1",
        created: "!",
        keywords: [1, "a", false, {}, "b"] as never,
      });

      expect(chart?.keywords).toStrictEqual(["a", "b"]);
    });

    it("should filter non-string sources", () => {
      const chart = HelmChart.create({
        apiVersion: "1",
        name: "1",
        version: "1",
        repo: "1",
        digest: "1",
        created: "!",
        sources: [1, "a", false, {}, "b"] as never,
      });

      expect(chart?.sources).toStrictEqual(["a", "b"]);
    });

    it("should filter invalid maintainers", () => {
      const chart = HelmChart.create({
        apiVersion: "1",
        name: "1",
        version: "1",
        repo: "1",
        digest: "1",
        created: "!",
        maintainers: [
          {
            name: "a",
            email: "b",
            url: "c",
          },
        ] as never,
      });

      expect(chart?.maintainers).toStrictEqual([
        {
          name: "a",
          email: "b",
          url: "c",
        },
      ]);
    });

    it("should warn on unknown fields", () => {
      const { warn } = console;
      const warnFn = (console.warn = jest.fn());

      HelmChart.create({
        apiVersion: "1",
        name: "1",
        version: "1",
        repo: "1",
        digest: "1",
        created: "!",
        maintainers: [
          {
            name: "a",
            email: "b",
            url: "c",
          },
        ] as never,
        asdjhajksdhadjks: 1,
      } as never);

      expect(warnFn).toHaveBeenCalledWith("HelmChart data has unexpected fields", {
        original: anyObject(),
        unknownFields: ["asdjhajksdhadjks"],
      });
      console.warn = warn;
    });
  });
});
