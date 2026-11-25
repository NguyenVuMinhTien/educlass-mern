import axios from "axios";
import { useEffect, useState } from "react";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  withCredentials: true,
});
export const errorMessage = (error) => {
  const body = error.response?.data;
  return (
    body?.errors?.[0]?.message ||
    body?.message ||
    "Không thể kết nối. Hãy thử lại."
  );
};
export async function call(method, path, data, options) {
  const response = await api.request({ method, url: path, data, ...options });
  return response.data.data;
}
export function useData(path, version = 0) {
  const [state, setState] = useState({
    path,
    version,
    loading: Boolean(path),
    data: null,
    error: null,
  });
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    call("GET", path, undefined, { signal: controller.signal })
      .then((data) =>
        setState({ path, version, data, loading: false, error: null }),
      )
      .catch((error) => {
        if (!axios.isCancel(error))
          setState({ path, version, data: null, loading: false, error });
      });
    return () => controller.abort();
  }, [path, version]);
  if (!path) return { data: null, error: null, loading: false };
  return state.path === path && state.version === version
    ? state
    : { data: null, error: null, loading: true };
}
export function query(path, params) {
  const search = new URLSearchParams(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== undefined && value !== null,
    ),
  );
  return search.size ? path + "?" + search : path;
}
export function formBody(value) {
  const body = new FormData();
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined && item !== null && item !== "")
      body.append(key, item);
    if (key === "textContent" && item === "") body.append(key, "");
    if (key === "lessonId" && item === "") body.append(key, "");
  }
  return body;
}
export async function download(path) {
  let response;
  try {
    response = await api.get(path, { responseType: "blob" });
  } catch (error) {
    const body = error.response?.data;
    if (body instanceof Blob && body.type.includes("application/json")) {
      try {
        error.response.data = JSON.parse(await body.text());
      } catch {
        /* Keep the default error message. */
      }
    }
    throw error;
  }
  const disposition = response.headers["content-disposition"] || "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const filename = encoded
    ? decodeURIComponent(encoded[1])
    : disposition.match(/filename="?([^";]+)"?/i)?.[1] || "tai-lieu";
  const href = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
export const fileUrl = (path) => api.defaults.baseURL.replace(/\/$/, "") + path;
