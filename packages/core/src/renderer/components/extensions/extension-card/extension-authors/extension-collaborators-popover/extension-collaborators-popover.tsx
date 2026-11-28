import { Icon } from "@freelensapp/icon";
import { withTooltip } from "@freelensapp/tooltip";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import openLinkInBrowserInjectable from "../../../../../../common/utils/open-link-in-browser.injectable";
import { authorKey, fullNameOf, initialsOf, isGithubUrl } from "../extension-author-helpers";
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

const AuthorLink: React.FC<{ url: string; openLinkInBrowser: OpenLinkInBrowser }> = ({ url, openLinkInBrowser }) => {
  const isGithub = isGithubUrl(url);

  return (
    <button
      type="button"
      className={styles.linkButton}
      aria-label={isGithub ? "github" : "website"}
      onClick={() => void openLinkInBrowser(url)}
    >
      {isGithub ? <GithubIcon className={styles.icon} /> : <Icon material="language" className={styles.icon} />}
    </button>
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
      <div className={styles.list}>
        {authors.map((a) => (
          <div key={authorKey(a)} className={styles.row}>
            <span className={styles.avatar}>{initialsOf(a)}</span>
            <AuthorName name={fullNameOf(a)} />
            {!disabled && a.url && <AuthorLink url={a.url} openLinkInBrowser={openLinkInBrowser} />}
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
