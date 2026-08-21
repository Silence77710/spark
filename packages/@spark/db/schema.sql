-- Spark 数据库初始化脚本
-- 用法：docker exec -i spark-mysql mysql -uroot -pspark123 < packages/@spark/db/schema.sql

CREATE DATABASE IF NOT EXISTS spark
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE spark;

-- 想法表
CREATE TABLE IF NOT EXISTS ideas (
  id               VARCHAR(36)  NOT NULL,
  title            VARCHAR(500) NOT NULL,
  content          TEXT,
  status           VARCHAR(20)  NOT NULL DEFAULT 'seed',
  collection       VARCHAR(100),
  importance       TINYINT      NOT NULL DEFAULT 0,
 is_capsule       BOOLEAN      NOT NULL DEFAULT FALSE,
 unlock_at        DATETIME(3)  NULL,
 epitaph          TEXT         NULL,
 parent_a_id      VARCHAR(36)  NULL,
 parent_b_id      VARCHAR(36)  NULL,
 emotion          VARCHAR(20)  NULL,
 created_at       DATETIME(3)  NOT NULL,
  updated_at       DATETIME(3)  NOT NULL,
  last_reviewed_at DATETIME(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 活动时间线表
CREATE TABLE IF NOT EXISTS idea_activities (
  id         VARCHAR(36) NOT NULL,
  idea_id    VARCHAR(36) NOT NULL,
  type       VARCHAR(20) NOT NULL DEFAULT 'general',
  content    TEXT        NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_idea_activities_idea
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 按想法查询活动的索引
CREATE INDEX idx_idea_activities_idea_id ON idea_activities(idea_id);

-- 设置表（键值对存储，如自定义重要程度名称）
CREATE TABLE IF NOT EXISTS settings (
  `key`   VARCHAR(100) NOT NULL,
  value   TEXT,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI 交互日志表
CREATE TABLE IF NOT EXISTS ai_interactions (
  id               VARCHAR(36)  NOT NULL,
  feature          VARCHAR(30)  NOT NULL,
  idea_id          VARCHAR(36)  NULL,
  request_summary  VARCHAR(200) NULL,
  response_summary VARCHAR(500) NULL,
  tokens_used      INT          NULL,
  created_at       DATETIME(3)  NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 按想法查询 AI 交互的索引
CREATE INDEX idx_ai_interactions_idea_id ON ai_interactions(idea_id);

-- 想法全方位分析存档表（用户确认后才保存，同一想法可存多份）
-- 与 ai_interactions / idea_relationships 一致：不加外键，只用索引
--（线上库 ideas 表为 utf8mb4_0900_ai_ci，与本文件声明的 unicode_ci 不一致，加外键会报 3780）
CREATE TABLE IF NOT EXISTS idea_analyses (
  id          VARCHAR(36)  NOT NULL,
  idea_id     VARCHAR(36)  NOT NULL,
  dimensions  JSON         NOT NULL,
  model       VARCHAR(100) NULL,
  tokens_used INT          NULL,
  created_at  DATETIME(3)  NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_idea_analyses_idea_id (idea_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 想法关联表（AI 连接器 + 手动关联）
CREATE TABLE IF NOT EXISTS idea_relationships (
  id              VARCHAR(36)  NOT NULL,
  source_id       VARCHAR(36)  NOT NULL,
  target_id       VARCHAR(36)  NOT NULL,
  type            VARCHAR(20)  NOT NULL DEFAULT 'related',
  created_by      VARCHAR(10)  NOT NULL DEFAULT 'user',
  ai_explanation  TEXT         NULL,
  created_at      DATETIME(3)  NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_rel_source (source_id),
  INDEX idx_rel_target (target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
