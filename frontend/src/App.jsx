import React, { useEffect, useState } from "react";
import { NavLink, Routes, Route, useNavigate } from "react-router-dom";
import { api } from "./api";
const money = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });
function Layout({ children }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          AP <span>Automation</span>
        </div>
        <nav>
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/vendors">Vendors</NavLink>
          <NavLink to="/invoices">Invoices</NavLink>
          <NavLink to="/approvals">Approvals</NavLink>
          <NavLink to="/payments">Payments</NavLink>
        </nav>
        <div className="side-note">
          Accounts Payable
          <br />
          Student Project
        </div>
      </aside>
      <main className="main">
        <header>
          <div>
            <small>WORKSPACE / AP MANAGEMENT</small>
            <h1>Accounts Payable</h1>
          </div>
          <div className="avatar">AP</div>
        </header>
        {children}
      </main>
    </div>
  );
}
function Dashboard() {
  const [stats, setStats] = useState({});
  const [invoices, setInvoices] = useState([]);
  useEffect(() => {
    api
      .get("/invoices/dashboard/")
      .then((r) => setStats(r.data))
      .catch(() => {});
    api
      .get("/invoices/")
      .then((r) => setInvoices(r.data))
      .catch(() => {});
  }, []);
  return (
    <>
      <section className="cards">
        <Card
          title="Total invoices"
          value={stats.invoice_count || 0}
          detail="Invoices in system"
        />
        <Card
          title="Pending approval"
          value={stats.pending_count || 0}
          detail="Needs review"
        />
        <Card
          title="Approved"
          value={stats.approved_count || 0}
          detail="Ready for payment"
        />
        <Card
          title="Paid"
          value={stats.paid_count || 0}
          detail="Completed payments"
        />
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Recent invoices</h2>
          <a href="/invoices">View all</a>
        </div>
        <InvoiceTable invoices={invoices.slice(0, 5)} />
      </section>
      <section className="panel">
        <h2>Quick overview</h2>
        <p className="muted">
          Use the sidebar to add vendors, upload invoices, review approvals and
          record payments.
        </p>
      </section>
    </>
  );
}

