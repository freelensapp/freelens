import { exec } from "child_process";
import { getInjectable } from "@ogre-tools/injectable";

export type Exec = typeof exec;

export const execInjectable = getInjectable({
  id: "exec",
  instantiate: () => exec,
});
