// src/shared/emailService.ts
import nodemailer from "nodemailer";
import config from "../config";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: true,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP connection error:", error);
  } else {
    console.log("✅ SMTP server ready to send emails");
  }
});

export const sendOrderNotificationEmail = async (orderData: any) => {
  try {
    const orderDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Dhaka",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const mailOptions = {
      from: `"Outfitro Orders" <${config.smtp.user}>`,
      to: config.smtp.adminEmail,
      subject: `🛍️ New Order - ${orderData.trackingNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: #ffffff;">
                      <h1 style="margin: 0 0 10px 0; font-size: 24px;">🎉 New Order Received!</h1>
                      <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                        Tracking: ${orderData.trackingNumber}
                      </div>
                    </td>
                  </tr>

                  <!-- Order Summary -->
                  <tr>
                    <td style="padding: 30px 20px;">
                      <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">📦 Order Summary</h2>
                      <table width="100%" cellpadding="10" cellspacing="0">
                        <tr>
                          <td width="50%" style="background: #f8f9fa; border-left: 3px solid #667eea; padding: 12px;">
                            <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 5px;">Order ID</div>
                            <div style="font-size: 14px; color: #333; font-weight: 600;">#${(orderData.id || orderData._id || "").toString().substring(0, 8)}</div>
                          </td>
                          <td width="50%" style="background: #f8f9fa; border-left: 3px solid #667eea; padding: 12px;">
                            <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 5px;">Order Date</div>
                            <div style="font-size: 14px; color: #333; font-weight: 600;">${orderDate}</div>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" style="background: #f8f9fa; border-left: 3px solid #667eea; padding: 12px;">
                            <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 5px;">Payment Status</div>
                            <div style="font-size: 14px; color: #333; font-weight: 600;">
                              <span style="background: #ffc107; color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 11px; text-transform: uppercase;">${orderData.paymentStatus}</span>
                            </div>
                          </td>
                          <td width="50%" style="background: #f8f9fa; border-left: 3px solid #667eea; padding: 12px;">
                            <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 5px;">Order Status</div>
                            <div style="font-size: 14px; color: #333; font-weight: 600;">
                              <span style="background: #ffc107; color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 11px; text-transform: uppercase;">${orderData.status}</span>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Customer Information -->
                  <tr>
                    <td style="padding: 0 20px 30px 20px;">
                      <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">👤 Customer Information</h2>
                      <table width="100%" cellpadding="10" cellspacing="0">
                        <tr>
                          <td width="50%" style="background: #f8f9fa; border-left: 3px solid #667eea; padding: 12px;">
                            <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 5px;">Name</div>
                            <div style="font-size: 14px; color: #333; font-weight: 600;">${orderData.shippingAddress.customerName}</div>
                          </td>
                          <td width="50%" style="background: #f8f9fa; border-left: 3px solid #667eea; padding: 12px;">
                            <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 5px;">Mobile</div>
                            <div style="font-size: 14px; color: #333; font-weight: 600;">${orderData.shippingAddress.mobile}</div>
                          </td>
                        </tr>
                      </table>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px;">
                        <tr>
                          <td style="background: #fff; border: 1px solid #e0e0e0; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 8px;">📍 Shipping Address</div>
                            <div style="color: #333; font-size: 14px;">
                              ${orderData.shippingAddress.addressLine}<br>
                              ${orderData.shippingAddress.upazila}, ${orderData.shippingAddress.district}
                              ${orderData.shippingAddress.postalCode ? `, ${orderData.shippingAddress.postalCode}` : ""}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Order Items -->
                  <tr>
                    <td style="padding: 0 20px 30px 20px;">
                      <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">🛒 Order Items (${orderData.items.length})</h2>
                      <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                        <thead>
                          <tr style="background: #667eea; color: #fff;">
                            <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600;">Image</th>
                            <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600;">Product</th>
                            <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600;">Size</th>
                            <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600;">Qty</th>
                            <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600;">Price</th>
                            <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600;">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${orderData.items
                            .map(
                              (item: any) => `
                            <tr style="border-bottom: 1px solid #e0e0e0;">
                              <td style="padding: 10px;">
                                <img src="${item.image}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; display: block;">
                              </td>
                              <td style="padding: 10px; font-size: 13px; color: #333;">${item.title}</td>
                              <td style="padding: 10px; font-size: 13px; color: #333; font-weight: 600;">${item.size}</td>
                              <td style="padding: 10px; font-size: 13px; color: #333;">${item.quantity}</td>
                              <td style="padding: 10px; font-size: 13px; color: #333;">৳${item.unitPrice}</td>
                              <td style="padding: 10px; font-size: 13px; color: #333; font-weight: 600;">৳${item.totalPrice}</td>
                            </tr>
                          `,
                            )
                            .join("")}
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  ${
                    orderData.orderNote
                      ? `
                  <!-- Order Note -->
                  <tr>
                    <td style="padding: 0 20px 30px 20px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px;">
                            <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 5px;">📝 Order Note</div>
                            <div style="color: #333; font-size: 14px;">${orderData.orderNote}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  `
                      : ""
                  }

                  <!-- Total Section -->
                  <tr>
                    <td style="padding: 0 20px 30px 20px;">
                      <table width="100%" cellpadding="12" cellspacing="0" style="background: #f8f9fa; border-radius: 8px;">
                        <tr>
                          <td style="font-size: 15px; color: #333;">Subtotal:</td>
                          <td align="right" style="font-size: 15px; color: #333;">৳${orderData.subtotal}</td>
                        </tr>
                        <tr>
                          <td style="font-size: 15px; color: #333;">Shipping Charge:</td>
                          <td align="right" style="font-size: 15px; color: #333;">৳${orderData.shipping}</td>
                        </tr>
                        ${
                          orderData.discountAmount > 0
                            ? `
                        <tr>
                          <td style="font-size: 15px; color: #28a745;">Discount:</td>
                          <td align="right" style="font-size: 15px; color: #28a745;">-৳${orderData.discountAmount}</td>
                        </tr>
                        `
                            : ""
                        }
                        <tr style="border-top: 2px solid #667eea;">
                          <td style="font-size: 18px; font-weight: bold; color: #667eea; padding-top: 15px;">Total Amount:</td>
                          <td align="right" style="font-size: 18px; font-weight: bold; color: #667eea; padding-top: 15px;">৳${orderData.totalAmount}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background: #f8f9fa; padding: 20px; text-align: center;">
                      <p style="margin: 0 0 5px 0; font-size: 14px; color: #333; font-weight: 600;">Outfitro Admin Panel</p>
                      <p style="margin: 0 0 10px 0; font-size: 13px; color: #666;">This is an automated notification from your store.</p>
                      <p style="margin: 0; font-size: 13px; color: #666;">Login to your admin panel to process this order.</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      "✅ Order notification email sent successfully:",
      info.messageId,
    );
    return info;
  } catch (error) {
    console.error("❌ Failed to send order notification email:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    throw error;
  }
};