function Card({ title, value, detail }) {
  return (
    <div className="stat">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Vendors() {
  const [items, setItems] = useState([]),
    [form, setForm] = useState({
      name: "",
      email: "",
      phone: "",
      gst_number: "",
      address: "",
    }),
    [editing, setEditing] = useState(null),
    [error, setError] = useState("");
  const load = () => api.get("/vendors/").then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, []);
  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }
  async function save(e) {
    e.preventDefault();
    try {
      if (editing) await api.put(`/vendors/${editing}/`, form);
      else await api.post("/vendors/", form);
      setForm({ name: "", email: "", phone: "", gst_number: "", address: "" });
      setEditing(null);
      load();
      setError("");
    } catch {
      setError("Could not save vendor. Check required fields.");
    }
  }
  async function remove(id) {
    if (confirm("Delete this vendor?")) {
      try {
        await api.delete(`/vendors/${id}/`);
        load();
      } catch {
        setError("Vendor may be linked to an invoice and cannot be deleted.");
      }
    }
  }
  return (
    <div className="split">
      <section className="panel">
        <h2>{editing ? "Edit vendor" : "Add vendor"}</h2>
        <form onSubmit={save} className="form">
          <label>
            Vendor name *
            <input name="name" value={form.name} onChange={change} required />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={change}
            />
          </label>
          <label>
            Phone
            <input name="phone" value={form.phone} onChange={change} />
          </label>
          <label>
            GST number
            <input
              name="gst_number"
              value={form.gst_number}
              onChange={change}
            />
          </label>
          <label>
            Address
            <textarea name="address" value={form.address} onChange={change} />
          </label>
          <button>{editing ? "Update vendor" : "Save vendor"}</button>
          {editing && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEditing(null);
                setForm({
                  name: "",
                  email: "",
                  phone: "",
                  gst_number: "",
                  address: "",
                });
              }}
            >
              Cancel
            </button>
          )}
          {error && <p className="error">{error}</p>}
        </form>
      </section>
      <section className="panel">
        <h2>Vendor list</h2>
        {items.map((v) => (
          <div className="list-row" key={v.id}>
            <div>
              <b>{v.name}</b>
              <small>
                {v.email || "No email"} · {v.gst_number || "No GST"}
              </small>
            </div>
            <div className="actions">
              <button
                className="secondary"
                onClick={() => {
                  setEditing(v.id);
                  setForm(v);
                }}
              >
                Edit
              </button>
              <button className="danger" onClick={() => remove(v.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function Invoices() {
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [form, setForm] = useState({
    vendor: "",
    invoice_number: "",
    invoice_date: "",
    due_date: "",
    subtotal: "",
    tax_amount: "",
    total_amount: "",
    description: "",
  });

  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const load = () => api.get("/invoices/").then((r) => setItems(r.data));

  useEffect(() => {
    load();
    api.get("/vendors/").then((r) => setVendors(r.data));
  }, []);

  // OCR extraction and automatic vendor selection
  async function extractInvoice() {
    if (!file) {
      setMessage("Please select an invoice file first.");
      return;
    }

    try {
      const data = new FormData();
      data.append("file", file);

      const response = await api.post("/invoices/upload/", data);

      console.log("OCR Response:", response.data);

      const extracted = response.data.extracted || {};
      const vendor = response.data.vendor;

      // Convert OCR date into YYYY-MM-DD format
      const toInputDate = (value) => {
        if (!value) return "";

        const months = {
          Jan: "01",
          Feb: "02",
          Mar: "03",
          Apr: "04",
          May: "05",
          Jun: "06",
          Jul: "07",
          Aug: "08",
          Sep: "09",
          Oct: "10",
          Nov: "11",
          Dec: "12",
        };

        const match = value.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);

        if (!match) return value;

        return `${match[3]}-${months[match[2]]}-${match[1].padStart(2, "0")}`;
      };

      // Add vendor to dropdown if it is not already present
      if (vendor) {
        setVendors((prev) => {
          const exists = prev.some((v) => String(v.id) === String(vendor.id));

          if (exists) return prev;

          return [...prev, vendor];
        });
      }

      // Populate invoice fields and automatically select vendor
      setForm((prev) => ({
        ...prev,

        vendor: vendor?.id ? String(vendor.id) : prev.vendor,

        invoice_number: extracted.invoice_number || prev.invoice_number,

        invoice_date: toInputDate(extracted.invoice_date) || prev.invoice_date,

        due_date: toInputDate(extracted.due_date) || prev.due_date,

        subtotal: extracted.subtotal ?? prev.subtotal,

        tax_amount: extracted.tax_amount ?? prev.tax_amount,

        total_amount: extracted.total_amount ?? prev.total_amount,
      }));

      console.log("Extracted Fields:", extracted);
      console.log("Recognized Vendor:", vendor);

      if (vendor && response.data.vendor_created) {
        setMessage(
          "OCR completed. New vendor created and selected automatically. Please review the details.",
        );
      } else if (vendor) {
        setMessage(
          "OCR completed. Existing vendor selected automatically. Please review the details.",
        );
      } else {
        setMessage(
          "OCR completed, but vendor could not be identified. Please select manually.",
        );
      }
    } catch (err) {
      console.error("OCR Error:", err.response?.data || err.message);

      setMessage(
        err.response?.data?.error || "Unable to extract invoice details.",
      );
    }
  }

  // Save invoice
  async function submit(e) {
    e.preventDefault();

    try {
      const data = new FormData();

      Object.entries(form).forEach(([k, v]) => {
        data.append(k, v);
      });

      if (file) {
        data.append("file", file);
      }

      await api.post("/invoices/", data);

      setMessage("Invoice created successfully.");

      setForm({
        vendor: "",
        invoice_number: "",
        invoice_date: "",
        due_date: "",
        subtotal: "",
        tax_amount: "",
        total_amount: "",
        description: "",
      });

      setFile(null);

      load();
    } catch (err) {
      console.error("Invoice Save Error:", err.response?.data || err.message);

      console.log("Full Error Response:", err.response);

      setMessage(JSON.stringify(err.response?.data || err.message));
    }
  }

  // Submit invoice for approval
  async function submitForApproval(id) {
    try {
      await api.post(`/invoices/${id}/submit/`);

      setMessage("Invoice submitted for approval successfully.");

      await load();
    } catch (err) {
      setMessage(
        err.response?.data?.error || "Unable to submit invoice for approval.",
      );
    }
  }

  return (
    <>
      <section className="panel">
        <h2>Upload / Add invoice</h2>

        <form className="form grid-form" onSubmit={submit}>
          <label>
            Vendor *
            <select
              required
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            >
              <option value="">Select vendor</option>

              {vendors.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Invoice number *
            <input
              required
              value={form.invoice_number}
              onChange={(e) =>
                setForm({
                  ...form,
                  invoice_number: e.target.value,
                })
              }
            />
          </label>

          <label>
            Invoice date *
            <input
              type="date"
              required
              value={form.invoice_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  invoice_date: e.target.value,
                })
              }
            />
          </label>

          <label>
            Due date
            <input
              type="date"
              value={form.due_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  due_date: e.target.value,
                })
              }
            />
          </label>

          <label>
            Subtotal
            <input
              type="number"
              step="0.01"
              value={form.subtotal}
              onChange={(e) =>
                setForm({
                  ...form,
                  subtotal: e.target.value,
                })
              }
            />
          </label>

          <label>
            Tax amount
            <input
              type="number"
              step="0.01"
              value={form.tax_amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  tax_amount: e.target.value,
                })
              }
            />
          </label>

          <label>
            Total amount *
            <input
              type="number"
              step="0.01"
              required
              value={form.total_amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  total_amount: e.target.value,
                })
              }
            />
          </label>

          <label>
            Invoice file
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.tiff"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </label>

          <button
            type="button"
            className="secondary wide"
            onClick={extractInvoice}
          >
            Extract Details using OCR
          </button>

          <label className="wide">
            Description
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
            />
          </label>

          <button className="wide" type="submit">
            Save invoice
          </button>
        </form>

        {message && <p className="notice">{message}</p>}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Invoice register</h2>

          <a
            href="http://127.0.0.1:8000/api/reports/invoice-csv/"
            target="_blank"
          >
            Export CSV
          </a>
        </div>

        <InvoiceTable
          invoices={items}
          actions={(inv) =>
            inv.status === "Submitted" ? (
              <button
                className="secondary"
                onClick={() => submitForApproval(inv.id)}
              >
                Submit for Approval
              </button>
            ) : (
              <span>{inv.status}</span>
            )
          }
        />
      </section>
    </>
  );
}

