-- Bulai Shop — стартовая схема для MariaDB / MySQL 8+ (utf8mb4, InnoDB).
-- Применение: из каталога server — `npm run migrate` (нужен созданный DATABASE и .env).

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Заготовка под перенос настроек сайта из админки (JSON); одна строка id=1.
CREATE TABLE IF NOT EXISTS site_config_snapshot (
  id INT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  payload JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
