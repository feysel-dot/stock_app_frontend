// FILE: src/pages/AdminUserManager.jsx
import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Form,
  Input,
  Select,
  Popconfirm,
  Modal,
  message,
  Space,
  Card,
  Typography,
  Switch,
} from "antd";
import axios from "../api/axios"; // ✅ central axios instance

const { Title } = Typography;
const { Option } = Select;

const AdminUserManager = () => {
  // 🔹 State hooks
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // 🔹 Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/users/users-list");
      const mappedUsers = Array.isArray(data.users)
        ? data.users.map((u) => ({
            ...u,
            blocked: Boolean(u.blocked), // normalize DB -> boolean
          }))
        : [];
      setUsers(mappedUsers);
      console.log("✅ Users fetched:", mappedUsers);
    } catch (err) {
      console.error("❌ Fetch users error:", err);
      messageApi.error(err.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 🔹 Save (create or update) user
  const handleSaveUser = async (values) => {
    try {
      // ✅ double-check duplicate on backend
      const checkRes = await axios.post("/users/check-duplicate", {
        name: values.name,
        email: values.email,
      });

      if (checkRes.data.exists) {
        return messageApi.error(
          "❌ User with this name or email already exists"
        );
      }

      let payload = { ...values };
      if (editingUser) {
        if (!payload.password) delete payload.password;
        await axios.put(`/users/${editingUser.id}`, payload);
        messageApi.success("✅ User updated successfully");
      } else {
        await axios.post("/users/new-users", payload);
        messageApi.success("✅ User created successfully");
      }

      form.resetFields();
      setIsModalVisible(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error("❌ Save user error:", err);
      messageApi.error(err.response?.data?.message || "Failed to save user");
    }
  };

  // 🔹 Delete user
  const handleDeleteUser = async (id) => {
    try {
      await axios.delete(`/users/${id}`);
      messageApi.success("🗑️ User deleted");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error("❌ Delete user error:", err);
      messageApi.error(err.response?.data?.message || "Failed to delete user.");
    }
  };

  // 🔹 Block/unblock user
  const handleToggleBlock = async (user) => {
    try {
      const newStatus = !user.blocked;
      await axios.put(`/users/${user.id}/block`, {
        failed_attempts: newStatus,
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, blocked: newStatus } : u))
      );

      messageApi.success(
        `✅ User ${newStatus ? "blocked" : "unblocked"} successfully`
      );
    } catch (err) {
      console.error("❌ Block/unblock error:", err);
      messageApi.error(
        err.response?.data?.message || "Failed to update status"
      );
    }
  };

  // 🔹 Table columns
  const columns = [
    { title: "👤 Name", dataIndex: "name", key: "name" },
    { title: "📧 Email", dataIndex: "email", key: "email" },
    { title: "🛠️ Role", dataIndex: "role", key: "role" },
    {
      title: "🚦 Status",
      dataIndex: "blocked",
      key: "blocked",
      render: (_, user) => (
        <Switch
          checked={user.blocked}
          onChange={() => handleToggleBlock(user)}
          checkedChildren="Blocked"
          unCheckedChildren="Active"
        />
      ),
    },
    {
      title: "⚡ Actions",
      key: "actions",
      render: (_, user) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setEditingUser(user);
              form.setFieldsValue(user);
              setIsModalVisible(true);
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure to delete this user?"
            onConfirm={() => handleDeleteUser(user.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ padding: 24 }}>
      {contextHolder}
      <Title level={3}>👥 User Management</Title>

      <Button
        type="primary"
        style={{ marginBottom: 16 }}
        onClick={() => setIsModalVisible(true)}
      >
        + Add User
      </Button>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={{ pageSize: 5 }}
        bordered
      />

      {/* 🔹 User Form Modal */}
      <Modal
        title={editingUser ? "Edit User" : "Add User"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingUser(null);
          form.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveUser}
          initialValues={{ role: "user", blocked: false }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Enter user name" },
              {
                validator: async (_, value) => {
                  if (!value) return Promise.resolve();
                  try {
                    const res = await axios.post("/users/check-duplicate", {
                      name: value,
                    });
                    if (res.data.exists) {
                      return Promise.reject(
                        new Error("❌ Username already exists")
                      );
                    }
                  } catch (err) {
                    console.error("Validation error:", err);
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Enter user email" },
              { type: "email", message: "Enter valid email" },
              {
                validator: async (_, value) => {
                  if (!value) return Promise.resolve();
                  try {
                    const res = await axios.post("/users/check-duplicate", {
                      email: value,
                    });
                    if (res.data.exists) {
                      return Promise.reject(
                        new Error("❌ Email already exists")
                      );
                    }
                  } catch (err) {
                    console.error("Validation error:", err);
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: "Select user role" }]}
          >
            <Select>
              <Option value="admin">Admin</Option>
              <Option value="manager">Manager</Option>
              <Option value="sales">Sales</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={
              !editingUser
                ? [{ required: true, message: "Enter a password" }]
                : []
            }
          >
            <Input.Password
              placeholder={editingUser ? "Leave empty to keep current" : ""}
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ display: "flex", justifyContent: "end" }}>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingUser(null);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? "Update User" : "Create User"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminUserManager;
