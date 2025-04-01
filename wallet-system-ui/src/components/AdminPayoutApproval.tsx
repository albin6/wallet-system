import React, { useEffect, useState } from "react";
import axios from "axios";

interface Transaction {
  _id: string;
  userId: string;
  receiverId: string;
  walletId: string;
  amount: number;
  status: "processing" | "success" | "failed";
  createdAt: string;
}

const AdminPayoutApproval: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminWallet, setAdminWallet] = useState<{ _id: string; balance: number } | null>(null)

  useEffect(() => {
    const fetchPendingPayouts = async () => {
      try {
        // Make sure to call the correct endpoint for fetching pending payouts
        const response = await axios.get<{
          transactions: Transaction[];
          adminWallet: { _id: string; balance: number };
        }>("http://localhost:3030/api/admin/payouts");
        setTransactions(response.data.transactions);
        setAdminWallet(response.data.adminWallet)
      } catch (err) {
        setError("Failed to fetch pending payouts. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchPendingPayouts();
  }, []);

  const handleAction = async (
    transactionId: string,
    action: "approve" | "reject"
  ) => {
    try {
      const response = await axios.post(
        "http://localhost:3030/api/admin/payout", // Updated endpoint for payout action
        { transactionId, action }
      );
      // Update the transaction status locally after approval/rejection
      setTransactions((prev) =>
        prev.map((tx) =>
          tx._id === transactionId
            ? { ...tx, status: response.data.transaction.status }
            : tx
        )
      );
    } catch (err: any) {
      // Handle specific error responses
      setError(
        err.response?.data?.error || `Failed to ${action} payout request.`
      );
    }
  };

  if (loading)
    return <div className="text-center text-gray-600 mt-8">Loading...</div>;
  if (error)
    return <div className="text-center text-red-600 mt-8">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <div>
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Wallet balance : {adminWallet?.balance}
      </h2>
      </div>
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Pending Payouts
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="text-xs uppercase bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Sender</th>
              <th className="px-4 py-3">Receiver</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{tx._id}</td>
                <td className="px-4 py-3">{tx.userId}</td>
                <td className="px-4 py-3">{tx.receiverId}</td>
                <td className="px-4 py-3">${tx.amount.toFixed(2)}</td>
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
                  {tx.status === "processing" && (
                    <div className="space-x-2">
                      <button
                        onClick={() => handleAction(tx._id, "approve")}
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(tx._id, "reject")}
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPayoutApproval;
