import React, { useEffect, useContext } from "react";
import { Form, Input, Button, Alert, Typography, Card } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const { Title, Text } = Typography;

const Login = () => {
  const { handleLogin, loading, error } = useAuth();
  const { user } = useContext(AuthContext); // get user from context
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // 🔄 Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // 🚀 Handle login form
  const onFinish = async (values) => {
    await handleLogin(values);
    // no manual navigate — effect above handles it
  };

  return (
    <div style={{ minHeight: "100vh", overflow: "hidden" }}>
      <div className="animated-bg"></div>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <Card
          style={{
            maxWidth: 400,
            width: "100%",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            backgroundColor: "#fff",
            textAlign: "center",
            padding: "40px 24px",
          }}
        >
          <div
            style={{
              fontSize: 48,
              color: "#1890ff",
              marginBottom: 16,
              animation: "bounce 1.5s infinite",
            }}
          >
            <LockOutlined />
          </div>

          <Title level={2} style={{ color: "#1890ff", marginBottom: 4 }}>
            Welcome Back
          </Title>
          <Text type="secondary">Login to your account</Text>

          {error && (
            <Alert
              type="error"
              message={error}
              style={{ marginTop: 16, marginBottom: 16 }}
              showIcon
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            style={{ marginTop: 16 }}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                {
                  required: true,
                  type: "email",
                  message: "Enter a valid email",
                },
              ]}
            >
              <Input placeholder="you@example.com" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Please enter your password" },
              ]}
            >
              <Input.Password placeholder="••••••••" />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{ borderRadius: 6, marginTop: 8 }}
              >
                Log In
              </Button>
            </Form.Item>
          </Form>

          <Button
            type="link"
            onClick={() => navigate("/forgot-password")}
            style={{ padding: 0, marginTop: 8 }}
          >
            Forgot Password?
          </Button>
        </Card>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .animated-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 200%;
          height: 200%;
          background: linear-gradient(270deg, #1890ff, #52c41a, #13c2c2, #ffc53d);
          background-size: 800% 800%;
          animation: gradientAnimation 20s ease infinite;
          z-index: 0;
        }

        @keyframes gradientAnimation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

export default Login;
