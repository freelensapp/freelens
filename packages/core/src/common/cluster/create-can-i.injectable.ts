/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// import { Agent } from "https";
import fetch from "@freelensapp/node-fetch";
import { ResponseContext, type AuthorizationV1Api, type V1ResourceAttributes } from "@freelensapp/kubernetes-client-node";
import { getInjectable } from "@ogre-tools/injectable";
import { loggerInjectionToken } from "@freelensapp/logger";
// import lensProxyCertificateInjectable from "../certificate/lens-proxy-certificate.injectable";

/**
 * Requests the permissions for actions on the kube cluster
 * @param resourceAttributes The descriptor of the action that is desired to be known if it is allowed
 * @returns `true` if the actions described are allowed
 */
export type CanI = (resourceAttributes: V1ResourceAttributes) => Promise<boolean>;

export type CreateCanI = (api: AuthorizationV1Api) => CanI;

export class Observable<T> {
  constructor(private promise: Promise<T>) {}

  toPromise() {
    return this.promise;
  }

  pipe<S>(callback: (value: T) => S | Promise<S>): Observable<S> {
    return new Observable(this.promise.then(callback));
  }
}

export class FetchHttpLibrary {
  public send(request: any): any {
    const method = request.getHttpMethod().toString();
    const body = request.getBody();

    const resultPromise = fetch(request.getUrl(), {
      method,
      body: body as any,
      headers: request.getHeaders(),
      agent: request.getAgent(),
    }).then((resp: any) => {
      const headers: { [name: string]: string } = {};

      resp.headers.forEach((value: string, name: string) => {
        headers[name] = value;
      });

      const body = {
        text: () => resp.text(),
        binary: () => resp.buffer(),
      };

      return new ResponseContext(resp.status, headers, body);
    });

    return new Observable(resultPromise);
  }
}

const createCanIInjectable = getInjectable({
  id: "create-can-i",
  instantiate: (di): CreateCanI => {
    const logger = di.inject(loggerInjectionToken);

    return (api) => async (resourceAttributes: V1ResourceAttributes): Promise<boolean> => {
      // const lensProxyCertificate = di.inject(lensProxyCertificateInjectable);
    
      // const agent = new Agent({
      //   ca: lensProxyCertificate.get().cert,
      // });
      
      // const originalSend = (api as any).api.configuration.httpApi.send;

      (api as any).api.configuration.httpApi = new FetchHttpLibrary();
      // console.log((api as any).api.configuration.httpApi.send);
      // .applyToHTTPSOptions({ agent });

      try {
        const data = await api.createSelfSubjectAccessReview({
          body: {
            apiVersion: "authorization.k8s.io/v1",
            kind: "SelfSubjectAccessReview",
            spec: { resourceAttributes },
          },
        });

        return data.status?.allowed ?? false;
      } catch (error) {
        logger.error(`[AUTHORIZATION-REVIEW]: failed to create access review: ${error}`, { resourceAttributes });
        console.log(error);
        console.log(api);
        console.log((api as any).api.configuration);

        return false;
      }
    };
  },
});

export default createCanIInjectable;
