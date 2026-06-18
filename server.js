require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const mysql = require("mysql2/promise");
const cloudinary = require("cloudinary").v2;

const app = express();
const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const publicDir = path.join(rootDir, "public");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "material_register",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});

const deliveryTypes = new Set(["Purchase Order", "Courier", "Direct Delivery", "Others"]);
const requiredTextFields = [
  "branch_name",
  "entry_date",
  "entry_time",
  "vendor_name",
  "whom_to_meet",
  "delivery_type",
  "department_name",
  "po_number",
  "created_by_name",
  "material_details"
];
const allowedRoles = new Set(["security", "admin"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed."));
      return;
    }
    cb(null, true);
  }
});

// Helper to upload to Cloudinary
async function uploadToCloudinary(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "material-inward-register",
        resource_type: "auto",
        public_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

app.use(express.json());

function serveAppPage(_req, res) {
  res.sendFile(path.join(publicDir, "index.html"));
}

app.get("/", (_req, res) => {
  res.redirect("/register");
});
app.get("/register", serveAppPage);
app.get("/admin", serveAppPage);

app.use(express.static(publicDir));

function clean(value) {
  return String(value || "").trim();
}

// No longer needed - Cloudinary handles file management
async function removeUploadedFiles() {
  // Files are stored on Cloudinary, no cleanup needed
}

function validatePayload(body, files) {
  const missing = requiredTextFields.filter((field) => !clean(body[field]));
  ["po_image", "material_image_1", "material_image_2"].forEach((field) => {
    if (!files[field] || !files[field][0]) missing.push(field);
  });

  if (missing.length) {
    return `Missing required field(s): ${missing.join(", ")}`;
  }
  if (!deliveryTypes.has(clean(body.delivery_type))) {
    return "Invalid delivery type.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(body.entry_date))) {
    return "Date must use YYYY-MM-DD format.";
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(clean(body.entry_time))) {
    return "Time must use HH:MM format.";
  }
  return "";
}

function normalizeRole(value) {
  const role = clean(value).toLowerCase();
  return allowedRoles.has(role) ? role : "security";
}

function requireAdmin(req, res) {
  const role = clean(req.get("x-mir-role") || req.query.role).toLowerCase();
  if (role !== "admin") {
    res.status(403).json({ error: "Admin access required." });
    return false;
  }
  return true;
}

async function ensureRoleColumns() {
  const [columns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'material_inward_register'
       AND COLUMN_NAME IN ('created_by_role', 'created_by_name')`
  );
  const existing = new Set(columns.map((column) => column.COLUMN_NAME));
  if (!existing.has("created_by_role")) {
    await pool.execute(
      "ALTER TABLE material_inward_register ADD COLUMN created_by_role ENUM('security', 'admin') NOT NULL DEFAULT 'security' AFTER material_image_2"
    );
  }
  if (!existing.has("created_by_name")) {
    await pool.execute(
      "ALTER TABLE material_inward_register ADD COLUMN created_by_name VARCHAR(180) NOT NULL DEFAULT '' AFTER created_by_role"
    );
  }
}

async function generateInwardNo(connection, year) {
  const prefix = `MIR-${year}-`;
  const [rows] = await connection.execute(
    "SELECT inward_no FROM material_inward_register WHERE inward_no LIKE ? ORDER BY inward_no DESC LIMIT 1 FOR UPDATE",
    [`${prefix}%`]
  );
  const last = rows[0]?.inward_no || "";
  const lastNumber = Number(last.replace(prefix, "")) || 0;
  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
}

function rowToRecord(row) {
  return {
    ...row,
    entry_date: row.entry_date instanceof Date ? row.entry_date.toISOString().slice(0, 10) : row.entry_date,
    po_image_url: row.po_image || "",
    material_image_1_url: row.material_image_1 || "",
    material_image_2_url: row.material_image_2 || ""
  };
}

app.post(
  "/api/material-inward",
  upload.fields([
    { name: "po_image", maxCount: 1 },
    { name: "material_image_1", maxCount: 1 },
    { name: "material_image_2", maxCount: 1 }
  ]),
  async (req, res) => {
    const error = validatePayload(req.body, req.files || {});
    if (error) {
      res.status(400).json({ error });
      return;
    }

    const connection = await pool.getConnection();
    try {
      // Upload images to Cloudinary
      const poImageUrl = (await uploadToCloudinary(req.files.po_image[0].buffer, "po_image")).secure_url;
      const materialImage1Url = (await uploadToCloudinary(req.files.material_image_1[0].buffer, "material_image_1")).secure_url;
      const materialImage2Url = (await uploadToCloudinary(req.files.material_image_2[0].buffer, "material_image_2")).secure_url;

      await connection.beginTransaction();
      const year = clean(req.body.entry_date).slice(0, 4);
      const inwardNo = await generateInwardNo(connection, year);
      const createdByRole = normalizeRole(req.body.created_by_role);
      const createdByName = clean(req.body.created_by_name) || createdByRole;
      const params = [
        inwardNo,
        clean(req.body.branch_name),
        clean(req.body.entry_date),
        clean(req.body.entry_time).slice(0, 8),
        clean(req.body.vendor_name),
        clean(req.body.whom_to_meet),
        clean(req.body.delivery_type),
        clean(req.body.department_name),
        clean(req.body.po_number),
        clean(req.body.material_details),
        poImageUrl,
        materialImage1Url,
        materialImage2Url,
        createdByRole,
        createdByName
      ];

      const [result] = await connection.execute(
        `INSERT INTO material_inward_register
          (inward_no, branch_name, entry_date, entry_time, vendor_name, whom_to_meet,
           delivery_type, department_name, po_number, material_details, po_image,
           material_image_1, material_image_2, created_by_role, created_by_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params
      );
      await connection.commit();
      res.status(201).json({ id: result.insertId, inward_no: inwardNo });
    } catch (err) {
      await connection.rollback();
      console.error(err);
      res.status(500).json({ error: "Unable to save material inward record." });
    } finally {
      connection.release();
    }
  }
);

