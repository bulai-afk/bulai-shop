-- Отзывы витрины (общий пул и привязка к productId в JSON).

CREATE TABLE IF NOT EXISTS store_reviews_snapshot (
  id INT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  payload JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