function InvoiceTable({ invoices, actions }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Vendor</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            {actions && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id}>
              <td>{i.invoice_number}</td>
              <td>{i.vendor_name || i.vendor}</td>
              <td>{i.invoice_date}</td>
              <td>{money(i.total_amount)}</td>
              <td>
                <span
                  className={
                    "badge " + i.status.toLowerCase().replaceAll(" ", "-")
                  }
                >
                  {i.status}
                </span>
              </td>
              {actions && <td className="actions">{actions(i)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {!invoices.length && <p className="muted">No invoices yet.</p>}
    </div>
  );
}
function Approvals() {
  const [items, setItems] = useState([]);
  const load = () =>
    api
      .get("/approvals/")
      .then((r) => setItems(r.data.filter((x) => x.decision === "Pending")));
  useEffect(() => {
    load();
  }, []);
  async function decide(id, decision) {
    await api.post(`/approvals/${id}/decide/`, {
      decision,
      comments: "Reviewed",
    });
    load();
  }
  return (
    <section className="panel">
      <h2>Pending approvals</h2>
      {items.map((a) => (
        <div className="list-row" key={a.id}>
          <div>
            <b>Invoice {a.invoice_number}</b>
            <small>Submitted for approval</small>
          </div>
          <div className="actions">
            <button onClick={() => decide(a.id, "Approved")}>Approve</button>
            <button className="danger" onClick={() => decide(a.id, "Rejected")}>
              Reject
            </button>
          </div>
        </div>
      ))}
      {!items.length && (
        <p className="muted">
          No pending approvals. Submit an invoice from the invoice register to
          start the workflow.
        </p>
      )}
    </section>
  );
}
function Payments() {
  const [invoices, setInvoices] = useState([]),
    [payments, setPayments] = useState([]),
    [ref, setRef] = useState("");
  const load = () => {
    api
      .get("/invoices/")
      .then((r) => setInvoices(r.data.filter((x) => x.status === "Approved")));
    api.get("/payments/").then((r) => setPayments(r.data));
  };
  useEffect(() => {
    load();
  }, []);
  async function pay(id) {
    await api.post("/payments/mark-paid/", {
      invoice_id: id,
      reference_number: ref,
    });
    setRef("");
    load();
  }
  return (
    <>
      <section className="panel">
        <h2>Approved invoices ready for payment</h2>
        <label className="inline-label">
          Payment reference
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="Optional reference"
          />
        </label>
        {invoices.map((i) => (
          <div className="list-row" key={i.id}>
            <div>
              <b>
                {i.invoice_number} · {i.vendor_name}
              </b>
              <small>{money(i.total_amount)}</small>
            </div>
            <button onClick={() => pay(i.id)}>Mark paid</button>
          </div>
        ))}
        {!invoices.length && (
          <p className="muted">No approved invoices waiting for payment.</p>
        )}
      </section>
      <section className="panel">
        <h2>Payment history</h2>
        {payments.map((p) => (
          <div className="list-row" key={p.id}>
            <div>
              <b>
                {p.invoice_number} · {p.vendor_name}
              </b>
              <small>
                {p.paid_date || "Not paid"} ·{" "}
                {p.reference_number || "No reference"}
              </small>
            </div>
            <span className="badge paid">{p.status}</span>
          </div>
        ))}
      </section>
    </>
  );
}
export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/payments" element={<Payments />} />
      </Routes>
    </Layout>
  );
}
