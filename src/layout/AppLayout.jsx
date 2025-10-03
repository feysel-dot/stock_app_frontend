import React, { useContext, useMemo, useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Card,
  Row,
  Col,
  Tooltip,
  Progress,
  Statistic,
  Typography,
} from "antd";
import {
  DashboardOutlined,
  TableOutlined,
  PlusCircleOutlined,
  LogoutOutlined,
  ShoppingOutlined,
  UserOutlined,
  TagsOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import axios from "../api/axios"; // path to the file above
import logo from "../assets/logo.png";
import HeaderBar from "../components/HeaderBar";

const { Sider, Content } = Layout;
const { Text } = Typography;

const accentColors = {
  dashboard: "#ff6b6b",
  sales: "#ffa94d",
  newSale: "#69db7c",
  products: "#4dabf7",
  report: "#845ef7",
  customers: "#fcc419",
  meta: "#ff8787",
  users: "#12b886",
};

const SummaryCard = ({ title, value, lastValue, growth, prefix }) => {
  const isPositive = Number(growth) > 0;
  const isNegative = Number(growth) < 0;

  return (
    <Tooltip
      title={
        <>
          <div>
            {title} this period: {value}
          </div>
          <div>Previous period: {lastValue}</div>
        </>
      }
    >
      <Card variant="bordered" style={{ borderRadius: 10 }}>
        <Statistic
          title={<span style={{ fontWeight: 600 }}>{title}</span>}
          value={value}
          precision={typeof value === "number" ? 2 : undefined}
          prefix={prefix}
          valueStyle={{
            color: isPositive ? "#3f8600" : isNegative ? "#cf1322" : "#111827",
            fontWeight: 700,
          }}
          suffix={
            <span
              style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
            >
              {isPositive && <ArrowUpOutlined style={{ color: "#3f8600" }} />}
              {isNegative && <ArrowDownOutlined style={{ color: "#cf1322" }} />}
              <Text
                strong
                style={{
                  color: isPositive
                    ? "#3f8600"
                    : isNegative
                    ? "#cf1322"
                    : "#8c8c8c",
                }}
              >
                {Math.abs(Number(growth ?? 0))}%
              </Text>
            </span>
          }
        />
        <Progress
          percent={Math.min(Math.abs(Number(growth ?? 0)), 100)}
          size="small"
          status={isPositive ? "success" : isNegative ? "exception" : "normal"}
          style={{ marginTop: 10 }}
        />
        <div style={{ marginTop: 6 }}>
          <Text type="secondary" size="small">
            Compared to last month
          </Text>
        </div>
      </Card>
    </Tooltip>
  );
};

const AppLayout = ({ children }) => {
  const { user, logout, toggleTheme, themeDark } = useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const [summary, setSummary] = useState(null);
  const [stats, setStats] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/dashboard/summary", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data || {};
        setSummary(data);

        // Build small stat cards (optional)
        setStats([
          {
            title: "Total Income",
            value: data.total_income ?? 0,
            growth: data.growth?.income ?? data.income_growth ?? 0,
            color: "#3f8600",
            icon: <RiseOutlined />,
          },
          {
            title: "Total Sales",
            value: data.sales ?? 0,
            growth: data.growth?.sales ?? data.sales_growth ?? 0,
            color: "#1890ff",
            icon: <ShoppingOutlined />,
          },
          {
            title: "Total Profit",
            value: data.profit ?? 0,
            growth: data.growth?.profit ?? data.profit_growth ?? 0,
            color: "#722ed1",
            icon: <RiseOutlined />,
          },
          {
            title: "Customers",
            value: data.customers ?? 0,
            growth: data.growth?.customers ?? data.customer_growth ?? 0,
            color: "#fcc419",
            icon: <UserOutlined />,
          },
        ]);
      } catch (err) {
        console.error("❌ Failed to fetch summary:", err);
        setSummary(null);
      }
    };
    fetchDashboard();
  }, []);

  const menuItems = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: "Dashboard",
      roles: ["admin", "manager"],
      color: accentColors.dashboard,
    },
    {
      key: "/sales",
      icon: <TableOutlined />,
      label: "Sales History",
      roles: ["sales", "manager"],
      color: accentColors.sales,
    },
    {
      key: "/new-sale",
      icon: <PlusCircleOutlined />,
      label: "New Sale",
      roles: ["sales", "manager"],
      color: accentColors.newSale,
    },
    {
      key: "/products",
      icon: <ShoppingOutlined />,
      label: "Products List",
      roles: ["sales", "manager"],
      color: accentColors.products,
    },
    {
      key: "/report",
      icon: <TableOutlined />,
      label: "Report",
      roles: ["manager"],
      color: accentColors.report,
    },
    {
      key: "/customers",
      icon: <UserOutlined />,
      label: "Customers",
      roles: ["admin", "manager"],
      color: accentColors.customers,
    },
    {
      key: "/meta",
      icon: <TagsOutlined />,
      label: "Meta Manager",
      roles: ["admin", "manager"],
      color: accentColors.meta,
    },
    {
      key: "/users",
      icon: <PlusCircleOutlined />,
      label: "Users",
      roles: ["admin"],
      color: accentColors.users,
    },
  ];

  const filteredItems = useMemo(
    () => menuItems.filter((it) => !it.roles || it.roles.includes(user?.role)),
    [user?.role]
  );

  const userMenu = {
    items: [
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: <span onClick={logout}>Logout</span>,
      },
    ],
  };

  const formatCurrency = (value) =>
    (Number(value) || 0).toLocaleString("en-ET", {
      style: "currency",
      currency: "ETB",
    });

  return (
    <Layout style={{ minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme={themeDark ? "dark" : "light"}
        width={220}
        style={{
          background: themeDark
            ? "linear-gradient(180deg,#0f2027,#203a43)"
            : "linear-gradient(180deg,#1e3c72,#2a5298)",
          transition: "all .25s",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "1rem",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <img
            src={logo}
            alt="logo"
            style={{ width: 36, height: 36, borderRadius: 8 }}
          />
          {!collapsed && (
            <span
              style={{ color: "#fff", fontWeight: 700, letterSpacing: 0.4 }}
            >
              StockApp
            </span>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{ marginTop: 12, background: "transparent" }}
          items={filteredItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: <Link to={item.key}>{item.label}</Link>,
          }))}
        />
      </Sider>

      <Layout>
        <HeaderBar /> {/* ✅ Always show welcome + role */}
        <Content
          style={{
            margin: 24,
            padding: 24,
            minHeight: "calc(100vh - 64px)",
            background: themeDark ? "#111827" : "#f5f7fa",
            borderRadius: 12,
          }}
        >
          <Card
            variant="bordered"
            style={{ borderRadius: 12, marginBottom: 20 }}
          >
            {["admin", "manager"].includes(user?.role) && summary ? (
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <SummaryCard
                    title="💰 Total Income"
                    value={formatCurrency(summary.total_income ?? 0)}
                    lastValue={formatCurrency(summary?.last_income ?? 0)}
                    growth={
                      summary?.growth?.income ?? summary?.income_growth ?? 0
                    }
                    prefix={<DollarOutlined />}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <SummaryCard
                    title="📈 Sales"
                    value={summary.sales ?? 0}
                    lastValue={summary?.last_sales ?? 0}
                    growth={
                      summary?.growth?.sales ?? summary?.sales_growth ?? 0
                    }
                    prefix={<ShoppingCartOutlined />}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <SummaryCard
                    title="💹 Profit"
                    value={formatCurrency(summary.profit ?? 0)}
                    lastValue={formatCurrency(summary?.last_profit ?? 0)}
                    growth={
                      summary?.growth?.profit ?? summary?.profit_growth ?? 0
                    }
                    prefix={<RiseOutlined />}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <SummaryCard
                    title="👥 Customers"
                    value={summary.customers ?? 0}
                    lastValue={summary?.last_customers ?? 0}
                    growth={
                      summary?.growth?.customers ??
                      summary?.customer_growth ??
                      0
                    }
                    prefix={<UserOutlined />}
                  />
                </Col>
              </Row>
            ) : (
              <div style={{ padding: 20 }}>
                <Text type="secondary">
                  Summary is available for admin and manager roles only.
                </Text>
              </div>
            )}
          </Card>

          <Card style={{ borderRadius: 12, minHeight: 360 }}>
            <Outlet />
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
