import React, { useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useNavigate } from "react-router-dom";

interface PayoutResponse {
  transaction: {
    _id: string;
    userId: string;
    receiverId: string;
    walletId: string;
    amount: number;
    status: string;
  };
  message: string;
}

const PayoutRequestForm: React.FC = () => {
  const navigate = useNavigate();
  const [receiverId, setReceiverId] = useState("");
  const { id } = useSelector((state: RootState) => state.user.userData);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const response = await axios.post<PayoutResponse>(
        "http://localhost:3030/api/user/payout",
        { userId: id, receiverId, amount: parseFloat(amount) }
      );
      setMessage(response.data.message);
      setReceiverId("");
      setAmount("");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to submit payout request");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Request Payout
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Receiver ID:
            <input
              type="text"
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </label>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Amount:
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </label>
        </div>
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-200"
        >
          Submit Payout
        </button>
        <button
          onClick={() => navigate(-1)}
          className="w-full bg-slate-800 text-white py-2 px-4 rounded-md hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-200"
        >
          Go back
        </button>
      </form>
      {message && (
        <p className="mt-4 text-center text-green-600 text-sm font-medium">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 text-center text-red-600 text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
};

export default PayoutRequestForm;
