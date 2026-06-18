require("dotenv").config();
const mysql = require("mysql2/promise");

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "material_register",
  });

  try {
    console.log("Migrating database schema for Cloudinary URLs...");

    // Alter image columns to store full URLs
    await connection.execute(
      "ALTER TABLE material_inward_register MODIFY COLUMN po_image TEXT DEFAULT NULL"
    );
    console.log("✓ Updated po_image column to TEXT");

    await connection.execute(
      "ALTER TABLE material_inward_register MODIFY COLUMN material_image_1 TEXT DEFAULT NULL"
    );
    console.log("✓ Updated material_image_1 column to TEXT");

    await connection.execute(
      "ALTER TABLE material_inward_register MODIFY COLUMN material_image_2 TEXT DEFAULT NULL"
    );
    console.log("✓ Updated material_image_2 column to TEXT");

    console.log("\n✓ Migration completed successfully!");
    console.log("Your database is now ready for Cloudinary image storage.");
  } catch (error) {
    console.error("Migration error:", error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
