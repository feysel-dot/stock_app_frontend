// FILE: src/pages/ResetRequest.jsx
import React, { useState } from "react";
import { Form, Input, Button, Alert, Card, Typography } from "antd";
import axios from "../api/axios.js"; // path to the file above

const { Title } = Typography;

const ResetRequest = () => {
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ email }) => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await axios.post("/auth/reset-request", {
        email,
      });
      setSuccess(res.data.message || "Reset email sent");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 80 }}>
      <Card
        title={<Title level={3}>🔁 Reset Password</Title>}
        style={{ width: 400 }}
      >
        {success && (
          <Alert
            message={success}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Invalid email format" },
            ]}
          >
            <Input placeholder="Enter your email" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ResetRequest;
