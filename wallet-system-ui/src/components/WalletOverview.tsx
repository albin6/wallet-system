import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useNavigate } from "react-router-dom";

interface Wallet {
  _id: string;
  userId: string;
  availableBalance: number;
  heldBalance: number;
}

interface Transaction {
  _id: string;
  userId: string;
  receiverId?: string;
  walletId: string;
  amount: number;
  status: "processing" | "success" | "failed";
  type: "payout" | "deposit";
  createdAt: string;
  updatedAt: string;
}

const WalletOverview: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useSelector((state: RootState) => state.user.userData);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositError, setDepositError] = useState<string | null>(null);

  const fetchWalletData = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3030/api/user/wallet/${id}`
      );
      setWallet(response.data.wallet);
      setTransactions(response.data.transactions);
    } catch (err) {
      setError("Failed to fetch wallet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [id]);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError(null);

    try {
      const response = await axios.post(
        "http://localhost:3030/api/user/deposit",
        { userId: id, amount: parseFloat(depositAmount) }
      );
      setWallet(response.data.wallet);
      setTransactions([...response.data.transactions, ...transactions]);
      setDepositAmount("");
      setIsModalOpen(false);
      fetchWalletData()
    } catch (err: any) {
      // setDepositError(err.response?.data?.error || "Failed to process deposit");
    }
  };

  if (loading)
    return <div className="text-center text-gray-600 mt-8">Loading...</div>;
  if (error)
    return <div className="text-center text-red-600 mt-8">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <p className="text-2xl font-bold text-gray-800">Wallet Overview</p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-200"
        >
          Deposit
        </button>
      </div>
      
      <button
        onClick={() => navigate('/payout-request')}
        className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-200 mb-6"
      >
        Make Payout
      </button>

      {wallet && (
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <p className="text-lg text-gray-700">
            <span className="font-medium">Available Balance:</span>
            <span className="text-green-600">
              {" "}
              ${wallet.availableBalance.toFixed(2)}
            </span>
          </p>
          <p className="text-lg text-gray-700 mt-2">
            <span className="font-medium">Held Balance:</span>
            <span className="text-orange-600">
              {" "}
              ${wallet.heldBalance.toFixed(2)}
            </span>
          </p>
        </div>
      )}

      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Transaction History
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="text-xs uppercase bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Receiver</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{tx._id}</td>
                <td className="px-4 py-3 capitalize">{tx.type}</td>
                <td className="px-4 py-3">${tx.amount.toFixed(2)}</td>
                <td className="px-4 py-3">{tx.receiverId || "N/A"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs ${
                      tx.status === "success"
                        ? "bg-green-100 text-green-800"
                        : tx.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {tx.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {new Date(tx.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Deposit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Make a Deposit</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Deposit Amount:
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </label>
              </div>
              {/* {depositError && (
                <p className="text-red-600 text-sm text-center">{depositError}</p>
              )} */}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-200"
                >
                  Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletOverview;