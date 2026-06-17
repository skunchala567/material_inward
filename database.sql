CREATE DATABASE IF NOT EXISTS material_register
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE material_register;

CREATE TABLE IF NOT EXISTS material_inward_register (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  inward_no VARCHAR(20) NOT NULL,
  branch_name VARCHAR(120) NOT NULL,
  entry_date DATE NOT NULL,
  entry_time TIME NOT NULL,
  vendor_name VARCHAR(180) NOT NULL,
  whom_to_meet VARCHAR(180) NOT NULL,
  delivery_type ENUM('Purchase Order', 'Courier', 'Direct Delivery', 'Others') NOT NULL,
  department_name VARCHAR(140) NOT NULL,
  po_number VARCHAR(120) NOT NULL,
  material_details TEXT NOT NULL,
  po_image VARCHAR(255) NOT NULL,
  material_image_1 VARCHAR(255) NOT NULL,
  material_image_2 VARCHAR(255) NOT NULL,
  created_by_role ENUM('security', 'admin') NOT NULL DEFAULT 'security',
  created_by_name VARCHAR(180) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_material_inward_no (inward_no),
  KEY idx_mir_vendor_name (vendor_name),
  KEY idx_mir_po_number (po_number),
  KEY idx_mir_entry_date (entry_date),
  KEY idx_mir_branch_name (branch_name),
  KEY idx_mir_created_by_name (created_by_name)
);
