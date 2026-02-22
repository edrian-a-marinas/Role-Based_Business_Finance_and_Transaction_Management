import { useState, useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";

import {
  CreateTransaction,
  ViewTransaction,
  UpdateTransaction,
  //DeleteTransaction
} from "../components";


export default function Transactions() {
  const { user } = useContext(AuthContext);

  const userRole = user!.role_id

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showUpdateModa, setShowUpdateModal] = useState(false);


  return (

    <div>
      <title>Transactions</title>
      <h1>Transactions</h1>

      <ul style={{ listStyle: "none", padding: 0 }}>
        <li>
          <button onClick={() => setShowCreateModal(true)}> Create Transactions </button>
        </li>
        <li>
          <button onClick={() => setShowViewModal(true)}>View Transactions</button>
        </li>
        <li>
          <button onClick={() => setShowUpdateModal(true)}>Update Transactions</button>
        </li>

        {userRole === 1 && (
          <li>
            <button onClick={() => setShowCreateModal(true)}>Delete Transaction</button>
          </li>
        )}
      </ul>

      {showCreateModal && ( <CreateTransaction onClose={() => setShowCreateModal(false)} /> )}
      {showViewModal && ( <ViewTransaction onClose={() => setShowViewModal(false)} /> )}
      {showUpdateModa && ( <UpdateTransaction onClose={() => setShowUpdateModal(false)} /> )}

      {showCreateModal && ( <CreateTransaction onClose={() => setShowCreateModal(false)} /> )}

    </div>
  );
}