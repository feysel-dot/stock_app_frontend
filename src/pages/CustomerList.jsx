// FILE: src/pages/CustomerList.jsx
import React, { useEffect, useState, useMemo, useContext } from "react";
import {
  Table,
  Input,
  Button,
  Space,
  Popconfirm,
  Typography,
  message,
  Empty,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { AuthContext } from "../context/AuthContext";
import NotAuthorized from "./NotAuthorized";
import axios from "../api/axios"; // ✅ central axios with token
const { Title } = Typography;

const CustomerList = () => {
  const { user } = useContext(AuthContext);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/customers");
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Fetch customers error:", err);
      message.error(err.response?.data?.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return; // Only fetch if logged in
    fetchCustomers();
  }, [user]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/customers/${id}`);
      message.success("🗑️ Customer deleted");
      fetchCustomers();
    } catch (err) {
      console.error("❌ Delete error:", err);
      message.error(
        err.response?.data?.message || "Failed to delete customer."
      );
    }
  };


  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      return message.warning("⚠️ Name is required");
    }
    if (!newCustomer.phone.trim()) {
      return message.warning("⚠️ Phone is required");
    }

    // ✅ Pre-check against current list
    const exists = customers.find(
      (c) =>
        c.phone === newCustomer.phone ||
        (newCustomer.email && c.email === newCustomer.email)
    );

    if (exists) {
      return message.error("❌ Customer with this phone/email already exists");
    }

    try {
      await axios.post("/customers", newCustomer);
      message.success("✅ Customer added");
      setNewCustomer({ name: "", phone: "", email: "", address: "" });
      fetchCustomers();
    } catch (err) {
      console.error("❌ Add error:", err);
      message.error(err.response?.data?.message || "Failed to add customer.");
    }
  };

  const columns = useMemo(
    () => [
      { title: "👤 Name", dataIndex: "name", key: "name" },
      { title: "📞 Phone", dataIndex: "phone", key: "phone" },
      { title: "📧 Email", dataIndex: "email", key: "email" },
      { title: "🏠 Address", dataIndex: "address", key: "address" },
      {
        title: "Actions",
        key: "actions",
        width: 120,
        render: (_, record) => (
          <Popconfirm
            title="Are you sure to delete?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        ),
      },
    ],
    []
  );

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>👥 Customers</Title>

      {user.role !== "admin" ? (
        <NotAuthorized />
      ) : (
        // (<p style={{ color: "red" }}>❌ Only admins can manage customers.</p>))
        <>
          <Space wrap style={{ marginBottom: 16 }}>
            <Input
              placeholder="Name"
              value={newCustomer.name}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, name: e.target.value })
              }
              style={{ width: 200 }}
            />
            <Input
              placeholder="Phone"
              value={newCustomer.phone}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, phone: e.target.value })
              }
              style={{ width: 200 }}
            />
            <Input
              placeholder="Email"
              value={newCustomer.email}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, email: e.target.value })
              }
              style={{ width: 200 }}
            />
            <Input
              placeholder="Address"
              value={newCustomer.address}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, address: e.target.value })
              }
              style={{ width: 300 }}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddCustomer}
            >
              Add
            </Button>
          </Space>

          <Table
            dataSource={customers.map((c) => ({ ...c, key: c.id }))}
            columns={columns}
            loading={loading}
            bordered
            locale={{ emptyText: <Empty description="No customers" /> }}
          />
        </>
      )}
    </div>
  );
};

export default CustomerList;
