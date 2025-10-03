const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});
exports.sendLowStockAlert = (product) => {
  const mailOptions = {
    from: `"Stock Manager" <${process.env.SMTP_EMAIL}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `🚨 Low Stock Alert: ${product.name}`,
    text: `Product "${product.name}" has low stock (only ${product.quantity} left).`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error("Email error:", err);
    else console.log("Low stock alert sent:", info.response);
  });
};
