import { useState, useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";

import {
  CreateTransaction,
  ReadTransactions,
  UpdateTransaction,
  DeleteTransaction,
  HistoryTransaction
} from "../components/modals";


export default function Transactions() {
  const { user } = useContext(AuthContext);

  const userRole = user!.role_id;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReadModal, setShowReadModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  return (
    <div>
      <title>Transactions</title>
      <h1>Transactions</h1>

      <ul style={{ listStyle: "none", padding: 0 }}>
        <li>
          <button onClick={() => setShowCreateModal(true)}> Create Transaction </button>
        </li>
        <li>
          <button onClick={() => setShowReadModal(true)}>View Transactions</button>
        </li>
        <li>
          <button onClick={() => setShowUpdateModal(true)}>Edit Transaction</button>
        </li>

        {userRole === 1 ? (
          <li>
            <button onClick={() => setShowDeleteModal(true)}>Delete Transaction</button>
          </li>
        ) : (
          <li>
            <button onClick={() => setShowDeleteModal(true)}>Request for Deletion</button>
          </li>
        )}
      </ul>

      <li>
        <button onClick={() => setShowHistoryModal(true)}>Transaction History</button>
      </li>

      {showCreateModal && <CreateTransaction onClose={() => setShowCreateModal(false)} />}
      {showReadModal && <ReadTransactions onClose={() => setShowReadModal(false)} />}
      {showUpdateModal && <UpdateTransaction onClose={() => setShowUpdateModal(false)} />}
      {showDeleteModal && <DeleteTransaction onClose={() => setShowDeleteModal(false)} />}
        
      {showHistoryModal && <HistoryTransaction onClose={() => setShowHistoryModal(false)} />}
    </div>
  );
}