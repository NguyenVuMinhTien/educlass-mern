import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { api, call } from "./api.js";
import { Loading } from "./ui.jsx";

const Auth = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let current = true;
    const middleware = api.interceptors.response.use(
      (result) => result,
      (error) => {
        if (
          error.response?.status === 401 &&
          !error.config?.url?.startsWith("/auth/")
        )
          setUser(null);
        return Promise.reject(error);
      },
    );
    call("GET", "/auth/me")
      .then((account) => {
        if (current) setUser(account);
      })
      .catch(() => {})
      .finally(() => {
        if (current) setReady(true);
      });
    return () => {
      current = false;
      api.interceptors.response.eject(middleware);
    };
  }, []);
  async function signIn(mode, data) {
    const account = await call("POST", "/auth/" + mode, data);
    setUser(account);
    return account;
  }
  async function signOut() {
    await call("POST", "/auth/logout");
    setUser(null);
  }
  return (
    <Auth.Provider value={{ user, setUser, ready, signIn, signOut }}>
      {children}
    </Auth.Provider>
  );
}
export const useAuth = () => useContext(Auth);
export function RequireRole({ roles }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (!user)
    return (
      <Navigate
        replace
        to="/dang-nhap"
        state={{ next: location.pathname + location.search }}
      />
    );
  if (roles && !roles.includes(user.role))
    return <Navigate replace to="/403" />;
  return <Outlet />;
}
