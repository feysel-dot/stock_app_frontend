
import React, { useEffect, useState, useContext, useRef } from "react";
import {
  Card,
  Col,
  Row,
  Typography,
  Table,
  Tooltip,
  message,
  Empty,
  Statistic,
  Skeleton,
  Progress,
  Divider,
  Button,
  Space,
  Spin,
} from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  BarChartOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import axios from "../api/axios.js";
import { AuthContext } from "../context/AuthContext";
import IncomeChart from "../components/IncomeChart";
import TopProductsChart from "../components/TopProductsChart";

const { Title, Text } = Typography;

/** ✅ Currency formatter */
const formatCurrency = (value) =>
  (Number(value) || 0).toLocaleString("en-ET", {
    style: "currency",
    currency: "ETB",
  });

/** ✅ Summary card */
const SummaryCard = ({ title, value, lastValue, growth, icon, color }) => {
  const isPositive = growth > 0;
  const isNegative = growth < 0;

  return (
    <Tooltip
      title={`${title} this period: ${formatCurrency(
        value
      )} | Previous: ${formatCurrency(lastValue)}`}
    >
      <Card>
        <Statistic
          title={title}
          value={value}
          formatter={formatCurrency}
          prefix={icon}
          valueStyle={{ color }}
          suffix={
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              {isPositive && <ArrowUpOutlined style={{ color: "#3f8600" }} />}
              {isNegative && <ArrowDownOutlined style={{ color: "#cf1322" }} />}
              <b
                style={{
                  color: isPositive
                    ? "#3f8600"
                    : isNegative
                    ? "#cf1322"
                    : "#8c8c8c",
                }}
              >
                {Math.abs(growth ?? 0)}%
              </b>
            </span>
          }
        />
        <Progress
          percent={Math.min(Math.abs(growth ?? 0), 100)}
          size="small"
          status={isPositive ? "success" : isNegative ? "exception" : "normal"}
          style={{ marginTop: 8 }}
        />
        <Text type="secondary">Compared to last month</Text>
      </Card>
    </Tooltip>
  );
};

/** ✅ Export Buttons */
const ExportButtons = ({ onExcel, onPdf }) => (
  <Space style={{ marginBottom: 16 }}>
    <Tooltip title="Export full report to Excel">
      <Button icon={<FileExcelOutlined />} onClick={onExcel} type="primary">
        Excel
      </Button>
    </Tooltip>
    <Tooltip title="Export full report to PDF including charts">
      <Button icon={<FilePdfOutlined />} onClick={onPdf} danger>
        PDF
      </Button>
    </Tooltip>
  </Space>
);

