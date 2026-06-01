-- Снимок промо-материалов (лента, hero главной и «О нас») — JSON, одна строка id=1.

CREATE TABLE IF NOT EXISTS promo_materials_snapshot (
  id INT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  payload JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
