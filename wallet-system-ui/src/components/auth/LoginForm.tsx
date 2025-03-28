import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { userLogin } from "../../store/userSlice";
import { Link } from "react-router-dom";
import { adminLogin } from "../../store/adminSlice";

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.post(
        "http://localhost:3030/api/user/login",
        { username, role }
      );
      if (role == "admin") {
        dispatch(adminLogin(response.data.user));
        navigate("/payout-handle");
      } else {
        dispatch(userLogin(response.data.user));
        navigate("/wallet");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to login");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Login
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Username:
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </label>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Role:
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "admin")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-200"
        >
          Login
        </button>
      </form>
      <Link to={"/signup"} className="mt-4 text-center  text-sm font-medium">
        signup
      </Link>
      {error && (
        <p className="mt-4 text-center text-red-600 text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
};

export default LoginForm;
