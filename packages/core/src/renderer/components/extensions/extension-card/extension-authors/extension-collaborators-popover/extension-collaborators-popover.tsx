import { Icon } from "@freelensapp/icon";
import { withTooltip } from "@freelensapp/tooltip";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import openLinkInBrowserInjectable from "../../../../../../common/utils/open-link-in-browser.injectable";
import { authorKey, avatarClassFor, fullNameOf, initialsOf, toHttpUrl } from "../extension-author-helpers";
import { GithubIcon } from "../github-icon/github-icon";
import styles from "./extension-collaborators-popover.module.scss";
import { useAuthorName } from "./use-author-name.hook";
import { useExtensionCollaboratorsPopover } from "./use-extension-collaborators-popover.hook";

import type { StrictReactNode } from "@freelensapp/utilities";
import type { OpenLinkInBrowser } from "../../../../../../common/utils/open-link-in-browser.injectable";
import type { MarketplaceExtensionAuthor } from "../../../marketplace-extensions/marketplace-extensions.injectable";

export interface ExtensionCollaboratorsPopoverProps {
  authors: MarketplaceExtensionAuthor[];
  onDismiss: () => void;
  disabled?: boolean;
}

interface Dependencies {
  openLinkInBrowser: OpenLinkInBrowser;
}

interface TooltipableNameProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: StrictReactNode;
}

const TooltipableName = withTooltip(({ className, children, ...elemProps }: TooltipableNameProps) => (
  <span className={className} {...elemProps}>
    {children}
  </span>
));

const AuthorName: React.FC<{ name: string }> = ({ name }) => {
  const { ref, needsTooltip } = useAuthorName({ name });

  if (needsTooltip) {
    return (
      <TooltipableName tooltip={name} className={styles.authorName}>
        {name}
      </TooltipableName>
    );
  }

  return (
    <span ref={ref} className={styles.authorName}>
      {name}
    </span>
  );
};

const NonInjectedExtensionCollaboratorsPopover = ({
  authors,
  onDismiss,
  disabled,
  openLinkInBrowser,
}: ExtensionCollaboratorsPopoverProps & Dependencies) => {
  const { popoverRef } = useExtensionCollaboratorsPopover({ onDismiss });

  return (
    <div
      ref={popoverRef}
      className={`${styles.popover} ${disabled ? styles.disabled : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Collaborators"
      data-testid="collaborators-popover"
    >
      {disabled && <div className={styles.disabledVeil} />}
      <div className={styles.list}>
        {authors.map((a) => (
          <div key={authorKey(a)} className={styles.row}>
            <span className={`${styles.avatar} ${styles[avatarClassFor(a.name)]}`}>{initialsOf(a)}</span>
            <AuthorName name={fullNameOf(a)} />
            {!disabled && a.github && (
              <button
                type="button"
                className={styles.linkButton}
                aria-label="github"
                onClick={() => void openLinkInBrowser(toHttpUrl(a.github!))}
              >
                <GithubIcon className={styles.icon} />
              </button>
            )}
            {!disabled && a.website && (
              <button
                type="button"
                className={styles.linkButton}
                aria-label="website"
                onClick={() => void openLinkInBrowser(toHttpUrl(a.website!))}
              >
                <Icon material="language" className={styles.icon} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ExtensionCollaboratorsPopover = withInjectables<Dependencies, ExtensionCollaboratorsPopoverProps>(
  NonInjectedExtensionCollaboratorsPopover,
  {
    getProps: (di, props) => ({
      ...props,
      openLinkInBrowser: di.inject(openLinkInBrowserInjectable),
    }),
  },
);