const Report = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [topProducts, setTopProducts] = useState([]);
  const [salesByCustomer, setSalesByCustomer] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();

  const topProductsRef = useRef(null);
  const incomeChartRef = useRef(null);

  /** ✅ Fetch report data */
  useEffect(() => {
    if (user.role !== "manager") return;
    (async () => {
      try {
        const [summaryRes, productsRes, customerRes, stockRes] =
          await Promise.all([
            axios.get("/dashboard/summary"),
            axios.get("/sales/top-products?limit=5"),
            axios.get("/sales/by-customer"),
            axios.get("/reports/stock-report"),
          ]);
        setSummary(summaryRes.data || {});
        setTopProducts(productsRes.data || []);
        setSalesByCustomer(customerRes.data || []);
        setData(stockRes.data || []);
      } catch (err) {
        console.error("Report fetch error:", err);
        messageApi.error("❌ Failed to fetch report data");
      } finally {
        setLoading(false);
      }
    })();
  }, [user.role, messageApi]);

  if (user.role !== "manager") {
    return <Text type="danger">❌ Only managers can view reports.</Text>;
  }

  /** 📥 Export Excel */
  const exportFullExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([summary]),
      "Summary"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(topProducts),
      "Top Products"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(salesByCustomer),
      "Sales By Customer"
    );
    XLSX.writeFile(wb, "FullBusinessReport.xlsx");
  };

  /** 📄 Export PDF */
  const exportFullPDF = async () => {
    const doc = new jsPDF();
    doc.text("📊 Full Business Report", 14, 15);

    doc.autoTable({
      startY: 25,
      head: [["Income", "Sales", "Profit", "Margin", "Customers"]],
      body: [
        [
          formatCurrency(summary.total_income),
          summary.sales || 0,
          formatCurrency(summary.profit),
          `${summary.profit_margin ?? 0}%`,
          summary.total_customers || 0,
        ],
      ],
    });

    const captureChart = async (ref, title) => {
      if (!ref.current) return;
      const canvas = await html2canvas(ref.current, { scale: 2 });
      doc.addPage();
      doc.text(title, 14, 20);
      doc.addImage(canvas.toDataURL("image/png"), "PNG", 14, 30, 180, 100);
    };

    await captureChart(topProductsRef, "🏆 Top Products Chart");
    await captureChart(incomeChartRef, "📅 Income Trend Chart");
    doc.save("FullBusinessReport.pdf");
  };

  /** Table columns */
  const columns = [
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (text) => <b>{text}</b>,
    },
    { title: "Color", dataIndex: "color", key: "color" },
    {
      title: "Product Count",
      dataIndex: "product_count",
      key: "product_count",
    },
    {
      title: "Total Stock",
      dataIndex: "total_stock",
      key: "total_stock",
      render: (val) => <span>{Number(val).toLocaleString()}</span>,
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f5f7fa", minHeight: "100vh" }}>
      {contextHolder}

      <Title level={2} style={{ textAlign: "center", marginBottom: 8 }}>
        📊 Manager Dashboard Report
      </Title>
      <Text type="secondary" style={{ display: "block", textAlign: "center" }}>
        Overview of sales, stock, income, profit, and customer trends.
      </Text>

      <Divider />

      {/* Stock Report */}
      <Card style={{ borderRadius: 16, margin: "20px auto" }}>
        <Title level={3} style={{ textAlign: "center", marginBottom: 20 }}>
          📦 Stock Report (By Product, Category & Color)
        </Title>
        <Spin spinning={loading} tip="Loading stock report...">
          <Table
            columns={columns}
            dataSource={data.map((item, idx) => ({
              key: item.id || idx,
              ...item,
            }))}
            pagination={{ pageSize: 8 }}
            bordered
            scroll={{ x: "max-content" }}
            sticky
          />
        </Spin>
      </Card>

      <Divider orientation="left">
        📅 <b>Business Overview</b>
      </Divider>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        {loading ? (
          <Skeleton active />
        ) : (
          <>
            <Col xs={24} sm={12} md={6}>
              <SummaryCard
                title="💰 Income"
                value={summary.total_income}
                lastValue={summary.last_income}
                growth={summary.income_growth}
                icon={<DollarOutlined />}
                color="#3f8600"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <SummaryCard
                title="🛒 Sales"
                value={summary.sales}
                lastValue={summary.last_sales}
                growth={summary.sales_growth}
                icon={<ShoppingCartOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <SummaryCard
                title="📦 Profit"
                value={summary.profit}
                lastValue={summary.last_profit}
                growth={summary.profit_growth}
                icon={<BarChartOutlined />}
                color="#722ed1"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <SummaryCard
                title="👤 Customers"
                value={summary.total_customers}
                lastValue={summary.last_customers}
                growth={summary.customer_growth}
                icon={<UserOutlined />}
                color="#faad14"
              />
            </Col>
          </>
        )}
      </Row>

      <Divider orientation="left">
        🏆 <b>Performance Insights</b>
      </Divider>

      {/* Top Products */}
      <div ref={topProductsRef}>
        <Title level={4}>Top-Selling Products</Title>
        <Spin spinning={loading} tip="Loading top products...">
          {topProducts.length ? (
            <TopProductsChart data={topProducts} />
          ) : (
            <Empty />
          )}
        </Spin>
      </div>

      {/* Income Chart */}
      <div style={{ marginTop: 32 }} ref={incomeChartRef}>
        <Title level={4}>Income Trend</Title>
        <Spin spinning={loading} tip="Loading income chart...">
          <IncomeChart />
        </Spin>
      </div>

      <Divider orientation="left">
        👥 <b>Customer Insights</b>
      </Divider>

      {/* Sales by Customer */}
      <div style={{ marginTop: 16 }}>
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 12 }}
        >
          <Title level={4} style={{ margin: 0 }}>
            Sales by Customer
          </Title>
          <ExportButtons onExcel={exportFullExcel} onPdf={exportFullPDF} />
        </Row>
        <Spin spinning={loading} tip="Loading customer sales...">
          <Table
            dataSource={salesByCustomer.map((c, i) => ({
              key: c.id || i,
              ...c,
            }))}
            columns={[
              { title: "Customer", dataIndex: "customer", key: "customer" },
              {
                title: "Total Purchases",
                dataIndex: "total_amount",
                key: "total_amount",
                render: (val) => formatCurrency(val),
              },
            ]}
            pagination={{ pageSize: 5 }}
            bordered
            sticky
          />
        </Spin>
      </div>
    </div>
  );
};

export default Report;
