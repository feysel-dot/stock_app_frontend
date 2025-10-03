import React, { useEffect, useState } from "react";
import {
  Table,
  Tag,
  Typography,
  Button,
  Collapse,
  Space,
  message,
  Modal,
  Card,
} from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import axios from "../api/axios"; // path to the file above

const { Title } = Typography;

const GroupedSalesTable = () => {
  const [groupedSales, setGroupedSales] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);

  const token = localStorage.getItem("token");
  const [invoiceUrl, setInvoiceUrl] = useState(null);
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  console.log("JWT token:", token);
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

        if (invoiceUrl) URL.revokeObjectURL(invoiceUrl); // free previous URL
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
  /** ---------- Fetch Grouped Sales ---------- */
  const fetchGroupedSales = async () => {
    try {
      const res = await axios.get(`${base_URL}/sales/grouped-sales`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(res.data);
      if (Array.isArray(res.data)) setGroupedSales(res.data);
      else {
        setGroupedSales([]);
        message.warning("No grouped sales data found");
      }
    } catch (err) {
      console.error("❌ Error fetching grouped sales:", err);
      message.error("Unauthorized or failed to load sales");
    }
  };

  useEffect(() => {
    if (!openPreview && invoiceUrl) {
      URL.revokeObjectURL(invoiceUrl);
      setInvoiceUrl(null);
    }
  }, [openPreview]);

  /** ---------- Payment Status Tag ---------- */
  const getPaymentStatusTag = (paid, total) => {
    if (paid >= total && total > 0) return <Tag color="green">Paid</Tag>;
    if (paid > 0 && paid < total) return <Tag color="orange">Partial</Tag>;
    return <Tag color="red">Pending</Tag>;
  };

  /** ---------- Prepare Collapse Items ---------- */
  const collapseItems = groupedSales.map((sale) => {
    const customer = sale.customer || {};
    return {
      key: sale.invoice_id,
      label: `Invoice #${sale.invoice_id} - ${
        customer.name || "N/A"
      } - ${new Date(sale.created_at).toLocaleDateString()}`,
      children: (
        <Card
          style={{
            borderRadius: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            marginBottom: 16,
          }}
        >
          <p>
            <b>Customer:</b> {customer.name || "N/A"} <br />
            <b>Phone:</b> {customer.phone || "N/A"} <br />
            <b>Email:</b> {customer.email || "N/A"} <br />
            <b>Total Amount:</b> ₵{sale.total_amount} <br />
            <b>Paid Amount:</b> ₵{sale.paid_amount} <br />
            <b>Payment Status:</b>{" "}
            {getPaymentStatusTag(
              Number(sale.paid_amount),
              Number(sale.total_amount)
            )}
          </p>
          <Table
            dataSource={sale.items || []}
            rowKey={(item) => item.product_id}
            pagination={false}
            columns={[
              { title: "Product", dataIndex: "product_name" },
              { title: "Quantity", dataIndex: "quantity" },
              {
                title: "Price",
                dataIndex: "sale_price",
                render: (price) => `₵${price}`,
              },
              {
                title: "Total",
                dataIndex: "total_price",
                render: (total) => `₵${total}`,
              },
            ]}
            variant="bordered"
            rowClassName={(r, i) =>
              i % 2 === 0 ? "table-row-light" : "table-row-dark"
            }
          />
          <Space style={{ marginTop: "1rem" }}>
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => handlePreviewInvoice(id)}
            >
              Preview Invoice
            </Button>
          </Space>
        </Card>
      ),
    };
  });

  return (
    <div>
      <Title level={3}>Grouped Sales by Invoice</Title>
      <Collapse
        accordion
        items={collapseItems}
        style={{ borderRadius: 12, overflow: "hidden" }}
      />
      <Modal
        title="Invoice Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width="80%"
      >
        <iframe
          src={invoiceUrl}
          style={{
            width: "100%",
            height: "80vh",
            border: "none",
            borderRadius: 8,
          }}
          title="Invoice PDF"
        />
      </Modal>
      <style>{`
        .table-row-light { background: #f5faff; }
        .table-row-dark { background: #e0f0ff; }
        .ant-table-thead > tr > th { background: #5b86e5; color: #fff; }
        .ant-table-tbody > tr:hover { background: #d0ebff !important; cursor: pointer; }
      `}</style>
    </div>
  );
};
export default GroupedSalesTable;
