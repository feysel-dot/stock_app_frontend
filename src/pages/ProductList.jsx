import React, { useEffect, useState, useContext } from "react";
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  InputNumber,
  Select,
  Upload,
  message,
  Popconfirm,
  Typography,
  Image,
  Tag,
  Badge,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  SearchOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import axios from "../api/axios.js"; // path to the file above
import { DashboardContext } from "../context/DashboardContext";
const { Title } = Typography;

export default function ProductList() {
  const { refreshDashboard } = useContext(DashboardContext);
  const [products, setProducts] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [colorOptions, setColorOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [fileList, setFileList] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);

  // ✅ Fetch Products
  const fetchProducts = async () => {
    try {
      const res = await axios.get("/products");
      setProducts(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (error) {
      console.error(error);
      messageApi.error("❌ Failed to fetch products");
    }
  };

  // ✅ Fetch dropdown options
  const fetchDropdownOptions = async () => {
    try {
      const [cats, colors, units] = await Promise.all([
        axios.get("/meta/category"),
        axios.get("/meta/colors"),
        axios.get("/meta/units"),
      ]);
      setCategoryOptions(cats.data);
      setColorOptions(colors.data);
      setUnitOptions(units.data);
    } catch (error) {
      console.error(error);
      messageApi.error("❌ Failed to load dropdown options");
    }
  };

  // ✅ Image change in modal
  const handleImageChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    const file = newFileList[0]?.originFileObj;
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  // ✅ Save or Update Product
  const handleAddOrUpdate = async (values) => {
    const isEditing = !!editingProduct;

    try {
      // Duplicate name check
      const existing = products.find(
        (p) =>
          p.name?.trim().toLowerCase() === values.name.trim().toLowerCase() &&
          (!isEditing || p.id !== editingProduct.id)
      );
      if (existing) {
        return messageApi.error(`❌ Product "${values.name}" already exists`);
      }

      const formData = new FormData();

      // Attach image if uploaded
      if (values.image?.[0]?.originFileObj) {
        formData.append("image", values.image[0].originFileObj);
      }

      // Append other fields
      const numberFields = [
        "quantity",
        "cost_price",
        "sale_price",
        "kg_price",
        "bar_price",
        "critical_level",
      ];

      Object.entries(values).forEach(([key, val]) => {
        if (key === "image") return;

        const backendKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();

        if (numberFields.includes(backendKey)) {
          // Default kg_price/bar_price to sale_price if empty
          if (
            (backendKey === "kg_price" || backendKey === "bar_price") &&
            !val
          ) {
            formData.append(backendKey, values.sale_price ?? 0);
          } else {
            formData.append(backendKey, val ?? 0);
          }
        } else {
          if (val !== undefined && val !== "") {
            formData.append(backendKey, val);
          }
        }
      });

      if (isEditing) {
        await axios.put(`/products/${editingProduct.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        messageApi.success("✅ Product updated");
      } else {
        await axios.post("/products", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        messageApi.success("✅ Product added");
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      form.resetFields();
      setFileList([]);
      setImagePreview(null);
      fetchProducts();
    } catch (error) {
      console.error(
        "Add/Update failed:",
        error.response?.data || error.message
      );
      Modal.error({
        title: "Operation Failed",
        content: error.response?.data?.error || error.message,
      });
    }
  };

  // ✅ Delete Product
  const handleDelete = async (id) => {
    try {
      await axios.delete(`/products/${id}`);
      messageApi.success("✅ Product deleted");
      fetchProducts();
    } catch (error) {
      console.error(error);
      messageApi.error("❌ Delete failed");
    }
  };

  // ✅ Export to Excel
  const exportToExcel = () => {
    const data = products.map((p) => ({
      Name: p.name,
      SKU: p.sku,
      Category: p.category,
      Color: p.color,
      Unit: p.unit,
      Quantity: p.quantity,
      CostPrice: p.cost_price,
      SalePrice: p.sale_price,
      KGPrice: p.kg_price,
      BARPrice: p.bar_price,
      CriticalLevel: p.critical_level,
      CreatedAt: p.created_at,
      ImageURL: p.image_url,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "products.xlsx");
  };

  const handleExcelImport = async ({ file, onSuccess, onError }) => {
    try {
      const formData = new FormData();
      formData.append("file", file); // 👈 must match backend: uploadExcel.single("file")

      await axios.post("/products/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      message.success("✅ Import Successful");
      fetchProducts();
      onSuccess();
    } catch (err) {
      console.error(err.response?.data || err.message);
      Modal.error({
        title: "Import Failed",
        content: err.response?.data?.error || err.message,
      });
      onError(err);
    }
  };

  const filteredProducts = products.filter((p) => {
    const category = (p.category || "").toLowerCase();
    const color = (p.color || "").toLowerCase();
    const sku = (p.sku || "").toLowerCase();
    const query = searchText.toLowerCase();

    return (
      category.includes(query) || color.includes(query) || sku.includes(query)
    );
  });

  useEffect(() => {
    fetchProducts();
    fetchDropdownOptions();
  }, [refreshDashboard]);

  // ✅ Column definitions with Row Numbering, Safe Tags, and Stock Status
  const columns = [
    {
      title: "#",
      render: (_, __, index) => index + 1,
      width: 60,
    },
    {
      title: "Image",
      dataIndex: "image_url",
      render: (url, record) => (
        <Image
          src={url ? `http://localhost:3000/uploads/${url}` : "/no-image.png"}
          alt={record.name || "No image"}
          style={{ maxHeight: 80, objectFit: "cover", borderRadius: 6 }}
          fallback="/no-image.png"
          preview
        />
      ),
    },

    { title: "Name", dataIndex: "name" },
    { title: "SKU", dataIndex: "sku" },
    {
      title: "Category",
      dataIndex: "category",
      render: (cat) => <Tag color="blue">{cat || "N/A"}</Tag>,
    },
    {
      title: "Color",
      dataIndex: "color",
      render: (color) => {
        if (!color) return <Tag>—</Tag>;

        const colorVal = color.trim();

        // Check if hex (e.g., #fff, #ffffff)
        const isHex = /^#([0-9A-F]{3}){1,2}$/i.test(colorVal);

        // Normalize (lowercase for names)
        const bgColor = isHex ? colorVal : colorVal.toLowerCase();

        // Decide text color (black for light, white for dark)
        const lightColors = [
          "white",
          "yellow",
          "silver",
          "Bronze",
          "lightgray",
          "#fff",
          "#ffffff",
          "#fefefe",
        ];
        const textColor = lightColors.includes(bgColor)
          ? "#1b7c40ff"
          : "#fff"
          ? "#1b7c40ff"
          : "#ffffff";

        return (
          <Tag
            style={{
              backgroundColor: bgColor,
              color: textColor,
              border: "1px solid #40eea5ff",
              textTransform: "capitalize",
              fontWeight: "bold",
              padding: "2px 10px",
              borderRadius: "6px",
            }}
          >
            {colorVal}
          </Tag>
        );
      },
    },

    { title: "Unit", dataIndex: "unit" },
    { title: "Cost", dataIndex: "cost_price", render: (val) => `$${val}` },
    { title: "Price", dataIndex: "sale_price", render: (val) => `$${val}` },
    {
      title: "KG Price",
      dataIndex: "kg_price",
      render: (val) => `$${Number(val).toFixed(2)}`,
    },
    {
      title: "BAR Price",
      dataIndex: "bar_price",
      render: (val) => `$${Number(val).toFixed(2)}`,
    },
    { title: "Quantity", dataIndex: "quantity" },
    { title: "Critical Level", dataIndex: "critical_level" },
    {
      title: "Status",
      render: (_, record) => {
        if (record.quantity === 0) {
          return <Badge status="error" text="Out of Stock" />;
        } else if (record.quantity <= record.critical_level) {
          return <Badge status="warning" text="Low Stock" />;
        }
        return <Badge status="success" text="Advance Stock" />;
      },
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      render: (val) => new Date(val).toLocaleString(),
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditingProduct(record);
              setIsModalOpen(true);

              form.setFieldsValue({
                ...record,
                kg_price: record.kg_price ?? record.sale_price ?? 0,
                bar_price: record.bar_price ?? record.sale_price ?? 0,
                cost_price: record.cost_price ?? 0,
                sale_price: record.sale_price ?? 0,
                quantity: record.quantity ?? 0,
                critical_level: record.critical_level ?? 0,
              });

              // Set image preview if available
              if (record.image_url) {
                setImagePreview(
                  `http://localhost:3000/uploads/${record.image_url}`
                );
                setFileList([
                  {
                    uid: "-1",
                    name: "current_image",
                    url: `http://localhost:3000/uploads/${record.image_url}`,
                  },
                ]);
              } else {
                setImagePreview(null);
                setFileList([]);
              }

              setIsModalOpen(true);
            }}
          />

          <Popconfirm
            title="Delete this product?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 12,
          boxShadow: "0 6px 12px rgba(0,0,0,0.1)",
        }}
      >
        {contextHolder}
        <Title level={2} style={{ color: "#1890ff" }}>
          📦 Product List
        </Title>

        <Space
          wrap
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: 12,
            background: "linear-gradient(90deg, #e3f2fd, #fce4ec)", // light gradient
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          }}
        >
          <Input
            prefix={<SearchOutlined />}
            placeholder="🔍 Search products..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: 240,
              borderRadius: 8,
              backgroundColor: "#fff",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
            }}
          />

          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{
              borderRadius: 8,
              background: "linear-gradient(90deg, #42a5f5, #1e88e5)",
              boxShadow: "0 2px 6px rgba(33,150,243,0.4)",
            }}
            onClick={() => setIsModalOpen(true)}
          >
            Add Product
          </Button>

          <Upload
            name="file"
            accept=".xlsx,.xls"
            showUploadList={false}
            customRequest={handleExcelImport}
          >
            <Button
              icon={<UploadOutlined />}
              style={{
                borderRadius: 8,
                background: "linear-gradient(90deg, #66bb6a, #43a047)",
                color: "#fff",
                boxShadow: "0 2px 6px rgba(76,175,80,0.4)",
              }}
            >
              Import
            </Button>
          </Upload>

          <Button
            icon={<DownloadOutlined />}
            style={{
              borderRadius: 8,
              background: "linear-gradient(90deg, #ffa726, #fb8c00)",
              color: "#fff",
              boxShadow: "0 2px 6px rgba(255,152,0,0.4)",
            }}
            onClick={exportToExcel}
          >
            Export Excel
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredProducts}
          rowKey="id"
          pagination={{ pageSize: 15 }}
          bordered
          rowClassName={(_, index) =>
            index % 2 === 0 ? "table-row-light" : "table-row-dark"
          }
          scroll={{ x: "max-content" }}
        />

        <Modal
          title={
            <span style={{ color: "#1890ff", fontWeight: "bold" }}>
              🎨 {editingProduct ? "Edit Product" : "Create New Product"}
            </span>
          }
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
            form.resetFields();
            setFileList([]);
            setImagePreview(null);
          }}
          footer={null}
          width={750}
          centered
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddOrUpdate}
            initialValues={{
              ...editingProduct,
              kg_price:
                editingProduct?.kg_price ?? editingProduct?.sale_price ?? 0,
              bar_price:
                editingProduct?.bar_price ?? editingProduct?.sale_price ?? 0,
            }}
          >
            {/* Name & SKU */}
            <Space size="large" style={{ display: "flex" }}>
              <Form.Item
                name="name"
                label="Product Name"
                rules={[{ required: true }]}
                style={{ flex: 1 }}
              >
                <Input placeholder="Enter product name" />
              </Form.Item>

              <Form.Item
                name="sku"
                label="SKU"
                rules={[{ required: true }]}
                style={{ flex: 1 }}
              >
                <Input placeholder="Enter SKU" />
              </Form.Item>
            </Space>

            {/* Category, Color, Unit */}
            <Space size="large" style={{ display: "flex", marginTop: 12 }}>
              <Form.Item name="category" label="Category" style={{ flex: 1 }}>
                <Select
                  options={categoryOptions}
                  placeholder="Select category"
                />
              </Form.Item>

              <Form.Item name="color" label="Color" style={{ flex: 1 }}>
                <Select options={colorOptions} placeholder="Select color" />
              </Form.Item>

              <Form.Item name="unit" label="Unit" style={{ flex: 1 }}>
                <Select options={unitOptions} placeholder="Select unit" />
              </Form.Item>
            </Space>

            {/* Prices */}
            <Space size="large" style={{ display: "flex", marginTop: 12 }}>
              {["cost_price", "sale_price", "kg_price", "bar_price"].map(
                (field) => (
                  <Form.Item
                    key={field}
                    name={field}
                    label={field.replace("_", " ").toUpperCase()}
                    rules={[{ required: true, type: "number", min: 0 }]}
                    style={{ flex: 1 }}
                  >
                    <InputNumber
                      className="w-full"
                      placeholder="0.00"
                      formatter={(val) =>
                        `$ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      parser={(val) => val.replace(/\$\s?|(,*)/g, "")}
                    />
                  </Form.Item>
                )
              )}
            </Space>

            {/* Quantity & Critical Level */}
            <Space size="large" style={{ display: "flex", marginTop: 12 }}>
              {["quantity", "critical_level"].map((field) => (
                <Form.Item
                  key={field}
                  name={field}
                  label={field.replace("_", " ").toUpperCase()}
                  rules={[{ required: true, type: "number", min: 0 }]}
                  style={{ flex: 1 }}
                >
                  <InputNumber className="w-full" placeholder="0" />
                </Form.Item>
              ))}
            </Space>

            {/* Image Upload */}
            <Form.Item
              name="image"
              label="Product Image"
              valuePropName="fileList"
              getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
              style={{ marginTop: 12 }}
            >
              <Upload
                maxCount={1}
                beforeUpload={() => false}
                listType="picture"
                fileList={fileList}
                onChange={({ fileList: newFileList }) => {
                  setFileList(newFileList);
                  const file = newFileList[0]?.originFileObj;
                  setImagePreview(file ? URL.createObjectURL(file) : null);
                }}
              >
                <Button
                  icon={<UploadOutlined />}
                  style={{
                    background: "#52c41a",
                    color: "#fff",
                    borderRadius: 6,
                  }}
                >
                  Upload Image
                </Button>
              </Upload>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ marginTop: 10, maxHeight: 150, borderRadius: 8 }}
                />
              )}
            </Form.Item>

            {/* Submit Button */}
            <Form.Item style={{ marginTop: 24 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                icon={<SaveOutlined />}
                style={{ borderRadius: 8, fontSize: 16, height: 45 }}
              >
                Save Product
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
