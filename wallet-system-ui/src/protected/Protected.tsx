import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { Navigate } from "react-router-dom";

export function AdminProtected({ children }: {children : any}) {
  const adminData = useSelector((state: RootState) => state.admin.adminData);

  if (!adminData) {
    return <Navigate to={"/"} />;
  }
  return children;
}


export function UserProtected({ children }: {children : any}) {
  const userData = useSelector((state: RootState) => state.user.userData);

  if (!userData) {
    return <Navigate to={"/"} />;
  }
  return children;
}
