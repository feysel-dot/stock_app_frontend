import React, { useState } from "react";
import { Table, Tag, Progress, Typography } from "antd";
import InvoicePreview from "./InvoicePreview";
import axios from "../api/axios.js"; // path to the file above
const { Text } = Typography;

const RecentSales = ({ sales }) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState("");
  //const res = await axios.get(`/sales/report?from=${from}&to=${to}`);
  const base_URL = axios.get(`/sales/${record.invoice_id}/invoice`);

  const formatETB = (num) =>
    `ETB ${Number(num || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

  const getStatusTag = (record) => {
    const total = Number(record.total_amount) || 0;
    const paid = Number(record.paid_amount) || 0;
    if (paid >= total && total > 0) return <Tag color="green">Paid</Tag>;
    if (paid > 0 && paid < total) return <Tag color="orange">Partial</Tag>;
    return <Tag color="red">Pending</Tag>;
  };

  const columns = [
    {
      title: "Invoice",
      dataIndex: "invoice_id",
      key: "invoice_id",
      render: (id) => <b>#{id}</b>,
    },
    {
      title: "Customer",
      dataIndex: ["customer", "name"],
      key: "customer",
      render: (name) => name || <i style={{ color: "#888" }}>N/A</i>,
    },
    {
      title: "Total",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (val) => formatETB(val),
    },
    {
      title: "Paid",
      dataIndex: "paid_amount",
      key: "paid_amount",
      render: (val) => formatETB(val),
    },
    {
      title: "Progress",
      key: "progress",
      render: (_, record) => {
        const total = Number(record.total_amount) || 0;
        const paid = Number(record.paid_amount) || 0;
        const percent = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
        return (
          <Progress
            percent={percent}
            size="small"
            status={percent === 100 ? "success" : "active"}
            strokeColor={{ from: "#108ee9", to: "#87d068" }}
          />
        );
      },
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => getStatusTag(record),
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div style={{ marginTop: 20 }}>
      <Typography.Title
        level={4}
        style={{ marginBottom: 16, color: "#1677ff" }}
      >
        Recent Sales
      </Typography.Title>

      <Table
        dataSource={sales}
        rowKey={(r) => r.invoice_id}
        columns={columns}
        pagination={{ pageSize: 5 }}
        size="middle"
        variant="bordered"
        onRow={(record) => ({
          onClick: () => {
            // const url = `${base_URL}/sales/${record.invoice_id}/invoice`;
            const url = `${base_URL}`;
            setInvoiceUrl(url);
            setPreviewVisible(true);
          },
        })}
        rowClassName="clickable-row"
      />

      <InvoicePreview
        visible={previewVisible}
        url={invoiceUrl}
        onClose={() => setPreviewVisible(false)}
      />

      <style>{`
        .clickable-row {
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .clickable-row:hover {
          background: #f0f8ff !important;
        }
      `}</style>
    </div>
  );
};

export default RecentSales;
