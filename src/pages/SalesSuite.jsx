import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  ConfigProvider,
  Layout,
  Row,
  Col,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Divider,
  Typography,
  Table,
  Tag,
  Progress,
  Collapse,
  Space,
  Modal,
  message,
  Empty,
} from "antd";
import {
  MinusCircleOutlined,
  PlusOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import axios from "../api/axios.js"; // path to the file above

const { Option } = Select;
const { Title, Text } = Typography;
const { Header, Content } = Layout;

/* -------------------- Line Totals -------------------- */
const LineTotals = ({ index, productById, form }) => {
  // 🔎 Watch field values reactively
  const productId = Form.useWatch(["items", index, "product_id"], form);
  const quantity = Form.useWatch(["items", index, "quantity"], form);
  const measurement = Form.useWatch(["items", index, "measurement"], form); // ✅ consistent naming

  const p = productById.get(String(productId));
  if (!p) return null;

  // ✅ Pick correct price depending on measurement
  let unitPrice = Number(p.sale_price || 0);
  switch (measurement) {
    case "KG":
      unitPrice = Number(p.kg_price ?? p.sale_price ?? 0);
      break;
    case "BAR":
      unitPrice = Number(p.bar_price ?? p.sale_price ?? 0);
      break;
    case "METER":
      unitPrice = Number(p.meter_price ?? p.sale_price ?? 0);
      break;
    case "PCS":
      unitPrice = Number(p.unit_price ?? p.sale_price ?? 0);
      break;
    default:
      unitPrice = Number(p.sale_price ?? 0);
  }

  const lineTotal = unitPrice * (Number(quantity) || 0);

  return (
    <div style={{ textAlign: "right" }}>
      <Text type="secondary">
        Unit Price: {unitPrice.toFixed(2)} ETB &nbsp; | &nbsp; Line Total:{" "}
        <b>{lineTotal.toFixed(2)} ETB</b>
      </Text>
    </div>
  );
};

/* -------------------- Sales Suite -------------------- */
const SalesSuite = () => {
  /* Forms */
  const [form] = Form.useForm();
  const [custForm] = Form.useForm();
  const [apiMsg, ctx] = message.useMessage();

  /* Meta */
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [groupedSales, setGroupedSales] = useState([]);

  /* UI state */
  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [addCustVisible, setAddCustVisible] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState(null);
  const [openPreview, setOpenPreview] = useState(false);

  /* Totals (live) */
  const [subtotal, setSubtotal] = useState(0);
  const [vat, setVat] = useState(0);
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);

  /* Fetch meta + recent + grouped */
  const fetchAll = useCallback(async () => {
    try {
      setLoadingMeta(true);
      const [prodRes, custRes, groupedRes] = await Promise.all([
        axios.get("/products"),
        axios.get("/customers"),
        axios.get("/sales/grouped-sales"),
      ]);

      const allSales = Array.isArray(groupedRes?.data) ? groupedRes.data : [];

      setRecentSales(allSales.slice(0, 5));
      setProducts(Array.isArray(prodRes?.data?.data) ? prodRes.data.data : []);
      setCustomers(Array.isArray(custRes?.data) ? custRes.data : []);
      setGroupedSales(allSales);
    } catch (err) {
      console.error("Fetch dashboard error:", err);
      apiMsg.error("Failed to load dashboard data.");
    } finally {
      setLoadingMeta(false);
    }
  }, [apiMsg]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* Product map */
  const productById = useMemo(
    () => new Map(products.map((p) => [String(p.id), p])),
    [products]
  );

  /* -------------------- Live Totals -------------------- */
  const items = Form.useWatch("items", form) || [];
  const vatPercentage = Form.useWatch("vat_percentage", form) ?? 15;
  const amountPaid = Form.useWatch("amount_paid", form) ?? 0;

  useEffect(() => {
    const sub = items.reduce((sum, it) => {
      const p = productById.get(String(it?.product_id));
      if (!p) return sum;

      let unitPrice = Number(p.sale_price || 0);

      switch (
        it?.measurement // ✅ renamed from "measurement" to "unit" consistently
      ) {
        case "KG":
          unitPrice = Number(p.kg_price ?? p.sale_price ?? 0);
          break;
        case "BAR":
          unitPrice = Number(p.bar_price ?? p.sale_price ?? 0);
          break;
        case "METER":
          unitPrice = Number(p.meter_price ?? p.sale_price ?? 0);
          break;
        case "PCS":
          unitPrice = Number(p.unit_price ?? p.sale_price ?? 0);
          break;
        default:
          unitPrice = Number(p.sale_price ?? 0);
      }

      return sum + unitPrice * (Number(it?.quantity) || 0);
    }, 0);

    const vatAmt = sub * (Number(vatPercentage) / 100);
    const tot = sub + vatAmt;

    setSubtotal(sub);
    setVat(vatAmt);
    setTotal(tot);
    setRemaining(Math.max(tot - Number(amountPaid || 0), 0));
  }, [items, vatPercentage, amountPaid, productById]);

  /* Add customer */
  const handleAddCustomer = async () => {
    try {
      const values = await custForm.validateFields();
      setAddingCustomer(true);
      const payload = {
        name: values.name?.trim(),
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        address: values.address?.trim() || null,
      };
      // 👇 prevent duplicates by phone or email
      const exists = customers.find(
        (c) =>
          c.phone === payload.phone ||
          (payload.email && c.email === payload.email)
      );
      if (exists) {
        apiMsg.error("❌ Customer already exists with this phone/email");
        setAddingCustomer(false);
        return;
      }
      const res = await axios.post("/customers", payload);
      apiMsg.success("✅ Customer added");
      setAddCustVisible(false);
      custForm.resetFields();
      await fetchAll();
      const newId =
        res?.data?.id ?? res?.data?.data?.id ?? res?.data?.customer?.id ?? null;
      if (newId) form.setFieldsValue({ customer_id: newId });
    } catch (err) {
      apiMsg.error(err?.message || "Failed to add customer");
    } finally {
      setAddingCustomer(false);
    }
  };

  /* -------------------- Submit Sale -------------------- */
  const onFinish = async (values) => {
    try {
      setLoading(true);

      if (!values.items?.length)
        return apiMsg.error("Add at least one product.");
      if (!values.customer_id) return apiMsg.error("Select a customer.");

      const itemsPayload = values.items
        .map((it) => {
          const p = productById.get(String(it.product_id));
          if (!p) return null;

          let price = Number(p.sale_price || 0);

          // ✅ match price based on measurement type
          switch (it?.measurement) {
            case "KG":
              price = Number(p.kg_price || p.sale_price || 0);
              break;
            case "BAR":
              price = Number(p.bar_price || p.sale_price || 0);
              break;
            case "METER":
              price = Number(p.meter_price || p.sale_price || 0);
              break;
            case "PCS":
            case "UNIT":
              price = Number(p.unit_price || p.sale_price || 0);
              break;
            default:
              price = Number(p.sale_price || 0);
          }

          return {
            product_id: Number(it.product_id),
            measurement: String(
              it?.measurement || p.default_measurement || "PCS"
            ).toLowerCase(), // ✅ renamed & lowercase
            color: it?.color || null, // ✅ correct field + null if not chosen
            quantity: Number(it.quantity) || 1,
            sale_price: price,
          };
        })
        .filter(Boolean); // ✅ remove nulls

      const payload = {
        customer_id: values.customer_id,
        items: itemsPayload,
        amount_paid: Number(values.amount_paid || 0),
        vat_percentage: Number(values.vat_percentage ?? 15),
        payment_status: values.payment_status || "pending",
      };

      const res = await axios.post("/sales/new-sales", payload);
      const saleId = res?.data?.saleId || res?.data?.sale_id || res?.data?.id;

      apiMsg.success("✅ Sale recorded successfully!");

      if (saleId) {
        const inv = await axios.get(`/sales/${saleId}/invoice`, {
          responseType: "blob",
        });
        const blobUrl = URL.createObjectURL(
          new Blob([inv.data], { type: "application/pdf" })
        );
        setInvoiceUrl(blobUrl);
        setOpenPreview(true);
      }

      form.resetFields();
      await fetchAll();
    } catch (err) {
      apiMsg.error(
        err?.response?.data?.error || err?.message || "Sale failed."
      );
    } finally {
      setLoading(false);
    }
  };

  //   /** 🔹 Payment status renderer */
  const renderStatus = (sale) => {
    const total = Number(sale.total_amount) || 0;
    const paid = Number(sale.amount_paid) || 0;

    if (paid >= total && total > 0)
      return <span style={{ color: "green", fontWeight: 600 }}>Paid</span>;
    if (paid > 0 && paid < total)
      return <span style={{ color: "orange", fontWeight: 600 }}>Partial</span>;
    return <span style={{ color: "red", fontWeight: 600 }}>Pending</span>;
  };

  /* Recent sales columns */
  /** 🔹 Columns */
  const recentColumns = useMemo(
    () => [
      { title: "Invoice ID", dataIndex: "invoice_id" },
      {
        title: "Customer",
        dataIndex: ["customer", "name"],
        render: (val) => val || "N/A",
      },
      {
        title: "Total",
        dataIndex: "total_amount",
        render: (val) => `Brr-${Number(val || 0).toFixed(2)}`,
      },
      {
        title: "Paid",
        dataIndex: "amount_paid",
        render: (val) => `Brr-${Number(val || 0).toFixed(2)}`,
      },
      {
        title: "Status",
        key: "status",
        render: (_, record) => renderStatus(record),
      },
      {
        title: "Progress",
        key: "progress",
        render: (_, record) => {
          const total = Number(record.total_amount) || 0;
          const paid = Number(record.amount_paid) || 0;
          const percent = total > 0 ? (paid / total) * 100 : 0;
          return (
            <Progress
              percent={percent}
              size="small"
              strokeColor={
                paid >= total ? "green" : paid > 0 ? "orange" : "red"
              }
            />
          );
        },
      },
    ],
    []
  );
  /* Grouped collapse items */
  const collapseItems = groupedSales.map((sale) => {
    const customer = sale.customer || {};
    return {
      key: sale.invoice_id,
      label: `Invoice #${sale.invoice_id} — ${
        customer.name || "N/A"
      } — ${new Date(sale.created_at).toLocaleDateString()}`,
      children: (
        <Card className="glass-card" style={{ marginBottom: 12 }}>
          <Row gutter={16} style={{ marginBottom: 8 }}>
            <Col xs={24} md={12}>
              <p style={{ marginBottom: 6 }}>
                <b>Customer:</b> {customer.name || "N/A"} <br />
                <b>Phone:</b> {customer.phone || "N/A"} <br />
                <b>Email:</b> {customer.email || "N/A"}
              </p>
            </Col>
            <Col xs={24} md={12} style={{ textAlign: "right" }}>
              <p style={{ marginBottom: 6 }}>
                <b>Total:</b> ETB{sale.total_amount} &nbsp; | &nbsp;
                <br />
                <b>Paid:</b> ETB{sale.paid_amount} &nbsp; | &nbsp;
                <br />
                <b>Payment Status:</b> {renderStatus(sale)}
              </p>
            </Col>
          </Row>

          <Table
            dataSource={sale.items || []}
            rowKey={(record) => record.id || record._id}
            pagination={false}
            size="small"
            columns={[
              { title: "Product", dataIndex: "name" },
              { title: "Qty", dataIndex: "quantity", width: 90 },
              {
                title: "Unit Price",
                dataIndex: "sale_price",
                render: (v) => `ETB${Number(v || 0).toFixed(2)}`,
              },
              {
                title: "Line Total",
                dataIndex: "total_price",
                render: (v) => `ETB${Number(v || 0).toFixed(2)}`,
              },
            ]}
            variant
            rowClassName={(_, i) => (i % 2 === 0 ? "row-light" : "row-dark")}
          />

          <Space style={{ marginTop: 12 }}>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                setInvoiceUrl(
                  `${axios.defaults.baseURL}/sales/${sale.invoice_id}/invoice`
                );
                setOpenPreview(true);
              }}
            >
              Preview Invoice
            </Button>
          </Space>
        </Card>
      ),
    };
  });

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#22c1c3", // blue-green brand
          colorInfo: "#22c1c3",
          colorSuccess: "#17c964",
          colorWarning: "#f5a524",
          colorError: "#f31260",
          borderRadius: 12,
          fontSize: 14,
        },
      }}
    >
      {ctx}
      <Layout className="suite-layout">
        <Header className="suite-header">
          <div className="brand">
            <div className="brand-dot" />
            <span>Sales Dashboard</span>
          </div>
          <div className="header-total">
            <span>Total (live):</span>
            <b> ETB {total.toFixed(2)}</b>
          </div>
        </Header>

        <Content style={{ padding: 16, maxWidth: 2000, margin: "0 auto" }}>
          <Row gutter={[16, 16]}>
            {/* Left: Form */}
            <Col xs={24} lg={14}>
              <Card
                title="🧾 New Sale Entry"
                className="glass-card"
                loading={loading || loadingMeta}
              >
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={onFinish}
                  initialValues={{
                    items: [{}],
                    vat_percentage: 15,
                    payment_status: "pending",
                  }}
                >
                  {/* Customer */}
                  <Form.Item
                    name="customer_id"
                    label="Select Customer"
                    rules={[
                      { required: true, message: "Please select a customer" },
                    ]}
                  >
                    <Select
                      placeholder="Select customer"
                      showSearch
                      optionFilterProp="children"
                      popupRender={(menu) => (
                        <>
                          {menu}
                          <Divider style={{ margin: "6px 0" }} />
                          <Button
                            type="link"
                            block
                            onClick={() => setAddCustVisible(true)}
                          >
                            + Add Customer
                          </Button>
                        </>
                      )}
                    >
                      <Option value="guest">Guest Customer</Option>
                      {customers.map((c) => (
                        <Option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ""}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Divider />

                  {/* -------------------- Items -------------------- */}
                  <Form.List name="items">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }, index) => {
                          const items = form.getFieldValue("items") || [];
                          const currentItem = items[index] || {};
                          const pid = currentItem.product_id;
                          const qty = currentItem.quantity || 0;

                          const selectedProduct = products.find(
                            (p) => p.id === pid
                          );

                          // ✅ Duplicate check
                          const isDuplicate =
                            pid &&
                            items.filter((it) => it.product_id === pid).length >
                              1;

                          // ✅ Stock check
                          const stockQty = selectedProduct?.quantity ?? 0;
                          const stockExceeded = qty > stockQty;

                          return (
                            <Card
                              className="glass-card"
                              key={key}
                              type="inner"
                              title={`🛒 Product #${index + 1}`}
                              extra={
                                fields.length > 1 && (
                                  <MinusCircleOutlined
                                    onClick={() => remove(name)}
                                    style={{ color: "var(--error)" }}
                                  />
                                )
                              }
                            >
                              <Row gutter={16}>
                                {/* Product Dropdown */}
                                <Col xs={24} md={24}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, "product_id"]}
                                    label="Product"
                                    rules={[
                                      {
                                        required: true,
                                        message: "Select product",
                                      },
                                    ]}
                                  >
                                    <Select
                                      placeholder="Select product"
                                      showSearch
                                      optionFilterProp="children"
                                      allowClear
                                    >
                                      {products.map((p) => (
                                        <Select.Option key={p.id} value={p.id}>
                                          {p.name} — Stock: {p.quantity} — Unit
                                          Price:{" "}
                                          {Number(p.sale_price || 0).toFixed(2)}{" "}
                                          ETB
                                        </Select.Option>
                                      ))}
                                    </Select>
                                  </Form.Item>
                                </Col>

                                {/* Quantity Input */}
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, "quantity"]}
                                    label="Quantity"
                                    rules={[
                                      {
                                        required: true,
                                        message: "Enter quantity",
                                      },
                                      {
                                        validator: (_, value) => {
                                          if (!value) return Promise.resolve();
                                          if (value > stockQty) {
                                            return Promise.reject(
                                              new Error(
                                                `Quantity exceeds available stock (${stockQty})`
                                              )
                                            );
                                          }
                                          return Promise.resolve();
                                        },
                                      },
                                    ]}
                                  >
                                    <InputNumber
                                      min={1}
                                      max={stockQty}
                                      style={{ width: "100%" }}
                                      placeholder="Enter quantity"
                                    />
                                  </Form.Item>
                                </Col>
                              </Row>

                              {/* Dynamic warnings */}
                              {(isDuplicate || stockExceeded) && (
                                <Row>
                                  <Col span={24}>
                                    {isDuplicate && (
                                      <Typography.Text type="danger">
                                        ⚠️ Duplicate product detected!
                                      </Typography.Text>
                                    )}
                                    {stockExceeded && (
                                      <Typography.Text
                                        type="danger"
                                        style={{ display: "block" }}
                                      >
                                        ⚠️ Quantity exceeds available stock (
                                        {stockQty})
                                      </Typography.Text>
                                    )}
                                  </Col>
                                </Row>
                              )}

                              <Row gutter={16}>
                                {/* Measurement */}
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, "measurement"]}
                                    label="Measurement"
                                    rules={[
                                      {
                                        required: true,
                                        message: "Select measurement",
                                      },
                                    ]}
                                    initialValue={
                                      selectedProduct?.default_measurement ||
                                      "PCS"
                                    }
                                  >
                                    <Select
                                      placeholder="Select measurement"
                                      disabled={!selectedProduct?.type?.length}
                                    >
                                      {selectedProduct?.type?.map((m, idx) => (
                                        <Select.Option
                                          key={`${pid}-${idx}`}
                                          value={m}
                                        >
                                          {m}
                                        </Select.Option>
                                      ))}
                                    </Select>
                                  </Form.Item>
                                </Col>

                                {/* Color */}
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, "color"]}
                                    label="Color"
                                    rules={
                                      selectedProduct?.colors?.length
                                        ? [
                                            {
                                              required: true,
                                              message: "Select color",
                                            },
                                          ]
                                        : []
                                    }
                                  >
                                    <Select
                                      placeholder={
                                        selectedProduct?.colors?.length
                                          ? "Select color"
                                          : "No colors available"
                                      }
                                      disabled={
                                        !selectedProduct?.colors?.length
                                      }
                                    >
                                      {selectedProduct?.colors?.map(
                                        (c, idx) => (
                                          <Select.Option
                                            key={`${pid}-${idx}`}
                                            value={c}
                                          >
                                            {c}
                                          </Select.Option>
                                        )
                                      )}
                                    </Select>
                                  </Form.Item>
                                </Col>
                              </Row>

                              {/* Totals Row */}
                              <LineTotals
                                index={index}
                                form={form}
                                productById={productById}
                              />
                            </Card>
                          );
                        })}

                        {/* Add Product Button */}
                        <Form.Item>
                          <Button
                            type="dashed"
                            onClick={() => add({})}
                            icon={<PlusOutlined />}
                            block
                          >
                            Add Product
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>

                  <Divider />

                  {/* VAT & Payment */}
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item name="vat_percentage" label="VAT %">
                        <InputNumber
                          min={0}
                          max={100}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="payment_status"
                        label="Payment Status"
                        rules={[{ required: true }]}
                      >
                        <Select placeholder="Select status">
                          <Select.Option value="paid">✅ Paid</Select.Option>
                          <Select.Option value="partial">
                            🌓 Partial
                          </Select.Option>
                          <Select.Option value="pending">
                            ⏳ Pending
                          </Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="amount_paid"
                        label="Amount Paid (ETB)"
                        rules={[
                          {
                            required: true,
                            message: "Please enter amount paid",
                          },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              //  const totalAmount = {remaining}; // 👈 get total
                              if (value > total) {
                                return Promise.reject(
                                  new Error(
                                    `Paid amount cannot exceed total (${total} ETB)`
                                  )
                                );
                              }
                              return Promise.resolve();
                            },
                          }),
                        ]}
                      >
                        <InputNumber
                          min={0}
                          style={{ width: "100%" }}
                          placeholder="Enter paid amount"
                          onChange={(val) => {
                            const totalAmount = form.getFieldValue("total");
                            if (val > totalAmount) {
                              form.setFieldsValue({ amount_paid: totalAmount }); // 👈 auto-fix value
                              message.warning(
                                `Paid amount adjusted to ${totalAmount} ETB`
                              );
                            }
                          }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    disabled={loadingMeta}
                    block
                  >
                    💾 Save Sale
                  </Button>
                </Form>
              </Card>
            </Col>

            {/* Right: Live Summary + Recent */}
            {/* Right: Live Summary + Recent */}
            {/* <Col xs={24} lg={10}> */}
            {/* Live Sale Summary */}
            <Col xs={24} lg={12} xl={10}>
              <Card
                title="💰 Live Sale Summary"
                className="glass-card"
                style={{ marginBottom: 16, width: "100%" }}
              >
                <div style={{ textAlign: "right" }}>
                  <div>
                    <Text>Subtotal: </Text>
                    <Text strong>{subtotal.toFixed(2)} ETB</Text>
                  </div>
                  <div>
                    <Text>VAT ({vatPercentage}%): </Text>
                    <Text strong>{vat.toFixed(2)} ETB</Text>
                  </div>
                  <Divider style={{ margin: "10px 0" }} />
                  <Title level={4} style={{ margin: 0 }}>
                    Total: {total.toFixed(2)} ETB
                  </Title>
                  <Text type="danger">
                    Remaining: {remaining.toFixed(2)} ETB
                  </Text>
                </div>
                <Progress
                  percent={
                    total > 0
                      ? Math.min((Number(amountPaid) / total) * 100, 100)
                      : 0
                  }
                  status={remaining === 0 ? "success" : "active"}
                  style={{ marginTop: 10 }}
                />
              </Card>

              {/* Recent Sales */}
              {/* <Card title="🕒 Recent Sales" className="glass-card"> */}
              <Card
                title="🕒 Recent Sales"
                className="glass-card"
                style={{ width: "100%" }}
              >
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  <Table
                    dataSource={recentSales}
                    rowKey={(record) => record.id || record._id}
                    loading={loadingMeta}
                    columns={recentColumns}
                    pagination={false}
                    size="small"
                    variant="bordered"
                  />
                </div>
              </Card>
            </Col>
          </Row>

          {/* Grouped Sales */}
          <Card
            title="📦 Grouped Sales by Invoice"
            className="glass-card"
            style={{ marginTop: 16 }}
            //style={{ paddingTop: 8 }}
          >
            <Collapse
              accordion
              items={collapseItems}
              style={{ borderRadius: 12, overflow: "hidden" }}
            />
          </Card>
        </Content>
      </Layout>

      {/* Invoice Modal */}
      <Modal
        open={openPreview}
        title="🧾 Invoice Preview"
        onCancel={() => setOpenPreview(false)}
        footer={[
          <Button key="close" onClick={() => setOpenPreview(false)}>
            Close
          </Button>,
        ]}
        width="80%"
      >
        {invoiceUrl ? (
          <iframe src={invoiceUrl} width="100%" height="600px" />
        ) : (
          "Loading invoice..."
        )}
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        open={addCustVisible}
        title="Add Customer"
        onCancel={() => setAddCustVisible(false)}
        onOk={handleAddCustomer}
        confirmLoading={addingCustomer}
        okText="Save"
      >
        <Form form={custForm} layout="vertical">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Please enter customer name" }]}
          >
            <Input placeholder="Full name" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="09XXXXXXXX" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: "email", message: "Invalid email" }]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input placeholder="Address" />
          </Form.Item>
        </Form>
      </Modal>

      {/* THEME STYLES */}
      <style>{`
        :root {
          --gradA: #22c1c3; /* brand blue-green */
          --gradB: #2fb7b9;
          --gradC: #5b86e5; /* accent */
          --bgSoft: #f6fffe;
          --rowLight: #f1fbff;
          --rowDark: #e4f7ff;
          --hover: #d6f3ff;
          --error: #f31260;
        }

        .suite-layout {
          min-height: 100vh;
          background:
            radial-gradient(1200px 400px at 10% -10%, #e6fffb 0%, transparent 70%),
            radial-gradient(1000px 400px at 110% 0%, #e8f1ff 0%, transparent 70%),
            #ffffff;
        }

        .suite-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: linear-gradient(110deg, var(--gradA), var(--gradC));
          color: #fff;
          border-bottom: 1px solid rgba(255,255,255,0.25);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 18px;
          letter-spacing: 0.2px;
        }

        .brand-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(255,255,255,0.25);
        }

        .header-total {
          font-weight: 600;
          font-size: 15px;
        }

        .glass-card {
          background: linear-gradient(180deg, #ffffffaa, #ffffffee);
          border: 1px solid rgba(34, 193, 195, 0.15);
          box-shadow: 0 8px 24px rgba(34, 193, 195, 0.15);
          border-radius: 16px !important;
        }
        .inner-card {
          border: 1px dashed rgba(34, 193, 195, 0.35);
          border-radius: 14px !important;
          background: #ffffff;
        }

        /* Tables */
        .ant-table-thead > tr > th {
          background: linear-gradient(110deg, #5b86e5, #22c1c3) !important;
          color: #fff !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: var(--hover) !important;
        }
        .row-light td { background: var(--rowLight) !important; }
        .row-dark  td { background: var(--rowDark) !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default SalesSuite;
