import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Table,
  Button,
  Modal,
  message,
  Popconfirm,
  Typography,
  Space,
  Select,
  Empty,
  Card,
  Row,
  Col,
  Tabs,
  Form,
  Input,
  InputNumber,
  Tag,
} from "antd";
import {
  FilePdfOutlined,
  EditOutlined,
  DeleteOutlined,
  PrinterOutlined,
  DownloadOutlined,
  DollarCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import axios from "../api/axios.js"; // path to the file above
import SalesEditForm from "../components/SalesEditForm.jsx";

const { Title, Text } = Typography;

const SalesTable = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState(null);
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [form] = Form.useForm();
  const statusOptions = ["Pending", "Partial", "Paid", "Cancelled"];

  /** Fetch sales */
  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/sales/grouped-sales");
      const data = Array.isArray(res.data) ? res.data : [];

      const enriched = data.map((sale) => {
        const total_amount =
          sale.items?.reduce(
            (sum, item) => sum + Number(item.total_price || 0),
            0
          ) || 0;
        const vat_amount = Number(sale.vat_amount || 0);
        const grand_total = total_amount + vat_amount;
        const amount_paid = Number(sale.amount_paid || 0);
        const remaining_payment = grand_total - amount_paid;

        let status = "Pending";
        if (amount_paid === 0) status = "Pending";
        else if (amount_paid > 0 && amount_paid < grand_total)
          status = "Partial";
        else if (amount_paid >= grand_total) status = "Paid";

        return {
          ...sale,
          total_amount,
          vat_amount,
          grand_total,
          amount_paid,
          remaining_payment,
          status,
        };
      });

      setSales(enriched);
    } catch (err) {
      console.error("❌ Failed to fetch sales:", err);
      message.error("Failed to load sales data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  /** Update status manually */
  const updateStatus = useCallback(
    async (saleId, newStatus) => {
      if (!saleId) return message.error("Invalid sale ID");
      try {
        await axios.put(`/sales/${saleId}/status`, { status: newStatus });
        message.success("✅ Status updated");
        fetchSales();
      } catch (err) {
        console.error("Error updating status:", err);
        message.error("Failed to update status");
      }
    },
    [fetchSales]
  );

  /** Preview invoice */
  const handlePreviewInvoice = useCallback(
    async (saleId) => {
      if (!saleId) return message.error("Invalid sale ID");
      try {
        const res = await axios.get(`/sales/${saleId}/invoice`, {
          responseType: "blob",
        });
        const blob = new Blob([res.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        if (invoiceUrl) URL.revokeObjectURL(invoiceUrl);
        setInvoiceUrl(url);
        setInvoiceVisible(true);
      } catch (err) {
        console.error("❌ Invoice Preview Error:", err);
        message.error(
          err?.response?.status === 404
            ? "Invoice not found."
            : "Failed to preview invoice."
        );
      }
    },
    [invoiceUrl]
  );

  /** Delete sale */
  const handleDelete = useCallback(
    async (saleId) => {
      if (!saleId) return message.error("Invalid sale ID.");
      try {
        await axios.delete(`/sales/${saleId}`);
        message.success("✅ Sale deleted successfully.");
        fetchSales();
      } catch (err) {
        console.error("❌ Delete Error:", err);
        message.error("Failed to delete sale.");
      }
    },
    [fetchSales]
  );

  /** Payment Modal Open */
  const openPaymentModal = (record) => {
    setPayingInvoice(record);
    form.resetFields(); // Reset previous values
    setPaymentModalVisible(true);
  };

  const handlePaymentSubmit = async () => {
    try {
      if (!payingInvoice) return;

      const values = await form.validateFields();
      const { amount, method, note } = values;

      const remaining = payingInvoice.grand_total - payingInvoice.amount_paid;

      if (amount > remaining) {
        return message.error("❌ Payment cannot exceed remaining amount");
      }

      // Send payment to backend
      const res = await axios.post(
        `/sales/${payingInvoice.invoice_id}/payment`,
        { amount, method, note }
      );

      const updatedSale = res.data; // backend returns updated sale with payments

      // Update frontend state
      setSales((prev) =>
        prev.map((sale) =>
          sale.invoice_id === payingInvoice.invoice_id
            ? {
                ...sale,
                payments: updatedSale.payments || [],
                amount_paid: updatedSale.amount_paid,
                remaining_payment: updatedSale.remaining_payment,
                status: updatedSale.status,
              }
            : sale
        )
      );

      message.success("✅ Payment recorded successfully!");
      setPaymentModalVisible(false);
      form.resetFields();
      setPayingInvoice(null);
    } catch (err) {
      console.error("Payment error:", err);
      message.error(err.response?.data?.error || "❌ Failed to record payment");
    }
  };

  /** Expanded row for items & payments */

  const expandedRowRender = useCallback(
    (record) => {
      const total = record.total_amount || 0;
      const vat = record.vat_amount || 0;
      const grandTotal = total + vat;
      const amountPaid = record.amount_paid || 0;
      const remaining = grandTotal - amountPaid;

      return (
        <Tabs
          defaultActiveKey="items"
          type="card"
          tabBarStyle={{ marginBottom: 20 }}
          items={[
            {
              key: "items",
              label: <span>📦 Items</span>,
              children: (
                <>
                  <Table
                    dataSource={record.items || []}
                    rowKey={(item) => item.product_id || item.name}
                    size="small"
                    pagination={false}
                    variant="bordered"
                    columns={[
                      {
                        title: "Product",
                        dataIndex: "name",
                        render: (val) => (
                          <Text strong style={{ color: "#1890ff" }}>
                            {val}
                          </Text>
                        ),
                      },
                      {
                        title: "Quantity",
                        dataIndex: "quantity",
                        align: "center",
                        render: (val) => (
                          <Tag color="blue" style={{ fontSize: 13 }}>
                            {val}
                          </Tag>
                        ),
                      },
                      {
                        title: "Unit Price",
                        dataIndex: "sale_price",
                        align: "right",
                        render: (val) => (
                          <Text type="secondary">
                            ETB {Number(val || 0).toFixed(2)}
                          </Text>
                        ),
                      },
                      {
                        title: "Subtotal",
                        align: "right",
                        render: (_, item) => (
                          <Text strong style={{ color: "#52c41a" }}>
                            ETB{" "}
                            {(
                              Number(item?.quantity || 0) *
                              Number(item?.sale_price || 0)
                            ).toFixed(2)}
                          </Text>
                        ),
                      },
                    ]}
                    locale={{
                      emptyText: (
                        <Empty
                          description="No items in this sale"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ),
                    }}
                  />

                  {/* Summary Card */}
                  <Card
                    size="small"
                    style={{
                      marginTop: 16,
                      borderRadius: 10,
                      background: "#fafafa",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div style={{ textAlign: "right" }}>
                      <div>
                        Total (excl. VAT): <b>ETB {total.toFixed(2)}</b>
                      </div>
                      <div>
                        VAT: <b>ETB {vat.toFixed(2)}</b>
                      </div>
                      <div style={{ fontWeight: "bold", fontSize: 16 }}>
                        Grand Total:{" "}
                        <span style={{ color: "#722ed1" }}>
                          ETB {grandTotal.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        Paid:{" "}
                        <Text style={{ color: "green", fontWeight: 600 }}>
                          ETB {amountPaid.toFixed(2)}
                        </Text>
                      </div>
                      <div>
                        Remaining:{" "}
                        <Text
                          style={{
                            color: remaining > 0 ? "red" : "gray",
                            fontWeight: 600,
                          }}
                        >
                          ETB {remaining.toFixed(2)}
                        </Text>
                      </div>
                      <div>
                        Status:{" "}
                        <Tag
                          color={
                            record.status === "Paid"
                              ? "green"
                              : record.status === "Partial"
                              ? "orange"
                              : "red"
                          }
                          style={{ fontSize: 13, padding: "2px 10px" }}
                        >
                          {record.status}
                        </Tag>
                      </div>
                    </div>
                  </Card>
                </>
              ),
            },
            {
              key: "payments",
              label: <span>💰 Payments</span>,
              children: (
                <>
                  <Button
                    type="primary"
                    onClick={() => openPaymentModal(record)}
                    style={{
                      marginBottom: 12,
                      borderRadius: 6,
                      background: "#52c41a",
                      borderColor: "#52c41a",
                    }}
                  >
                    + Record Payment
                  </Button>

                  <Table
                    dataSource={record.payments || []}
                    rowKey={(p) => p.id}
                    size="small"
                    variant="bordered"
                    pagination={false}
                    columns={[
                      {
                        title: "Amount",
                        dataIndex: "amount",
                        render: (val) => (
                          <Tag color="gold" style={{ fontSize: 13 }}>
                            ETB {Number(val || 0).toFixed(2)}
                          </Tag>
                        ),
                      },
                      {
                        title: "Method",
                        dataIndex: "method",
                        render: (val) => (
                          <Text style={{ color: "#1890ff" }}>{val}</Text>
                        ),
                      },
                      { title: "Note", dataIndex: "note" },
                      {
                        title: "Date",
                        dataIndex: "paid_at",
                        render: (date) =>
                          date ? (
                            <Text type="secondary">
                              {new Date(date).toLocaleString()}
                            </Text>
                          ) : (
                            <i>N/A</i>
                          ),
                      },
                    ]}
                    locale={{
                      emptyText: (
                        <Empty
                          description="No payments recorded yet"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ),
                    }}
                  />
                </>
              ),
            },
          ]}
        />
      );
    },
    [openPaymentModal]
  );

  /** Summary Cards */
  const totalSales = useMemo(
    () => sales.reduce((sum, s) => sum + (s.grand_total || 0), 0),
    [sales]
  );
  const totalPaid = useMemo(
    () => sales.reduce((sum, s) => sum + (s.amount_paid || 0), 0),
    [sales]
  );
  const totalRemaining = useMemo(
    () => sales.reduce((sum, s) => sum + (s.remaining_payment || 0), 0),
    [sales]
  );

  const formatter = new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 2,
  });

  /** Columns */
  const columns = useMemo(
    () => [
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (text, record) => {
          const color =
            text === "Paid"
              ? "green"
              : text === "Partial"
              ? "orange"
              : text === "Pending"
              ? "red"
              : "gray";
          return (
            <Space>
              <Tag color={color}>{text}</Tag>
              <Select
                value={text}
                onChange={(value) => updateStatus(record.invoice_id, value)}
                style={{ width: 140 }}
                options={statusOptions.map((s) => ({ label: s, value: s }))}
              />
            </Space>
          );
        },
      },
      {
        title: "Customer",
        dataIndex: ["customer", "name"],
        key: "customer_name",
        render: (n) => n || <i style={{ color: "#999" }}>N/A</i>,
      },
      {
        title: "Phone",
        dataIndex: ["customer", "phone"],
        key: "customer_phone",
        render: (p) => p || <i style={{ color: "#999" }}>N/A</i>,
      },
      {
        title: "Items",
        key: "items_count",
        render: (_, r) => r.items?.length || 0,
      },
      {
        title: "Total",
        key: "total_amount",
        render: (_, r) => (
          <Text>{`ETB ${Number(r.total_amount || 0).toFixed(2)}`}</Text>
        ),
      },
      {
        title: "VAT",
        key: "vat_amount",
        render: (_, r) => `ETB ${Number(r.vat_amount || 0).toFixed(2)}`,
      },
      {
        title: "Grand Total",
        key: "grand_total",
        render: (_, r) => (
          <Text strong>{`ETB ${Number(r.grand_total || 0).toFixed(2)}`}</Text>
        ),
      },
      {
        title: "Paid",
        key: "amount_paid",
        render: (_, r) => (
          <Text style={{ color: "green" }}>{`ETB ${Number(
            r.amount_paid || 0
          ).toFixed(2)}`}</Text>
        ),
      },
      {
        title: "Remaining",
        key: "remaining_payment",
        render: (_, r) => (
          <Text
            style={{ color: r.remaining_payment > 0 ? "red" : "gray" }}
          >{`ETB ${Number(r.remaining_payment || 0).toFixed(2)}`}</Text>
        ),
      },
      {
        title: "Date",
        dataIndex: "created_at",
        key: "created_at",
        render: (d) => (d ? new Date(d).toLocaleString() : <i>N/A</i>),
      },
      {
        title: "Actions",
        key: "actions",
        render: (_, r) => {
          const id = r.invoice_id;
          return (
            <Space>
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => handlePreviewInvoice(id)}
              >
                Invoice
              </Button>
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  setSelectedSale(r);
                  setEditVisible(true);
                }}
              >
                Edit
              </Button>
              <Popconfirm
                title="Are you sure to delete?"
                onConfirm={() => handleDelete(id)}
                okText="Yes"
                cancelText="No"
              >
                <Button danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [updateStatus, handlePreviewInvoice, handleDelete]
  );

  return (
    <div>
      <Title level={3}>🧾 Sales Overview</Title>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12, background: "#e6f7ff" }}>
            <DollarCircleOutlined style={{ fontSize: 24, color: "#1890ff" }} />
            <Title level={4}>{formatter.format(totalSales)}</Title>
            <Text>Total Sales</Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12, background: "#f6ffed" }}>
            <CheckCircleOutlined style={{ fontSize: 24, color: "#52c41a" }} />
            <Title level={4}>{formatter.format(totalPaid)}</Title>
            <Text>Total Paid</Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12, background: "#fff1f0" }}>
            <WarningOutlined style={{ fontSize: 24, color: "#ff4d4f" }} />
            <Title level={4}>{formatter.format(totalRemaining)}</Title>
            <Text>Remaining</Text>
          </Card>
        </Col>
      </Row>

      <Table
        dataSource={sales}
        columns={columns}
        rowKey={(r) => r.invoice_id ?? r.id}
        loading={loading}
        expandable={{ expandedRowRender }}
        variant="bordered"
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: "max-content" }}
      />

      {/* Payment Modal */}
      <Modal
        title={`Record Payment - Invoice #${payingInvoice?.invoice_id}`}
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        onOk={handlePaymentSubmit}
        okText="Record Payment"
      >
        {payingInvoice && (
          <>
            {/* Remaining Payment Display */}
            <div style={{ marginBottom: 12 }}>
              Remaining Payment:{" "}
              <Text
                style={{
                  fontWeight: 600,
                  color: payingInvoice.remaining_payment > 0 ? "red" : "gray",
                }}
              >
                ETB {payingInvoice.remaining_payment.toFixed(2)}
              </Text>
            </div>

            <Form form={form} layout="vertical">
              <Form.Item
                name="amount"
                label="Amount (ETB)"
                rules={[
                  { required: true, message: "Enter amount" },
                  {
                    validator: (_, value) => {
                      const remaining =
                        payingInvoice.grand_total - payingInvoice.amount_paid;
                      if (value > remaining) {
                        return Promise.reject(
                          new Error("❌ Amount cannot exceed remaining payment")
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  max={payingInvoice.grand_total - payingInvoice.amount_paid}
                  style={{ width: "100%" }}
                  formatter={(val) => `ETB ${val}`}
                  parser={(val) => val.replace(/ETB\s?|(,*)/g, "")}
                  onChange={(value) => {
                    const remaining =
                      payingInvoice.grand_total - payingInvoice.amount_paid;
                    if (value > remaining) {
                      message.warning(
                        `⚠️ Amount cannot exceed remaining payment: ETB ${remaining.toFixed(
                          2
                        )}`
                      );
                      form.setFieldsValue({ amount: remaining });
                    }
                  }}
                />
              </Form.Item>

              <Form.Item
                name="method"
                label="Payment Method"
                initialValue="Cash"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value="Cash">Cash</Select.Option>
                  <Select.Option value="Bank">Bank</Select.Option>
                  <Select.Option value="Mobile">Mobile</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="note" label="Note (optional)">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* Invoice Modal */}
      <Modal
        title="🧾 Invoice Preview"
        open={invoiceVisible}
        onCancel={() => {
          setInvoiceVisible(false);
          if (invoiceUrl) URL.revokeObjectURL(invoiceUrl);
          setInvoiceUrl(null);
        }}
        footer={[
          <Button
            key="print"
            icon={<PrinterOutlined />}
            onClick={() =>
              document.getElementById("invoice-frame")?.contentWindow?.print()
            }
          >
            Print
          </Button>,
          <Button
            key="download"
            icon={<DownloadOutlined />}
            onClick={() => window.open(invoiceUrl, "_blank")}
            disabled={!invoiceUrl}
          >
            Download
          </Button>,
        ]}
        width="80%"
        destroyOnHidden
      >
        {invoiceUrl ? (
          <iframe
            id="invoice-frame"
            src={invoiceUrl}
            style={{ width: "100%", height: 600, border: "none" }}
            title="Invoice Preview"
          />
        ) : (
          <p>Loading invoice preview...</p>
        )}
      </Modal>

      {/* Edit Sale Modal */}
      <Modal
        title="✏️ Edit Sale"
        open={editVisible}
        onCancel={() => setEditVisible(false)}
        footer={null}
        destroyOnHidden
      >
        <SalesEditForm
          sale={selectedSale}
          onClose={() => setEditVisible(false)}
          onUpdated={fetchSales}
        />
      </Modal>
    </div>
  );
};

export default SalesTable;
