// components/HeaderBar.jsx
import React, { useContext, useState } from "react";
import { Typography, Dropdown, Space, Tag } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { AuthContext } from "../context/AuthContext";

const { Text } = Typography;

const HeaderBar = () => {
  const { user, logout, themeDark } = useContext(AuthContext);
  const [hovered, setHovered] = useState(false);

  if (!user) return null;

  // Dynamic greeting based on time
  const getGreeting = () => {
    // Always use UTC, then shift +3 hours for EAT (East Africa Time)
    const now = new Date();
    const hour = (now.getUTCHours() + 3) % 24; // shift to UTC+3

    if (hour >= 6 && hour < 12) return "Good morning! 🌅"; // 6 AM – 11 AM
    if (hour >= 12 && hour < 18) return "Good afternoon! ☀️"; // 12 PM – 5 PM
    if (hour >= 18 && hour < 24) return "Good evening! 🌇"; // 6 PM – 11 PM
    return "Hello! 🌙"; // 12 AM – 5 AM
  };

  const today = new Date().toLocaleDateString("en-ET", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const userMenu = {
    items: [
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: <span onClick={logout}>Logout</span>,
      },
    ],
  };

  const baseColor = themeDark ? "#3b82f6" : "#1890ff"; // normal bubble color
  const hoverColor = themeDark ? "#2563eb" : "#096dd9"; // hover color

  return (
    <div
      style={{
        background: "rgba(56, 161, 112, 0.2)", // light blue header
        padding: "8px 24px",
        borderBottom: "1px solid #ddd",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      {/* Left: Optional Welcome Text */}
      <Text style={{ color: themeDark ? "#fff" : "#000", fontWeight: 500 }}>
        👋 Welcome
      </Text>

      {/* Right: Date + User Bubble + Dropdown */}
      <Space size={16} align="center" style={{ flexShrink: 0 }}>
        {/* Date */}
        <Text type="secondary" style={{ whiteSpace: "nowrap", fontSize: 13 }}>
          {today}
        </Text>

        {/* User dropdown with greeting, animated bubble and shadow */}
        <Dropdown menu={userMenu} placement="bottomRight" arrow>
          <Space
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              cursor: "pointer",
              padding: "6px 16px",
              background: hovered ? hoverColor : baseColor,
              borderRadius: 24,
              color: "#fff",
              fontWeight: 500,
              fontSize: 14,
              transition: "all 0.3s ease-in-out",
              transform: hovered ? "scale(1.05)" : "scale(1)",
              boxShadow: hovered
                ? "0 8px 20px rgba(0,0,0,0.25)"
                : "0 2px 6px rgba(0,0,0,0.15)",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
            align="center"
          >
            <Text style={{ color: "#fff", fontSize: 12 }}>
              {getGreeting()}, {user?.name || "User"} !
            </Text>
            <Space align="center" size={4}>
              <UserOutlined />
              <span>{user?.name || "User"}</span>
              <Tag
                color={themeDark ? "gray" : "green"}
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  transition: "all 0.3s ease-in-out",
                }}
              >
                {user?.role || "User"}
              </Tag>
            </Space>
          </Space>
        </Dropdown>
      </Space>
    </div>
  );
};

export default HeaderBar;
