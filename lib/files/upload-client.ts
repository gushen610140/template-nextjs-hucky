/**
 * 浏览器直传对象存储。
 *
 * 用 XHR 而不是 fetch: 只有 XHR 提供上传进度事件。
 * 预签名 URL 的 Content-Type 参与签名, 必须和签名时一致。
 */
export function putToStorage(
  url: string,
  contentType: string,
  body: Blob,
  onProgress: (ratio: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(event.loaded / event.total);
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.send(body);
  });
}
