import { Upload, Button, message } from "antd";
import { UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import axios from "../api/axios.js"; // path to the file above

const ProductImportExport = () => {
  const handleImport = async (info) => {
    const file = info.file.originFileObj;
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post("/products/import", formData);
      message.success("✅ Products imported successfully");
    } catch (err) {
      message.error("❌ Import failed");
    }
  };

  const handleExport = () => {
    window.location.href = "http://localhost:3000/api/products/export";
  };

  return (
    <div className="mb-4 flex gap-2">
      <Upload beforeUpload={() => false} onChange={handleImport}>
        <Button icon={<UploadOutlined />}>Import Excel</Button>
      </Upload>
      <Button icon={<DownloadOutlined />} onClick={handleExport}>
        Export Excel
      </Button>
    </div>
  );
};

export default ProductImportExport;