app.get("/api/material-inward", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const where = [];
  const params = [];
  const { vendor, po, date_from, date_to, branch, created_by_name } = req.query;

  if (clean(vendor)) {
    where.push("vendor_name LIKE ?");
    params.push(`%${clean(vendor)}%`);
  }
  if (clean(po)) {
    where.push("po_number LIKE ?");
    params.push(`%${clean(po)}%`);
  }
  if (clean(date_from)) {
    where.push("entry_date >= ?");
    params.push(clean(date_from));
  }
  if (clean(date_to)) {
    where.push("entry_date <= ?");
    params.push(clean(date_to));
  }
  if (clean(branch)) {
    where.push("branch_name = ?");
    params.push(clean(branch));
  }
  if (clean(created_by_name)) {
    where.push("created_by_name = ?");
    params.push(clean(created_by_name));
  }

  const sql = `SELECT * FROM material_inward_register ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC`;
  try {
    const [rows] = await pool.execute(sql, params);
    res.json({ records: rows.map(rowToRecord) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to load records." });
  }
});

app.get("/api/material-inward/export", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const where = [];
    const params = [];
    if (clean(req.query.vendor)) {
      where.push("vendor_name LIKE ?");
      params.push(`%${clean(req.query.vendor)}%`);
    }
    if (clean(req.query.po)) {
      where.push("po_number LIKE ?");
      params.push(`%${clean(req.query.po)}%`);
    }
    if (clean(req.query.date_from)) {
      where.push("entry_date >= ?");
      params.push(clean(req.query.date_from));
    }
    if (clean(req.query.date_to)) {
      where.push("entry_date <= ?");
      params.push(clean(req.query.date_to));
    }
    if (clean(req.query.branch)) {
      where.push("branch_name = ?");
      params.push(clean(req.query.branch));
    }
    if (clean(req.query.created_by_name)) {
      where.push("created_by_name = ?");
      params.push(clean(req.query.created_by_name));
    }
    const [rows] = await pool.execute(
      `SELECT * FROM material_inward_register ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC`,
      params
    );
    const headers = [
      "Inward No",
      "Branch",
      "Date",
      "Time",
      "Vendor",
      "Whom To Meet",
      "Delivery Type",
      "Department",
      "PO Number",
      "Material Details",
      "Filled By Role",
      "Filled By Name",
      "PO Image",
      "Material Image 1",
      "Material Image 2",
      "Created At"
    ];
    const escapeCell = (value) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const tableRows = rows.map((row) => [
      row.inward_no,
      row.branch_name,
      row.entry_date instanceof Date ? row.entry_date.toISOString().slice(0, 10) : row.entry_date,
      row.entry_time,
      row.vendor_name,
      row.whom_to_meet,
      row.delivery_type,
      row.department_name,
      row.po_number,
      row.material_details,
      row.created_by_role,
      row.created_by_name,
      row.po_image,
      row.material_image_1,
      row.material_image_2,
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    ]);
    const workbookHtml = `<!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <table border="1">
            <thead><tr>${headers.map((header) => `<th>${escapeCell(header)}</th>`).join("")}</tr></thead>
            <tbody>${tableRows.map((cells) => `<tr>${cells.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
        </body>
      </html>`;
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=material-inward-register.xls");
    res.send(workbookHtml);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to export records." });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Request failed." });
});

ensureRoleColumns()
  .then(() => {
    app.listen(port, () => {
      console.log(`Material Inward Register running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Unable to prepare database schema.", err);
    process.exit(1);
  });
