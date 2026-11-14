/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import { Dialog } from "../../../renderer/components/dialog";
import focusWindowInjectable from "../../../renderer/navigation/focus-window.injectable";
import styles from "./ai-approval-dialog.module.scss";
import aiApprovalsStateInjectable from "./ai-approvals-state.injectable";
import answerAiApprovalInjectable from "./answer-ai-approval.injectable";

import type { IObservableArray } from "mobx";

import type { AiApprovalRequest } from "../common/ai-tools";
import type { AnswerAiApproval } from "./answer-ai-approval.injectable";

interface Dependencies {
  approvals: IObservableArray<AiApprovalRequest>;
  answer: AnswerAiApproval;
  focusWindow: () => void;
}

const reasons: Record<AiApprovalRequest["reason"], string> = {
  mutation: "This changes the cluster.",
  interactive: "This opens an interactive channel into the cluster (exec, attach, port-forward or proxy).",
  secret: "This reveals the values of Secrets.",
};

const NonInjectedAiApprovalDialog = observer(({ approvals, answer, focusWindow }: Dependencies) => {
  const current = approvals[0];
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!current) return undefined;

    focusWindow();

    const timer = setInterval(() => {
      setNow(Date.now());

      // Main has already denied it; only the prompt is left to remove.
      if (Date.now() >= current.expiresAt) {
        void answer(current.id, false);
      }
    }, 1_000);

    return () => clearInterval(timer);
  }, [current?.id]);

  const deny = () => current && void answer(current.id, false);
  const seconds = current ? Math.max(0, Math.round((current.expiresAt - now) / 1000)) : 0;

  return (
    <Dialog isOpen={Boolean(current)} close={deny} className="AiApprovalDialog" data-testid="ai-approval-dialog">
      {current && (
        <div className={styles.dialog}>
          <div className={styles.header}>
            <h2>Approve AI action?</h2>
            <p>
              <strong>{current.providerName}</strong> wants to act on cluster <strong>{current.clusterName}</strong>.{" "}
              {reasons[current.reason]}
            </p>
          </div>
          <div className={styles.body}>
            <div className={styles.action} data-testid="ai-approval-action">
              {current.action}
            </div>
            <div className={styles.request} title={current.path}>
              {current.method} {current.path}
            </div>
            <div className={styles.hint}>
              Only this one request is allowed. Denied automatically in {seconds}s.
              {approvals.length > 1 && ` ${approvals.length - 1} more waiting.`}
            </div>
          </div>
          <div className={styles.footer}>
            <span className={styles.spacer} />
            <Button plain label="Deny" autoFocus onClick={deny} data-testid="ai-approval-deny" />
            <Button
              accent
              label="Allow once"
              onClick={() => void answer(current.id, true)}
              data-testid="ai-approval-allow"
            />
          </div>
        </div>
      )}
    </Dialog>
  );
});

export const AiApprovalDialog = withInjectables<Dependencies>(NonInjectedAiApprovalDialog, {
  getProps: (di) => ({
    approvals: di.inject(aiApprovalsStateInjectable),
    answer: di.inject(answerAiApprovalInjectable),
    focusWindow: di.inject(focusWindowInjectable),
  }),
});
