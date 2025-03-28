import { BrowserRouter, Route, Routes } from "react-router-dom";
import WalletOverview from "./components/WalletOverview";
import PayoutRequestForm from "./components/PayoutRequestForm";
import AdminPayoutApproval from "./components/AdminPayoutApproval";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import { AdminProtected, UserProtected } from "./protected/Protected";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/signup" element={<RegisterForm />} />
        <Route
          path="/wallet"
          element={
            <UserProtected>
              <WalletOverview />
            </UserProtected>
          }
        />
        <Route
          path="/payout-request"
          element={
            <UserProtected>
              <PayoutRequestForm />
            </UserProtected>
          }
        />
        <Route
          path="/payout-handle"
          element={
            <AdminProtected>
              <AdminPayoutApproval />
            </AdminProtected>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
