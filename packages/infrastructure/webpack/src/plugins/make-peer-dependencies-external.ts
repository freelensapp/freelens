import { readJsonSync } from "fs-extra";
import path from "path";
// @ts-ignore
import ExternalModuleFactoryPlugin from "webpack/lib/ExternalModuleFactoryPlugin";
import { toModuleMatcherRegExp } from "./to-module-matcher-reg-exp/to-module-matcher-reg-exp";

export class MakePeerDependenciesExternalPlugin {
  apply(compiler: any) {
    compiler.hooks.compile.tap("compile", (params: any) => {
      const peerDependencies = getPeerDependencies();

      new ExternalModuleFactoryPlugin(
        compiler.options.output.library.type,
        peerDependencies.map(toModuleMatcherRegExp),
      ).apply(params.normalModuleFactory);
    });
  }
}

const getPeerDependencies = () => {
  const pathToPackageJson = path.resolve(process.cwd(), "package.json");

  const packageJson = readJsonSync(pathToPackageJson);

  return Object.keys(packageJson.peerDependencies || {});
};
