import nodeFetch, {
  AbortError,
  Blob,
  blobFrom,
  blobFromSync,
  FetchError,
  File,
  FormData,
  fileFrom,
  fileFromSync,
  Headers,
  isRedirect,
  Request,
  Response,
} from "node-fetch";

const fetch = nodeFetch;
(fetch as any).AbortError = AbortError;
(fetch as any).Blob = Blob;
(fetch as any).blobFrom = blobFrom;
(fetch as any).blobFromSync = blobFromSync;
(fetch as any).FetchError = FetchError;
(fetch as any).Headers = Headers;
(fetch as any).File = File;
(fetch as any).fileFrom = fileFrom;
(fetch as any).fileFromSync = fileFromSync;
(fetch as any).FormData = FormData;
(fetch as any).Headers = Headers;
(fetch as any).isRedirect = isRedirect;
(fetch as any).Request = Request;
(fetch as any).Response = Response;

export * from "node-fetch";
export default fetch;
