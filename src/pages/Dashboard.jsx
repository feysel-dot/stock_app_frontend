// src/pages/Dashboard.jsx
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useContext,
} from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Badge,
  Table,
  Modal,
  Grid,
  message,
  Empty,
  Radio,
} from "antd";
import {
  DollarCircleOutlined,
  LineChartOutlined,
  RiseOutlined,
  WarningOutlined,
  PrinterOutlined,
  EyeOutlined,
  DownloadOutlined,
  MailOutlined,
} from "@ant-design/icons";
import axios from "../api/axios.js"; // ✅ central axios
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";
import { DashboardContext } from "../context/DashboardContext";
import { AuthContext } from "../context/AuthContext";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const { Title } = Typography;
const { useBreakpoint } = Grid;

const Dashboard = () => {
  const { refreshDashboard } = useContext(DashboardContext);
  const { user, themeDark } = useContext(AuthContext);

  const screens = useBreakpoint();
  const [messageApi, contextHolder] = message.useMessage();

  const [summary, setSummary] = useState({
    total_income: 0,
    total_cost: 0,
    profit: 0,
    products: 0,
    sales: 0,
    customers: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("daily");
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  const dashboardPrintRef = useRef();
  const stockPrintRef = useRef();

  // ✅ Currency formatter
  const formatCurrency = (val) =>
    (Number(val) || 0).toLocaleString("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 2,
    });

  const isJSON = (str) => {
    try {
      if (typeof str === "object") return true;
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  // ---------- Fetch Summary ----------
  const fetchSummary = useCallback(async () => {
    try {
      const res = await axios.get(`/dashboard/summary`);
      const data =
        typeof res.data === "string" && isJSON(res.data)
          ? JSON.parse(res.data)
          : res.data;

      setSummary({
        total_income: Number(data.total_income || 0),
        total_cost: Number(data.total_cost || 0),
        profit: Number(data.profit || 0),
        products: data.products || 0,
        sales: data.sales || 0,
        customers: data.customers || 0,
        growth: {
          income: Number(data.growth?.income || 0),
          sales: Number(data.growth?.sales || 0),
          profit: Number(data.growth?.profit || 0),
          customers: Number(data.growth?.customers || 0),
          products: Number(data.growth?.products || 0),
        },
      });
    } catch (err) {
      console.error("❌ Summary fetch error:", err);
      messageApi.error("Failed to load summary.");
    }
  }, [messageApi]);

  // ---------- Fetch Chart ----------
  const fetchChart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/dashboard/chart?type=${period}`);
      const data =
        typeof res.data === "string" && isJSON(res.data)
          ? JSON.parse(res.data)
          : res.data;

      setChartData(
        Array.isArray(data)
          ? data.map((d) => ({
              label: d.label,
              total_income: Number(d.income || d.total_income || 0),
              total_cost: Number(d.cost || d.total_cost || 0),
            }))
          : []
      );
    } catch (err) {
      console.error("❌ Chart fetch error:", err);
      messageApi.error("Failed to load chart data.");
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [period, messageApi]);

  // ---------- Low Stock ----------
  const fetchLowStockItems = useCallback(async () => {
    try {
      const { data } = await axios.get(`/products/low-stock`);
      setLowStockItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Low stock fetch error:", err);
      setLowStockItems([]);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchChart();
    fetchLowStockItems();
    const interval = setInterval(fetchLowStockItems, 30000);
    return () => clearInterval(interval);
  }, [fetchSummary, fetchChart, fetchLowStockItems, refreshDashboard]);

  // Refresh chart when period changes
  useEffect(() => {
    fetchChart();
  }, [period, fetchChart]);

  // ---------- Excel Export ----------
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet([summary]),
        "Summary"
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          chartData.map((row) => ({
            Date: row.label,
            Income: row.total_income,
            Cost: row.total_cost,
            Profit: row.total_income - row.total_cost,
          }))
        ),
        "Chart"
      );
      XLSX.writeFile(wb, "Dashboard_Report.xlsx");
      messageApi.success("✅ Excel exported");
    } catch (err) {
      console.error("❌ Excel export error:", err);
      messageApi.error("Failed to export Excel");
    }
  };

  // ---------- Print ----------
  const handlePrintDashboard = useReactToPrint({
    content: () => dashboardPrintRef.current,
    documentTitle: "Dashboard Report",
  });
  const handlePrintStock = useReactToPrint({
    content: () => stockPrintRef.current,
    documentTitle: "Low Stock Report",
  });

  // ---------- Email ----------
  const handleEmailReport = async () => {
    try {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet([summary]),
        "Summary"
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(chartData),
        "Chart"
      );

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const formData = new FormData();
      formData.append("report", blob, "dashboard.xlsx");

      await axios.post(`/reports/email`, formData);

      messageApi.success("📧 Report emailed successfully!");
    } catch (err) {
      console.error("❌ Email report error:", err);
      messageApi.error("Failed to email report");
    }
  };

  const chartColors = themeDark ? "#3AAFA9" : "#1890ff";

  return (
    <div
      style={{
        padding: screens.xs ? 12 : 24,
        background: "linear-gradient(to right, #f0f5ff, #e6fffb)",
        minHeight: "100vh",
      }}
    >
      {contextHolder}

      {/* Stock Alerts */}
      <Card title="📦 Stock Alerts" style={{ marginBottom: 24 }}>
        <Badge count={lowStockItems.length} color="red">
          <span style={{ marginLeft: 8 }}>
            <WarningOutlined style={{ color: "red", marginRight: 4 }} />
            Low Stock Items
          </span>
        </Badge>
        <Button
          icon={<EyeOutlined />}
          type="link"
          onClick={() => setShowLowStockModal(true)}
        >
          View All
        </Button>
        <Button icon={<PrinterOutlined />} onClick={handlePrintStock}>
          Print / PDF
        </Button>
        <Button icon={<MailOutlined />} onClick={handleEmailReport}>
          Email Report
        </Button>
      </Card>

      {/* Dashboard Report */}
      <div ref={dashboardPrintRef}>
        <Title level={screens.xs ? 4 : 2}>📊 Dashboard</Title>

        {/* Period Selector */}
        <Row justify="end" style={{ marginBottom: 16 }}>
          <Radio.Group
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="daily">Daily</Radio.Button>
            <Radio.Button value="weekly">Weekly</Radio.Button>
            <Radio.Button value="monthly">Monthly</Radio.Button>
            <Radio.Button value="yearly">Yearly</Radio.Button>
          </Radio.Group>
        </Row>

        {/* Summary Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8}>
            <Card
              style={{
                background: "linear-gradient(135deg, #52c41a, #a0d911)",
                borderRadius: 12,
                color: "#fff",
              }}
            >
              <DollarCircleOutlined style={{ fontSize: 32, color: "#fff" }} />
              <Title level={5} style={{ color: "#fff" }}>
                Total Income
              </Title>
              <p style={{ fontSize: 20, margin: 0 }}>
                {formatCurrency(summary.total_income)}
                {summary.growth?.income !== undefined && (
                  <span style={{ marginLeft: 8, fontSize: 14, color: "#fff" }}>
                    ({summary.growth.income >= 0 ? "+" : ""}
                    {summary.growth.income}%)
                  </span>
                )}
              </p>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Card
              style={{
                background: "linear-gradient(135deg, #faad14, #ffd666)",
                borderRadius: 12,
                color: "#fff",
              }}
            >
              <LineChartOutlined style={{ fontSize: 32, color: "#fff" }} />
              <Title level={5} style={{ color: "#fff" }}>
                Total Cost
              </Title>
              <p style={{ fontSize: 20, margin: 0 }}>
                {formatCurrency(summary.total_cost)}
              </p>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Card
              style={{
                background: "linear-gradient(135deg, #1890ff, #69c0ff)",
                borderRadius: 12,
                color: "#fff",
              }}
            >
              <RiseOutlined style={{ fontSize: 32, color: "#fff" }} />
              <Title level={5} style={{ color: "#fff" }}>
                Profit
              </Title>
              <p style={{ fontSize: 20, margin: 0 }}>
                {formatCurrency(summary.profit)}
              </p>
            </Card>
          </Col>
        </Row>

        {/* Line Chart */}
        <Card title="📈 Income vs Cost" style={{ marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total_income"
                stroke={chartColors}
                name="Income"
              />
              <Line
                type="monotone"
                dataKey="total_cost"
                stroke="#ff4d4f"
                name="Cost"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Export & Print */}
      <Row justify="end" gutter={8}>
        <Col>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
            type="primary"
          >
            Export to Excel
          </Button>
        </Col>
        <Col>
          <Button icon={<PrinterOutlined />} onClick={handlePrintDashboard}>
            Print Dashboard
          </Button>
        </Col>
      </Row>

      {/* Low Stock Modal */}
      <Modal
        title="Low Stock Products"
        open={showLowStockModal}
        onCancel={() => setShowLowStockModal(false)}
        footer={null}
        width={screens.xs ? 360 : 800}
      >
        <div ref={stockPrintRef}>
          <Table
            dataSource={lowStockItems}
            rowKey="id"
            pagination={false}
            columns={[
              { title: "Product", dataIndex: "name" },
              { title: "SKU", dataIndex: "sku" },
              { title: "Quantity", dataIndex: "quantity" },
              { title: "Critical Level", dataIndex: "critical_level" },
              { title: "Category", dataIndex: "category" },
            ]}
            locale={{
              emptyText: <Empty description="All stock levels are safe." />,
            }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
