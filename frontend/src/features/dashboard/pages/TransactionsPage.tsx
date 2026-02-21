import { useState, useEffect, useContext } from "react";
import type { ChangeEvent } from 'react';

import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";
import type { Transaction, Category, TransactionsProps } from "../schemas/transaction";
import { transactionSchema } from "../schemas/transaction";

export default function Transactions({ children }: TransactionsProps) {
  const token = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const { user } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [categoryDescription, setCategoryDescription] = useState<string>('');

  const [form, setForm] = useState<Transaction>({
    amount: 0,
    description: "",
    category_id: 0,
    transaction_type: "credit",
    transaction_date: ""
  });

  useEffect(() => {
    // Fetch categories from API
    api.get("api/categories/").then(res => setCategories(res.data));
  }, []);

  useEffect(() => {
    // Fetch category description whenever category_id changes
    if (form.category_id) {
      const selectedCategory = categories.find(c => c.id === form.category_id);
      if (selectedCategory) {
        setCategoryDescription(selectedCategory.name); // Example, change to description from DB if available
      }
    }
  }, [form.category_id, categories]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === "amount" || name === "category_id" ? Number(value) : value
    }));
  };

  const handleSubmit = async () => {
    const result = transactionSchema.safeParse(form);

    if (!result.success) {
      const messages = result.error.issues.map(issue => issue.message);
      setErrors(messages);
      return;
    }

    setErrors([]);
    setShowConfirmation(true);  // Go to the confirmation step
  };

  const handleBackToEdit = () => {
    setShowConfirmation(false);  // Allow the user to go back to the form to edit
  };

  const handleConfirm = async () => {
    try {
      if (!user) return;
      if (!token || !tokenType) return alert("Not authorized");

      const res = await api.post("api/transactions/", form, {
        headers: {
          Authorization: `${tokenType} ${token}`,
        },
      });

      console.log("Transaction created:", res.data);
      alert("Successfully created!");

      setForm({
        amount: 0,
        description: "",
        category_id: 0,
        transaction_type: "credit",
        transaction_date: ""
      });

      setShowModal(false);
      setShowConfirmation(false); // Reset to initial state
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <title>Transactions</title>
      <h1>Transactions</h1>
      <button onClick={() => setShowModal(true)}>Create Transaction</button>

      {/* Create Modal */}
      {showModal && !showConfirmation && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#1c1414",
              padding: "1.5rem",
              borderRadius: "8px",
              minWidth: "320px",
              position: "relative"
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: "absolute",
                top: "8px",
                right: "12px",
                background: "transparent",
                border: "none",
                color: "#aaa",
                fontSize: "22px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              ×
            </button>

            <h2 style={{ textAlign: "center" }}>Create Transaction</h2>
            {errors.length > 0 && (
              <div style={{ color: "red" }}>
                {errors.map((err, index) => (
                  <div key={index}>{err}</div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Category */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <label style={{ width: "40%" }}>Category</label>
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  style={{ width: "55%" }}
                >
                  <option value={0}>Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <label style={{ width: "40%" }}>Type</label>
                <select
                  name="transaction_type"
                  value={form.transaction_type}
                  onChange={handleChange}
                  style={{ width: "55%" }}
                >
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
              </div>

              {/* Date */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <label style={{ width: "40%" }}>Date</label>
                <input
                  type="date"
                  name="transaction_date"
                  value={form.transaction_date}
                  onChange={handleChange}
                  style={{ width: "55%" }}
                />
              </div>

              {/* Amount */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <label style={{ width: "40%" }}>Amount</label>
                <input
                  type="text"
                  name="amount"
                  value={form.amount || ''}
                  onChange={handleChange}
                  placeholder="₱ Enter amount"
                  style={{ width: "55%" }}
                />
              </div>

              {/* Description */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <label style={{ width: "40%" }}>Description</label>
                <input
                  type="text"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Enter description"
                  style={{ width: "55%" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button onClick={() => setShowModal(false)}>Cancel</button>
                <button onClick={handleSubmit}>Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Page */}
      {showConfirmation && (
        <div
          onClick={() => setShowConfirmation(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#1c1414",
              padding: "1.5rem",
              borderRadius: "8px",
              minWidth: "320px",
              position: "relative"
            }}
          >
            <button
              onClick={() => setShowConfirmation(false)}
              style={{
                position: "absolute",
                top: "8px",
                right: "12px",
                background: "transparent",
                border: "none",
                color: "#aaa",
                fontSize: "22px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              ×
            </button>

            <h2 style={{ textAlign: "center" }}>Confirm Your Transaction</h2>

            <div style={{ marginBottom: "1rem" }}>
              <h3>Your Transaction Ticket:</h3>
              <p><strong>Category:</strong> {categoryDescription}</p>
              <p><strong>Type:</strong> {form.transaction_type}</p>
              <p><strong>Date:</strong> {form.transaction_date}</p>
              <p><strong>Amount:</strong> ₱{form.amount}</p>
              <p><strong>Description:</strong> {form.description}</p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button onClick={handleBackToEdit}>Go Back</button>
              <button onClick={handleConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
