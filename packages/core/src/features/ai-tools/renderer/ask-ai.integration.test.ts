/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { kubeEventApiInjectable } from "@freelensapp/kube-api-specifics";
import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { computed, observable, runInAction } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import activeKubernetesClusterInjectable from "../../../renderer/cluster-frame-context/active-kubernetes-cluster.injectable";
import hostedClusterInjectable from "../../../renderer/cluster-frame-context/hosted-cluster.injectable";
import hostedClusterIdInjectable from "../../../renderer/cluster-frame-context/hosted-cluster-id.injectable";
import callForLogsInjectable from "../../../renderer/components/dock/logs/call-for-logs.injectable";
import sendCommandInjectable from "../../../renderer/components/dock/terminal/send-command.injectable";
import { getDiForUnitTesting } from "../../../renderer/getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../../renderer/routes/currently-in-cluster-frame.injectable";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";
import { askAiInClusterChannel, detectAiToolsChannel, prepareAiLaunchChannel } from "../common/ai-tools";
import aiToolProvidersInjectable from "./ai-tool-providers.injectable";
import askAiDialogStateInjectable from "./ask-ai-dialog-state.injectable";
import buildAskAiPromptInjectable from "./build-ask-ai-prompt.injectable";
import launchAiToolInjectable from "./launch-ai-tool.injectable";
import openAskAiInjectable from "./open-ask-ai.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { Mock } from "vitest";

import type { AiToolDetection } from "../common/ai-tools";
import type { AskAiTarget } from "../common/ask-ai-request";

const podTarget: AskAiTarget = {
  type: "resource",
  resource: { kind: "Pod", apiVersion: "v1", name: "web-1", namespace: "shop", uid: "uid-1" },
  manifest: {
    apiVersion: "v1",
    kind: "Pod",
    metadata: { name: "web-1", namespace: "shop", managedFields: [{ manager: "x" }] },
    spec: { containers: [{ name: "web", env: [{ name: "DB_PASSWORD", value: "hunter2" }] }] },
    status: { phase: "Running" },
  },
};

