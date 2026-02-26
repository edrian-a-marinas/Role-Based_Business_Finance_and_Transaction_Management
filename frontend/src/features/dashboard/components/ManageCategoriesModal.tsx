import { useEffect, useState, useContext } from "react";
import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";
import type { CategoryCreate, CategoryRead } from "../schemas/category";
import { categorySchema } from "../schemas/category";

import type { OnCloseProps } from "../../../../utility";

export default function ManageCategories({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;

  const token = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [categories, setCategories] = useState<CategoryRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<{ name: string; description: string; type: "Expense" | "Income" }>({
    name: "",
    description: "",
    type: "Expense"
  });

  useEffect(() => {
    const fetchCategories = async () => {
      if (!token || !tokenType) return;
      try {
        const res = await api.get("api/categories/", { headers: { Authorization: `${tokenType} ${token}` } });
        setCategories(res.data);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [token, tokenType]);

  const resetForm = () => {
    setFormData({ name: "", description: "", type: "Expense" });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    try {
      const parsed: CategoryCreate = categorySchema.parse(formData);

      if (editingId) {
        // update category
        await api.put(`api/categories/${editingId}`, parsed, {
          headers: { Authorization: `${tokenType} ${token}` }
        });
        setCategories(categories.map(c => (c.id === editingId ? { ...c, ...parsed } : c)));
      } else {
        // create category
        const res = await api.post("api/categories/", parsed, {
          headers: { Authorization: `${tokenType} ${token}` }
        });
        setCategories([...categories, res.data]);
      }
      resetForm();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Validation error");
    }
  };

  const handleEdit = (cat: CategoryRead) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, description: cat.description || "", type: cat.type });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await api.delete(`api/categories/${id}`, { headers: { Authorization: `${tokenType} ${token}` } });
      setCategories(categories.filter(c => c.id !== id));
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.3)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1c1414",
          padding: "1.5rem",
          borderRadius: "8px",
          minWidth: "700px",
          maxHeight: "80vh",
          overflow: "auto",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "8px",
            right: "12px",
            background: "transparent",
            border: "none",
            color: "#aaa",
            fontSize: "22px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <h2 style={{ textAlign: "center" }}>{editingId ? "Edit Category" : "Add Category"}</h2>

        {/* Form */}
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{ width: "100%", marginBottom: "0.5rem" }}
          />
          <input
            type="text"
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={{ width: "100%", marginBottom: "0.5rem" }}
          />
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as "Expense" | "Income" })}
            style={{ width: "100%", marginBottom: "0.5rem" }}
          >
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
          </select>
          <button onClick={handleSubmit} style={{ width: "100%" }}>
            {editingId ? "Update" : "Add"} Category
          </button>
          {editingId && <button onClick={resetForm} style={{ width: "100%", marginTop: "0.5rem" }}>Cancel Edit</button>}
        </div>

        {/* Categories Table */}
        {loading && <p>Loading...</p>}
        {!loading && categories.length === 0 && <p>No categories found.</p>}
        {!loading && categories.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td style={tdStyle}>{cat.id}</td>
                  <td style={tdStyle}>{cat.name}</td>
                  <td style={tdStyle}>{cat.description}</td>
                  <td style={tdStyle}>{cat.type}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEdit(cat)}>Edit</button>
                    <button onClick={() => handleDelete(cat.id)} style={{ marginLeft: "0.5rem" }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: "1px solid #999",
  padding: "4px 8px",
  backgroundColor: "#333",
  color: "#fff",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #999",
  padding: "4px 8px",
  color: "#eee",
};