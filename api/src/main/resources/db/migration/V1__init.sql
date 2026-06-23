CREATE TABLE etf_price_daily (
  index_key   VARCHAR(8)  NOT NULL,
  trade_date  DATE        NOT NULL,
  close_price DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (index_key, trade_date)
);

CREATE TABLE index_return_yearly (
  index_key   VARCHAR(8) NOT NULL,
  year        SMALLINT   NOT NULL,
  return_pct  DECIMAL(7,2) NOT NULL,
  PRIMARY KEY (index_key, year)
);

CREATE TABLE app_config (
  cfg_key   VARCHAR(40) PRIMARY KEY,
  cfg_value VARCHAR(100) NOT NULL
);

CREATE TABLE sync_log (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  source    VARCHAR(40) NOT NULL,
  ran_at    DATETIME    NOT NULL,
  status    VARCHAR(20) NOT NULL,
  rows_cnt  INT,
  message   VARCHAR(255)
);

INSERT INTO app_config (cfg_key, cfg_value)
VALUES ('depositRate', '0.03');