describe("Ask AI", () => {
  let di: DiContainer;
  let requestFromChannel: Mock;
  let sendCommand: Mock;
  let listEvents: Mock;
  let callForLogs: Mock;
  let detection: AiToolDetection;

  beforeEach(() => {
    di = getDiForUnitTesting();

    detection = {
      id: "claude-code",
      status: "installed",
      executable: "claude",
      resolvedPath: "/usr/local/bin/claude",
    };

    requestFromChannel = vi.fn(async (channel: { id: string }, request: unknown) => {
      switch (channel.id) {
        case detectAiToolsChannel.id:
          return [detection];
        case prepareAiLaunchChannel.id:
          return {
            callWasSuccessful: true,
            response: {
              promptFilePath: "/tmp/prolens-ai-me/s1.md",
              tokenFilePath: "/tmp/prolens-ai-me/s1.token",
              sessionId: "s1",
            },
          };
        case askAiInClusterChannel.id:
          return { callWasSuccessful: true };
        default:
          throw new Error(`unexpected channel ${channel.id} ${JSON.stringify(request)}`);
      }
    });
    sendCommand = vi.fn(async () => {});
    listEvents = vi.fn(async () => [
      {
        type: "Warning",
        reason: "BackOff",
        count: 7,
        lastTimestamp: "2026-01-01T10:00:00Z",
        message: "Back-off restarting failed container web",
        involvedObject: { kind: "Pod", name: "web-1", namespace: "shop" },
      },
    ]);
    callForLogs = vi.fn(async (_pod: unknown, query?: { previous?: boolean }) =>
      query?.previous ? "panic: connection refused password=topsecret" : "starting server",
    );

    di.override(requestFromChannelInjectionToken, () => requestFromChannel as never);
    di.override(sendCommandInjectable, () => sendCommand);
    di.override(kubeEventApiInjectable, () => ({ list: listEvents }) as never);
    di.override(callForLogsInjectable, () => callForLogs);
    di.override(isWindowsInjectable, () => false);
    di.override(hostedClusterIdInjectable, () => "cluster-1");
    di.override(
      hostedClusterInjectable,
      () => ({ name: computed(() => "prod-eu"), contextName: observable.box("prod-eu-context") }) as never,
    );
  });

  describe("context handling", () => {
    it("sends only the manifest when the user leaves events and logs out", async () => {
      const prompt = await di.inject(buildAskAiPromptInjectable)({
        target: podTarget,
        question: "Why is this pod crashing?",
        sourceIds: ["manifest"],
        signal: new AbortController().signal,
      });

      expect(prompt).toContain("- Cluster: prod-eu");
      expect(prompt).toContain("- kubeconfig context: prod-eu-context");
      expect(prompt).toContain("- Namespace: shop");
      expect(prompt).toContain("phase: Running");
      expect(prompt).not.toContain("managedFields");
      expect(prompt).not.toContain("hunter2");
      expect(listEvents).not.toHaveBeenCalled();
      expect(callForLogs).not.toHaveBeenCalled();
    });

    it("adds the resource's events and its logs, redacted, when asked to", async () => {
      const prompt = await di.inject(buildAskAiPromptInjectable)({
        target: podTarget,
        question: "Why is this pod crashing?",
        sourceIds: ["manifest", "events", "logs"],
        signal: new AbortController().signal,
      });

      expect(listEvents).toHaveBeenCalledWith(
        { namespace: "shop" },
        { fieldSelector: ["involvedObject.kind=Pod", "involvedObject.name=web-1"] },
      );
      expect(prompt).toContain("Warning BackOff (x7) Pod shop/web-1: Back-off restarting failed container web");
      expect(callForLogs).toHaveBeenCalledWith(
        { name: "web-1", namespace: "shop" },
        { container: "web", tailLines: 200 },
        expect.anything(),
      );
      expect(prompt).toContain("starting server");
      expect(prompt).toContain("panic: connection refused password=<redacted>");
      expect(prompt).not.toContain("topsecret");
    });

    it("asks for cluster-wide warnings for the cluster", async () => {
      await di.inject(buildAskAiPromptInjectable)({
        target: { type: "cluster" },
        question: "Health?",
        sourceIds: ["events"],
        signal: new AbortController().signal,
      });

      expect(listEvents).toHaveBeenCalledWith({ namespace: "" }, { fieldSelector: "type=Warning" });
    });

    it("keeps going with a note when a source fails", async () => {
      listEvents.mockRejectedValue(new Error("forbidden"));

      const prompt = await di.inject(buildAskAiPromptInjectable)({
        target: podTarget,
        question: "q",
        sourceIds: ["events"],
        signal: new AbortController().signal,
      });

      expect(prompt).toContain("(ProLens could not collect this: Error: forbidden)");
    });
  });

  describe("launching", () => {
    const claude = () => di.inject(aiToolProvidersInjectable).find((provider) => provider.id === "claude-code")!;

    it("prepares a session for the cluster and runs the tool with its token, in plan mode", async () => {
      await di.inject(launchAiToolInjectable)(claude(), "the prompt");

      expect(requestFromChannel).toHaveBeenCalledWith(prepareAiLaunchChannel, {
        prompt: "the prompt",
        providerName: "Claude Code",
        clusterId: "cluster-1",
      });
      expect(sendCommand).toHaveBeenCalledWith(
        `exec env FREELENS_PROXY_TOKEN="$(cat '/tmp/prolens-ai-me/s1.token')" '/usr/local/bin/claude' '--permission-mode' 'plan' "$(cat '/tmp/prolens-ai-me/s1.md')"`,
        { enter: true, redactCommandFromLogs: true },
      );
    });

    it("refuses to launch outside a cluster frame", async () => {
      di.override(hostedClusterIdInjectable, () => undefined);

      await expect(di.inject(launchAiToolInjectable)(claude(), "p")).rejects.toThrow("Open a cluster");
      expect(sendCommand).not.toHaveBeenCalled();
    });

    it("uses the configured arguments", async () => {
      runInAction(() => {
        di.inject(userPreferencesStateInjectable).aiToolSettings = {
          "claude-code": { arguments: "--model opus {prompt}" },
        };
      });

      await di.inject(launchAiToolInjectable)(claude(), "p");

      expect(sendCommand.mock.calls[0][0]).toBe(
        `exec env FREELENS_PROXY_TOKEN="$(cat '/tmp/prolens-ai-me/s1.token')" '/usr/local/bin/claude' '--model' 'opus' "$(cat '/tmp/prolens-ai-me/s1.md')"`,
      );
    });

    it("refuses a tool that is not installed, without writing the prompt", async () => {
      detection = { id: "claude-code", status: "not-installed", executable: "claude" };

      await expect(di.inject(launchAiToolInjectable)(claude(), "p")).rejects.toThrow('("claude") was not found');
      expect(sendCommand).not.toHaveBeenCalled();
      expect(requestFromChannel).not.toHaveBeenCalledWith(prepareAiLaunchChannel, expect.anything());
    });
  });

  describe("opening", () => {
    it("opens the dialog of the cluster frame it is in", async () => {
      di.override(currentlyInClusterFrameInjectable, () => true);

      await di.inject(openAskAiInjectable)({ target: podTarget });

      expect(di.inject(askAiDialogStateInjectable).get()).toEqual({ target: podTarget });
    });

    it("forwards from the root frame to the frame of the active cluster", async () => {
      di.override(currentlyInClusterFrameInjectable, () => false);
      di.override(activeKubernetesClusterInjectable, () => computed(() => ({ getId: () => "cluster-1" }) as never));

      await di.inject(openAskAiInjectable)({ target: { type: "cluster" } });

      expect(requestFromChannel).toHaveBeenCalledWith(askAiInClusterChannel, {
        clusterId: "cluster-1",
        request: { target: { type: "cluster" } },
      });
    });

    it("tells the user to open a cluster when none is active", async () => {
      const showError = vi.fn();

      di.override(currentlyInClusterFrameInjectable, () => false);
      di.override(activeKubernetesClusterInjectable, () => computed(() => null));
      di.override(showErrorNotificationInjectable, () => showError);

      await di.inject(openAskAiInjectable)({ target: { type: "cluster" } });

      expect(showError).toHaveBeenCalledWith("Open a cluster to ask AI about it.");
      expect(requestFromChannel).not.toHaveBeenCalled();
    });
  });
});
