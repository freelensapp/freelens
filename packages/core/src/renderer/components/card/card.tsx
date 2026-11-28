/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./card.scss";

import { cssNames } from "@freelensapp/utilities";

import type { StrictReactNode } from "@freelensapp/utilities";

export interface CardProps {
  /** Makes the whole card a button that calls it, from a click and from the keyboard. */
  onClick?: () => void;
  /**
   * The name of the card. A card that is not a button is a region named by it; a card that is a
   * button is named by its content unless this is given.
   */
  "aria-label"?: string;
  className?: string;
  "data-testid"?: string;
  children?: StrictReactNode;
}

/**
 * The panel the cards of the host are drawn on: a square panel without a border, in the colors of
 * the active theme, which shows a hover and a focus when it is a button. A card that has buttons of
 * its own inside it is not a button itself.
 */
export const Card = ({ onClick, "aria-label": ariaLabel, className, "data-testid": testId, children }: CardProps) => {
  if (onClick) {
    return (
      <button
        type="button"
        className={cssNames("Card", className)}
        onClick={onClick}
        aria-label={ariaLabel}
        data-testid={testId}
      >
        {children}
      </button>
    );
  }

  return (
    <section className={cssNames("Card", className)} aria-label={ariaLabel} data-testid={testId}>
      {children}
    </section>
  );
};
